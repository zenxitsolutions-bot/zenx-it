import PDFDocument from 'pdfkit';
import { addCalendarDays, dateForWeekdaySlot, formatCalendarDate, planRangeDates, toCalendarDate } from '../utils/calendarDate.js';

const FOREST = '#1b2b42';
const BRAND = '#3478d8';
const MUTED = '#5a6b80';
const LINE = '#d8e0ec';
const CREAM = '#f5f7fb';
const MARGIN = 48;
const FOOTER = 42;

function stripEmoji(value) {
  return String(value ?? '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu, '')
    .trim();
}

function parseTimeToMinutes(time) {
  const [clock, meridiem] = String(time ?? '').trim().split(/\s+/);
  let [hours, minutes] = (clock || '0:00').split(':').map(Number);
  const period = (meridiem ?? '').toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return (hours || 0) * 60 + (minutes || 0);
}

function splitItems(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return [];
  if (/\r?\n/.test(raw)) return raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return raw.split(',').map((item) => item.replace(/\.$/, '').trim()).filter(Boolean);
}

function splitSteps(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return [];
  if (/\r?\n/.test(raw)) return raw.split(/\r?\n/).map((step) => step.trim()).filter(Boolean);
  return [raw];
}

function mealTitle(meal) {
  return stripEmoji(meal.recipe?.title || meal.customTitle || `${meal.mealType} — recipe TBD`);
}

function groupMealsByDay(plan) {
  const dates = planRangeDates(plan.week, plan.weekEnd);
  const map = Object.fromEntries(dates.map((date) => [date, []]));
  for (const meal of plan.meals ?? []) {
    const date = dateForWeekdaySlot(plan.week, meal.day);
    if (!date) continue;
    (map[date] ??= []).push(meal);
  }
  for (const day of Object.keys(map)) {
    map[day].sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
  }
  return map;
}

function orderedDays(plan, mealsByDay) {
  const dates = planRangeDates(plan.week, plan.weekEnd);
  const extra = Object.keys(mealsByDay).filter((day) => !dates.includes(day));
  return [...dates, ...extra];
}

function dayLabel(week, day) {
  const date = dateForWeekdaySlot(week, day) || toCalendarDate(day);
  if (!date) return day;
  return `${formatCalendarDate(date, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function weekRange(plan) {
  const start = toCalendarDate(plan.week);
  const end = toCalendarDate(plan.weekEnd) || (start ? addCalendarDays(start, 6) : null);
  if (!start) return '';
  return `${formatCalendarDate(start, { day: 'numeric', month: 'short', year: 'numeric' })} – ${formatCalendarDate(end, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function slugPart(value) {
  return stripEmoji(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export function planPdfFileName({ plan, client }) {
  const who = slugPart(client?.name) || 'client';
  const week = toCalendarDate(plan.week) || 'week';
  return `weekly-plan-${who}-${week}.pdf`;
}

function contentWidth(doc) {
  return doc.page.width - MARGIN * 2;
}

function ensureSpace(doc, needed = 24) {
  if (doc.y + needed > doc.page.height - FOOTER) doc.addPage();
}

function writeParagraph(doc, text, { font = 'Helvetica', size = 10, color = FOREST, indent = 0, gapAfter = 3 } = {}) {
  const cleaned = stripEmoji(text);
  if (!cleaned) return;
  ensureSpace(doc, size + 8);
  doc.font(font).fontSize(size).fillColor(color);
  doc.text(cleaned, MARGIN + indent, doc.y, {
    width: contentWidth(doc) - indent,
    align: 'left',
    lineGap: 1.5,
  });
  doc.moveDown(0);
  doc.y += gapAfter;
}

function rule(doc) {
  ensureSpace(doc, 14);
  doc.save();
  doc.strokeColor(LINE).lineWidth(0.8).moveTo(MARGIN, doc.y).lineTo(MARGIN + contentWidth(doc), doc.y).stroke();
  doc.restore();
  doc.y += 10;
}

function mealMeta(meal) {
  const recipe = meal.recipe;
  return [
    recipe?.kcal != null && recipe.kcal !== '' ? `${recipe.kcal} kcal` : null,
    recipe?.protein != null && recipe.protein !== '' ? `${recipe.protein}g protein` : null,
    recipe?.prepTime ? `${stripEmoji(recipe.prepTime)} prep` : null,
    Array.isArray(recipe?.tags) && recipe.tags.length ? recipe.tags.map(stripEmoji).filter(Boolean).join(', ') : null,
  ]
    .filter(Boolean)
    .join('  |  ');
}

function uniqueIngredients(plan) {
  const seen = new Set();
  const items = [];
  for (const meal of plan.meals ?? []) {
    for (const item of splitItems(meal.recipe?.ingredients)) {
      const key = stripEmoji(item).toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      items.push(stripEmoji(item));
    }
  }
  return items.sort((a, b) => a.localeCompare(b));
}

function drawHeader(doc, { company, plan, client }) {
  const width = contentWidth(doc);
  doc.save();
  doc.rect(0, 0, doc.page.width, 78).fill(FOREST);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11);
  doc.text(stripEmoji(company?.name) || 'Weekly diet plan', MARGIN, 22, { width, lineBreak: false });
  doc.font('Helvetica').fontSize(9).fillColor('#c5d4ea');
  doc.text('Weekly diet plan', MARGIN, 40, { width, lineBreak: false });
  doc.restore();
  doc.y = 96;
  const title =
    stripEmoji(plan.title) || (client?.name ? `${stripEmoji(client.name)}'s weekly nourish plan` : 'Weekly nourish plan');
  writeParagraph(doc, title, { font: 'Helvetica-Bold', size: 18, gapAfter: 8 });
}

function drawMeta(doc, { client, dietitian, plan }) {
  const rows = [
    ['Prepared for', stripEmoji(client?.name) || 'Client'],
    ['Dietitian', stripEmoji(dietitian?.name) || '—'],
    ['Week', weekRange(plan) || '—'],
    ['Meals', String((plan.meals ?? []).length)],
  ];
  ensureSpace(doc, 56);
  const top = doc.y;
  doc.save();
  doc.roundedRect(MARGIN, top, contentWidth(doc), 46, 6).fill(CREAM);
  doc.restore();
  const colW = contentWidth(doc) / rows.length;
  rows.forEach((row, i) => {
    const x = MARGIN + 10 + i * colW;
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(row[0].toUpperCase(), x, top + 10, { width: colW - 16 });
    doc.font('Helvetica-Bold').fontSize(10).fillColor(FOREST).text(row[1], x, top + 24, { width: colW - 16 });
  });
  doc.y = top + 58;
}

function drawRecipe(doc, meal) {
  const recipe = meal.recipe;
  const ingredients = splitItems(recipe?.ingredients).map(stripEmoji).filter(Boolean);
  const steps = splitSteps(recipe?.instructions).map(stripEmoji).filter(Boolean);
  const notes = stripEmoji(meal.notes);
  const meta = mealMeta(meal);

  ensureSpace(doc, 72);
  doc.save();
  doc.roundedRect(MARGIN, doc.y, contentWidth(doc), 4, 2).fill(BRAND);
  doc.restore();
  doc.y += 10;

  writeParagraph(doc, mealTitle(meal), { font: 'Helvetica-Bold', size: 13, gapAfter: 2 });
  writeParagraph(doc, `${stripEmoji(meal.time)}  |  ${stripEmoji(meal.mealType)}`, {
    size: 9,
    color: BRAND,
    gapAfter: 2,
  });
  if (meta) writeParagraph(doc, meta, { size: 9, color: MUTED, gapAfter: 8 });
  else doc.y += 6;

  if (ingredients.length) {
    writeParagraph(doc, 'Ingredients', { font: 'Helvetica-Bold', size: 9, color: MUTED, gapAfter: 3 });
    for (const item of ingredients) {
      writeParagraph(doc, `-  ${item}`, { size: 10, indent: 10, gapAfter: 2 });
    }
    doc.y += 6;
  }

  if (steps.length) {
    writeParagraph(doc, 'How to make it', { font: 'Helvetica-Bold', size: 9, color: MUTED, gapAfter: 3 });
    steps.forEach((step, i) => {
      writeParagraph(doc, `${i + 1}.  ${step}`, { size: 10, indent: 10, gapAfter: 3 });
    });
    doc.y += 4;
  }

  if (notes) {
    writeParagraph(doc, `Note: ${notes}`, { size: 10, color: MUTED, gapAfter: 6 });
  }

  if (!recipe && !notes) {
    writeParagraph(doc, 'No recipe details saved for this meal.', { size: 10, color: MUTED, gapAfter: 6 });
  } else if (recipe && !ingredients.length && !steps.length) {
    writeParagraph(doc, 'This recipe has no ingredients or method saved yet.', { size: 10, color: MUTED, gapAfter: 6 });
  }

  doc.y += 8;
}

function drawWeek(doc, plan, mealsByDay) {
  writeParagraph(doc, "This week's meals and recipes", { font: 'Helvetica-Bold', size: 14, gapAfter: 6 });
  writeParagraph(doc, 'Every meal in the plan, with ingredients and method.', { size: 9, color: MUTED, gapAfter: 10 });
  rule(doc);

  for (const day of orderedDays(plan, mealsByDay)) {
    const meals = mealsByDay[day] ?? [];
    if (meals.length === 0) continue;
    ensureSpace(doc, 36);
    writeParagraph(doc, dayLabel(plan.week, day), { font: 'Helvetica-Bold', size: 13, color: BRAND, gapAfter: 8 });
    for (const meal of meals) drawRecipe(doc, meal);
  }
}

function drawShoppingList(doc, plan) {
  const items = uniqueIngredients(plan);
  if (items.length === 0) return;
  ensureSpace(doc, 40);
  writeParagraph(doc, 'Shopping list', { font: 'Helvetica-Bold', size: 14, gapAfter: 4 });
  writeParagraph(doc, 'Combined ingredients from every recipe this week.', { size: 9, color: MUTED, gapAfter: 8 });
  for (const item of items) {
    writeParagraph(doc, `[ ]  ${item}`, { size: 10, gapAfter: 3 });
  }
}

function drawFooters(doc) {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i += 1) {
    doc.switchToPage(range.start + i);
    doc.font('Helvetica').fontSize(8).fillColor(MUTED);
    doc.text(`Page ${i + 1} of ${range.count}`, MARGIN, doc.page.height - 28, {
      width: contentWidth(doc),
      align: 'center',
      lineBreak: false,
    });
  }
}

export function renderPlanPdf({ plan, client, dietitian, company }) {
  const mealsByDay = groupMealsByDay(plan);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: MARGIN,
      bufferPages: true,
      info: {
        Title: stripEmoji(plan.title) || 'Weekly diet plan',
        Author: stripEmoji(company?.name) || 'ZenX Dietitian',
      },
    });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawHeader(doc, { company, plan, client });
    drawMeta(doc, { client, dietitian, plan });
    drawWeek(doc, plan, mealsByDay);
    drawShoppingList(doc, plan);
    drawFooters(doc);
    doc.end();
  });
}

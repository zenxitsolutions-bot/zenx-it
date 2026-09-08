import pptxgen from 'pptxgenjs';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'ZenX-Dietitian-Product-Demo.pptx');

const C = {
  navy: '0F1F35',
  navy2: '162A45',
  blue: '3478D8',
  blueSoft: 'E8F1FC',
  page: 'F5F7FB',
  ink: '1B2B42',
  muted: '5A6B80',
  white: 'FFFFFF',
  line: 'D5DEEA',
  green: '2F8A5A',
  greenSoft: 'E6F5EC',
  orange: 'D97706',
  orangeSoft: 'FEF3E2',
  purple: '6D5BD0',
  purpleSoft: 'EEE9FB',
  red: 'C24141',
  redSoft: 'FDECEC',
};

const FONT = 'Calibri';

const pptx = new pptxgen();
pptx.author = 'ZenX IT Solutions';
pptx.company = 'ZenX IT Solutions Pvt Ltd';
pptx.title = 'ZenX Dietitian — Product Demo';
pptx.subject = 'Live product demonstration of the ZenX Dietitian application';
pptx.defineLayout({ name: 'WIDE', width: 13.333, height: 7.5 });
pptx.layout = 'WIDE';

function addFooter(slide, page, total = 17) {
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 7.22, w: 13.333, h: 0.28, fill: { color: C.navy },
  });
  slide.addText('ZENX DIETITIAN  ·  PRODUCT DEMO', {
    x: 0.4, y: 7.22, w: 8, h: 0.28,
    fontFace: FONT, fontSize: 10, color: 'A8B8CC', margin: 0, valign: 'middle',
  });
  slide.addText(String(page).padStart(2, '0'), {
    x: 11.6, y: 7.22, w: 1.3, h: 0.28,
    fontFace: FONT, fontSize: 10, color: 'A8B8CC', align: 'right', margin: 0, valign: 'middle',
  });
}

function contentHeader(slide, kicker, title) {
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.12, h: 7.5, fill: { color: C.blue },
  });
  slide.addText(kicker.toUpperCase(), {
    x: 0.48, y: 0.28, w: 12.3, h: 0.28,
    fontFace: FONT, fontSize: 12, bold: true, color: C.blue, charSpacing: 1.4,
  });
  slide.addText(title, {
    x: 0.48, y: 0.52, w: 12.3, h: 0.5,
    fontFace: FONT, fontSize: 26, bold: true, color: C.ink,
  });
}

function card(slide, { x, y, w, h, fill = C.white }) {
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h,
    fill: { color: fill },
    rectRadius: 0.08,
    shadow: { type: 'outer', color: '0F1F35', blur: 10, opacity: 0.08, offset: 2 },
  });
}

function notes(slide, text) {
  slide.addNotes(text);
}

// ---------------------------------------------------------------------------
// 01 Title
// ---------------------------------------------------------------------------
{
  const s = pptx.addSlide();
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.navy } });
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 0.16, h: 7.5, fill: { color: C.blue } });
  s.addShape(pptx.shapes.OVAL, {
    x: 10.2, y: -1.4, w: 5.2, h: 5.2, fill: { color: '1A3354' },
  });
  s.addShape(pptx.shapes.OVAL, {
    x: 11.1, y: 4.6, w: 3.4, h: 3.4, fill: { color: '16304E' },
  });
  s.addText('ZENX IT SOLUTIONS', {
    x: 0.7, y: 1.55, w: 10, h: 0.32,
    fontFace: FONT, fontSize: 13, bold: true, color: C.blue, charSpacing: 2.2,
  });
  s.addText('ZenX Dietitian', {
    x: 0.7, y: 2.0, w: 11.5, h: 0.95,
    fontFace: FONT, fontSize: 48, bold: true, color: C.white,
  });
  s.addText('Product demonstration', {
    x: 0.7, y: 2.95, w: 11, h: 0.45,
    fontFace: FONT, fontSize: 24, color: 'B8C7DB',
  });
  s.addText('A connected practice platform for enquiries, clients, weekly diet plans,\nprogress, consultations, and video calls — in one place.', {
    x: 0.7, y: 3.7, w: 9.2, h: 0.85,
    fontFace: FONT, fontSize: 16, color: 'D5DEEA',
  });
  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 0.7, y: 5.0, w: 2.35, h: 0.42, fill: { color: C.blue }, rectRadius: 0.06,
  });
  s.addText('LIVE PRODUCT WALKTHROUGH', {
    x: 0.7, y: 5.0, w: 2.35, h: 0.42,
    fontFace: FONT, fontSize: 10, bold: true, color: C.white, align: 'center', valign: 'middle',
  });
  s.addText('Admin  ·  Dietitian  ·  Client', {
    x: 3.2, y: 5.0, w: 6, h: 0.42,
    fontFace: FONT, fontSize: 14, color: 'A8B8CC', valign: 'middle',
  });
  notes(s, 'Open with the product name, then one sentence: ZenX Dietitian is the practice system dietitians and their clients use every day. Do not invent client counts or outcomes.');
}

// ---------------------------------------------------------------------------
// 02 Agenda
// ---------------------------------------------------------------------------
{
  const s = pptx.addSlide();
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.page } });
  contentHeader(s, '01  /  Agenda', 'What we will walk through');
  const items = [
    ['01', 'The problem and the product', 'Why a dietitian practice needs one system'],
    ['02', 'Three roles, one journey', 'Admin, dietitian, and client — how they connect'],
    ['03', 'Practice operations', 'Enquiries, users, recipes, plans, and insights'],
    ['04', 'Care delivery', 'Weekly meals, progress, reports, messages, and video calls'],
    ['05', 'Live demo', 'A real path from first enquiry to a published plan'],
  ];
  items.forEach((item, i) => {
    const y = 1.28 + i * 1.08;
    card(s, { x: 0.48, y, w: 12.35, h: 0.96 });
    s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 0.68, y: y + 0.22, w: 0.62, h: 0.52, fill: { color: C.blueSoft }, rectRadius: 0.06,
    });
    s.addText(item[0], {
      x: 0.68, y: y + 0.22, w: 0.62, h: 0.52,
      fontFace: FONT, fontSize: 14, bold: true, color: C.blue, align: 'center', valign: 'middle',
    });
    s.addText(item[1], {
      x: 1.5, y: y + 0.16, w: 10.9, h: 0.36,
      fontFace: FONT, fontSize: 18, bold: true, color: C.ink,
    });
    s.addText(item[2], {
      x: 1.5, y: y + 0.5, w: 10.9, h: 0.3,
      fontFace: FONT, fontSize: 13, color: C.muted,
    });
  });
  addFooter(s, 2);
  notes(s, 'Keep this slide to 20 seconds. Promise a live walkthrough, not a feature dump.');
}

// ---------------------------------------------------------------------------
// 03 Problem
// ---------------------------------------------------------------------------
{
  const s = pptx.addSlide();
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.page } });
  contentHeader(s, '02  /  The challenge', 'A practice should not live in chat threads');
  const pains = [
    ['Scattered leads', 'Enquiries arrive by form, phone, and WhatsApp. Follow-ups get lost.'],
    ['Plans in documents', 'Weekly meals live in Word, Excel, or photos — hard to update or track.'],
    ['No shared view', 'The dietitian and the client rarely see the same plan, progress, or next call.'],
    ['Admin is separate work', 'Users, conversion, and reporting sit outside the care workflow.'],
  ];
  pains.forEach((p, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.48 + col * 6.32;
    const y = 1.35 + row * 2.55;
    card(s, { x, y, w: 6.1, h: 2.35 });
    s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: x + 0.28, y: y + 0.32, w: 0.5, h: 0.5, fill: { color: C.blueSoft }, rectRadius: 0.08,
    });
    s.addText(String(i + 1), {
      x: x + 0.28, y: y + 0.32, w: 0.5, h: 0.5,
      fontFace: FONT, fontSize: 16, bold: true, color: C.blue, align: 'center', valign: 'middle',
    });
    s.addText(p[0], {
      x: x + 0.95, y: y + 0.36, w: 4.85, h: 0.42,
      fontFace: FONT, fontSize: 20, bold: true, color: C.ink, valign: 'middle',
    });
    s.addText(p[1], {
      x: x + 0.28, y: y + 1.05, w: 5.55, h: 0.95,
      fontFace: FONT, fontSize: 15, color: C.muted,
    });
  });
  addFooter(s, 3);
  notes(s, 'Frame the pain without criticizing a specific clinic. The point is fragmentation.');
}

// ---------------------------------------------------------------------------
// 04 Product
// ---------------------------------------------------------------------------
{
  const s = pptx.addSlide();
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.page } });
  contentHeader(s, '03  /  The product', 'One platform for the whole practice');
  s.addText('ZenX Dietitian is a nutrition practice system: public lead capture, an admin CRM, a dietitian workspace, and a client portal — connected to the ZenX Admin company record.', {
    x: 0.48, y: 1.18, w: 12.35, h: 0.7,
    fontFace: FONT, fontSize: 16, color: C.muted,
  });
  const feats = [
    ['Client management', 'Roster, profiles, notes, assignment, and account status'],
    ['Diet plans & recipes', 'Recipe library, program plans, and a weekly meal builder'],
    ['Progress & reports', 'Weight and measurements, plus lab/report upload and review'],
    ['Appointments & video', 'Availability, booking, recurring schedules, and Jitsi calls'],
  ];
  feats.forEach((f, i) => {
    const x = 0.48 + i * 3.16;
    card(s, { x, y: 2.1, w: 3.02, h: 4.55 });
    s.addShape(pptx.shapes.RECTANGLE, {
      x, y: 2.1, w: 3.02, h: 0.1, fill: { color: C.blue },
    });
    s.addText(String(i + 1).padStart(2, '0'), {
      x: x + 0.22, y: 2.4, w: 2.55, h: 0.4,
      fontFace: FONT, fontSize: 18, bold: true, color: C.blue,
    });
    s.addText(f[0], {
      x: x + 0.22, y: 2.9, w: 2.55, h: 1.15,
      fontFace: FONT, fontSize: 20, bold: true, color: C.ink,
    });
    s.addText(f[1], {
      x: x + 0.22, y: 4.15, w: 2.55, h: 2.1,
      fontFace: FONT, fontSize: 14, color: C.muted,
    });
  });
  addFooter(s, 4);
  notes(s, 'These four bullets match the marketing site product card. Stay on capabilities, not invented metrics.');
}

// ---------------------------------------------------------------------------
// 05 Three roles
// ---------------------------------------------------------------------------
{
  const s = pptx.addSlide();
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.page } });
  contentHeader(s, '04  /  Who uses it', 'Three portals. One practice.');
  const roles = [
    {
      title: 'Admin',
      fill: C.navy,
      titleColor: C.white,
      bodyColor: 'C5D3E4',
      items: [
        'Dashboard with today’s work and KPIs',
        'Enquiry pipeline and conversion',
        'Users, clients, plans, recipes',
        'Growth insights and email log',
      ],
    },
    {
      title: 'Dietitian',
      fill: C.blue,
      titleColor: C.white,
      bodyColor: 'E8F1FC',
      items: [
        'Caseload and today’s appointments',
        'Weekly plan builder and recipes',
        'Schedule and join video calls',
        'Messages and report reviews',
      ],
    },
    {
      title: 'Client',
      fill: C.white,
      titleColor: C.ink,
      bodyColor: C.muted,
      items: [
        'Today’s meals and weekly plan',
        'Log weight and measurements',
        'Book or join consultations',
        'Upload reports and message the dietitian',
      ],
    },
  ];
  roles.forEach((r, i) => {
    const x = 0.48 + i * 4.22;
    card(s, { x, y: 1.3, w: 4.02, h: 5.35, fill: r.fill });
    s.addText(r.title, {
      x: x + 0.28, y: 1.55, w: 3.45, h: 0.5,
      fontFace: FONT, fontSize: 24, bold: true, color: r.titleColor,
    });
    r.items.forEach((item, j) => {
      s.addText(item, {
        x: x + 0.28, y: 2.3 + j * 0.9, w: 3.45, h: 0.75,
        fontFace: FONT, fontSize: 15, color: r.bodyColor,
      });
    });
  });
  addFooter(s, 5);
  notes(s, 'Say: Admin runs the practice. Dietitian delivers care. Client lives the plan. Then go live.');
}

// ---------------------------------------------------------------------------
// 06 Journey
// ---------------------------------------------------------------------------
{
  const s = pptx.addSlide();
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.page } });
  contentHeader(s, '05  /  The journey', 'From first enquiry to ongoing care');
  const steps = [
    ['Enquire', 'Public 3-step form: goal, contact, preferred slot'],
    ['Qualify', 'Pipeline: New → Contacted → Follow-up'],
    ['Convert', 'Won creates the client account and carries history'],
    ['Plan', 'Recipes + weekly builder, then publish to the client'],
    ['Care', 'Meals, progress, reports, messages, video calls'],
  ];
  steps.forEach((st, i) => {
    const x = 0.4 + i * 2.58;
    card(s, { x, y: 1.55, w: 2.42, h: 4.95 });
    s.addShape(pptx.shapes.OVAL, {
      x: x + 0.86, y: 1.82, w: 0.7, h: 0.7, fill: { color: C.blue },
    });
    s.addText(String(i + 1), {
      x: x + 0.86, y: 1.82, w: 0.7, h: 0.7,
      fontFace: FONT, fontSize: 18, bold: true, color: C.white, align: 'center', valign: 'middle',
    });
    s.addText(st[0], {
      x: x + 0.14, y: 2.7, w: 2.14, h: 0.7,
      fontFace: FONT, fontSize: 18, bold: true, color: C.ink, align: 'center',
    });
    s.addText(st[1], {
      x: x + 0.16, y: 3.5, w: 2.1, h: 2.5,
      fontFace: FONT, fontSize: 13, color: C.muted, align: 'center',
    });
  });
  addFooter(s, 6);
  notes(s, 'This is the spine of the live demo. Conversion happens only at Successfully Converted / Won — not at Follow-up.');
}

// ---------------------------------------------------------------------------
// 07 Enquiry
// ---------------------------------------------------------------------------
{
  const s = pptx.addSlide();
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.page } });
  contentHeader(s, '06  /  Lead capture', 'Book a free consultation in three steps');
  const steps = [
    ['Step 1 — Goal', 'Weight loss, PCOS support, diabetes support, sports nutrition, general wellness, or something else'],
    ['Step 2 — Contact', 'Name, email, and a valid phone number'],
    ['Step 3 — Timing', 'Preferred slot (weekday morning / afternoon / evening, or weekend) plus an optional note'],
  ];
  steps.forEach((st, i) => {
    const y = 1.3 + i * 1.55;
    card(s, { x: 0.48, y, w: 8.15, h: 1.42 });
    s.addText(st[0], {
      x: 0.75, y: y + 0.2, w: 7.65, h: 0.38,
      fontFace: FONT, fontSize: 18, bold: true, color: C.ink,
    });
    s.addText(st[1], {
      x: 0.75, y: y + 0.62, w: 7.65, h: 0.6,
      fontFace: FONT, fontSize: 14, color: C.muted,
    });
  });
  card(s, { x: 8.85, y: 1.3, w: 4.0, h: 5.35, fill: C.navy });
  s.addText('What happens next', {
    x: 9.1, y: 1.55, w: 3.5, h: 0.45,
    fontFace: FONT, fontSize: 16, bold: true, color: C.white,
  });
  const next = [
    'Enquiry lands in the admin pipeline as New',
    'Staff can contact and book a follow-up call against the enquiry',
    'Convert / Won creates the real client account',
    'Welcome email is queued automatically',
  ];
  next.forEach((t, i) => {
    s.addText(`${i + 1}.  ${t}`, {
      x: 9.1, y: 2.2 + i * 0.95, w: 3.5, h: 0.85,
      fontFace: FONT, fontSize: 14, color: 'D5DEEA',
    });
  });
  addFooter(s, 7);
  notes(s, 'Live: open the public page, click Book a free consultation, submit a test enquiry, then switch to admin.');
}

// ---------------------------------------------------------------------------
// 08 Admin dashboard
// ---------------------------------------------------------------------------
{
  const s = pptx.addSlide();
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.page } });
  contentHeader(s, '07  /  Admin dashboard', 'The practice at a glance');
  const kpis = [
    ['Today strip', 'What needs attention right now'],
    ['Six KPI cards', 'Volume and month-on-month movement'],
    ['Status donut', 'Where every enquiry sits'],
    ['Growth chart', '7 days, 30 days, 3 months, or 6 months'],
    ['Recent enquiries', 'Newest leads, ready to open'],
    ['Quick actions', 'The five moves used every day'],
  ];
  kpis.forEach((k, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.48 + col * 4.22;
    const y = 1.3 + row * 2.55;
    card(s, { x, y, w: 4.05, h: 2.35 });
    s.addText(k[0], {
      x: x + 0.28, y: y + 0.35, w: 3.5, h: 0.55,
      fontFace: FONT, fontSize: 18, bold: true, color: C.ink,
    });
    s.addText(k[1], {
      x: x + 0.28, y: y + 1.05, w: 3.5, h: 0.9,
      fontFace: FONT, fontSize: 15, color: C.muted,
    });
  });
  addFooter(s, 8);
  notes(s, 'Show the greeting, today strip, then click each quick action once without completing forms: Add Enquiry, Add User, Schedule Follow-up, Add Recipes, Create Plan.');
}

// ---------------------------------------------------------------------------
// 09 Pipeline
// ---------------------------------------------------------------------------
{
  const s = pptx.addSlide();
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.page } });
  contentHeader(s, '08  /  Enquiry pipeline', 'The same lead language as ZenX Admin CRM');
  const cols = [
    { t: 'New enquiry', d: 'Just arrived', c: C.blue, bg: C.blueSoft },
    { t: 'Contacted', d: 'First outreach done', c: C.purple, bg: C.purpleSoft },
    { t: 'Follow-up', d: 'Book a call on the enquiry', c: C.orange, bg: C.orangeSoft },
    { t: 'Converted / Won', d: 'Creates the client account', c: C.green, bg: C.greenSoft },
    { t: 'Unsuccessful', d: 'Closed without conversion', c: C.red, bg: C.redSoft },
  ];
  cols.forEach((col, i) => {
    const x = 0.4 + i * 2.58;
    card(s, { x, y: 1.4, w: 2.45, h: 4.2, fill: col.bg });
    s.addShape(pptx.shapes.OVAL, {
      x: x + 0.95, y: 1.7, w: 0.55, h: 0.55, fill: { color: col.c },
    });
    s.addText(col.t, {
      x: x + 0.12, y: 2.45, w: 2.2, h: 1.1,
      fontFace: FONT, fontSize: 16, bold: true, color: C.ink, align: 'center',
    });
    s.addText(col.d, {
      x: x + 0.16, y: 3.7, w: 2.12, h: 1.4,
      fontFace: FONT, fontSize: 13, color: C.muted, align: 'center',
    });
  });
  s.addText('Follow-up books against the enquiry. Only Convert / Won creates the client — history and any follow-up calls move with them.', {
    x: 0.48, y: 5.8, w: 12.35, h: 0.85,
    fontFace: FONT, fontSize: 15, color: C.ink,
  });
  addFooter(s, 9);
  notes(s, 'Open the enquiry you just submitted. Move it Contacted, then Follow-up and mention booking. Convert only if you want a new client in this demo tenant.');
}

// ---------------------------------------------------------------------------
// 10 Practice ops
// ---------------------------------------------------------------------------
{
  const s = pptx.addSlide();
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.page } });
  contentHeader(s, '09  /  Practice operations', 'Users, plans, and the recipe library');
  const blocks = [
    ['Manage users', 'Add dietitians and staff. Dietitian profiles include contact, qualifications, account status (active / inactive / suspended), and working hours.'],
    ['Program plans', 'Reusable plan templates for the practice. Create from the dashboard quick action or the Plans screen.'],
    ['Recipe library', 'Shared catalog with meal types. Custom recipes are allowed — a slot does not have to come from the catalog.'],
    ['Weekly plan', 'Assign meals to days, then publish. The client sees the same week immediately.'],
  ];
  blocks.forEach((b, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.48 + col * 6.32;
    const y = 1.3 + row * 2.7;
    card(s, { x, y, w: 6.12, h: 2.5 });
    s.addText(b[0], {
      x: x + 0.3, y: y + 0.32, w: 5.5, h: 0.45,
      fontFace: FONT, fontSize: 20, bold: true, color: C.ink,
    });
    s.addText(b[1], {
      x: x + 0.3, y: y + 0.9, w: 5.5, h: 1.3,
      fontFace: FONT, fontSize: 15, color: C.muted,
    });
  });
  addFooter(s, 10);
  notes(s, 'If time is short, open Recipes and Plans only. The weekly builder is the hero on the dietitian login.');
}

// ---------------------------------------------------------------------------
// 11 Dietitian
// ---------------------------------------------------------------------------
{
  const s = pptx.addSlide();
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.page } });
  contentHeader(s, '10  /  Dietitian workspace', 'Today’s caseload, then the plan');
  const left = [
    ['Dashboard', 'Clients, today’s appointments, active plans, and recent progress'],
    ['Clients', 'Open a profile, notes, progress, reports, and consultation settings'],
    ['Weekly plan builder', 'Drop recipes — or a custom meal — onto breakfast, lunch, dinner, snacks'],
    ['Schedule calls', 'Availability, exceptions, booking, reschedule, cancel, join video'],
  ];
  left.forEach((row, i) => {
    const y = 1.28 + i * 1.35;
    card(s, { x: 0.48, y, w: 8.2, h: 1.22 });
    s.addText(row[0], {
      x: 0.75, y: y + 0.18, w: 7.7, h: 0.36,
      fontFace: FONT, fontSize: 18, bold: true, color: C.ink,
    });
    s.addText(row[1], {
      x: 0.75, y: y + 0.58, w: 7.7, h: 0.45,
      fontFace: FONT, fontSize: 14, color: C.muted,
    });
  });
  card(s, { x: 8.9, y: 1.28, w: 3.95, h: 5.4, fill: C.navy });
  s.addText('Demo focus', {
    x: 9.15, y: 1.55, w: 3.45, h: 0.4,
    fontFace: FONT, fontSize: 14, bold: true, color: C.blue,
  });
  s.addText('Publish one week for the seeded client. Then switch accounts and show the same meals on the client portal.', {
    x: 9.15, y: 2.1, w: 3.45, h: 2.0,
    fontFace: FONT, fontSize: 15, color: 'D5DEEA',
  });
  s.addText('Also show', {
    x: 9.15, y: 4.2, w: 3.45, h: 0.35,
    fontFace: FONT, fontSize: 13, bold: true, color: C.blue,
  });
  s.addText('Messages\nReport reviews\nRecipe library', {
    x: 9.15, y: 4.6, w: 3.45, h: 1.6,
    fontFace: FONT, fontSize: 15, color: 'D5DEEA',
  });
  addFooter(s, 11);
  notes(s, 'Login as dietitian. Open plan builder, change one meal, publish. Do not linger on empty charts.');
}

// ---------------------------------------------------------------------------
// 12 Client
// ---------------------------------------------------------------------------
{
  const s = pptx.addSlide();
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.page } });
  contentHeader(s, '11  /  Client experience', 'The plan the client actually lives');
  const tiles = [
    ['Overview', 'Today’s meals, next call, progress snapshot, assigned dietitian'],
    ["This week's meals", 'Day-by-day plan. Mark a meal eaten.'],
    ['My progress', 'Log weight and measurements. See the trend.'],
    ['Calls', 'Book, reschedule, cancel. Join the video room when it is time.'],
    ['Messages', 'Thread with the assigned dietitian'],
    ['Reports', 'Upload labs or documents. Preview PDF and images in-app.'],
  ];
  tiles.forEach((t, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.48 + col * 4.22;
    const y = 1.3 + row * 2.7;
    card(s, { x, y, w: 4.05, h: 2.5 });
    s.addText(t[0], {
      x: x + 0.28, y: y + 0.35, w: 3.5, h: 0.5,
      fontFace: FONT, fontSize: 18, bold: true, color: C.ink,
    });
    s.addText(t[1], {
      x: x + 0.28, y: y + 1.0, w: 3.5, h: 1.15,
      fontFace: FONT, fontSize: 15, color: C.muted,
    });
  });
  addFooter(s, 12);
  notes(s, 'Client login. Mark one meal eaten. Open Progress. Mention Reports upload if time remains.');
}

// ---------------------------------------------------------------------------
// 13 Consultations
// ---------------------------------------------------------------------------
{
  const s = pptx.addSlide();
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.page } });
  contentHeader(s, '12  /  Consultations', 'Availability, bookings, and video');
  const rows = [
    ['Working hours', 'Dietitian sets weekly hours and blocked dates. Slots respect that timezone.'],
    ['Smart booking', 'Picker only offers open slots. Reschedule and cancel update the same appointment.'],
    ['Recurring schedule', 'Frequency, preferred day/time, start date. A rolling window of upcoming calls is generated and checked against real availability.'],
    ['Video + calendar', 'Booked calls get a Jitsi meeting link. Confirmation emails include a calendar invite that updates on reschedule or cancel.'],
  ];
  rows.forEach((r, i) => {
    const y = 1.28 + i * 1.35;
    card(s, { x: 0.48, y, w: 12.35, h: 1.22 });
    s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 0.7, y: y + 0.34, w: 2.35, h: 0.54, fill: { color: C.blueSoft }, rectRadius: 0.06,
    });
    s.addText(r[0], {
      x: 0.7, y: y + 0.34, w: 2.35, h: 0.54,
      fontFace: FONT, fontSize: 13, bold: true, color: C.blue, align: 'center', valign: 'middle',
    });
    s.addText(r[1], {
      x: 3.25, y: y + 0.28, w: 9.25, h: 0.68,
      fontFace: FONT, fontSize: 16, color: C.ink, valign: 'middle',
    });
  });
  addFooter(s, 13);
  notes(s, 'Important: seeded demo calls may have no meeting URL. Book a new call after availability is set, then click Join video call.');
}

// ---------------------------------------------------------------------------
// 14 Connected
// ---------------------------------------------------------------------------
{
  const s = pptx.addSlide();
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.page } });
  contentHeader(s, '13  /  Connected operations', 'The practice stays in sync');
  const items = [
    ['Email notifications', 'Enquiry received, client welcome, plan published, call booked / rescheduled / cancelled — queued, retried, and visible in the admin email log.'],
    ['Organisation isolation', 'Each company only sees its own users, enquiries, plans, and clients. Admin here is org-scoped, not platform-wide.'],
    ['ZenX Admin handoff', 'A company contact can arrive via SSO from the ZenX Admin portal into this app, already attached to their organisation.'],
    ['Secure sessions', 'Short-lived access token in memory, refresh token in an httpOnly cookie. Uploaded reports are permission-checked before preview or download.'],
  ];
  items.forEach((it, i) => {
    const y = 1.28 + i * 1.35;
    card(s, { x: 0.48, y, w: 12.35, h: 1.22 });
    s.addText(it[0], {
      x: 0.75, y: y + 0.16, w: 11.85, h: 0.36,
      fontFace: FONT, fontSize: 17, bold: true, color: C.ink,
    });
    s.addText(it[1], {
      x: 0.75, y: y + 0.55, w: 11.85, h: 0.5,
      fontFace: FONT, fontSize: 14, color: C.muted,
    });
  });
  addFooter(s, 14);
  notes(s, 'Skip deep security talk unless asked. One line on SSO is enough: the company already exists in ZenX Admin.');
}

// ---------------------------------------------------------------------------
// 15 Live demo script
// ---------------------------------------------------------------------------
{
  const s = pptx.addSlide();
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.page } });
  contentHeader(s, '14  /  Live demo', 'Suggested 10-minute path');
  const path = [
    ['1', 'Public site', 'Book a free consultation. Submit a new enquiry.'],
    ['2', 'Admin login', 'Dashboard → confirm the new lead on Recent enquiries.'],
    ['3', 'Pipeline', 'Open the card. Contacted → Follow-up. Point at Convert / Won.'],
    ['4', 'Quick actions', 'Add User, Add Recipes, Create Plan — show the dialogs open.'],
    ['5', 'Dietitian login', 'Dashboard, then Weekly plan builder. Publish one change.'],
    ['6', 'Client login', 'Overview and This week’s meals. Mark a meal eaten. Open Calls.'],
    ['7', 'Video', 'Book a fresh slot and click Join video call (Jitsi).'],
  ];
  path.forEach((p, i) => {
    const y = 1.22 + i * 0.78;
    s.addShape(pptx.shapes.OVAL, {
      x: 0.5, y: y + 0.12, w: 0.48, h: 0.48, fill: { color: C.blue },
    });
    s.addText(p[0], {
      x: 0.5, y: y + 0.12, w: 0.48, h: 0.48,
      fontFace: FONT, fontSize: 14, bold: true, color: C.white, align: 'center', valign: 'middle',
    });
    s.addText(p[1], {
      x: 1.15, y: y, w: 2.6, h: 0.72,
      fontFace: FONT, fontSize: 16, bold: true, color: C.ink, valign: 'middle',
    });
    s.addText(p[2], {
      x: 3.85, y: y, w: 8.95, h: 0.72,
      fontFace: FONT, fontSize: 15, color: C.muted, valign: 'middle',
    });
  });
  addFooter(s, 15);
  notes(s, 'If you only have 5 minutes: steps 1, 2, 5, 6. Skip Convert unless you want a new user in the tenant.');
}

// ---------------------------------------------------------------------------
// 16 Demo accounts
// ---------------------------------------------------------------------------
{
  const s = pptx.addSlide();
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.page } });
  contentHeader(s, '15  /  Demo logins', 'Seeded accounts for the walkthrough');
  const accounts = [
    ['Admin', 'admin@nourishly.test', 'Dashboard, pipeline, users, plans, insights'],
    ['Dietitian', 'dietitian@nourishly.test', 'Caseload, weekly builder, calls, reviews'],
    ['Client', 'client@nourishly.test', 'Meals, progress, reports, messages, calls'],
  ];
  accounts.forEach((a, i) => {
    const x = 0.48 + i * 4.22;
    card(s, { x, y: 1.35, w: 4.05, h: 3.55 });
    s.addText(a[0], {
      x: x + 0.28, y: 1.6, w: 3.5, h: 0.4,
      fontFace: FONT, fontSize: 14, bold: true, color: C.blue,
    });
    s.addText(a[1], {
      x: x + 0.28, y: 2.1, w: 3.5, h: 0.7,
      fontFace: FONT, fontSize: 16, bold: true, color: C.ink,
    });
    s.addText(a[2], {
      x: x + 0.28, y: 2.95, w: 3.5, h: 1.4,
      fontFace: FONT, fontSize: 15, color: C.muted,
    });
  });
  card(s, { x: 0.48, y: 5.1, w: 12.35, h: 1.55, fill: C.navy });
  s.addText('Shared password for all seeded users:  Password123!', {
    x: 0.78, y: 5.28, w: 11.75, h: 0.45,
    fontFace: FONT, fontSize: 18, bold: true, color: C.white,
  });
  s.addText('Seeded historical calls may not have a video link. Book a new appointment after the dietitian’s availability is set, then join.', {
    x: 0.78, y: 5.78, w: 11.75, h: 0.6,
    fontFace: FONT, fontSize: 14, color: 'C5D3E4',
  });
  addFooter(s, 16);
  notes(s, 'Do not leave this slide on screen in an external customer meeting unless this is a private sandbox. Fine for an internal ZenX demo.');
}

// ---------------------------------------------------------------------------
// 17 Close
// ---------------------------------------------------------------------------
{
  const s = pptx.addSlide();
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.navy } });
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 0.16, h: 7.5, fill: { color: C.blue } });
  s.addText('What to remember', {
    x: 0.7, y: 0.7, w: 12, h: 0.6,
    fontFace: FONT, fontSize: 32, bold: true, color: C.white,
  });
  const remember = [
    'One enquiry becomes one client — without losing the conversation.',
    'The dietitian publishes a week. The client sees that same week.',
    'Calls respect real availability, and video is one click away.',
    'Admin, dietitian, and client are three views of the same practice.',
  ];
  remember.forEach((t, i) => {
    s.addText(t, {
      x: 0.7, y: 1.6 + i * 0.85, w: 11.8, h: 0.7,
      fontFace: FONT, fontSize: 20, color: 'D5DEEA',
    });
  });
  s.addText('Questions?  ·  ZenX IT Solutions', {
    x: 0.7, y: 5.35, w: 11.8, h: 0.45,
    fontFace: FONT, fontSize: 16, color: C.blue,
  });
  s.addText('hello@zenxitsolutions.com', {
    x: 0.7, y: 5.85, w: 11.8, h: 0.4,
    fontFace: FONT, fontSize: 16, color: 'A8B8CC',
  });
  notes(s, 'End on the client seeing the published plan. Invite questions. Do not invent case-study numbers.');
}

const data = await pptx.write({ outputType: 'nodebuffer' });
writeFileSync(OUT, data);
console.log(OUT);

import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstat, mkdir, readFile, realpath, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { CONVERTED_RECIPE_IMAGE_BASENAMES as names } from '../zenx-wellness/shared/recipeImageAssets.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const relativeCatalog = 'zenx-wellness/client/public/images/recipe-catalog';
const catalog = path.resolve(root, relativeCatalog);
const reportPath = path.resolve(root, '.local/image-optimization/report.json');
const mode = process.argv[2];
assert.ok(['--apply', '--remove-originals'].includes(mode) && process.argv.length === 3,
  'Usage: node scripts/optimize-recipe-images.mjs --apply | --remove-originals. Conversion never deletes originals; removal is a separate verified step.');
assert.equal(await realpath(catalog), catalog, 'Catalog must be a real directory, not a redirected path');
assert.equal(new Set(names).size, names.length, 'Duplicate asset names');
for (const name of names) assert.match(name, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
sharp.concurrency(1);
sharp.cache({ memory: 32, files: 0, items: 32 });
let priorRecords = new Map();
if (mode === '--apply') {
  try {
    const previous = JSON.parse(await readFile(reportPath, 'utf8'));
    priorRecords = new Map(previous.records.map((record) => [record.name, record]));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const gitBlob = (bytes) => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
async function saveReport(report) {
  await mkdir(path.dirname(reportPath), { recursive: true });
  const temporary = `${reportPath}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  await rename(temporary, reportPath);
}
async function asset(name, extension) {
  const filename = path.resolve(catalog, `${name}.${extension}`);
  assert.equal(path.dirname(filename), catalog, 'Asset escaped catalog');
  const stat = await lstat(filename);
  assert.ok(stat.isFile() && !stat.isSymbolicLink(), `Asset is not a regular file: ${filename}`);
  return { filename, bytes: await readFile(filename) };
}

function psnr(source, output) {
  assert.equal(source.length, output.length, 'Decoded image layout changed');
  let squaredError = 0;
  for (let i = 0; i < source.length; i++) squaredError += (source[i] - output[i]) ** 2;
  return squaredError === 0 ? 100 : 10 * Math.log10(255 ** 2 / (squaredError / source.length));
}

const presets = [
  { quality: 94, smartSubsample: true, effort: 6 },
  { quality: 98, smartSubsample: true, effort: 6 },
  { nearLossless: true, quality: 80, effort: 6 },
];

// Compare actual color channels only. Adding an identical opaque alpha channel
// would artificially inflate PSNR; transparency, if present, is checked separately.
const rgb = (input) => sharp(input).removeAlpha().toColourspace('srgb').raw().toBuffer();

async function verifyAlpha(source, output, hasAlpha) {
  if (!hasAlpha) return;
  assert.deepEqual(await sharp(source).extractChannel('alpha').raw().toBuffer(),
    await sharp(output).extractChannel('alpha').raw().toBuffer(), 'Transparency changed');
}

async function convert(name) {
  const { bytes: source } = await asset(name, 'png');
  const metadata = await sharp(source).metadata();
  assert.equal(metadata.format, 'png');
  assert.equal(metadata.depth, 'uchar', `Review higher-bit-depth image manually: ${name}`);
  assert.ok(!metadata.pages || metadata.pages === 1, `Review animated image manually: ${name}`);
  assert.ok(!metadata.orientation || metadata.orientation === 1, `Review rotated image manually: ${name}`);
  const decodedSource = await rgb(source);
  let output;
  let score;
  let encoding;
  const previous = priorRecords.get(name);
  if (previous) {
    assert.equal(hash(source), previous.originalSha256, `Source changed since previous run: ${name}`);
    output = (await asset(name, 'webp')).bytes;
    if (hash(output) === previous.webpSha256) {
      score = psnr(decodedSource, await rgb(output));
      encoding = previous.encoding;
    } else {
      // An interrupted upgrade can leave a stale report. Re-encode the unchanged
      // source and accept only an EXACT match below; arbitrary edits still fail.
      output = undefined;
    }
  }
  for (const preset of presets) {
    if (output && score >= 41) break;
    output = await sharp(source).keepIccProfile().webp(preset).toBuffer();
    const decodedOutput = await rgb(output);
    score = psnr(decodedSource, decodedOutput);
    encoding = preset;
    if (score >= 41) break;
  }
  assert.ok(score >= 41, `Quality check failed: ${name}`);
  const result = await sharp(output).metadata();
  assert.equal(result.format, 'webp');
  assert.equal(result.width, metadata.width);
  assert.equal(result.height, metadata.height);
  assert.equal(result.hasAlpha, metadata.hasAlpha);
  await verifyAlpha(source, output, metadata.hasAlpha);
  assert.ok(output.length < source.length, `Conversion increased storage: ${name}`);
  const target = path.resolve(catalog, `${name}.webp`);
  // Never silently replace a hand-edited output. Repeated runs accept identical bytes only.
  try {
    await writeFile(target, output, { flag: 'wx' });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const currentHash = hash((await asset(name, 'webp')).bytes);
    if (currentHash !== hash(output)) {
      assert.equal(currentHash, previous?.webpSha256, `Existing output differs: ${name}`);
      await writeFile(target, output); // Only replace the exact recorded output of a prior run.
    }
  }
  return { name, width: result.width, height: result.height, originalBytes: source.length,
    webpBytes: output.length, originalSha256: hash(source), originalGitBlob: gitBlob(source),
    webpSha256: hash(output), psnr: +score.toFixed(4), encoding };
}

if (mode === '--apply') {
  const records = [];
  let next = 0;
  // Bounded workers avoid using all server/laptop memory during an optional offline build step.
  await Promise.all(Array.from({ length: 3 }, async () => {
    while (next < names.length) {
      const name = names[next++];
      records.push(await convert(name));
      if (records.length % 50 === 0) console.log(`Converted and verified ${records.length}/${names.length}`);
    }
  }));
  records.sort((a, b) => a.name.localeCompare(b.name));
  assert.equal(new Set(records.map((record) => record.webpSha256)).size, records.length, 'Images must stay unique');
  const originalBytes = records.reduce((sum, record) => sum + record.originalBytes, 0);
  const webpBytes = records.reduce((sum, record) => sum + record.webpBytes, 0);
  const report = { generatedAt: new Date().toISOString(), encoder: sharp.versions, count: records.length,
    originalBytes, webpBytes, reductionPercent: +(100 * (1 - webpBytes / originalBytes)).toFixed(2),
    qualityMetric: 'RGB PSNR in dB, minimum 41; alpha verified separately',
    minPsnr: Math.min(...records.map((record) => record.psnr)), records };
  await saveReport(report);
  console.log(JSON.stringify({ ...report, records: undefined }, null, 2));
  console.log('Original PNGs retained. Review visuals and the report before --remove-originals.');
} else {
  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  assert.equal(report.count, names.length);
  assert.deepEqual(report.records.map((record) => record.name).sort(), [...names].sort());
  assert.equal(execFileSync('git', ['rev-parse', '--show-object-format'], { cwd: root, encoding: 'utf8' }).trim(), 'sha1');
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const tree = execFileSync('git', ['ls-tree', '-r', '-z', commit, '--', relativeCatalog], { cwd: root, encoding: 'utf8' });
  const committed = new Map(tree.split('\0').filter(Boolean).map((entry) => {
    const [header, filename] = entry.split('\t');
    return [filename, header.split(' ')[2]];
  }));
  const removals = [];
  // Validate EVERY source/replacement and committed recovery copy before deleting ANY source.
  for (const record of report.records) {
    const original = await asset(record.name, 'png');
    const optimized = await asset(record.name, 'webp');
    assert.equal(hash(original.bytes), record.originalSha256, `Original changed: ${record.name}`);
    assert.equal(gitBlob(original.bytes), committed.get(`${relativeCatalog}/${record.name}.png`), `No identical committed backup: ${record.name}`);
    assert.equal(hash(optimized.bytes), record.webpSha256, `Optimized image changed: ${record.name}`);
    const result = await sharp(optimized.bytes).metadata();
    assert.equal(result.format, 'webp');
    assert.equal(result.width, record.width);
    assert.equal(result.height, record.height);
    const sourceMetadata = await sharp(original.bytes).metadata();
    assert.equal(result.hasAlpha, sourceMetadata.hasAlpha);
    await verifyAlpha(original.bytes, optimized.bytes, sourceMetadata.hasAlpha);
    const score = psnr(await rgb(original.bytes), await rgb(optimized.bytes));
    assert.ok(score >= 41, `Quality changed: ${record.name}`);
    removals.push({ filename: original.filename, hash: record.originalSha256 });
    if (removals.length % 100 === 0) console.log(`Rechecked ${removals.length}/${names.length} committed originals and replacements; no deletion yet`);
  }
  report.originalsRecoveryCommit = commit;
  await saveReport(report);
  for (const removal of removals) {
    assert.equal(hash(await readFile(removal.filename)), removal.hash, 'Original changed during verification');
    await unlink(removal.filename); // Exact allowlisted files only; never recursive.
  }
  console.log(`Replaced ${removals.length} PNG files. Identical originals remain recoverable from Git commit ${commit}.`);
}

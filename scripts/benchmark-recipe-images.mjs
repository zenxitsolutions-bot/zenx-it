import sharp from 'sharp';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const inputDir = resolve('zenx-wellness/client/public/images/recipe-catalog');
const outputDir = resolve('.local/image-optimization');
await mkdir(outputDir, { recursive: true });
const samples = ['0001-banana-oats-smoothie', '0041-palak-paneer', '0055-vegetable-salad', '0079-healthy-chicken-biryani'];
const presets = {
  lossless: { lossless: true, effort: 6 },
  near80: { nearLossless: true, quality: 80, effort: 6 },
  near60: { nearLossless: true, quality: 60, effort: 6 },
  photo94: { quality: 94, smartSubsample: true, effort: 6 },
};
for (const name of samples) {
  const source = await readFile(resolve(inputDir, `${name}.png`));
  const rawSource = await sharp(source).raw().toBuffer();
  for (const [preset, options] of Object.entries(presets)) {
    const started = Date.now();
    const target = resolve(outputDir, `${name}-${preset}.webp`);
    const result = await sharp(source).webp(options).toFile(target);
    const rawResult = await sharp(target).raw().toBuffer();
    let squaredError = 0;
    let maxError = 0;
    for (let i = 0; i < rawSource.length; i++) {
      const diff = Math.abs(rawSource[i] - rawResult[i]);
      squaredError += diff * diff;
      maxError = Math.max(maxError, diff);
    }
    console.log(JSON.stringify({ name, preset, sourceBytes: source.length, outputBytes: result.size,
      reductionPercent: +(100 * (1 - result.size / source.length)).toFixed(1),
      maxChannelError: maxError, psnr: squaredError ? +(10 * Math.log10(255 ** 2 / (squaredError / rawSource.length))).toFixed(2) : 'identical', ms: Date.now() - started }));
  }
}

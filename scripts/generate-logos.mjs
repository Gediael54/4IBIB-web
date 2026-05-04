import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = process.cwd();
const SOURCE = resolve(ROOT, "assets/logo-betel-2026.png");

const TARGETS = [
  { size: 16, files: ["apps/site/public/favicon-16.png", "apps/admin/public/favicon-16.png"] },
  { size: 32, files: ["apps/site/public/favicon-32.png", "apps/admin/public/favicon-32.png"] },
  { size: 180, files: ["apps/site/public/apple-touch-icon.png"] },
  { size: 192, files: ["apps/site/public/logo-192.png"] },
  { size: 512, files: ["apps/site/public/logo.png", "apps/admin/public/logo.png"] }
];

for (const target of TARGETS) {
  const buffer = await sharp(SOURCE)
    .resize(target.size, target.size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, quality: 90 })
    .toBuffer();

  for (const relPath of target.files) {
    const out = resolve(ROOT, relPath);
    await mkdir(resolve(out, ".."), { recursive: true });
    await sharp(buffer).toFile(out);
    console.log(
      `Generated ${relPath} (${target.size}x${target.size}, ${(buffer.length / 1024).toFixed(1)} kB)`
    );
  }
}

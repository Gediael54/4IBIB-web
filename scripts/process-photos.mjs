#!/usr/bin/env node
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const photos = resolve(root, "assets/photos");
const out = resolve(root, "apps/site/public");

await mkdir(out, { recursive: true });

const baseGrade = (image) =>
  image
    .modulate({ brightness: 1.04, saturation: 0.88 })
    .recomb([
      [1.04, 0.04, -0.02],
      [0.02, 1.0, -0.04],
      [-0.02, 0.0, 0.94]
    ])
    .sharpen({ sigma: 0.6 });

const jobs = [
  {
    name: "hero",
    src: "corrida-grupo-fachada-igreja.jpg",
    desktop: {
      width: 2400,
      height: 1350,
      left: 30,
      top: 570,
      width_src: 1020,
      height_src: 580,
      position: "center"
    },
    mobile: {
      width: 1200,
      height: 700,
      left: 30,
      top: 570,
      width_src: 1020,
      height_src: 580,
      position: "center"
    }
  },
  {
    name: "intro",
    src: "culto-homem-lendo-biblia-perfil.jpg",
    desktop: { width: 1400, height: 1750, mode: "portrait" }
  },
  {
    name: "gallery-worship",
    src: "culto-oracao-jovem-cruz-templo.jpg",
    desktop: { width: 800, height: 1000, mode: "portrait" }
  },
  {
    name: "gallery-prayer",
    src: "culto-oracao-mulher-camiseta-joao114.jpg",
    desktop: { width: 800, height: 1000, mode: "portrait" }
  },
  {
    name: "gallery-missions",
    src: "evangelismo-mae-bebe-biblia.jpg",
    desktop: { width: 800, height: 1000, mode: "portrait" }
  },
  {
    name: "gallery-community",
    src: "corrida-abraco-trio-portao.jpg",
    desktop: { width: 800, height: 1000, mode: "portrait" }
  },
  {
    name: "gallery-fellowship",
    src: "evangelismo-mulheres-mesa-ar-livre.jpg",
    desktop: { width: 800, height: 1000, mode: "portrait" }
  }
];

for (const job of jobs) {
  const srcPath = resolve(photos, job.src);
  const meta = await sharp(srcPath).metadata();
  console.log(`\n${job.name} <- ${job.src} (${meta.width}x${meta.height})`);

  const variants = [["", "desktop"]];
  if (job.mobile) variants.push(["-mobile", "mobile"]);

  for (const [suffix, size] of variants) {
    const cfg = job[size];
    let pipe = sharp(srcPath);

    if (cfg.height_src && cfg.top !== undefined) {
      pipe = pipe.extract({
        left: cfg.left ?? 0,
        top: cfg.top,
        width: cfg.width_src ?? meta.width,
        height: Math.min(cfg.height_src, meta.height - cfg.top)
      });
    }

    pipe = pipe.resize(cfg.width, cfg.height, {
      fit: "cover",
      position: cfg.position ?? (cfg.mode === "portrait" ? "center" : "top")
    });

    pipe = baseGrade(pipe);

    const outFile = resolve(out, `${job.name}${suffix}.jpg`);
    await pipe.jpeg({ quality: 84, progressive: true, mozjpeg: true }).toFile(outFile);
    const outMeta = await sharp(outFile).metadata();
    console.log(
      `  -> ${outFile.replace(root + "/", "")} (${outMeta.width}x${outMeta.height}, ${(outMeta.size / 1024).toFixed(0)} KB)`
    );
  }
}

console.log("\nDone.");

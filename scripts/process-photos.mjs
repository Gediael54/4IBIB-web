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

const vibrantGrade = (image) =>
  image
    .modulate({ brightness: 1.06, saturation: 1.28 })
    .linear(1.12, -12)
    .recomb([
      [1.08, 0.06, -0.02],
      [0.03, 1.04, -0.04],
      [-0.05, 0.0, 0.96]
    ])
    .sharpen({ sigma: 0.9 });

const jobs = [
  {
    name: "hero",
    src: "fachada-igreja-dia.png",
    grade: "vibrant",
    desktop: {
      width: 2400,
      height: 1350,
      left: 60,
      top: 1050,
      width_src: 1440,
      height_src: 809,
      position: "center"
    },
    mobile: {
      width: 1200,
      height: 700,
      left: 60,
      top: 1050,
      width_src: 1440,
      height_src: 809,
      position: "center"
    }
  },
  {
    name: "intro",
    src: "pororoca-aula-criancas-tenda.jpg",
    desktop: { width: 1400, height: 1750, mode: "portrait" }
  },
  {
    name: "gallery-worship",
    src: "fachada-igreja-noite-cruz-iluminada.jpg",
    desktop: { width: 800, height: 1000, mode: "portrait" }
  },
  {
    name: "gallery-prayer",
    src: "culto-oracao-joao114-vermelho.jpg",
    desktop: {
      width: 800,
      height: 1000,
      mode: "portrait",
      left: 20,
      top: 140,
      width_src: 650,
      height_src: 1590
    }
  },
  {
    name: "gallery-missions",
    src: "pororoca-evangelismo-violao-casa.jpg",
    desktop: {
      width: 800,
      height: 1000,
      mode: "portrait",
      left: 120,
      top: 300,
      width_src: 1200,
      height_src: 1500
    }
  },
  {
    name: "gallery-evangelismo-local",
    src: "evangelismo-local-visita-casa-missoes.jpg",
    desktop: { width: 800, height: 1000, mode: "portrait" }
  },
  {
    name: "gallery-community",
    src: "corrida-abraco-trio-portao.jpg",
    desktop: { width: 800, height: 1000, mode: "portrait" }
  },
  {
    name: "gallery-lado-a-lado",
    src: "corrida-casal-medalha.jpg",
    desktop: { width: 800, height: 1000, mode: "portrait" }
  },
  {
    name: "gallery-fellowship",
    src: "corrida-dia-dos-pais-grupo-fachada.jpg",
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

    pipe = job.grade === "vibrant" ? vibrantGrade(pipe) : baseGrade(pipe);

    const outFile = resolve(out, `${job.name}${suffix}.jpg`);
    await pipe.jpeg({ quality: 84, progressive: true, mozjpeg: true }).toFile(outFile);
    const outMeta = await sharp(outFile).metadata();
    console.log(
      `  -> ${outFile.replace(root + "/", "")} (${outMeta.width}x${outMeta.height}, ${(outMeta.size / 1024).toFixed(0)} KB)`
    );
  }
}

console.log("\nDone.");

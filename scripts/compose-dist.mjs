import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const outputDir = resolve(root, "dist");

await rm(outputDir, { recursive: true, force: true });
await mkdir(resolve(outputDir, "admin"), { recursive: true });
await cp(resolve(root, "apps/site/dist"), outputDir, { recursive: true });
await cp(resolve(root, "apps/admin/dist"), resolve(outputDir, "admin"), { recursive: true });

await writeFile(
  resolve(outputDir, "_redirects"),
  ["/admin/* /admin/index.html 200", "/* /index.html 200", ""].join("\n")
);

console.log("dist generated for Cloudflare Pages");

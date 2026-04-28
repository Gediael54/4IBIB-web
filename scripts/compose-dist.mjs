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

await writeFile(
  resolve(outputDir, "_headers"),
  [
    "/index.html",
    "  Cache-Control: public, max-age=0, must-revalidate",
    "/admin/index.html",
    "  Cache-Control: public, max-age=0, must-revalidate",
    "/assets/*",
    "  Cache-Control: public, max-age=31536000, immutable",
    "/admin/assets/*",
    "  Cache-Control: public, max-age=31536000, immutable",
    ""
  ].join("\n")
);

console.log("dist generated for Cloudflare Pages");

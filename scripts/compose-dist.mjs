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
    "/*",
    "  Content-Security-Policy: default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://i.ytimg.com https://*.ytimg.com; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.us.sentry.io; frame-src https://challenges.cloudflare.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests",
    "  X-Frame-Options: DENY",
    "  X-Content-Type-Options: nosniff",
    "  Referrer-Policy: strict-origin-when-cross-origin",
    "  Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()",
    "  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload",
    "  Cross-Origin-Opener-Policy: same-origin",
    "  Cross-Origin-Resource-Policy: same-site",
    "  X-XSS-Protection: 0",
    "/admin/*",
    "  X-Robots-Tag: noindex, nofollow",
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

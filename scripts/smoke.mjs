import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");

let failed = 0;
const pass = (msg) => console.log("✓ " + msg);
const fail = (msg) => {
  console.error("✗ " + msg);
  failed++;
};

if (!existsSync(dist)) {
  fail("dist/ does not exist - run `npm run build` first");
  process.exit(1);
}

const fileChecks = [
  {
    file: "dist/index.html",
    markers: ["4a Igreja Batista", '<div id="root">', '<link rel="canonical"']
  },
  {
    file: "dist/admin/index.html",
    markers: ["Painel Admin", '<div id="root">', "noindex"]
  },
  {
    file: "dist/_headers",
    markers: ["Content-Security-Policy", "X-Content-Type-Options"]
  },
  {
    file: "dist/_redirects",
    markers: ["/index.html", "/admin/"]
  },
  {
    file: "dist/robots.txt",
    markers: ["User-agent"],
    optional: true
  }
];

for (const check of fileChecks) {
  const path = resolve(root, check.file);
  if (!existsSync(path)) {
    if (check.optional) {
      console.log(`- ${check.file} (skipped, optional)`);
    } else {
      fail(`missing ${check.file}`);
    }
    continue;
  }
  const content = readFileSync(path, "utf8");
  let ok = true;
  for (const marker of check.markers) {
    if (!content.includes(marker)) {
      fail(`${check.file} missing marker: ${marker}`);
      ok = false;
    }
  }
  if (ok) pass(check.file);
}

const assetsDir = resolve(dist, "assets");
if (!existsSync(assetsDir)) {
  fail("dist/assets/ missing");
} else {
  const assets = readdirSync(assetsDir);
  const jsBundles = assets.filter((file) => file.endsWith(".js"));
  if (jsBundles.length === 0) {
    fail("no JS bundles in dist/assets/");
  } else {
    let allOk = true;
    for (const bundle of jsBundles) {
      const stats = statSync(resolve(assetsDir, bundle));
      if (stats.size === 0) {
        fail(`empty bundle: assets/${bundle}`);
        allOk = false;
      }
    }
    if (allOk) pass(`${jsBundles.length} JS bundle(s) in site, all non-empty`);
  }
}

const adminAssetsDir = resolve(dist, "admin/assets");
if (!existsSync(adminAssetsDir)) {
  fail("dist/admin/assets/ missing");
} else {
  const adminAssets = readdirSync(adminAssetsDir);
  const adminJs = adminAssets.filter((file) => file.endsWith(".js"));
  if (adminJs.length === 0) {
    fail("no JS bundles in dist/admin/assets/");
  } else {
    pass(`${adminJs.length} JS bundle(s) in admin`);
  }
}

const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
  ".xml": "application/xml",
  ".txt": "text/plain",
  ".json": "application/json"
};

const port = 4178;
const server = createServer((req, res) => {
  let url = (req.url ?? "/").split("?")[0];
  if (url.endsWith("/")) url += "index.html";
  const filePath = resolve(dist, url.replace(/^\//, ""));
  if (!filePath.startsWith(dist) || !existsSync(filePath)) {
    res.writeHead(404).end("not found");
    return;
  }
  const ext = extname(filePath);
  res.writeHead(200, { "content-type": mime[ext] ?? "application/octet-stream" });
  res.end(readFileSync(filePath));
});

await new Promise((resolveListen) => server.listen(port, resolveListen));

const httpRoutes = [
  { route: "/", needs: ['<div id="root">', "4a Igreja Batista"] },
  { route: "/admin/", needs: ['<div id="root">', "Painel Admin"] },
  { route: "/favicon-32.png", needs: [], status: 200 }
];

try {
  for (const { route, needs, status = 200 } of httpRoutes) {
    const url = `http://localhost:${port}${route}`;
    const response = await fetch(url);
    if (response.status !== status) {
      fail(`${route} returned ${response.status}, expected ${status}`);
      continue;
    }
    if (needs.length === 0) {
      pass(`HTTP ${status} ${route}`);
      continue;
    }
    const body = await response.text();
    let ok = true;
    for (const marker of needs) {
      if (!body.includes(marker)) {
        fail(`${route} body missing marker: ${marker}`);
        ok = false;
      }
    }
    if (ok) pass(`HTTP 200 ${route} with markers`);
  }
} finally {
  server.close();
}

if (failed > 0) {
  console.error(`\n${failed} smoke check(s) failed`);
  process.exit(1);
}
console.log("\nSmoke OK");

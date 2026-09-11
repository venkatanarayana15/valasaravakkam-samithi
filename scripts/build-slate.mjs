/**
 * Slate static build (nextplan.md Phase 3/5).
 *
 * `src/app/api/*` route handlers are DEV-ONLY infrastructure (local proxy to
 * the admin server / Catalyst). They use request-time APIs that cannot be
 * statically exported, so this script moves them aside for the export build
 * and restores them afterwards — always, via finally.
 *
 * Usage: npm run build:slate
 * Env:   NEXT_PUBLIC_FUNCTION_URL=https://<project>.catalystserverless.com/server/site-api/execute
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const API_DIR = path.join(ROOT, "src", "app", "api");
const STASH_DIR = path.join(ROOT, ".slate-api-stash");

function moveDir(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.renameSync(src, dest);
}

async function main() {
  // On Slate's nextjs runtime the build runs as `npm run build:slate` but the
  // platform expects a standard Next.js SSR build (.next), not a static export
  // (out/). Detect Slate by its build directory and do a normal SSR build
  // there; locally keep the static export for `out/` verification.
  const isSlate = fs.existsSync("/catalyst") || process.env.SLATE === "1";
  const hadApi = fs.existsSync(API_DIR);
  try {
    for (const dir of [path.join(ROOT, ".next"), path.join(ROOT, "out")]) {
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    }
    if (isSlate) {
      console.log("[build:slate] Slate nextjs detected — running SSR build (no export, no api stash)");
      execSync("npx next build", { cwd: ROOT, stdio: "inherit" });
      console.log("[build:slate] SSR build ready in .next — Slate nextjs adapter will deploy it");
      return;
    }
    // Local static-export path (verifies out/ content for SEO pre-render).
    if (hadApi) {
      if (fs.existsSync(STASH_DIR)) fs.rmSync(STASH_DIR, { recursive: true, force: true });
      moveDir(API_DIR, STASH_DIR);
      console.log("[build:slate] stashed dev-only src/app/api");
    }
    execSync("npx next build", {
      cwd: ROOT,
      stdio: "inherit",
      env: { ...process.env, NEXT_STATIC_EXPORT: "1" },
    });
    console.log("[build:slate] static export ready in ./out — deploy it to the Slate app.");
  } finally {
    if (hadApi && fs.existsSync(STASH_DIR)) {
      if (fs.existsSync(API_DIR)) fs.rmSync(API_DIR, { recursive: true, force: true });
      moveDir(STASH_DIR, API_DIR);
      console.log("[build:slate] restored src/app/api");
    }
  }
}

main().catch((e) => {
  console.error("[build:slate] FAILED:", e.message);
  process.exit(1);
});

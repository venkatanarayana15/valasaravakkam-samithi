import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
// Overridable so tests (and split-disk deployments) can relocate the runtime
// stores without touching the code. Defaults preserve the original layout.
const DATA_DIR = process.env.ADMIN_DATA_DIR || path.join(__dirname, "data");
const UPLOAD_DIR = process.env.ADMIN_UPLOAD_DIR || path.join(__dirname, "uploads");
const PUBLIC_DIR = path.join(__dirname, "public");

// Shared-secret gate for mutations AND private reads. Run with
// ADMIN_TOKEN=<long-random-string> in any shared/production environment.
// Empty = open (local dev only — the server prints a loud warning).
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";

// Collections containing personal data. They are never included in the
// public /api/site aggregate and are only readable WITH the admin token.
// (The public website does not render them; they are managed in the CMS.)
const PII_COLLECTIONS = new Set(["members", "balvikas"]);

function authorized(req) {
  if (!ADMIN_TOKEN) return true; // local dev mode
  const header = req.headers["authorization"] || "";
  const given = Buffer.from(header);
  const expected = Buffer.from(`Bearer ${ADMIN_TOKEN}`);
  if (given.length !== expected.length) return false;
  return crypto.timingSafeEqual(given, expected);
}

const COLLECTIONS = [
  "siteconfig",
  "events",
  "services",
  "coordinators",
  "gallery",
  "stats",
  "members",
  "balvikas",
  "activities",
  "about",
  "homegallery",
];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

// ---------------------------------------------------------------------------
// Startup: make sure the runtime dirs exist and seed on a fresh clone so a
// missing data file can never take the whole site down.
// ---------------------------------------------------------------------------
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const hasAnyData = COLLECTIONS.some((name) => fs.existsSync(path.join(DATA_DIR, `${name}.json`)));
if (!hasAnyData) {
  try {
    await import("./seed.mjs");
    console.log("[admin] data dir was empty — seeded from seed.mjs");
  } catch (err) {
    console.error("[admin] auto-seed failed:", err.message);
  }
}

function fileFor(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function readCollection(name) {
  const file = fileFor(name);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    // Never silently swallow: a corrupt file must be visible in the logs.
    console.error(`[admin] FAILED to parse ${name}.json — serving it as missing. ${err.message}`);
    return null;
  }
}

/**
 * Atomic write: dump to a temp file in the same directory, fsync, then rename
 * over the target. A crash mid-write can no longer corrupt a collection.
 */
function writeCollection(name, data) {
  const file = fileFor(name);
  const tmp = path.join(DATA_DIR, `.${name}.json.tmp-${process.pid}`);
  const payload = JSON.stringify(data, null, 2);
  const fd = fs.openSync(tmp, "w");
  try {
    fs.writeFileSync(fd, payload);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, file);
}

function send(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

// ---------------------------------------------------------------------------
// Dev-only multi-tenant parity API (mirrors Catalyst function endpoints so
// the SaaS admin UI runs end-to-end locally). Sessions + theme are in-memory.
// ---------------------------------------------------------------------------
const devSessions = new Map(); // token -> { samithi_id, name, role, expires }
let devThemeValue = "theme-1";
const DEV_THEMES = ["theme-1", "theme-2", "theme-3", "theme-4", "theme-5"];
function devTheme() {
  return devThemeValue;
}

function devSession(req) {
  // Same transport as production (X-Session-Token, never Authorization).
  const token = (req.headers["x-session-token"] || "").trim();
  if (!token) return null;
  const s = devSessions.get(token);
  if (!s || s.expires < Date.now()) {
    devSessions.delete(token);
    return null;
  }
  return s;
}

async function handleDevApi(req, res, pathname) {
  const needAuth =
    pathname.startsWith("/api/content") ||
    pathname === "/api/samithi" ||
    pathname === "/api/convenors" ||
    pathname === "/api/audit" ||
    pathname === "/api/messages";
  let me = null;
  if (needAuth) {
    me = devSession(req);
    // Legacy bridge: a valid ADMIN_TOKEN bearer also passes in dev.
    if (!me && authorized(req) && ADMIN_TOKEN) {
      me = { samithi_id: "valasaravakkam", name: "Dev Owner", role: "owner", expires: Date.now() + 12 * 60 * 60 * 1000 };
    }
    if (!me) {
      send(res, 401, { error: "missing session" });
      return;
    }
  }

  // POST /api/auth/login {login, password} — dev owner when password matches
  // ADMIN_TOKEN (or anything non-empty when no token is configured: localhost).
  if (req.method === "POST" && pathname === "/api/auth/login") {
    const body = await readBody(req).then((b) => { try { return JSON.parse(b.toString("utf8")); } catch { return {}; } });
    const login = String(body.login || "").trim();
    const password = String(body.password || "");
    const ok = login && password && (ADMIN_TOKEN ? password === ADMIN_TOKEN : true);
    if (!ok) {
      send(res, 401, { error: "invalid login or password" });
      return;
    }
    const token = crypto.randomBytes(32).toString("hex");
    devSessions.set(token, { samithi_id: "valasaravakkam", name: login, role: "owner", expires: Date.now() + 12 * 60 * 60 * 1000 });
    send(res, 200, { token, samithi_id: "valasaravakkam", name: login, role: "owner" });
    return;
  }
  if (req.method === "GET" && pathname === "/api/auth/me") {
    const s = devSession(req);
    if (!s) {
      send(res, 401, { error: "invalid or expired session" });
      return;
    }
    send(res, 200, { login: "dev", name: s.name, samithi_id: s.samithi_id, role: s.role });
    return;
  }
  if (req.method === "POST" && pathname === "/api/auth/logout") {
    const t = (req.headers["x-session-token"] || "").trim();
    if (t) devSessions.delete(t);
    send(res, 200, { ok: true });
    return;
  }
  if (req.method === "POST" && pathname === "/api/auth/change-password") {
    send(res, 501, { error: "dev only: restart the server with a new ADMIN_TOKEN" });
    return;
  }

  // GET /api/content — full editable payload (same shape as /api/site).
  if (req.method === "GET" && pathname === "/api/content") {
    const data = getSiteData(true);
    const sc = (data.siteconfig && data.siteconfig.siteConfig) || {};
    data.samithi = { slug: "valasaravakkam", name: sc.name || "Valasaravakkam Samithi", district: "Chennai", theme: devTheme(), status: "active" };
    send(res, 200, data);
    return;
  }

  // PUT /api/content/:collection — replace this tenant's rows.
  const cm = pathname.match(/^\/api\/content\/([^/]+)$/);
  if (req.method === "PUT" && cm) {
    const collection = cm[1];
    const body = await readBody(req).then((b) => { try { return JSON.parse(b.toString("utf8")); } catch { return {}; } });
    const simple = { events: 1, services: 1, coordinators: 1, stats: 1, activities: 1, homegallery: 1 };
    if (simple[collection]) {
      if (!Array.isArray(body.items)) {
        send(res, 400, { error: "items must be an array" });
        return;
      }
      writeCollection(collection, body.items);
      send(res, 200, { ok: true, length: body.items.length });
      return;
    }
    if (collection === "gallery") {
      if (!Array.isArray(body.categories)) {
        send(res, 400, { error: "categories must be an array" });
        return;
      }
      // Local gallery.json keeps images inline per folder (same as the SPA store).
      let imgCount = 0;
      writeCollection("gallery", body.categories.map((c) => {
        const images = Array.isArray(c.images) ? c.images.filter((img) => img && img.src).map((img) => ({
          src: String(img.src).slice(0, 1000),
          title: String(img.title || "").slice(0, 128),
          description: String(img.description || "").slice(0, 1000),
        })) : [];
        imgCount += images.length;
        return {
          slug: c.slug,
          label: c.label || c.slug,
          icon: c.icon || "fa-om",
          description: c.description || "",
          images,
        };
      }));
      send(res, 200, { ok: true, categories: body.categories.length, images: imgCount });
      return;
    }
    if (collection === "about") {
      if (!Array.isArray(body.sections)) {
        sendJsonSafe(res, 400, { error: "sections must be an array" });
        return;
      }
      writeCollection("about", body.sections.map((s) => ({ heading: s.heading || "", items: s.items || [] })));
      send(res, 200, { ok: true, length: body.sections.length });
      return;
    }
    if (collection === "siteconfig") {
      const cur = readCollection("siteconfig") || {};
      const next = {
        siteConfig: { ...(cur.siteConfig || {}), ...(body.siteConfig || {}) },
        socialLinks: Array.isArray(body.socialLinks) ? body.socialLinks : cur.socialLinks || [],
      };
      if (cur.navLinks) next.navLinks = cur.navLinks;
      writeCollection("siteconfig", next);
      send(res, 200, { ok: true });
      return;
    }
    send(res, 404, { error: "Not found" });
    return;
  }

  // PUT /api/samithi {theme,...} — dev theme switch (in-memory).
  if (req.method === "PUT" && pathname === "/api/samithi") {
    const body = await readBody(req).then((b) => { try { return JSON.parse(b.toString("utf8")); } catch { return {}; } });
    if (body.theme !== undefined) {
      if (!DEV_THEMES.includes(body.theme)) {
        send(res, 400, { error: "unknown theme" });
        return;
      }
      devThemeValue = body.theme;
    }
    send(res, 200, { ok: true, theme: devThemeValue });
    return;
  }

  if (req.method === "GET" && pathname === "/api/samithis") {
    const sc = ((readCollection("siteconfig") || {}).siteConfig) || {};
    send(res, 200, { samithis: [{ slug: "valasaravakkam", name: sc.name || "Valasaravakkam Samithi", district: "Chennai" }] });
    return;
  }
  if (req.method === "GET" && pathname === "/api/convenors") {
    send(res, 200, { convenors: [{ id: "dev-owner", samithi_id: "valasaravakkam", name: "Dev Owner", login: "dev", email: "", role: "owner", active: true, last_login: "" }] });
    return;
  }
  if (req.method === "GET" && (pathname === "/api/audit" || pathname === "/api/messages")) {
    send(res, 200, pathname === "/api/audit" ? { entries: [] } : { messages: [] });
    return;
  }
  if (
    (req.method === "POST" && (pathname === "/api/samithis" || pathname === "/api/convenors")) ||
    (req.method === "PUT" && (pathname.startsWith("/api/samithis/") || pathname.startsWith("/api/convenors/")))
  ) {
    send(res, 501, { error: "dev server cannot provision tenants — use production" });
    return;
  }
  send(res, 404, { error: "Not found" });
}

function sendJsonSafe(res, status, body) {
  send(res, status, body);
}

function readBody(req, limit = 5 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function sanitizeFilename(name) {
  const base = path.basename(name || "").replace(/[^\w.\-]/g, "_");
  if (!base || base === "." || base === "..") return `upload-${Date.now()}.bin`;
  return base;
}

/**
 * Path containment that cannot be fooled by sibling directories
 * (startsWidth(dir) alone accepts e.g. "uploads2"). The resolved path must
 * live strictly INSIDE the base directory.
 */
function isInside(baseDir, resolved) {
  const rel = path.relative(baseDir, resolved);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

function getSiteData(includePrivate) {
  const out = {};
  for (const name of COLLECTIONS) {
    if (!includePrivate && PII_COLLECTIONS.has(name)) continue;
    const data = readCollection(name);
    if (data !== null) out[name] = data;
  }
  return out;
}

const server = http.createServer(async (req, res) => {
  try {
    // Decode INSIDE the try: a malformed escape sequence like /api/%zz must
    // return 400 — not crash the whole process.
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host || "localhost"}`).pathname);
    } catch {
      send(res, 400, { error: "Malformed URL" });
      return;
    }

    // ---- Private collections: every read needs the token ----
    if (PII_COLLECTIONS.has(pathname.replace("/api/", "").split("/")[0]) && pathname.startsWith("/api/")) {
      if (!authorized(req)) {
        send(res, 401, { error: "Unauthorized: personal-data collections require the admin token" });
        return;
      }
    }

    // ---- Mutation gate: every non-GET /api/* needs the admin token ----
    // EXCEPT POST /api/auth/login, which is public by design (it *issues*
    // sessions), and requests carrying a valid dev session (SaaS login).
    // NOTE: devSession() is declared below but hoisted — safe at request time.
    if (req.method !== "GET" && pathname.startsWith("/api/") && pathname !== "/api/auth/login" && !devSession(req)) {
      if (!authorized(req)) {
        send(res, 401, { error: "Unauthorized: valid admin token required" });
        return;
      }
    }

    // ---- Static admin UI ----
    if (req.method === "GET" && pathname.startsWith("/_ui/")) {
      const rel = pathname.replace("/_ui/", "");
      const file = path.resolve(PUBLIC_DIR, rel);
      if (!isInside(PUBLIC_DIR, file) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const ext = path.extname(file).toLowerCase();
      res.writeHead(200, {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      fs.createReadStream(file).pipe(res);
      return;
    }

    // ---- Health ----
    if (req.method === "GET" && pathname === "/api/health") {
      send(res, 200, { ok: true });
      return;
    }

    // ---- Site aggregate (public — PII collections are excluded) ----
    // Dev parity with the multi-tenant function: honors ?samithi=. The local
    // JSON store holds exactly one tenant (valasaravakkam), so that slug (or
    // no slug) serves the aggregate; any other slug 404s like production.
    if (req.method === "GET" && pathname === "/api/site") {
      let slug = "valasaravakkam";
      try {
        const q = new URL(req.url, `http://${req.headers.host || "localhost"}`).searchParams.get("samithi");
        if (q !== null) slug = q.toLowerCase().trim();
      } catch {
        send(res, 400, { error: "Malformed URL" });
        return;
      }
      if (!/^[a-z0-9-]{1,64}$/.test(slug) || (slug !== "valasaravakkam")) {
        send(res, 404, { error: "unknown samithi" });
        return;
      }
      const data = getSiteData(false);
      const sc = (data.siteconfig && data.siteconfig.siteConfig) || {};
      data.samithi = {
        slug: "valasaravakkam",
        name: sc.name || "Valasaravakkam Samithi",
        district: "Chennai",
        theme: devTheme(),
        status: "active",
      };
      send(res, 200, data);
      return;
    }

    // ---- Dev-only multi-tenant parity (mirrors the Catalyst function API)
    // Lets the SaaS admin UI run end-to-end locally without a deployment.
    // In-memory sessions + theme; never persisted, never production.
    if (pathname.startsWith("/api/auth/") || pathname.startsWith("/api/content") || pathname === "/api/samithi" || pathname === "/api/samithis" || pathname === "/api/convenors" || pathname === "/api/audit" || pathname === "/api/messages") {
      handleDevApi(req, res, pathname);
      return;
    }

    // ---- Upload image — per-samithi isolated (dev parity with Stratus) ----
    if (req.method === "POST" && pathname === "/api/upload") {
      // Determine target samithi for isolation (same rules as the Catalyst function).
      let targetSamithi = "valasaravakkam";
      const sess = devSession(req);
      if (sess) {
        if (sess.role === "owner") {
          let q = null;
          try {
            q = new URL(req.url, `http://${req.headers.host || "localhost"}`).searchParams.get("samithi");
          } catch {}
          const h = req.headers["x-samithi-id"];
          const want = (q || h || "").toString().toLowerCase().trim();
          if (want) {
            if (!/^[a-z0-9-]{1,64}$/.test(want)) {
              send(res, 400, { error: "invalid samithi" });
              return;
            }
            targetSamithi = want;
          } else {
            send(res, 400, { error: "samithi context required for owner upload" });
            return;
          }
        } else {
          targetSamithi = sess.samithi_id || "valasaravakkam";
        }
      }
      const filename = sanitizeFilename(req.headers["x-filename"] || req.headers["x_filename"] || "");
      const ext = path.extname(filename).toLowerCase();
      const allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
      if (!allowed.includes(ext)) {
        send(res, 400, { error: "Only jpg/jpeg/png/gif/webp allowed (SVG is rejected for security)" });
        return;
      }
      const body = await readBody(req);
      if (body.length === 0) {
        send(res, 400, { error: "empty file" });
        return;
      }
      if (body.length > 10 * 1024 * 1024) {
        send(res, 400, { error: "file too large (max 10MB)" });
        return;
      }
      const magicOk =
        (ext === ".png" && body.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) ||
        (ext === ".gif" && body.subarray(0, 3).toString("latin1") === "GIF") ||
        (ext === ".jpg" && body[0] === 0xff && body[1] === 0xd8) ||
        (ext === ".jpeg" && body[0] === 0xff && body[1] === 0xd8) ||
        (ext === ".webp" && body.subarray(0, 4).toString("latin1") === "RIFF");
      if (!magicOk) {
        send(res, 400, { error: "File content does not match its extension" });
        return;
      }
      const name = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
      const dir = path.join(UPLOAD_DIR, targetSamithi);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, name), body);
      send(res, 200, { url: `/uploads/${targetSamithi}/${name}`, filename: name, samithi_id: targetSamithi });
      return;
    }

    // ---- Serve uploaded images (with hardening headers) ----
    if (req.method === "GET" && pathname.startsWith("/uploads/")) {
      const rel = pathname.replace("/uploads/", "");
      const file = path.resolve(UPLOAD_DIR, rel);
      if (!isInside(UPLOAD_DIR, file) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const ext = path.extname(file).toLowerCase();
      res.writeHead(200, {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        // Defense in depth for anything browser-interpretable:
        "Content-Security-Policy": "sandbox; default-src 'none'; script-src 'none';",
        "Content-Disposition": "attachment",
      });
      fs.createReadStream(file).pipe(res);
      return;
    }

    // ---- Collection CRUD: /api/:collection or /api/:collection/:index ----
    const match = pathname.match(/^\/api\/([^/]+)(?:\/([^/]+))?$/);
    if (match && req.method !== "GET") {
      const name = match[1];
      const index = match[2];
      if (!COLLECTIONS.includes(name)) {
        send(res, 404, { error: `Unknown collection: ${name}` });
        return;
      }

      if (req.method === "DELETE" && index !== undefined) {
        const current = readCollection(name);
        if (Array.isArray(current)) {
          const i = Number(index);
          if (!Number.isInteger(i) || i < 0 || i >= current.length) {
            send(res, 404, { error: "Index out of range" });
            return;
          }
          current.splice(i, 1);
          writeCollection(name, current);
          send(res, 200, { ok: true });
        } else {
          send(res, 400, { error: "Collection is not an array" });
        }
        return;
      }

      const body = await readBody(req);
      let payload = {};
      try {
        payload = JSON.parse(body.toString("utf8"));
      } catch {
        send(res, 400, { error: "Invalid JSON body" });
        return;
      }

      if (req.method === "PUT" && index === undefined) {
        writeCollection(name, payload);
        send(res, 200, { ok: true });
        return;
      }
      if (req.method === "POST" && index === undefined) {
        const current = readCollection(name);
        if (Array.isArray(current)) {
          current.push(payload);
          writeCollection(name, current);
          send(res, 200, { ok: true, length: current.length });
        } else {
          writeCollection(name, { ...(current || {}), ...payload });
          send(res, 200, { ok: true });
        }
        return;
      }
      if (req.method === "PUT" && index !== undefined) {
        const current = readCollection(name);
        if (Array.isArray(current)) {
          const i = Number(index);
          if (!Number.isInteger(i) || i < 0 || i >= current.length) {
            send(res, 404, { error: "Index out of range" });
            return;
          }
          current[i] = payload;
          writeCollection(name, current);
          send(res, 200, { ok: true });
        } else {
          writeCollection(name, { ...(current || {}), ...payload });
          send(res, 200, { ok: true });
        }
        return;
      }
    }

    // ---- GET collection (list). Private collections were already gated above. ----
    if (req.method === "GET" && pathname.startsWith("/api/")) {
      const name = pathname.replace("/api/", "");
      if (COLLECTIONS.includes(name)) {
        const data = readCollection(name);
        if (data === null) {
          send(res, 404, { error: `Collection not found: ${name}` });
        } else {
          send(res, 200, data);
        }
        return;
      }
    }

    // ---- Serve admin SPA ----
    if (req.method === "GET" && (pathname === "/" || pathname.startsWith("/admin"))) {
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "no-referrer",
      });
      fs.createReadStream(path.join(PUBLIC_DIR, "index.html")).pipe(res);
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  } catch (err) {
    if (!res.headersSent) send(res, 500, { error: "Internal server error" });
    else res.end();
    console.error("[admin] request error:", err);
  }
});

server.listen(PORT, () => {
  console.log(`[admin] listening on http://localhost:${PORT}`);
  if (!ADMIN_TOKEN) {
    console.warn(
      "[admin] WARNING: ADMIN_TOKEN is not set — mutations are open to anyone who can reach this server.\n" +
        "[admin]          Start with: ADMIN_TOKEN=<long-random-string> node server.mjs"
    );
  }
});

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, "data");
const UPLOAD_DIR = path.join(__dirname, "uploads");
const PUBLIC_DIR = path.join(__dirname, "public");

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

function fileFor(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function readCollection(name) {
  const file = fileFor(name);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function writeCollection(name, data) {
  const file = fileFor(name);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function send(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(payload);
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

function getSiteData() {
  const out = {};
  for (const name of COLLECTIONS) {
    const data = readCollection(name);
    if (data !== null) out[name] = data;
  }
  return out;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = decodeURIComponent(url.pathname);

  try {
    // ---- Static admin UI ----
    if (req.method === "GET" && pathname.startsWith("/_ui/")) {
      const rel = pathname.replace("/_ui/", "");
      const file = path.resolve(PUBLIC_DIR, rel);
      if (!file.startsWith(PUBLIC_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const ext = path.extname(file).toLowerCase();
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream", "Cache-Control": "no-cache" });
      fs.createReadStream(file).pipe(res);
      return;
    }

    // ---- Health ----
    if (req.method === "GET" && pathname === "/api/health") {
      send(res, 200, { ok: true });
      return;
    }

    // ---- Site aggregate ----
    if (req.method === "GET" && pathname === "/api/site") {
      send(res, 200, getSiteData());
      return;
    }

    // ---- Upload image ----
    if (req.method === "POST" && pathname === "/api/upload") {
      const filename = sanitizeFilename(req.headers["x-filename"]);
      const ext = path.extname(filename).toLowerCase();
      const allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
      if (!allowed.includes(ext)) {
        send(res, 400, { error: "Only jpg/png/gif/webp/svg allowed" });
        return;
      }
      const body = await readBody(req);
      const name = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
      fs.writeFileSync(path.join(UPLOAD_DIR, name), body);
      send(res, 200, { url: `/uploads/${name}`, filename: name });
      return;
    }

    // ---- Serve uploaded images ----
    if (req.method === "GET" && pathname.startsWith("/uploads/")) {
      const rel = pathname.replace("/uploads/", "");
      const file = path.resolve(UPLOAD_DIR, rel);
      if (!file.startsWith(UPLOAD_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const ext = path.extname(file).toLowerCase();
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream", "Cache-Control": "public, max-age=31536000, immutable" });
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

    // ---- GET collection (list) ----
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
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
      fs.createReadStream(path.join(PUBLIC_DIR, "index.html")).pipe(res);
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  } catch (err) {
    send(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`[admin] listening on http://localhost:${PORT}`);
});

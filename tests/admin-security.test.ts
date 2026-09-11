import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Security integration tests for the self-hosted admin CMS server.
 *
 * Boots the REAL server (admin/server.mjs) as a child process with a test
 * token and probes the actual HTTP surface: auth gate, PII exclusion,
 * upload hardening and path containment. No CMS data is touched — the child
 * gets its own ADMIN_TOKEN and we only verify response codes/headers.
 */

const PORT = 3577;
const TOKEN = `test-token-${crypto.randomBytes(12).toString("hex")}`;
const BASE = `http://127.0.0.1:${PORT}`;

let child: ChildProcess;

async function waitReady(): Promise<void> {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("admin server did not become ready");
}

beforeAll(async () => {
  child = spawn(process.execPath, ["server.mjs"], {
    cwd: path.resolve(__dirname, "..", "admin"),
    env: { ...process.env, PORT: String(PORT), ADMIN_TOKEN: TOKEN },
    stdio: "ignore",
  });
  await waitReady();
});

afterAll(async () => {
  child?.kill();
});

async function req(
  method: string,
  pathname: string,
  opts: { token?: string | null; body?: unknown; headers?: Record<string, string> } = {},
): Promise<Response> {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  if (opts.token !== null) {
    headers.Authorization = `Bearer ${opts.token ?? TOKEN}`;
  }
  let body: string | undefined;
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  return fetch(`${BASE}${pathname}`, { method, headers, body });
}

describe("admin auth gate", () => {
  it("health endpoint is open (liveness probe)", async () => {
    const res = await req("GET", "/api/health", { token: null });
    expect(res.status).toBe(200);
  });

  it("rejects mutations without a token", async () => {
    const res = await req("PUT", "/api/siteconfig", { token: null, body: {} });
    expect(res.status).toBe(401);
  });

  it("rejects mutations with a wrong token", async () => {
    const res = await req("PUT", "/api/siteconfig", { token: "Bearer nope", body: {} });
    expect(res.status).toBe(401);
  });

  it("rejects token look-alikes (suffix/prefix/case)", async () => {
    // Note: "Bearer <token> " (trailing space) is intentionally absent — HTTP
    // parsers trim optional whitespace from field values (RFC 7230 OWS), so it
    // is byte-identical to the real header by the time Node sees it.
    for (const bad of [`${TOKEN}x`, TOKEN.slice(0, -1), TOKEN.toUpperCase(), "", `bearer ${TOKEN}`]) {
      const res = await fetch(`${BASE}/api/siteconfig`, {
        method: "PUT",
        headers: { Authorization: bad, "Content-Type": "application/json" },
        body: "{}",
      });
      expect(res.status, `token variant "${bad.slice(0, 12)}…" must be rejected`).toBe(401);
    }
  });

  it("accepts a valid token for mutations", async () => {
    // Probe against a collection whose payload we deliberately keep trivial:
    // PUT to an unknown collection 404s, which still proves auth passed.
    const res = await req("PUT", "/api/not-a-collection", { body: {} });
    expect(res.status).toBe(404);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toContain("Unknown collection");
  });

  it("gates DELETE /api/collection/:index behind the token", async () => {
    const res = await req("DELETE", "/api/stats/0", { token: null });
    expect(res.status).toBe(401);
  });

  it("gates private PII collection reads behind the token", async () => {
    for (const name of ["members", "balvikas"]) {
      const res = await req("GET", `/api/${name}`, { token: null });
      expect(res.status).toBe(401);
    }
  });

  it("excludes PII collections from the public site aggregate", async () => {
    const res = await req("GET", "/api/site", { token: null });
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json).not.toHaveProperty("members");
    expect(json).not.toHaveProperty("balvikas");
    expect(json).toHaveProperty("siteconfig");
  });
});

describe("malformed input handling", () => {
  it("returns 400 (not a crash) for malformed URL escapes", async () => {
    const res = await fetch(`${BASE}/api/%zz`);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON bodies", async () => {
    const res = await fetch(`${BASE}/api/siteconfig`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: "{not json",
    });
    expect(res.status).toBe(400);
  });

  it("returns 400/404 (not a crash) for unknown collections", async () => {
    const res = await req("PUT", "/api/does-not-exist", { body: {} });
    expect([400, 404]).toContain(res.status);
  });
});

describe("upload hardening", () => {
  it("rejects SVG uploads (same-origin script vector)", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    const res = await fetch(`${BASE}/api/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "X-Filename": "evil.svg" },
      body: new Uint8Array(svg),
    });
    expect(res.status).toBe(400);
  });

  it("rejects files whose content does not match the extension (magic-byte check)", async () => {
    const fakePng = Buffer.from("<html><script>alert(1)</script></html>");
    const res = await fetch(`${BASE}/api/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "X-Filename": "fake.png" },
      body: new Uint8Array(fakePng),
    });
    expect(res.status).toBe(400);
  });

  it("rejects path-traversal filenames without writing outside the upload dir", async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const res = await fetch(`${BASE}/api/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "X-Filename": "../../etc/passwd.png" },
      body: new Uint8Array(png),
    });
    // Either accepted with a sanitized random name or rejected — never a traversal.
    if (res.ok) {
      const json = (await res.json()) as { url?: string };
      expect(json.url).toMatch(/^\/uploads\/(?:[\w-]+\/)?[\w.-]+$/);
      expect(json.url).not.toContain("..");
    } else {
      expect([400, 403]).toContain(res.status);
    }
  });
});

describe("path containment", () => {
  it("blocks traversal out of the uploads dir", async () => {
    for (const p of ["/uploads/../server.mjs", "/uploads/..%2fserver.mjs", "/uploads/%2e%2e%2fserver.mjs"]) {
      const res = await fetch(`${BASE}${p}`);
      expect([404, 400]).toContain(res.status);
    }
  });

  it("blocks traversal out of the admin UI static dir", async () => {
    for (const p of ["/_ui/../server.mjs", "/_ui/..%2fserver.mjs"]) {
      const res = await fetch(`${BASE}${p}`);
      expect([404, 400]).toContain(res.status);
    }
  });
});

describe("hardening headers on served files", () => {
  it("admin SPA is served with clickjacking/MIME protections", async () => {
    const res = await fetch(`${BASE}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("uploaded images get sandboxing CSP + nosniff + attachment disposition", async () => {
    // Upload a real minimal PNG first.
    const png = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
    ]);
    const up = await fetch(`${BASE}/api/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "X-Filename": "t.png" },
      body: new Uint8Array(png),
    });
    expect(up.status).toBe(200);
    const { url } = (await up.json()) as { url: string };

    const img = await fetch(`${BASE}${url}`);
    expect(img.status).toBe(200);
    expect(img.headers.get("x-content-type-options")).toBe("nosniff");
    expect(img.headers.get("content-security-policy")).toContain("sandbox");
    expect(img.headers.get("content-disposition")).toContain("attachment");
    expect(img.headers.get("cache-control")).toContain("immutable");
  });
});

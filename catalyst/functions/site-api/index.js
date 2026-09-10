'use strict';

/* eslint-disable @typescript-eslint/no-require-imports -- Catalyst Node functions are CommonJS by platform design */

/**
 * site-api — Advanced I/O function for Samithi websites (multi-tenant).
 *
 *   GET  /site?samithi=<slug> → site content JSON for one samithi
 *                                 (slug omitted → valasaravakkam, byte-identical legacy shape)
 *   GET  /samithis            → public directory: active slugs + names + districts (no emails)
 *   POST /contact?samithi=<slug> → validate + store message + notify that samithi's inbox
 *   POST /auth/login          → {login, password} → session {token, samithi_id, name, role}
 *   GET  /auth/me             → identity for a Bearer session (no signup exists anywhere)
 *   POST /auth/logout         → invalidate the Bearer session
 *   POST /auth/change-password → self-service rotation (session + old or first-login temp)
 *   Owner-only: POST /samithis, PUT /samithis/:slug, POST /convenors,
 *               PUT /convenors/:id, GET /convenors (no hashes),
 *               GET /messages (all samithis), GET /audit
 *
 * Tenancy: every content row carries samithi_id; every read below filters on
 * the validated slug. Unknown slug → 404, suspended → 403.
 *
 * Deploy: see catalyst/README.md + nextplan.md Phase 1.
 * CORS: browsers call this from Slate (*.onslate.com), a different origin.
 * Set ALLOWED_ORIGINS (comma-separated exact origins) on the function env;
 * without it, no CORS headers are sent (server-to-server callers unaffected).
 */

const catalyst = require('zcatalyst-sdk-node');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const LOGIN_FAIL_LIMIT = 5;
const LOGIN_FAIL_WINDOW_MS = 15 * 60 * 1000;
const PASSWORD_MIN = 8;
const THEMES = ['theme-1', 'theme-2', 'theme-3', 'theme-4', 'theme-5'];

const DEFAULT_TENANT = 'valasaravakkam';
const SLUG_RE = /^[a-z0-9-]{1,64}$/;
const RESERVED_SLUGS = new Set([
  'www', 'app', 'admin', 'api', 'mail', 's',
  'security', 'gallery', 'thank-you', 'manifest', 'robots', 'sitemap', 'favicon',
]);

const TABLES = {
  samithis: 'samithis',
  convenors: 'convenors',
  sessions: 'sessions',
  auditLog: 'audit_log',
  siteconfig: 'siteconfig',
  socialLinks: 'social_links',
  stats: 'stats',
  activities: 'activities',
  events: 'events',
  services: 'services',
  coordinators: 'coordinators',
  gallery: 'gallery_categories',
  galleryImages: 'gallery_images',
  homegallery: 'home_gallery',
  about: 'about_sections',
  contactMessages: 'contact_messages',
};

function sendJson(res, statusCode, data, extraHeaders) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    ...(extraHeaders || {}),
  });
  res.end(JSON.stringify(data));
}

// CORS for browser callers on Slate. Allowed origins come from the
// ALLOWED_ORIGINS env var (comma-separated exact origins). Unset/empty =
// no CORS headers (server-to-server callers keep working as before).
function corsHeaders(req) {
  const raw = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!raw.length) return null;
  const origin = req.headers.origin || '';
  if (origin && raw.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      Vary: 'Origin',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };
  }
  return null;
}

function publicCache(seconds) {
  // Query string (?samithi=) already makes each tenant a distinct cache entry.
  return { 'Cache-Control': `public, s-maxage=${seconds}, stale-while-revalidate=300` };
}

function resolveTenantSlug(url) {
  const raw = (url.searchParams.get('samithi') || DEFAULT_TENANT).toLowerCase().trim();
  if (!SLUG_RE.test(raw) || RESERVED_SLUGS.has(raw)) return null;
  return raw;
}

function getBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    if (req.body && typeof req.body === 'string') {
      try {
        return resolve(JSON.parse(req.body));
      } catch {
        return resolve({});
      }
    }
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function pick(row, keys) {
  const out = {};
  for (const k of keys) {
    if (row[k] !== undefined) out[k] = row[k];
  }
  return out;
}

async function readAllRows(ds, tableName) {
  const table = ds.table(tableName);
  // Follow pagination to the end — a single maxRows:200 call silently
  // dropped everything past row 200 (gallery images, events…).
  const all = [];
  let nextToken = null;
  do {
    const result = await table.getPagedRows({ maxRows: 200, nextToken });
    all.push(...(result.data || []));
    nextToken = result.next_token || null;
  } while (nextToken);
  return all;
}

async function handleGetSite(adminApp, res, slug, cache) {
  const ds = adminApp.datastore();
  const [samithiRows, configRows, links, stats, activities, events, services, coordinators, cats, images, homeGallery, about] =
    await Promise.all([
      readAllRows(ds, TABLES.samithis),
      readAllRows(ds, TABLES.siteconfig),
      readAllRows(ds, TABLES.socialLinks),
      readAllRows(ds, TABLES.stats),
      readAllRows(ds, TABLES.activities),
      readAllRows(ds, TABLES.events),
      readAllRows(ds, TABLES.services),
      readAllRows(ds, TABLES.coordinators),
      readAllRows(ds, TABLES.gallery),
      readAllRows(ds, TABLES.galleryImages),
      readAllRows(ds, TABLES.homegallery),
      readAllRows(ds, TABLES.about),
    ]);

  const tenant = samithiRows.find((r) => r.slug === slug);
  if (!tenant) {
    sendJson(res, 404, { error: 'unknown samithi' }, cache);
    return;
  }
  if ((tenant.status || 'active') !== 'active') {
    sendJson(res, 403, { error: 'suspended' }, cache);
    return;
  }

  // Tenant isolation: every collection filtered to this samithi's rows.
  // Legacy rows stamped before multi-tenancy carry samithi_id already; rows
  // with a missing samithi_id are treated as the default tenant's (never
  // another tenant's) so nothing vanishes during rollout.
  const owned = (rows) =>
    rows.filter((r) => (r.samithi_id || DEFAULT_TENANT) === slug);

  const cfg = owned(configRows)[0] || {};
  const ownedImages = owned(images);
  const ownedCats = owned(cats);
  const byCategory = {};
  for (const img of ownedImages) {
    const cslug = img.category_slug || 'other';
    if (!byCategory[cslug]) byCategory[cslug] = [];
    byCategory[cslug].push(pick(img, ['src', 'title', 'description']));
  }

  sendJson(res, 200, {
    samithi: {
      slug: tenant.slug,
      name: tenant.name,
      district: tenant.district || '',
      theme: tenant.theme || 'theme-1',
      status: tenant.status || 'active',
    },
    siteconfig: {
      siteConfig: pick(cfg, [
        'name',
        'shortName',
        'orgName',
        'zone',
        'tagline',
        'email',
        'phone',
        'address',
        'whatsapp',
        'youtube',
        'mapsEmbed',
      ]),
      socialLinks: owned(links).map((l) => pick(l, ['label', 'icon', 'href', 'color'])),
    },
    stats: owned(stats).map((s) => pick(s, ['icon', 'value', 'label', 'suffix'])),
    activities: owned(activities).map((a) => pick(a, ['name', 'value'])),
    events: owned(events).map((e) => pick(e, ['title', 'description', 'location', 'mapsUrl', 'image'])),
    services: owned(services).map((s) => pick(s, ['icon', 'title', 'description'])),
    coordinators: owned(coordinators).map((c) => pick(c, ['name', 'role', 'image', 'description'])),
    gallery: ownedCats.map((c) => ({
      ...pick(c, ['slug', 'label', 'icon', 'description']),
      images: byCategory[c.slug] || [],
    })),
    homegallery: owned(homeGallery).map((h) => pick(h, ['src', 'title', 'description'])),
    about: owned(about).map((a) => {
      let items = [];
      try {
        items = a.items_json ? JSON.parse(a.items_json) : [];
      } catch {
        items = [];
      }
      return { heading: a.heading, items };
    }),
    members: [],
    balvikas: [],
  }, cache);
}

async function handleGetSamithis(adminApp, res, cache) {
  const rows = await readAllRows(adminApp.datastore(), TABLES.samithis);
  sendJson(res, 200, {
    samithis: rows
      .filter((r) => (r.status || 'active') === 'active' && r.slug)
      .map((r) => pick(r, ['slug', 'name', 'district'])),
  }, cache);
}

function isEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

async function handleContact(adminApp, res, body, slug) {
  const name = String(body.name || '').trim().slice(0, 200);
  const email = String(body.email || '').trim().slice(0, 200);
  const subject = String(body.subject || '').trim().slice(0, 300);
  const message = String(body.message || '').trim().slice(0, 5000);

  // Honeypot — bots fill it, humans never see it. Pretend success.
  if (body._honey) {
    sendJson(res, 201, { ok: true });
    return;
  }

  if (!name || !isEmail(email) || !message) {
    sendJson(res, 400, { error: 'Name, valid email and message are required.' });
    return;
  }

  await adminApp
    .datastore()
    .table(TABLES.contactMessages)
    .insertRow({ name, email, subject, message, status: 'new', samithi_id: slug });

  // Notify the samithi inbox. Mail delivery needs a verified sender domain
  // (Console → Mail → Sender Domains) — failure must never fail the submit.
  try {
    const tenants = await readAllRows(adminApp.datastore(), TABLES.samithis);
    const tenant = tenants.find((r) => r.slug === slug);
    const inbox = (tenant && tenant.inbox_email) || undefined;
    if (inbox) {
      await adminApp.email().sendMail({
        from_email: inbox,
        to_email: [inbox],
        subject: `Website contact: ${subject || 'New message'} — ${name}`,
        content: `Samithi: ${slug}\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\n${message}`,
        reply_to: [{ email }],
      });
    }
  } catch (e) {
    console.error('contact notify mail failed:', e && e.message ? e.message : e);
  }

  sendJson(res, 201, { ok: true });
}

function sha256hex(s) {
  return crypto.createHash('sha256').update(String(s)).digest('hex');
}

function parseWhen(v) {
  if (!v) return NaN;
  if (v instanceof Date) return v.getTime();
  // Catalyst datetime "YYYY-MM-DD HH:mm:ss:SSS" → ISO.
  const iso = String(v).replace(' ', 'T').replace(/:(\d{3})$/, '.$1');
  return Date.parse(iso);
}

function randomToken() {
  return crypto.randomBytes(32).toString('hex');
}

function randomTempPassword() {
  // Human-relayable over WhatsApp: unambiguous chars only.
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  const buf = crypto.randomBytes(12);
  for (const b of buf) out += chars[b % chars.length];
  return out;
}

async function audit(ds, actor, action, samithiId, detail) {
  try {
    await ds.table(TABLES.auditLog).insertRow({
      actor_login: actor || '',
      action,
      samithi_id: samithiId || '',
      detail: String(detail || '').slice(0, 2000),
      created_at: new Date().toISOString(),
    });
  } catch {
    // Audit must never break the request it observes.
  }
}

// Resolve the calling convenor from Authorization: Bearer <token>.
// Returns { convenor } or { error, code }. Owner rows (role=owner,
// samithi_id='*') pass every tenant check.
async function requireAuth(ds, req, needOwner) {
  const header = req.headers.authorization || '';
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) return { error: 'missing session', code: 401 };
  let sessions;
  try {
    sessions = await readAllRows(ds, TABLES.sessions);
  } catch {
    return { error: 'auth unavailable', code: 503 };
  }
  const digest = sha256hex(m[1].trim());
  const session = sessions.find((s) => s.token_hash === digest);
  if (!session || Number.isNaN(parseWhen(session.expires_at)) || parseWhen(session.expires_at) < Date.now()) {
    return { error: 'invalid or expired session', code: 401 };
  }
  const users = await readAllRows(ds, TABLES.convenors);
  const convenor = users.find((u) => String(u.ROWID) === String(session.convenor_id));
  // Platform may coerce booleans to "true"/"false" strings — treat every
  // falsy spelling as disabled.
  const disabled = convenor && (convenor.active === false || convenor.active === 'false' || convenor.active === 0 || convenor.active === '0');
  if (!convenor || disabled) {
    return { error: 'account disabled', code: 401 };
  }
  if (needOwner && convenor.role !== 'owner') {
    return { error: 'owner only', code: 403 };
  }
  if (convenor.role !== 'owner' && convenor.samithi_id) {
    const tenants = await readAllRows(ds, TABLES.samithis);
    const home = tenants.find((t) => t.slug === convenor.samithi_id);
    if (!home || (home.status || 'active') !== 'active') {
      return { error: 'samithi suspended', code: 403 };
    }
  }
  return { convenor };
}

async function recentFails(ds, login) {
  try {
    const rows = await readAllRows(ds, TABLES.auditLog);
    const cutoff = Date.now() - LOGIN_FAIL_WINDOW_MS;
    return rows.filter(
      (r) => r.action === 'login_fail' && r.actor_login === login && parseWhen(r.created_at) >= cutoff
    ).length;
  } catch {
    return 0;
  }
}

async function handleLogin(ds, res, body) {
  const login = String(body.login || '').trim().slice(0, 128);
  const password = String(body.password || '');
  if (!login || !password) {
    sendJson(res, 400, { error: 'login and password required' });
    return;
  }
  const users = await readAllRows(ds, TABLES.convenors);
  const user = users.find((u) => u.login === login);
  // Uniform timing + uniform message: never reveal whether the login exists.
  // (Same boolean-coercion guard as requireAuth.)
  const hash = user ? user.password_hash : '$2b$10$invalidinvalidinvalidinvalidinvalid12';
  const enabled = user && !(user.active === false || user.active === 'false' || user.active === 0 || user.active === '0');
  let ok = false;
  try {
    ok = !!(enabled && bcrypt.compareSync(password, hash));
  } catch {
    ok = false;
  }
  if (!ok) {
    await audit(ds, login, 'login_fail', '', 'bad credentials or disabled');
    if ((await recentFails(ds, login)) >= LOGIN_FAIL_LIMIT) {
      sendJson(res, 429, { error: 'too many attempts, try again in 15 minutes' });
      return;
    }
    sendJson(res, 401, { error: 'invalid login or password' });
    return;
  }
  const token = randomToken();
  await ds.table(TABLES.sessions).insertRow({
    token_hash: sha256hex(token),
    convenor_id: String(user.ROWID),
    expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  });
  try {
    await ds.table(TABLES.convenors).updateRow({ ROWID: user.ROWID, last_login: new Date().toISOString() });
  } catch {
    // Non-fatal: the session already exists.
  }
  await audit(ds, login, 'login_ok', user.samithi_id || '', '');
  sendJson(res, 200, {
    token,
    samithi_id: user.samithi_id || '',
    name: user.name || '',
    role: user.role || 'convenor',
  });
}

async function handleChangePassword(ds, res, body, me) {
  const oldPassword = String(body.oldPassword || '');
  const newPassword = String(body.newPassword || '');
  if (newPassword.length < PASSWORD_MIN) {
    sendJson(res, 400, { error: `password must be at least ${PASSWORD_MIN} characters` });
    return;
  }
  const users = await readAllRows(ds, TABLES.convenors);
  const user = users.find((u) => String(u.ROWID) === String(me.ROWID));
  if (!user) {
    sendJson(res, 401, { error: 'account not found' });
    return;
  }
  let ok = false;
  try {
    ok = bcrypt.compareSync(oldPassword, user.password_hash || '');
  } catch {
    ok = false;
  }
  if (!ok) {
    await audit(ds, user.login, 'password_change_fail', user.samithi_id || '', '');
    sendJson(res, 401, { error: 'current password incorrect' });
    return;
  }
  await ds.table(TABLES.convenors).updateRow({ ROWID: user.ROWID, password_hash: bcrypt.hashSync(newPassword, 10) });
  // Rotate sessions: drop all of this convenor's tokens (re-login required).
  try {
    const sessions = await readAllRows(ds, TABLES.sessions);
    const mine = sessions.filter((s) => String(s.convenor_id) === String(user.ROWID));
    for (const s of mine) {
      try {
        await ds.table(TABLES.sessions).deleteRow(s.ROWID);
      } catch { /* keep going */ }
    }
  } catch { /* non-fatal */ }
  await audit(ds, user.login, 'password_change_ok', user.samithi_id || '', '');
  sendJson(res, 200, { ok: true });
}

// Owner: create a samithi + seed minimal content. Returns the live link path.
async function handleCreateSamithi(ds, res, body, me) {
  const slug = String(body.slug || '').toLowerCase().trim();
  const name = String(body.name || '').trim().slice(0, 128);
  if (!SLUG_RE.test(slug) || RESERVED_SLUGS.has(slug) || !name) {
    sendJson(res, 400, { error: 'valid unique slug and name required' });
    return;
  }
  const existing = await readAllRows(ds, TABLES.samithis);
  if (existing.some((r) => r.slug === slug)) {
    sendJson(res, 409, { error: 'slug already taken' });
    return;
  }
  const theme = THEMES.includes(body.theme) ? body.theme : 'theme-1';
  await ds.table(TABLES.samithis).insertRow({
    slug,
    name,
    district: String(body.district || '').slice(0, 64),
    zone: String(body.zone || '').slice(0, 64),
    address: String(body.address || '').slice(0, 2000),
    inbox_email: String(body.inbox_email || '').slice(0, 128),
    phone: String(body.phone || '').slice(0, 32),
    maps_embed: String(body.maps_embed || '').slice(0, 4000),
    theme,
    status: 'active',
  });
  // Seed: one siteconfig row + welcome event + default about block.
  await ds.table(TABLES.siteconfig).insertRow({
    samithi_id: slug,
    name,
    shortName: 'SSSSO',
    orgName: 'Sri Sathya Sai Seva Organisation',
    zone: String(body.zone || '').slice(0, 64),
    tagline: 'Love All, Serve All. Help Ever, Hurt Never.',
    email: String(body.inbox_email || '').slice(0, 128),
    phone: String(body.phone || '').slice(0, 32),
    address: String(body.address || '').slice(0, 2000),
  });
  await ds.table(TABLES.events).insertRow({
    samithi_id: slug,
    title: `Welcome to ${name}`,
    description: 'Replace this with your first real event — bhajans, seva, Balvikas and more.',
  });
  await ds.table(TABLES.about).insertRow({
    samithi_id: slug,
    heading: `About ${name}`,
    items_json: JSON.stringify([{ strong: 'Welcome:', text: ' Tell your samithi story here.' }]),
  });
  await audit(ds, me.login, 'samithi_create', slug, name);
  sendJson(res, 201, { ok: true, slug, path: `/s/${slug}`, theme });
}

// Owner: invite a convenor. Returns credentials ONCE — relay over WhatsApp.
async function handleInviteConvenor(ds, res, body, me) {
  const samithiId = String(body.samithi_id || '').toLowerCase().trim();
  const name = String(body.name || '').trim().slice(0, 128);
  const login = String(body.login || '').trim().slice(0, 128);
  const email = String(body.email || '').trim().slice(0, 128);
  let temp = String(body.tempPassword || '');
  if (!SLUG_RE.test(samithiId) || !name || !login) {
    sendJson(res, 400, { error: 'samithi_id, name and login required' });
    return;
  }
  if (temp && temp.length < PASSWORD_MIN) {
    sendJson(res, 400, { error: `temporary password must be at least ${PASSWORD_MIN} characters` });
    return;
  }
  const tenants = await readAllRows(ds, TABLES.samithis);
  if (!tenants.some((t) => t.slug === samithiId)) {
    sendJson(res, 404, { error: 'unknown samithi' });
    return;
  }
  const users = await readAllRows(ds, TABLES.convenors);
  if (users.some((u) => u.login === login)) {
    sendJson(res, 409, { error: 'login already taken' });
    return;
  }
  if (!temp) temp = randomTempPassword();
  await ds.table(TABLES.convenors).insertRow({
    samithi_id: samithiId,
    name,
    login,
    email,
    password_hash: bcrypt.hashSync(temp, 10),
    role: 'convenor',
    active: true,
  });
  await audit(ds, me.login, 'convenor_invite', samithiId, login);
  sendJson(res, 201, { ok: true, login, tempPassword: temp });
}

// Owner: deactivate / reset a convenor. Reset returns a temp password ONCE.
async function handleUpdateConvenor(ds, res, rowId, body, me) {
  const users = await readAllRows(ds, TABLES.convenors);
  const user = users.find((u) => String(u.ROWID) === String(rowId));
  if (!user) {
    sendJson(res, 404, { error: 'convenor not found' });
    return;
  }
  const patch = { ROWID: user.ROWID };
  if (body.active === true || body.active === false) patch.active = body.active;
  let temp = null;
  if (body.resetPassword === true) {
    temp = randomTempPassword();
    patch.password_hash = bcrypt.hashSync(temp, 10);
  }
  if (body.name) patch.name = String(body.name).slice(0, 128);
  if (body.email !== undefined) patch.email = String(body.email).slice(0, 128);
  await ds.table(TABLES.convenors).updateRow(patch);
  if (temp) {
    // Invalidate existing sessions so the new password takes effect now.
    try {
      const sessions = await readAllRows(ds, TABLES.sessions);
      for (const s of sessions.filter((x) => String(x.convenor_id) === String(user.ROWID))) {
        try {
          await ds.table(TABLES.sessions).deleteRow(s.ROWID);
        } catch { /* keep going */ }
      }
    } catch { /* non-fatal */ }
  }
  await audit(ds, me.login, temp ? 'convenor_reset' : 'convenor_update', user.samithi_id || '', user.login);
  sendJson(res, 200, { ok: true, ...(temp ? { tempPassword: temp } : {}) });
}

// Owner: update a samithi (status/theme/contact fields). Convenors use
// PUT /samithi (self, allowlisted keys) instead.
async function handleUpdateSamithi(ds, res, slug, body, me) {
  const tenants = await readAllRows(ds, TABLES.samithis);
  const tenant = tenants.find((t) => t.slug === slug);
  if (!tenant) {
    sendJson(res, 404, { error: 'unknown samithi' });
    return;
  }
  const patch = { ROWID: tenant.ROWID };
  for (const k of ['name', 'district', 'zone', 'address', 'inbox_email', 'phone', 'maps_embed']) {
    if (body[k] !== undefined) patch[k] = String(body[k]).slice(0, 4000);
  }
  if (body.theme !== undefined) {
    if (!THEMES.includes(body.theme)) {
      sendJson(res, 400, { error: 'unknown theme' });
      return;
    }
    patch.theme = body.theme;
  }
  if (body.status !== undefined) {
    if (!['active', 'suspended'].includes(body.status)) {
      sendJson(res, 400, { error: 'unknown status' });
      return;
    }
    patch.status = body.status;
  }
  await ds.table(TABLES.samithis).updateRow(patch);
  await audit(ds, me.login, 'samithi_update', slug, Object.keys(patch).filter((k) => k !== 'ROWID').join(','));
  sendJson(res, 200, { ok: true });
}

// Convenor: update OWN samithi row (contact/theme fields only — never slug,
// status, or another samithi).
async function handleUpdateOwnSamithi(ds, res, body, me) {
  const tenants = await readAllRows(ds, TABLES.samithis);
  const tenant = tenants.find((t) => t.slug === me.samithi_id);
  if (!tenant) {
    sendJson(res, 404, { error: 'samithi not found' });
    return;
  }
  const patch = { ROWID: tenant.ROWID };
  for (const k of ['name', 'district', 'zone', 'address', 'inbox_email', 'phone', 'maps_embed']) {
    if (body[k] !== undefined) patch[k] = String(body[k]).slice(0, 4000);
  }
  if (body.theme !== undefined) {
    if (!THEMES.includes(body.theme)) {
      sendJson(res, 400, { error: 'unknown theme' });
      return;
    }
    patch.theme = body.theme;
  }
  await ds.table(TABLES.samithis).updateRow(patch);
  await audit(ds, me.login, 'samithi_update', me.samithi_id, Object.keys(patch).filter((k) => k !== 'ROWID').join(','));
  sendJson(res, 200, { ok: true, theme: patch.theme || tenant.theme || 'theme-1' });
}

// Owner: all contact messages with their samithi; convenor: own samithi only.
async function handleGetMessages(ds, res, me, url, cache) {
  const rows = await readAllRows(ds, TABLES.contactMessages);
  const list = (me.role === 'owner' ? rows : rows.filter((r) => r.samithi_id === me.samithi_id))
    .map((r) => ({
      id: String(r.ROWID),
      samithi_id: r.samithi_id || '',
      name: r.name || '',
      email: r.email || '',
      subject: r.subject || '',
      message: r.message || '',
      status: r.status || 'new',
      created: r.CREATEDTIME || '',
    }))
    .reverse();
  const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit')) || 100));
  sendJson(res, 200, { messages: list.slice(0, limit) }, cache);
}

async function handleGetAudit(ds, res, me, url, cache) {
  const rows = await readAllRows(ds, TABLES.auditLog);
  const list = rows
    .map((r) => ({
      id: String(r.ROWID),
      actor: r.actor_login || '',
      action: r.action || '',
      samithi_id: r.samithi_id || '',
      detail: r.detail || '',
      created: r.created_at || r.CREATEDTIME || '',
    }))
    .reverse();
  const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit')) || 100));
  sendJson(res, 200, { entries: list.slice(0, limit) }, cache);
}

// Parse owner routes: PUT /samithis/:slug, PUT /convenors/:rowid.
// Returns { samithi } or { convenor } or null.
function pathnameOwner(path) {
  let m = path.match(/^\/samithis\/([A-Za-z0-9-]{1,64})$/);
  if (m) return { samithi: m[1].toLowerCase() };
  m = path.match(/^\/convenors\/(\d+)$/);
  if (m) return { convenor: m[1] };
  return null;
}

// ---- Tenant content CRUD (admin SPA writes here, never direct tables) ----

const CONTENT_TABLES = new Set([
  'events', 'services', 'coordinators', 'stats', 'activities',
  'homegallery', 'about', 'gallery', 'siteconfig',
]);

// Per-collection field allowlists for writes. Unknown keys are dropped;
// ROWID/CREATORID/MODIFIEDTIME can never be set by callers.
const WRITE_FIELDS = {
  events: ['title', 'description', 'location', 'mapsUrl', 'image', 'date'],
  services: ['icon', 'title', 'description'],
  coordinators: ['name', 'role', 'image', 'description'],
  stats: ['icon', 'value', 'label', 'suffix'],
  activities: ['name', 'value'],
  homegallery: ['src', 'title', 'description'],
};

function sanitizeItem(collection, item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const fields = WRITE_FIELDS[collection];
  if (!fields) return null;
  const out = {};
  for (const k of fields) {
    if (item[k] === undefined || item[k] === null) continue;
    out[k] = typeof item[k] === 'number' ? item[k] : String(item[k]).slice(0, 4000);
  }
  return out;
}

function validateItems(collection, items) {
  if (!Array.isArray(items)) return 'items must be an array';
  if (items.length > 500) return 'too many items (max 500)';
  if (collection === 'events') {
    for (const it of items) {
      if (!it || !String(it.title || '').trim()) return 'every event needs a title';
    }
  }
  return null;
}

// Replace ALL of this tenant's rows in a simple collection.
async function handleReplaceCollection(ds, res, collection, tableName, body, me) {
  const err = validateItems(collection, body.items);
  if (err) {
    sendJson(res, 400, { error: err });
    return;
  }
  const rows = await readAllRows(ds, tableName);
  const own = rows.filter((r) => r.samithi_id === me.samithi_id);
  for (const r of own) {
    try {
      await ds.table(tableName).deleteRow(r.ROWID);
    } catch { /* keep going */ }
  }
  const clean = [];
  for (const it of body.items) {
    const s = sanitizeItem(collection, it);
    if (s) clean.push({ ...s, samithi_id: me.samithi_id });
  }
  for (let i = 0; i < clean.length; i += 50) {
    const chunk = clean.slice(i, i + 50);
    if (chunk.length === 1) await ds.table(tableName).insertRow(chunk[0]);
    else await ds.table(tableName).insertRows(chunk);
  }
  await audit(ds, me.login, 'content_replace', me.samithi_id, `${collection}: ${clean.length} rows`);
  sendJson(res, 200, { ok: true, length: clean.length });
}

// Gallery: { categories: [{slug,label,icon,description,images:[{src,title,description}]}] }
async function handleReplaceGallery(ds, res, body, me) {
  const cats = body.categories;
  if (!Array.isArray(cats)) {
    sendJson(res, 400, { error: 'categories must be an array' });
    return;
  }
  if (cats.length > 50) {
    sendJson(res, 400, { error: 'too many categories (max 50)' });
    return;
  }
  const seen = new Set();
  for (const c of cats) {
    const slug = String((c && c.slug) || '').trim();
    if (!/^[a-z0-9-]{1,64}$/.test(slug) || seen.has(slug)) {
      sendJson(res, 400, { error: 'each category needs a unique url-safe slug' });
      return;
    }
    seen.add(slug);
    if (c.images && (!Array.isArray(c.images) || c.images.length > 300)) {
      sendJson(res, 400, { error: 'too many images in a category (max 300)' });
      return;
    }
  }
  const oldCats = (await readAllRows(ds, TABLES.gallery)).filter((r) => r.samithi_id === me.samithi_id);
  const oldImgs = (await readAllRows(ds, TABLES.galleryImages)).filter((r) => r.samithi_id === me.samithi_id);
  for (const r of oldCats) {
    try {
      await ds.table(TABLES.gallery).deleteRow(r.ROWID);
    } catch { /* keep going */ }
  }
  for (const r of oldImgs) {
    try {
      await ds.table(TABLES.galleryImages).deleteRow(r.ROWID);
    } catch { /* keep going */ }
  }
  let imgCount = 0;
  for (const c of cats) {
    await ds.table(TABLES.gallery).insertRow({
      samithi_id: me.samithi_id,
      slug: String(c.slug).trim(),
      label: String(c.label || c.slug).slice(0, 128),
      icon: String(c.icon || 'fa-om').slice(0, 64),
      description: String(c.description || '').slice(0, 2000),
    });
    for (const img of c.images || []) {
      if (!img || !img.src) continue;
      await ds.table(TABLES.galleryImages).insertRow({
        samithi_id: me.samithi_id,
        category_slug: String(c.slug).trim(),
        src: String(img.src).slice(0, 1000),
        title: String(img.title || '').slice(0, 128),
        description: String(img.description || '').slice(0, 1000),
      });
      imgCount += 1;
    }
  }
  await audit(ds, me.login, 'content_replace', me.samithi_id, `gallery: ${cats.length} categories, ${imgCount} images`);
  sendJson(res, 200, { ok: true, categories: cats.length, images: imgCount });
}

// About: { sections: [{heading, items:[{strong,text}]}] } → items_json storage.
async function handleReplaceAbout(ds, res, body, me) {
  if (!Array.isArray(body.sections)) {
    sendJson(res, 400, { error: 'sections must be an array' });
    return;
  }
  if (body.sections.length > 50) {
    sendJson(res, 400, { error: 'too many sections (max 50)' });
    return;
  }
  const rows = await readAllRows(ds, TABLES.about);
  for (const r of rows.filter((x) => x.samithi_id === me.samithi_id)) {
    try {
      await ds.table(TABLES.about).deleteRow(r.ROWID);
    } catch { /* keep going */ }
  }
  let n = 0;
  for (const s of body.sections) {
    if (!s || typeof s !== 'object') continue;
    const items = Array.isArray(s.items) ? s.items.slice(0, 100).map((it) => ({
      strong: String((it && it.strong) || '').slice(0, 200),
      text: String((it && it.text) || '').slice(0, 2000),
    })) : [];
    await ds.table(TABLES.about).insertRow({
      samithi_id: me.samithi_id,
      heading: String(s.heading || '').slice(0, 200),
      items_json: JSON.stringify(items),
    });
    n += 1;
  }
  await audit(ds, me.login, 'content_replace', me.samithi_id, `about: ${n} sections`);
  sendJson(res, 200, { ok: true, length: n });
}

// Siteconfig: { siteConfig: {...}, socialLinks: [...] } — single row + links.
async function handleReplaceSiteconfig(ds, res, body, me) {
  const sc = body.siteConfig && typeof body.siteConfig === 'object' ? body.siteConfig : {};
  const links = Array.isArray(body.socialLinks) ? body.socialLinks.slice(0, 20) : [];
  const cfg = {};
  for (const k of ['name', 'shortName', 'orgName', 'zone', 'tagline', 'email', 'phone', 'address', 'whatsapp', 'youtube', 'mapsEmbed']) {
    if (sc[k] !== undefined && sc[k] !== null) cfg[k] = String(sc[k]).slice(0, 4000);
  }
  const rows = await readAllRows(ds, TABLES.siteconfig);
  let row = rows.find((r) => r.samithi_id === me.samithi_id);
  if (row) {
    await ds.table(TABLES.siteconfig).updateRow({ ROWID: row.ROWID, ...cfg });
  } else {
    await ds.table(TABLES.siteconfig).insertRow({ samithi_id: me.samithi_id, ...cfg });
  }
  const oldLinks = (await readAllRows(ds, TABLES.socialLinks)).filter((r) => r.samithi_id === me.samithi_id);
  for (const r of oldLinks) {
    try {
      await ds.table(TABLES.socialLinks).deleteRow(r.ROWID);
    } catch { /* keep going */ }
  }
  let n = 0;
  for (const l of links) {
    if (!l || typeof l !== 'object' || (!l.label && !l.href)) continue;
    await ds.table(TABLES.socialLinks).insertRow({
      samithi_id: me.samithi_id,
      label: String(l.label || '').slice(0, 64),
      icon: String(l.icon || '').slice(0, 64),
      href: String(l.href || '').slice(0, 1000),
      color: String(l.color || '').slice(0, 64),
    });
    n += 1;
  }
  await audit(ds, me.login, 'content_replace', me.samithi_id, `siteconfig + ${n} social links`);
  sendJson(res, 200, { ok: true, socialLinks: n });
}

module.exports = async (req, res) => {
  try {
    // req.url includes the /execute prefix — strip it before routing.
    const parsedUrl = new URL(req.url, `https://${req.headers.host}`);
    const path = parsedUrl.pathname.replace(/^\/execute/, '') || '/';
    const cors = corsHeaders(req) || {};
    const cache = publicCache(60);

    // CORS preflight for browser callers.
    if (req.method === 'OPTIONS') {
      res.writeHead(204, cors);
      res.end();
      return;
    }

    const adminApp = catalyst.initialize(req, { scope: 'admin' });

    if (req.method === 'GET' && (path === '/site' || path === '/')) {
      const slug = resolveTenantSlug(parsedUrl);
      if (!slug) {
        sendJson(res, 400, { error: 'invalid samithi' }, { ...cors, ...cache });
        return;
      }
      await handleGetSite(adminApp, res, slug, { ...cors, ...cache });
      return;
    }
    if (req.method === 'GET' && path === '/samithis') {
      await handleGetSamithis(adminApp, res, { ...cors, ...cache });
      return;
    }
    if (req.method === 'POST' && path === '/contact') {
      const slug = resolveTenantSlug(parsedUrl);
      if (!slug) {
        sendJson(res, 400, { error: 'invalid samithi' }, cors);
        return;
      }
      const body = await getBody(req);
      await handleContact(adminApp, res, body, slug);
      return;
    }
    // ---- Auth (no signup exists anywhere; owner provisions logins) ----
    if (req.method === 'POST' && path === '/auth/login') {
      await handleLogin(adminApp.datastore(), res, await getBody(req));
      return;
    }
    if (req.method === 'POST' && path === '/auth/logout') {
      const auth = await requireAuth(adminApp.datastore(), req, false);
      if (auth.error) {
        sendJson(res, auth.code, { error: auth.error }, cors);
        return;
      }
      try {
        const sessions = await readAllRows(adminApp.datastore(), TABLES.sessions);
        const header = req.headers.authorization || '';
        const digest = sha256hex(header.replace(/^Bearer\s+/i, '').trim());
        for (const s of sessions.filter((x) => x.token_hash === digest)) {
          try {
            await adminApp.datastore().table(TABLES.sessions).deleteRow(s.ROWID);
          } catch { /* keep going */ }
        }
      } catch { /* logout is best-effort server-side; client drops the token */ }
      sendJson(res, 200, { ok: true }, cors);
      return;
    }
    if (req.method === 'GET' && path === '/auth/me') {
      const auth = await requireAuth(adminApp.datastore(), req, false);
      if (auth.error) {
        sendJson(res, auth.code, { error: auth.error }, cors);
        return;
      }
      const me = auth.convenor;
      sendJson(res, 200, {
        login: me.login,
        name: me.name || '',
        samithi_id: me.samithi_id || '',
        role: me.role || 'convenor',
      }, cors);
      return;
    }
    if (req.method === 'POST' && path === '/auth/change-password') {
      const auth = await requireAuth(adminApp.datastore(), req, false);
      if (auth.error) {
        sendJson(res, auth.code, { error: auth.error }, cors);
        return;
      }
      await handleChangePassword(adminApp.datastore(), res, await getBody(req), auth.convenor);
      return;
    }
    // ---- Owner-only management ----
    const ownerMatch = pathnameOwner(path);
    const isOwnerRoute =
      (req.method === 'POST' && (path === '/samithis' || path === '/convenors')) ||
      (req.method === 'PUT' && !!ownerMatch) ||
      (req.method === 'GET' && path === '/audit');
    if (isOwnerRoute) {
      const auth = await requireAuth(adminApp.datastore(), req, true);
      if (auth.error) {
        sendJson(res, auth.code, { error: auth.error }, cors);
        return;
      }
      const ds = adminApp.datastore();
      const body = ['POST', 'PUT'].includes(req.method) ? await getBody(req) : {};
      if (req.method === 'POST' && path === '/samithis') {
        await handleCreateSamithi(ds, res, body, auth.convenor);
        return;
      }
      if (req.method === 'PUT' && ownerMatch && ownerMatch.samithi) {
        await handleUpdateSamithi(ds, res, ownerMatch.samithi, body, auth.convenor);
        return;
      }
      if (req.method === 'POST' && path === '/convenors') {
        await handleInviteConvenor(ds, res, body, auth.convenor);
        return;
      }
      if (req.method === 'PUT' && ownerMatch && ownerMatch.convenor) {
        await handleUpdateConvenor(ds, res, ownerMatch.convenor, body, auth.convenor);
        return;
      }
      if (req.method === 'GET' && path === '/audit') {
        await handleGetAudit(ds, res, auth.convenor, parsedUrl, { ...cors, ...cache });
        return;
      }
      if (req.method === 'GET' && path === '/convenors') {
        const users = await readAllRows(ds, TABLES.convenors);
        sendJson(res, 200, {
          convenors: users.map((u) => ({
            id: String(u.ROWID),
            samithi_id: u.samithi_id || '',
            name: u.name || '',
            login: u.login,
            email: u.email || '',
            role: u.role || 'convenor',
            active: u.active !== false,
            last_login: u.last_login || '',
          })),
        }, { ...cors, ...cache });
        return;
      }
      sendJson(res, 404, { error: 'Not found' }, cors);
      return;
    }
    // ---- Convenor self-service ----
    if (req.method === 'PUT' && path === '/samithi') {
      const auth = await requireAuth(adminApp.datastore(), req, false);
      if (auth.error) {
        sendJson(res, auth.code, { error: auth.error }, cors);
        return;
      }
      if (auth.convenor.role === 'owner') {
        sendJson(res, 400, { error: 'owners use PUT /samithis/:slug' }, cors);
        return;
      }
      await handleUpdateOwnSamithi(adminApp.datastore(), res, await getBody(req), auth.convenor);
      return;
    }
    if (req.method === 'GET' && path === '/messages') {
      const auth = await requireAuth(adminApp.datastore(), req, false);
      if (auth.error) {
        sendJson(res, auth.code, { error: auth.error }, cors);
        return;
      }
      await handleGetMessages(adminApp.datastore(), res, auth.convenor, parsedUrl, { ...cors, ...cache });
      return;
    }
    // ---- Tenant content CRUD (admin SPA writes here, never direct tables) ----
    if ((req.method === 'GET' || req.method === 'PUT') && path.startsWith('/content')) {
      const auth = await requireAuth(adminApp.datastore(), req, false);
      if (auth.error) {
        sendJson(res, auth.code, { error: auth.error }, cors);
        return;
      }
      const me = auth.convenor;
      if (me.role !== 'owner' && !me.samithi_id) {
        sendJson(res, 403, { error: 'no samithi assigned' }, cors);
        return;
      }
      const ds = adminApp.datastore();
      const parts = path.split('/').filter(Boolean); // ['content', <collection>?]
      if (req.method === 'GET' && parts.length === 1) {
        // Full editable payload for this tenant (same shape as /site).
        // Owners pass ?samithi=<slug> to pick a context; convenors are fixed
        // to their own samithi regardless of the parameter.
        let slug = me.samithi_id;
        if (me.role === 'owner') {
          const want = String(parsedUrl.searchParams.get('samithi') || '').toLowerCase();
          slug = want && SLUG_RE.test(want) && !RESERVED_SLUGS.has(want) ? want : null;
        }
        if (!slug || slug === '*') {
          sendJson(res, 400, { error: 'samithi context required' }, cors);
          return;
        }
        await handleGetSite(adminApp, res, slug, cors);
        return;
      }
      if (req.method === 'PUT' && parts.length === 2 && CONTENT_TABLES.has(parts[1])) {
        const collection = parts[1];
        // Owner with no samithi cannot write tenant content.
        const target = me.role === 'owner' ? me.samithi_id : me.samithi_id;
        if (!target || target === '*') {
          sendJson(res, 403, { error: 'owner needs a samithi context (use owner endpoints)' }, cors);
          return;
        }
        const writer = { ...me, samithi_id: target };
        const body = await getBody(req);
        const tableKey = { events: 'events', services: 'services', coordinators: 'coordinators', stats: 'stats', activities: 'activities', homegallery: 'homegallery' }[collection];
        if (tableKey) {
          await handleReplaceCollection(ds, res, collection, TABLES[tableKey], body, writer);
          return;
        }
        if (collection === 'gallery') {
          await handleReplaceGallery(ds, res, body, writer);
          return;
        }
        if (collection === 'about') {
          await handleReplaceAbout(ds, res, body, writer);
          return;
        }
        if (collection === 'siteconfig') {
          await handleReplaceSiteconfig(ds, res, body, writer);
          return;
        }
      }
      sendJson(res, 404, { error: 'Not found' }, cors);
      return;
    }
    sendJson(res, 404, { error: 'Not found' }, cors);
  } catch (error) {
    console.error('site-api error:', error);
    try {
      sendJson(res, 500, { error: 'Internal error' });
    } catch {
      try {
        res.end();
      } catch {
        /* noop */
      }
    }
  }
};

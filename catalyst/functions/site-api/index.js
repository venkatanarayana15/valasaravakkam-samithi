'use strict';

/* eslint-disable @typescript-eslint/no-require-imports -- Catalyst Node functions are CommonJS by platform design */

/**
 * site-api — Advanced I/O function for the Valasaravakkam Samithi website.
 *
 *   GET  /site     → full site content JSON (mirrors the admin /api/site shape)
 *   POST /contact  → validate + store message + notify by mail
 *
 * Deploy: see catalyst/README.md
 * No CORS headers here on purpose — callers are server-side (Next.js
 * rewrites). If browsers ever call this directly, use Console →
 * Authentication → Authorized Domains instead of manual headers.
 */

const catalyst = require('zcatalyst-sdk-node');

const TABLES = {
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

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
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
  const result = await table.getPagedRows({ nextToken: null, maxRows: 200 });
  return result.data || [];
}

async function handleGetSite(adminApp, res) {
  const ds = adminApp.datastore();
  const [configRows, links, stats, activities, events, services, coordinators, cats, images, homeGallery, about] =
    await Promise.all([
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

  const cfg = configRows[0] || {};
  const byCategory = {};
  for (const img of images) {
    const slug = img.category_slug || 'other';
    if (!byCategory[slug]) byCategory[slug] = [];
    byCategory[slug].push(pick(img, ['src', 'title', 'description']));
  }

  sendJson(res, 200, {
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
      socialLinks: links.map((l) => pick(l, ['label', 'icon', 'href', 'color'])),
    },
    stats: stats.map((s) => pick(s, ['icon', 'value', 'label', 'suffix'])),
    activities: activities.map((a) => pick(a, ['name', 'value'])),
    events: events.map((e) => pick(e, ['title', 'description', 'location', 'mapsUrl', 'image'])),
    services: services.map((s) => pick(s, ['icon', 'title', 'description'])),
    coordinators: coordinators.map((c) => pick(c, ['name', 'role', 'image', 'description'])),
    gallery: cats.map((c) => ({
      ...pick(c, ['slug', 'label', 'icon', 'description']),
      images: byCategory[c.slug] || [],
    })),
    homegallery: homeGallery.map((h) => pick(h, ['src', 'title', 'description'])),
    about: about.map((a) => {
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
  });
}

function isEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

async function handleContact(adminApp, res, body) {
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
    .insertRow({ name, email, subject, message, status: 'new' });

  // Notify the samithi inbox. Mail delivery needs a verified sender domain
  // (Console → Mail → Sender Domains) — failure must never fail the submit.
  try {
    const siteRows = await readAllRows(adminApp.datastore(), TABLES.siteconfig);
    const inbox = (siteRows[0] && siteRows[0].email) || undefined;
    if (inbox) {
      await adminApp.email().sendMail({
        from_email: inbox,
        to_email: [inbox],
        subject: `Website contact: ${subject || 'New message'} — ${name}`,
        content: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\n${message}`,
      });
    }
  } catch (e) {
    console.error('contact notify mail failed:', e && e.message ? e.message : e);
  }

  sendJson(res, 201, { ok: true });
}

module.exports = async (req, res) => {
  try {
    // req.url includes the /execute prefix — strip it before routing.
    const parsedUrl = new URL(req.url, `https://${req.headers.host}`);
    const path = parsedUrl.pathname.replace(/^\/execute/, '') || '/';

    const adminApp = catalyst.initialize(req, { scope: 'admin' });

    if (req.method === 'GET' && (path === '/site' || path === '/')) {
      await handleGetSite(adminApp, res);
      return;
    }
    if (req.method === 'POST' && path === '/contact') {
      const body = await getBody(req);
      await handleContact(adminApp, res, body);
      return;
    }
    sendJson(res, 404, { error: 'Not found' });
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

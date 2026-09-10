const API = "/api";

// API base override for Slate deployments (static SPA, no same-origin
// server): stored in localStorage, editable on the login card. Empty =
// same-origin /api (local dev server or the site's /admin proxy).
function apiBase() {
  return (localStorage.getItem("samithi_api_base") || "").replace(/\/$/, "");
}
function apiUrl(path) {
  return apiBase() + API + path;
}

// Session state. sessionMode = function-style login (multi-tenant SaaS);
// legacy = shared ADMIN_TOKEN prompt (old standalone server compat).
let session = null; // {token, samithi_id, name, role} | null
let sessionMode = false;
let legacyMode = false;
let authed = false;
let activeSamithi = null; // owner picks a samithi context; convenors fixed

try {
  const saved = JSON.parse(sessionStorage.getItem("samithi_session") || "null");
  if (saved && saved.token) {
    session = saved;
    sessionMode = true;
    authed = true;
    if (session.role !== "owner") activeSamithi = session.samithi_id || null;
    else activeSamithi = sessionStorage.getItem("samithi_active_samithi") || null;
  }
} catch {}

function setActiveSamithi(slug) {
  activeSamithi = slug;
  if (slug) sessionStorage.setItem("samithi_active_samithi", slug);
  else sessionStorage.removeItem("samithi_active_samithi");
}

function saveSession(s) {
  session = s;
  if (s) sessionStorage.setItem("samithi_session", JSON.stringify(s));
  else sessionStorage.removeItem("samithi_session");
}

function clearSession() {
  saveSession(null);
  sessionMode = false;
  legacyMode = false;
  authed = false;
  setActiveSamithi(null);
  store = {};
  render();
  renderLogin();
}

function isOwner() {
  return !!(sessionMode && session && session.role === "owner");
}

// Personal-data collections are excluded from the public /api/site aggregate
// (server-side security) — the CMS loads them individually with the token.
const PRIVATE_COLLECTIONS = ["members", "balvikas"];

const COLLECTIONS = [
  { name: "siteconfig", label: "Site Settings", icon: "⚙️", group: "General" },
  { name: "events", label: "Upcoming Events", icon: "📅", group: "Content" },
  { name: "services", label: "Services", icon: "🤝", group: "Content" },
  { name: "coordinators", label: "Coordinators", icon: "👥", group: "Content" },
  { name: "gallery", label: "Gallery", icon: "🖼️", group: "Content" },
  { name: "homegallery", label: "Home Gallery", icon: "🏠", group: "Content" },
  { name: "stats", label: "Stats", icon: "📊", group: "Data" },
  { name: "activities", label: "Activities", icon: "📈", group: "Data" },
  { name: "about", label: "About Sections", icon: "📄", group: "Content" },
  { name: "members", label: "Members", icon: "🧑‍🤝‍🧑", group: "People" },
  { name: "balvikas", label: "Balvikas Children", icon: "🧒", group: "People" },
];

// Pseudo-views: rendered by dedicated screens, never saved as collections.
const PSEUDO_VIEWS = [
  { name: "owner", label: "Owner Console", icon: "👑", group: "Admin", pseudo: true, ownerOnly: true },
  { name: "account", label: "Account", icon: "👤", group: "Admin", pseudo: true },
];

function allViews() {
  return COLLECTIONS.concat(PSEUDO_VIEWS);
}

function findView(name) {
  return allViews().find((c) => c.name === name);
}

let store = {};
let activeCollection = null; // null = dashboard
let dirty = false;

const $ = (sel) => document.querySelector(sel);
const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  attrs = attrs || {};
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k === "style" && typeof v === "object") Object.assign(node.style, v);
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null) node.setAttribute(k, v);
  }
  for (const c of children) {
    if (c === null || c === undefined) continue;
    node.append(c.nodeType ? c : document.createTextNode(c));
  }
  return node;
};

function toast(msg, type = "ok") {
  const t = el("div", { class: `toast ${type}` }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), 2800);
}

async function getToken() {
  let token = sessionStorage.getItem("samithi_admin_token") || "";
  if (!token) {
    token = window.prompt("Enter admin token:") || "";
    token = token.trim();
    if (token) sessionStorage.setItem("samithi_admin_token", token);
  }
  return token;
}

function authHeaders(extra = {}) {
  // Session transport: X-Session-Token. NEVER Authorization: Bearer — the
  // Catalyst gateway intercepts Bearer as its own OAuth and 401s.
  if (sessionMode && session && session.token) {
    return { ...extra, "X-Session-Token": session.token };
  }
  const token = sessionStorage.getItem("samithi_admin_token") || "";
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

async function api(path, opts = {}, retried = false) {
  const res = await fetch(apiUrl(path), {
    ...opts,
    headers: { "Content-Type": "application/json", ...authHeaders(opts.headers || {}) },
  });
  if (res.status === 401 && !retried) {
    if (sessionMode) {
      // Session died server-side (or was never valid here): back to login.
      clearSession();
      throw new Error("401 Session expired — please sign in again");
    }
    sessionStorage.removeItem("samithi_admin_token");
    const token = await getToken();
    if (token) return api(path, opts, true);
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (body && body.error) detail = body.error;
    } catch {}
    const err = new Error(`${res.status} ${detail}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// Sign in with convenor credentials. Throws on failure; on legacy servers
// without /auth/login (404) the caller falls back to the token prompt.
async function doLogin(login, password) {
  let res;
  try {
    res = await fetch(apiUrl("/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password }),
    });
  } catch {
    throw new Error("Server unreachable — is it running?");
  }
  if (res.status === 404) {
    const err = new Error("legacy server");
    err.status = 404;
    throw err;
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (body && body.error) detail = body.error;
    } catch {}
    throw new Error(`${res.status} ${detail}`);
  }
  const data = await res.json();
  saveSession({ token: data.token, samithi_id: data.samithi_id || "", name: data.name || login, role: data.role || "convenor" });
  sessionMode = true;
  legacyMode = false;
  authed = true;
  activeSamithi = data.role === "owner" ? null : data.samithi_id || null;
  sessionStorage.removeItem("samithi_active_samithi");
}

// Sign-in screen: convenor login first, API base configurable for Slate.
function renderLogin(view) {
  const card = el("div", { class: "card", style: { maxWidth: "420px", margin: "8vh auto 0" } });
  card.append(
    el("div", { class: "card-head" },
      el("div", null,
        el("h3", null, "🔐 Samithi Admin"),
        el("p", null, "Sign in with your convenor login. No public signup — logins are issued by the organisation."),
        el("p", { style: { fontSize: "12px", color: "var(--muted)", marginTop: "4px" } },
          "Open this page through its server (http://localhost:3001) — not by double-clicking the file.")))
  );
  const errBox = el("div", { class: "field-error", style: { display: "none", marginBottom: "10px" } });
  const loginInput = el("input", { type: "text", name: "login", placeholder: "Login id", autocomplete: "username", style: { width: "100%" } });
  const passInput = el("input", { type: "password", name: "password", placeholder: "Password", autocomplete: "current-password", style: { width: "100%" } });
  const baseDetails = el("details", { style: { marginTop: "10px", fontSize: "12px", color: "var(--muted)" } });
  const baseSummary = el("summary", { style: { cursor: "pointer" } }, "Advanced: API server address");
  const baseInput = el("input", {
    type: "text", placeholder: "https://…/server/site-api/execute (empty = same server)",
    value: localStorage.getItem("samithi_api_base") || "", style: { width: "100%", marginTop: "6px" },
  });
  baseDetails.append(baseSummary, el("div", null, "Set this only when the admin is hosted separately (e.g. Slate) from the API.", baseInput));
  const submit = async () => {
    errBox.style.display = "none";
    const login = loginInput.value.trim();
    const password = passInput.value;
    if (!login || !password) {
      errBox.textContent = "Enter your login id and password.";
      errBox.style.display = "block";
      return;
    }
    localStorage.setItem("samithi_api_base", baseInput.value.trim().replace(/\/$/, ""));
    submitBtn.disabled = true;
    submitBtn.textContent = "Signing in…";
    try {
      await doLogin(login, password);
    } catch (e) {
      if (e.status === 404) {
        // Legacy standalone server without /auth/* — fall back to token prompt.
        submitBtn.disabled = false;
        submitBtn.textContent = "Sign In";
        legacyMode = true;
        try {
          const token = await getToken();
          if (!token) {
            errBox.textContent = "Sign-in cancelled.";
            errBox.style.display = "block";
            return;
          }
          authed = true;
          await loadAll();
          buildNav();
          render();
          updateUndoRedoButtons();
          toast("✅ Signed in (legacy token mode)");
          const s = $("#save-state");
          if (s) { s.textContent = ""; s.className = "save-state"; }
        } catch (err2) {
          errBox.textContent = "Failed to load: " + err2.message;
          errBox.style.display = "block";
        }
        return;
      }
      errBox.textContent = "Sign-in failed: " + e.message;
      errBox.style.display = "block";
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign In";
      return;
    }
    try {
      if (isOwner() && !activeSamithi) {
        // Owner picks a samithi context after signing in.
        buildNav();
        selectCollection("owner");
        updateUndoRedoButtons();
        toast(`✅ Signed in as ${session.name} (owner)`);
        return;
      }
      await loadAll();
      buildNav();
      render();
      updateUndoRedoButtons();
      toast(`✅ Signed in as ${session.name}`);
    } catch (e) {
      errBox.textContent = "Failed to load: " + e.message;
      errBox.style.display = "block";
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign In";
    }
  };
  const submitBtn = el("button", { class: "btn btn-primary", style: { width: "100%", marginTop: "12px" }, onclick: submit }, "Sign In");
  const onKey = (e) => { if (e.key === "Enter") submit(); };
  loginInput.addEventListener("keydown", onKey);
  passInput.addEventListener("keydown", onKey);
  card.append(
    el("div", { class: "field" }, el("label", null, "Login id"), loginInput),
    el("div", { class: "field" }, el("label", null, "Password"), passInput),
    errBox,
    submitBtn,
    baseDetails
  );
  view.append(card);
  setTimeout(() => loginInput.focus(), 50);
}

async function loadAll() {
  if (sessionMode) {
    // Multi-tenant SaaS path: one tenant payload per session (owner picks a
    // samithi context first — without it there is nothing to load).
    if (isOwner() && !activeSamithi) {
      store = {};
      undoStack = [];
      redoStack = [];
      buildNav();
      render();
      updateUndoRedoButtons();
      return;
    }
    const q = isOwner() ? `?samithi=${encodeURIComponent(activeSamithi)}` : "";
    const data = await api(`/content${q}`);
    store = data;
    undoStack = [];
    redoStack = [];
    buildNav();
    render();
    updateUndoRedoButtons();
    return;
  }
  const data = await api("/site");
  store = data;
  // Fetch private collections separately (token-gated server-side). A 401
  // here means the token wasn't accepted — keep the UI usable with empty
  // lists rather than blanking the dashboard.
  for (const name of PRIVATE_COLLECTIONS) {
    if (!Array.isArray(store[name])) {
      try {
        const list = await api(`/${name}`);
        store[name] = Array.isArray(list) ? list : [];
      } catch {
        store[name] = store[name] || [];
      }
    }
  }
  undoStack = [];
  redoStack = [];
  buildNav();
  render();
  updateUndoRedoButtons();
}

/* ================================================================
   Navigation
   ================================================================ */

function buildNav() {
  const nav = $("#nav");
  nav.innerHTML = "";

  // Dashboard button
  const dashBtn = el(
    "button",
    {
      class: `nav-item ${activeCollection === null ? "active" : ""}`,
      onclick: () => selectCollection(null),
    },
    el("span", { class: "nav-icon" }, "📊"),
    "Dashboard"
  );
  nav.append(dashBtn);

  // Group by category (owner console only visible to owners when signed in)
  const groups = {};
  const visible = COLLECTIONS.concat(
    PSEUDO_VIEWS.filter((c) => {
      if (c.ownerOnly && !isOwner()) return false;
      if (!authed) return false;
      return true;
    })
  );
  for (const c of visible) {
    if (!groups[c.group]) groups[c.group] = [];
    groups[c.group].push(c);
  }

  for (const [groupName, items] of Object.entries(groups)) {
    nav.append(el("div", { class: "nav-section-label" }, groupName));
    for (const c of items) {
      const count = Array.isArray(store[c.name]) ? store[c.name].length : null;
      nav.append(
        el(
          "button",
          {
            class: `nav-item ${activeCollection === c.name ? "active" : ""}`,
            onclick: () => selectCollection(c.name),
          },
          el("span", { class: "nav-icon" }, c.icon),
          c.label,
          count !== null ? el("span", { class: "count" }, String(count)) : null
        )
      );
    }
  }
}

function selectCollection(name) {
  activeCollection = name;
  searchQuery = "";
  sortBy = "default";
  selectedItems = new Set();
  $("#sidebar").classList.remove("open");
  const backdrop = $("#sidebar-backdrop");
  if (backdrop) backdrop.classList.remove("visible");
  buildNav();
  render();
  // Close quick-add dropdown
  const dd = $("#quick-add-dropdown");
  if (dd) dd.classList.remove("open");
}

/* ================================================================
   Render
   ================================================================ */

let currentTemplate = localStorage.getItem("admin-dashboard-template") || "overview";
let currentViewMode = localStorage.getItem("admin-view-mode") || "list";

function render() {
  updateBreadcrumb();
  // #page-title was removed from the markup (breadcrumb shows location);
  // guard keeps this safe if the element ever returns.
  const pageTitle = $("#page-title");
  const view = $("#view");
  view.innerHTML = "";
  if (!authed) {
    if (pageTitle) pageTitle.textContent = "Sign in";
    renderLogin(view);
    updateQuickAdd();
    return;
  }
  if (activeCollection === null) {
    if (pageTitle) pageTitle.textContent = "Dashboard";
    renderDashboard(view);
  } else if (activeCollection === "owner") {
    if (!isOwner()) {
      selectCollection(null);
      return;
    }
    if (pageTitle) pageTitle.textContent = "Owner Console";
    renderOwner(view);
  } else if (activeCollection === "account") {
    if (pageTitle) pageTitle.textContent = "Account";
    renderAccount(view);
  } else {
    const meta = findView(activeCollection);
    if (pageTitle) pageTitle.textContent = meta ? meta.label : "";
    if (activeCollection === "siteconfig") renderSiteConfig(view);
    else renderCollection(view, activeCollection, meta);
  }
  updateQuickAdd();
}

function updateBreadcrumb() {
  const bc = $("#breadcrumb");
  if (!bc) return;
  bc.innerHTML = "";
  bc.append(el("span", { class: "breadcrumb-home", onclick: () => selectCollection(null), style: { cursor: "pointer" } }, "Dashboard"));
  if (activeCollection) {
    const meta = findView(activeCollection);
    bc.append(el("span", { class: "breadcrumb-sep" }, "/"));
    bc.append(el("span", { class: "breadcrumb-current" }, meta ? meta.label : activeCollection));
  }
}

function updateQuickAdd() {
  const dd = $("#quick-add-dropdown");
  if (!dd) return;
  dd.innerHTML = "";
  const addable = COLLECTIONS.filter((c) => !c.pseudo && c.name !== "siteconfig" && c.name !== "stats" && c.name !== "activities");
  for (const c of addable) {
    dd.append(
      el(
        "button",
        { class: "quick-add-item", onclick: () => { dd.classList.remove("open"); editItem(c.name, null); } },
        el("span", { class: "qai-icon" }, c.icon),
        `Add ${c.label.replace(/s$/, "")}`
      )
    );
  }
}

/* ================================================================
   Dashboard Overview
   ================================================================ */

function renderDashboard(view) {
  // Stats grid
  const statsData = [
    {
      icon: "📅",
      label: "Events",
      value: Array.isArray(store.events) ? store.events.length : 0,
      color: "blue",
    },
    {
      icon: "🤝",
      label: "Services",
      value: Array.isArray(store.services) ? store.services.length : 0,
      color: "green",
    },
    {
      icon: "👥",
      label: "Coordinators",
      value: Array.isArray(store.coordinators) ? store.coordinators.length : 0,
      color: "purple",
    },
    {
      icon: "🖼️",
      label: "Gallery Items",
      value: Array.isArray(store.gallery) ? store.gallery.reduce((sum, g) => sum + (g.images?.length || 0), 0) : 0,
      color: "orange",
    },
    {
      icon: "📊",
      label: "Stats Entries",
      value: Array.isArray(store.stats) ? store.stats.length : 0,
      color: "cyan",
    },
    {
      icon: "🧑‍🤝‍🧑",
      label: "Members",
      value: Array.isArray(store.members) ? store.members.length : 0,
      color: "yellow",
    },
  ];

  // Template picker (desktop only)
  const picker = el("div", { class: "template-picker" });
  const templates = [
    { id: "overview", icon: "📊", label: "Overview" },
    { id: "compact", icon: "📋", label: "Compact" },
    { id: "analytics", icon: "📈", label: "Analytics" },
  ];
  for (const t of templates) {
    picker.append(
      el(
        "button",
        {
          class: `template-btn ${currentTemplate === t.id ? "active" : ""}`,
          title: t.label,
          onclick: () => {
            currentTemplate = t.id;
            localStorage.setItem("admin-dashboard-template", t.id);
            render();
          },
        },
        t.icon
      )
    );
  }

  // Template header
  const totalItems = statsData.reduce((sum, s) => sum + s.value, 0);
  const templateHeader = el("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" } });
  templateHeader.append(
    el("div", null,
      el("h2", { style: { fontSize: "20px", fontWeight: "700", color: "var(--text)" } }, "Welcome back"),
      el("p", { style: { fontSize: "13px", color: "var(--muted)", marginTop: "2px" } }, "Here's what's happening with your content")
    ),
    picker
  );
  view.append(templateHeader);

  // Featured stat card
  const featuredCard = el("div", { class: "stat-card stat-card-featured", style: { marginBottom: "16px" } });
  featuredCard.append(
    el("div", { class: "stat-icon" }, "🏛️"),
    el("div", { class: "stat-info" },
      el("div", { class: "stat-value" }, String(totalItems)),
      el("div", { class: "stat-label" }, "Total Content Items")
    )
  );
  view.append(featuredCard);

  const gridClass = `dashboard-grid ${currentTemplate === "compact" ? "dashboard-compact" : ""} ${currentTemplate === "analytics" ? "dashboard-analytics" : ""}`;
  const grid = el("div", { class: gridClass });
  for (const s of statsData) {
    const card = el("div", { class: "stat-card" },
      el("div", { class: `stat-icon ${s.color}` }, s.icon),
      el("div", { class: "stat-info" },
        el("div", { class: "stat-value" }, String(s.value)),
        el("div", { class: "stat-label" }, s.label)
      )
    );
    if (currentTemplate === "analytics" && totalItems > 0) {
      const pct = Math.round((s.value / totalItems) * 100);
      const colorMap = { blue: "primary", green: "green", purple: "accent", orange: "orange", cyan: "cyan", yellow: "yellow" };
      card.append(
        el("div", { class: "analytics-bar" },
          el("div", { class: "analytics-bar-fill", style: { width: `${pct}%`, background: `var(--${colorMap[s.color] || "primary"})` } })
        )
      );
    }
    grid.append(card);
  }
  view.append(grid);

  // Quick actions
  const actions = el("div", { class: "quick-actions" });
  actions.append(
    el(
      "button",
      { class: "btn btn-primary", onclick: () => selectCollection("events") },
      "📅 Manage Events"
    ),
    el(
      "button",
      { class: "btn btn-ghost", onclick: () => selectCollection("gallery") },
      "🖼️ Manage Gallery"
    ),
    el(
      "button",
      { class: "btn btn-ghost", onclick: () => selectCollection("coordinators") },
      "👥 Manage Coordinators"
    ),
    el(
      "button",
      { class: "btn btn-ghost", onclick: () => selectCollection("siteconfig") },
      "⚙️ Site Settings"
    )
  );
  view.append(actions);

  // Content overview cards
  const overviewGrid = el("div", { class: "grid", style: { gridTemplateColumns: "1fr 1fr", gap: "16px" } });

  // Recent events card
  const eventsCard = el("div", { class: "card" });
  eventsCard.append(
    el(
      "div",
      { class: "card-head" },
      el("div", null, el("h3", null, "📅 Upcoming Events")),
      el(
        "button",
        { class: "btn btn-ghost btn-sm", onclick: () => selectCollection("events") },
        "View All →"
      )
    )
  );
  const events = Array.isArray(store.events) ? store.events.slice(0, 3) : [];
  if (events.length === 0) {
    eventsCard.append(el("div", { class: "empty" }, el("div", { class: "empty-icon" }, "📅"), "No events yet"));
  } else {
    const list = el("div", { class: "activity-list" });
    for (const ev of events) {
      list.append(
        el(
          "div",
          { class: "activity-item" },
          el("div", { class: "activity-dot", style: { background: "var(--primary)" } }),
          el("div", { style: { flex: "1" } },
            el("div", { style: { fontWeight: "600", fontSize: "13px" } }, ev.title || "Untitled"),
            ev.description ? el("div", { style: { fontSize: "12px", color: "var(--muted)", marginTop: "2px" } }, ev.description.slice(0, 80) + (ev.description.length > 80 ? "..." : "")) : null
          )
        )
      );
    }
    eventsCard.append(list);
  }
  overviewGrid.append(eventsCard);

  // Services card
  const servicesCard = el("div", { class: "card" });
  servicesCard.append(
    el(
      "div",
      { class: "card-head" },
      el("div", null, el("h3", null, "🤝 Services")),
      el(
        "button",
        { class: "btn btn-ghost btn-sm", onclick: () => selectCollection("services") },
        "View All →"
      )
    )
  );
  const svcs = Array.isArray(store.services) ? store.services.slice(0, 3) : [];
  if (svcs.length === 0) {
    servicesCard.append(el("div", { class: "empty" }, el("div", { class: "empty-icon" }, "🤝"), "No services yet"));
  } else {
    const list = el("div", { class: "activity-list" });
    for (const s of svcs) {
      list.append(
        el(
          "div",
          { class: "activity-item" },
          el("div", { class: "activity-dot", style: { background: "var(--green)" } }),
          el("div", { style: { flex: "1" } },
            el("div", { style: { fontWeight: "600", fontSize: "13px" } }, s.title || "Untitled"),
            s.description ? el("div", { style: { fontSize: "12px", color: "var(--muted)", marginTop: "2px" } }, s.description.slice(0, 80) + (s.description.length > 80 ? "..." : "")) : null
          )
        )
      );
    }
    servicesCard.append(list);
  }
  overviewGrid.append(servicesCard);

  // Coordinators card
  const coordCard = el("div", { class: "card" });
  coordCard.append(
    el(
      "div",
      { class: "card-head" },
      el("div", null, el("h3", null, "👥 Coordinators")),
      el(
        "button",
        { class: "btn btn-ghost btn-sm", onclick: () => selectCollection("coordinators") },
        "View All →"
      )
    )
  );
  const coords = Array.isArray(store.coordinators) ? store.coordinators.slice(0, 4) : [];
  if (coords.length === 0) {
    coordCard.append(el("div", { class: "empty" }, el("div", { class: "empty-icon" }, "👥"), "No coordinators yet"));
  } else {
    const list = el("div", { class: "activity-list" });
    for (const c of coords) {
      list.append(
        el(
          "div",
          { class: "activity-item" },
          el("div", { class: "activity-dot", style: { background: "var(--accent)" } }),
          el("div", { style: { flex: "1" } },
            el("div", { style: { fontWeight: "600", fontSize: "13px" } }, c.name || "Unnamed"),
            el("div", { style: { fontSize: "12px", color: "var(--muted)", marginTop: "2px" } }, c.role || "")
          )
        )
      );
    }
    coordCard.append(list);
  }
  overviewGrid.append(coordCard);

  // Gallery summary card
  const galleryCard = el("div", { class: "card" });
  galleryCard.append(
    el(
      "div",
      { class: "card-head" },
      el("div", null, el("h3", null, "🖼️ Gallery")),
      el(
        "button",
        { class: "btn btn-ghost btn-sm", onclick: () => selectCollection("gallery") },
        "View All →"
      )
    )
  );
  const gal = Array.isArray(store.gallery) ? store.gallery : [];
  if (gal.length === 0) {
    galleryCard.append(el("div", { class: "empty" }, el("div", { class: "empty-icon" }, "🖼️"), "No gallery folders yet"));
  } else {
    const list = el("div", { class: "activity-list" });
    for (const g of gal) {
      list.append(
        el(
          "div",
          { class: "activity-item" },
          el("div", { class: "activity-dot", style: { background: "var(--orange)" } }),
          el("div", { style: { flex: "1" } },
            el("div", { style: { fontWeight: "600", fontSize: "13px" } }, g.label || g.slug || "Unnamed"),
            el("div", { style: { fontSize: "12px", color: "var(--muted)", marginTop: "2px" } }, `${g.images?.length || 0} images`)
          )
        )
      );
    }
    galleryCard.append(list);
  }
  overviewGrid.append(galleryCard);

  view.append(overviewGrid);

  // Site info footer
  if (store.siteconfig?.siteConfig) {
    const sc = store.siteconfig.siteConfig;
    const infoCard = el("div", { class: "card", style: { marginTop: "8px" } });
    infoCard.append(
      el("div", { class: "card-head" }, el("div", null, el("h3", null, "ℹ️ Site Information"))),
      el(
        "div",
        { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", fontSize: "13px" } },
        el("div", null,
          el("div", { style: { color: "var(--muted)", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px" } }, "Organization"),
          el("div", { style: { fontWeight: "600" } }, sc.orgName || "—")
        ),
        el("div", null,
          el("div", { style: { color: "var(--muted)", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px" } }, "Email"),
          el("div", { style: { fontWeight: "500" } }, sc.email || "—")
        ),
        el("div", null,
          el("div", { style: { color: "var(--muted)", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px" } }, "Phone"),
          el("div", { style: { fontWeight: "500" } }, sc.phone || "—")
        )
      )
    );
    view.append(infoCard);
  }
}

/* ================================================================
   Dirty tracking
   ================================================================ */

function markDirty() {
  dirty = true;
  const s = $("#save-state");
  if (!s) return;
  s.textContent = "Unsaved changes";
  s.className = "save-state";
}

function clearDirty(msg) {
  dirty = false;
  const s = $("#save-state");
  if (!s) return;
  s.textContent = msg || "";
  s.className = "save-state saved";
}

/* ================================================================
   Generic collection editor (arrays of objects)
   ================================================================ */

let searchQuery = "";
let sortBy = "default";
let selectedItems = new Set(); // Set of original indices for current collection
let dragSourceIndex = null; // Track the index being dragged
let isSaving = false; // Guard against double-save

/* ================================================================
   Undo / Redo History
   ================================================================ */

let undoStack = [];
let redoStack = [];
const MAX_HISTORY = 50;

function cloneStore() {
  return JSON.parse(JSON.stringify(store));
}

function pushSnapshot() {
  undoStack.push(cloneStore());
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack = [];
  updateUndoRedoButtons();
}

function undo() {
  if (undoStack.length === 0) return;
  redoStack.push(cloneStore());
  store = undoStack.pop();
  markDirty();
  render();
  updateUndoRedoButtons();
  logActivity("undo", "↩ Undid last action");
  toast("↩ Undone");
}

function redo() {
  if (redoStack.length === 0) return;
  undoStack.push(cloneStore());
  store = redoStack.pop();
  markDirty();
  render();
  updateUndoRedoButtons();
  logActivity("redo", "↪ Redid last action");
  toast("↪ Redone");
}

function updateUndoRedoButtons() {
  const undoBtn = $("#undo-btn");
  const redoBtn = $("#redo-btn");
  if (undoBtn) {
    undoBtn.disabled = undoStack.length === 0;
    undoBtn.title = undoStack.length > 0
      ? `Undo (${undoStack.length} step${undoStack.length > 1 ? "s" : ""}) — Ctrl+Z`
      : "Nothing to undo — Ctrl+Z";
  }
  if (redoBtn) {
    redoBtn.disabled = redoStack.length === 0;
    redoBtn.title = redoStack.length > 0
      ? `Redo (${redoStack.length} step${redoStack.length > 1 ? "s" : ""}) — Ctrl+Shift+Z`
      : "Nothing to redo — Ctrl+Shift+Z";
  }
}

function getSortOptions(name) {
  const opts = [
    { value: "default", label: "Default order" },
    { value: "az", label: "A → Z" },
    { value: "za", label: "Z → A" },
  ];
  // Add date-based sort for collections that likely have time-based data
  if (["events", "gallery", "homegallery"].includes(name)) {
    opts.push({ value: "newest", label: "Newest first" });
    opts.push({ value: "oldest", label: "Oldest first" });
  }
  return opts;
}

function filterItems(items, query) {
  if (!query.trim()) return items;
  const q = query.toLowerCase().trim();
  return items.filter((item) => {
    const searchable = [
      pickTitle(item),
      pickSub(item),
      item?.role,
      item?.name,
      item?.label,
      item?.slug,
      item?.heading,
      item?.icon,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return searchable.includes(q);
  });
}

function sortItems(items, sort) {
  if (sort === "default") return items;
  const sorted = [...items];
  switch (sort) {
    case "az":
      return sorted.sort((a, b) => pickTitle(a).localeCompare(pickTitle(b)));
    case "za":
      return sorted.sort((a, b) => pickTitle(b).localeCompare(pickTitle(a)));
    case "newest":
      return sorted.reverse(); // newest = last added
    case "oldest":
      return sorted;
    default:
      return sorted;
  }
}

function renderCollection(view, name, meta) {
  const allItems = Array.isArray(store[name]) ? store[name] : [];
  const filtered = sortItems(filterItems(allItems, searchQuery), sortBy);

  const card = el("div", { class: "card" });

  // Bulk toolbar placeholder (shown when items selected)
  const bulkToolbar = el("div", { class: "bulk-toolbar", style: { display: "none" } });
  const bulkCount = el("span", { class: "bulk-count" }, "0 selected");
  const bulkActions = el("div", { class: "bulk-actions" });
  bulkToolbar.append(bulkCount, bulkActions);

  function updateBulkToolbar() {
    const count = selectedItems.size;
    if (count === 0) {
      bulkToolbar.style.display = "none";
    } else {
      bulkToolbar.style.display = "flex";
      bulkCount.textContent = `${count} selected`;
      bulkActions.innerHTML = "";

      bulkActions.append(
        el("button", { class: "btn btn-ghost btn-sm", onclick: () => exportSelectedJSON(name, meta) }, "📥 Export JSON"),
        el("button", { class: "btn btn-danger btn-sm", onclick: () => bulkDelete(name) }, "🗑️ Delete Selected")
      );
    }
  }

  // Header with count + select all + add button
  const headerRight = el("div", { style: { display: "flex", alignItems: "center", gap: "12px" } });

  if (allItems.length > 0) {
    const selectAllWrap = el("div", { class: "select-all-checkbox" });
    const selectAllCb = el("input", { type: "checkbox" });
    const selectAllLabel = el("label", null, "Select all");
    selectAllLabel.setAttribute("for", `select-all-${name}`);
    selectAllCb.id = `select-all-${name}`;
    selectAllCb.addEventListener("change", () => {
      if (selectAllCb.checked) {
        filtered.forEach((item) => selectedItems.add(allItems.indexOf(item)));
      } else {
        filtered.forEach((item) => selectedItems.delete(allItems.indexOf(item)));
      }
      updateBulkToolbar();
      renderCollectionGrid(grid, emptyState, name, allItems, filtered, meta, resultsCount, updateBulkToolbar);
    });
    selectAllWrap.append(selectAllCb, selectAllLabel);
    headerRight.append(selectAllWrap);
  }

  if (allItems.length > 0) {
    // View toggle (grid/list)
    const viewToggle = el("div", { class: "view-toggle" });
    viewToggle.append(
      el("button", {
        class: `view-toggle-btn ${currentViewMode === "list" ? "active" : ""}`,
        title: "List view",
        onclick: () => { currentViewMode = "list"; localStorage.setItem("admin-view-mode", "list"); render(); },
      }, "☰"),
      el("button", {
        class: `view-toggle-btn ${currentViewMode === "grid" ? "active" : ""}`,
        title: "Grid view",
        onclick: () => { currentViewMode = "grid"; localStorage.setItem("admin-view-mode", "grid"); render(); },
      }, "⊞")
    );
    headerRight.append(viewToggle);
    headerRight.append(el("button", { class: "btn btn-ghost btn-sm", onclick: () => exportSelectedJSON(name, meta) }, "📥 Export JSON"));
  }
  headerRight.append(el("button", { class: "btn btn-primary btn-sm", onclick: () => { searchQuery = ""; sortBy = "default"; selectedItems = new Set(); editItem(name, null); } }, "+ Add Item"));

  card.append(
    el(
      "div",
      { class: "card-head" },
      el("div", null, el("h3", null, `${meta.icon} ${meta.label}`), el("p", null, `${allItems.length} item(s) total`)),
      headerRight
    )
  );

  card.append(bulkToolbar);

  // Search & filter toolbar (only show if there are items)
  if (allItems.length > 0) {
    const toolbar = el("div", { class: "toolbar" });

    // Search box
    const searchBox = el("div", { class: "search-box" });
    const searchIcon = el("span", { class: "search-icon" }, "🔍");
    const searchInput = el("input", {
      type: "text",
      placeholder: `Search ${meta.label.toLowerCase()}...`,
      value: searchQuery,
    });
    const clearBtn = el("button", {
      class: `search-clear ${searchQuery ? "visible" : ""}`,
      onclick: () => {
        searchInput.value = "";
        searchQuery = "";
        renderCollection(view, name, meta);
      },
    }, "✕");

    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      clearBtn.classList.toggle("visible", searchQuery.length > 0);
      renderCollectionGrid(grid, emptyState, name, allItems, sortItems(filterItems(allItems, searchQuery), sortBy), meta, resultsCount, updateBulkToolbar);
    });

    searchBox.append(searchIcon, searchInput, clearBtn);
    toolbar.append(searchBox);

    // Sort dropdown
    const sortOpts = getSortOptions(name);
    if (sortOpts.length > 1) {
      const filterGroup = el("div", { class: "filter-group" });
      filterGroup.append(el("label", null, "Sort:"));
      const select = el("select", { class: "filter-select" });
      for (const opt of sortOpts) {
        select.append(el("option", { value: opt.value, selected: sortBy === opt.value ? "selected" : null }, opt.label));
      }
      select.addEventListener("change", (e) => {
        sortBy = e.target.value;
        renderCollectionGrid(grid, emptyState, name, allItems, sortItems(filterItems(allItems, searchQuery), sortBy), meta, resultsCount, updateBulkToolbar);
      });
      filterGroup.append(select);
      toolbar.append(filterGroup);
    }

    // Results count
    const resultsCount = el("span", { class: "results-count" }, `${filtered.length} shown`);
    toolbar.append(resultsCount);

    card.append(toolbar);
  }

  // Grid of items
  const grid = el("div", { class: "grid" });
  const emptyState = el("div", { class: "empty" });

  renderCollectionGrid(grid, emptyState, name, allItems, filtered, meta, allItems.length > 0 ? el("span", { class: "results-count" }, `${filtered.length} shown`) : null, updateBulkToolbar);

  card.append(grid);
  card.append(emptyState);
  view.append(card);
}

function renderCollectionGrid(grid, emptyState, name, allItems, filtered, meta, resultsCount, updateBulkToolbar) {
  grid.innerHTML = "";
  emptyState.innerHTML = "";

  const canDrag = !searchQuery && sortBy === "default";
  if (!canDrag) grid.classList.add("drag-disabled");
  else grid.classList.remove("drag-disabled");

  if (allItems.length === 0) {
    emptyState.append(
      el("div", { class: "empty-icon" }, meta.icon),
      "No items yet. Click \"+ Add Item\" to create one."
    );
    emptyState.style.display = "block";
    return;
  }

  if (filtered.length === 0) {
    emptyState.append(
      el("div", { class: "no-results-icon" }, "🔍"),
      el("div", {}, `No results for `),
      el("span", { class: "no-results-query" }, `"${searchQuery}"`),
      el("div", { style: { marginTop: "6px", fontSize: "12px" } }, `Try a different search term or clear the filter.`)
    );
    emptyState.style.display = "block";
    if (resultsCount) resultsCount.textContent = `0 shown`;
    return;
  }

  emptyState.style.display = "none";
  if (resultsCount) resultsCount.textContent = `${filtered.length} shown`;

  // Re-find original indices for edit/delete
  filtered.forEach((item) => {
    const originalIndex = allItems.indexOf(item);
    grid.append(collectionCard(name, item, originalIndex, updateBulkToolbar));
  });

  // Set up drag-over and drop handlers on the grid
  // Remove old listeners first to prevent accumulation
  grid.removeEventListener("dragover", handleDragOver);
  grid.removeEventListener("dragleave", handleDragLeave);
  if (grid._dropHandler) grid.removeEventListener("drop", grid._dropHandler);
  if (canDrag) {
    grid.addEventListener("dragover", handleDragOver);
    grid.addEventListener("dragleave", handleDragLeave);
    grid._dropHandler = (e) => handleDrop(e, name);
    grid.addEventListener("drop", grid._dropHandler);
  }
}

/* ---------- Drag & Drop handlers ---------- */

function getDragTargetRow(e) {
  const row = e.target.closest(".row");
  if (!row) return null;
  const grid = row.parentElement;
  if (!grid || !grid.classList.contains("grid")) return null;
  // Only respond to drops within the same grid
  const rows = [...grid.querySelectorAll(".row")];
  const targetIndex = rows.indexOf(row);
  if (targetIndex === -1) return null;
  return { row, targetIndex, grid };
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  const target = getDragTargetRow(e);
  if (!target) return;

  // Clean previous indicators
  document.querySelectorAll(".row.drag-over, .row.drag-over-bottom").forEach((el) => {
    el.classList.remove("drag-over", "drag-over-bottom");
  });

  // Determine if dropping above or below the midpoint
  const rect = target.row.getBoundingClientRect();
  const midY = rect.top + rect.height / 2;
  if (e.clientY < midY) {
    target.row.classList.add("drag-over");
  } else {
    target.row.classList.add("drag-over", "drag-over-bottom");
  }
}

function handleDragLeave(e) {
  const row = e.target.closest(".row");
  if (row && !row.contains(e.relatedTarget)) {
    row.classList.remove("drag-over", "drag-over-bottom");
  }
}

function handleDrop(e, name) {
  e.preventDefault();
  const target = getDragTargetRow(e);
  if (!target || dragSourceIndex === null) return;

  const sourceIndex = dragSourceIndex;
  const targetIndex = target.targetIndex;

  // Clean indicators
  document.querySelectorAll(".row.drag-over, .row.drag-over-bottom").forEach((el) => {
    el.classList.remove("drag-over", "drag-over-bottom");
  });

  if (sourceIndex === targetIndex) return;

  // Determine drop position (above or below midpoint)
  const rect = target.row.getBoundingClientRect();
  const midY = rect.top + rect.height / 2;
  let insertAt = e.clientY < midY ? targetIndex : targetIndex + 1;

  // Adjust if dragging from before the insert point
  if (sourceIndex < insertAt) insertAt--;

  // Perform the reorder
  pushSnapshot();
  reorderItem(name, sourceIndex, insertAt);
  markDirty();
  logActivity("reorder", `Reordered item in <strong>${name}</strong>`);
  toast("↕️ Item reordered");
  render();
}

function reorderItem(name, fromIndex, toIndex) {
  if (!Array.isArray(store[name])) return;
  if (fromIndex < 0 || fromIndex >= store[name].length) return;
  if (toIndex < 0 || toIndex > store[name].length) return;
  const [item] = store[name].splice(fromIndex, 1);
  store[name].splice(toIndex > fromIndex ? toIndex - 1 : toIndex, 0, item);
}

function collectionCard(name, item, index, updateBulkToolbar) {
  const title = pickTitle(item);
  const sub = pickSub(item);
  const preview = pickPreview(item);
  const isSelected = selectedItems.has(index);

  // Drag handle (only when not searching/filtering/sorting)
  const canDrag = !searchQuery && sortBy === "default";
  const handle = el("span", { class: "drag-handle" }, "⠿");

  const checkbox = el("input", { type: "checkbox" });
  checkbox.checked = isSelected;
  checkbox.addEventListener("change", () => {
    if (checkbox.checked) selectedItems.add(index);
    else selectedItems.delete(index);
    box.classList.toggle("selected", checkbox.checked);
    if (updateBulkToolbar) updateBulkToolbar();
  });

  const checkmark = el("span", { class: "checkmark" }, "✓");
  const checkboxWrap = el("label", { class: "item-checkbox" }, checkbox, checkmark);

  const box = el(
    "div",
    { class: `row${isSelected ? " selected" : ""}` },
    checkboxWrap,
    canDrag ? handle : null,
    preview !== null
      ? el("img", { class: "thumb", src: preview, alt: "", onerror: "this.style.display='none'" })
      : null,
    el(
      "div",
      { class: "row-main" },
      el("div", { class: "row-title" }, title),
      sub ? el("div", { class: "row-sub" }, sub) : null
    ),
    el(
      "div",
      { class: "row-actions" },
      el("button", { class: "btn btn-ghost btn-sm", onclick: () => editItem(name, index) }, "✏️ Edit"),
      el("button", { class: "btn btn-danger btn-sm", onclick: () => deleteItem(name, index) }, "🗑️")
    )
  );

  // Set up drag events
  if (canDrag) {
    box.draggable = true;
    box.addEventListener("dragstart", (e) => {
      dragSourceIndex = index;
      box.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));
      // Slight delay so the dragging class renders after the browser captures the ghost
      requestAnimationFrame(() => box.classList.add("dragging"));
    });
    box.addEventListener("dragend", () => {
      dragSourceIndex = null;
      box.classList.remove("dragging");
      // Clean up all drag-over indicators
      document.querySelectorAll(".row.drag-over, .row.drag-over-bottom").forEach((el) => {
        el.classList.remove("drag-over", "drag-over-bottom");
      });
    });
  }

  return box;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function pickTitle(item) {
  if (typeof item !== "object") return escapeHtml(String(item));
  const raw = item.title || item.label || item.name || item.heading || item.strong || JSON.stringify(item).slice(0, 60);
  return escapeHtml(String(raw));
}

function pickSub(item) {
  if (typeof item !== "object") return "";
  const raw = item.description || item.role || item.text || item.href || "";
  return escapeHtml(String(raw));
}

function pickPreview(item) {
  if (typeof item !== "object") return null;
  return item.image || (item.images && item.images[0] && item.images[0].src) || item.src || null;
}

/* ---------- Bulk actions ---------- */

function bulkDelete(name) {
  const count = selectedItems.size;
  if (count === 0) return;
  if (!confirm(`Delete ${count} item(s)? This cannot be undone.`)) return;

  pushSnapshot();
  // Sort indices descending so splicing doesn't shift
  const indices = [...selectedItems].sort((a, b) => b - a);
  for (const i of indices) {
    if (Array.isArray(store[name]) && i >= 0 && i < store[name].length) {
      store[name].splice(i, 1);
    }
  }
  selectedItems = new Set();
  markDirty();
  toast(`🗑️ Deleted ${count} item(s)`);
  render();
}

function exportSelectedJSON(name, meta) {
  const items = Array.isArray(store[name]) ? store[name] : [];
  const selected = [...selectedItems]
    .filter((i) => i >= 0 && i < items.length)
    .map((i) => items[i]);

  const data = selected.length > 0 ? selected : items;
  const label = selected.length > 0 ? `${selected.length} selected` : `all ${items.length}`;

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `samithi-${name}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast(`📥 Exported ${label} ${meta.label} as JSON`);
}

/* ---------- Edit / create ---------- */

function editItem(name, index) {
  const isNew = index === null;
  if (!isNew && (!Array.isArray(store[name]) || index < 0 || index >= store[name].length)) {
    toast("Invalid item index", "err");
    return;
  }
  const item = isNew ? {} : { ...store[name][index] };
  if (name === "gallery") {
    editGalleryItem(index);
    return;
  }
  openOverlay(`Edit ${COLLECTIONS.find((c) => c.name === name).label}`, (overlay) => {
    const form = renderFormFor(name, item);
    const actions = el(
      "div",
      { class: "editor-actions" },
      el("div", { class: "spacer" }),
      el("button", { class: "btn btn-ghost", onclick: () => overlay.remove() }, "Cancel"),
      el(
        "button",
        {
          class: "btn btn-primary",
          onclick: (e) => {
            e.preventDefault();
            // Validate if rules exist for this collection
            const rules = VALIDATION_RULES[name];
            if (rules && !validateForm(form, rules)) return;

            pushSnapshot();
            const value = collectForm(form, name);
            if (value === null) return;
            if (isNew) {
              if (Array.isArray(store[name])) store[name].push(value);
              else store[name] = value;
              logActivity("create", `Created <strong>${pickTitle(value)}</strong> in ${name}`);
            } else {
              if (Array.isArray(store[name])) store[name][index] = value;
              else store[name] = value;
              logActivity("update", `Updated <strong>${pickTitle(value)}</strong> in ${name}`);
            }
            markDirty();
            overlay.remove();
            render();
            toast(isNew ? "✅ Added" : "✅ Updated");
          },
        },
        isNew ? "➕ Create" : "💾 Save"
      )
    );
    return [form, actions];
  });
}

function editGalleryItem(index) {
  const isNew = index === null;
  const item = isNew
    ? { slug: "", label: "", icon: "fa-om", description: "", images: [] }
    : { ...store.gallery[index], images: [...store.gallery[index].images] };

  openOverlay(isNew ? "New Gallery Folder" : "Edit Gallery Folder", (overlay) => {
    const form = el("div", {});
    for (const [key, label, type] of [
      ["slug", "Slug (URL path)", "text"],
      ["label", "Label", "text"],
      ["icon", "Icon key", "text"],
      ["description", "Description", "textarea"],
    ]) {
      form.append(
        el(
          "div",
          { class: "field" },
          el("label", null, label),
          type === "textarea"
            ? el("textarea", { name: key, rows: 3 }, item[key] ?? "")
            : el("input", { type: "text", name: key, value: item[key] ?? "" })
        )
      );
    }

    form.append(el("hr", { class: "separator" }));
    form.append(el("h3", { style: { fontSize: "14px", marginBottom: "10px", fontWeight: "700" } }, `📸 Images (${item.images.length})`));
    const imgBox = el("div", {});
    const countEl = form.querySelector("h3");

    const addImageRow = (img) => {
      imgBox.append(
        el(
          "div",
          { class: "sub-item" },
          el("img", { class: "thumb", src: img.src, alt: "", onerror: "this.style.display='none'" }),
          el("input", { type: "text", value: img.src, placeholder: "Image URL", oninput: (e) => (img.src = e.target.value) }),
          el("input", { type: "text", value: img.title || "", placeholder: "Title", style: { maxWidth: "130px" }, oninput: (e) => (img.title = e.target.value) }),
          el("input", { type: "text", value: img.description || "", placeholder: "Caption", style: { maxWidth: "150px" }, oninput: (e) => (img.description = e.target.value) }),
          el(
            "button",
            {
              class: "btn btn-danger btn-sm",
              onclick: () => {
                const idx = item.images.indexOf(img);
                if (idx !== -1) item.images.splice(idx, 1);
                img.remove();
                markDirty();
                countEl.textContent = `📸 Images (${item.images.length})`;
              },
            },
            "✕"
          )
        )
      );
    };
    item.images.forEach(addImageRow);
    const addImg = el(
      "button",
      {
        class: "btn btn-ghost btn-sm",
        style: { marginTop: "8px" },
        onclick: () => {
          const img = { src: "", title: "", description: "" };
          item.images.push(img);
          addImageRow(img);
          markDirty();
          countEl.textContent = `📸 Images (${item.images.length})`;
        },
      },
      "+ Add image"
    );
    imgBox.append(addImg);
    form.append(imgBox);

    const uploadBox = el("div", { class: "field", style: { marginTop: "14px" } });
    uploadBox.append(el("label", null, "📤 Upload image (appends to list)"));
    const fileInput = el("input", {
      type: "file",
      accept: "image/*",
      onchange: async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const res = await fetch(API + "/upload", {
            method: "POST",
            headers: authHeaders({ "Content-Type": "application/octet-stream", "X-Filename": file.name }),
            body: await file.arrayBuffer(),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || "upload failed");
          const img = { src: json.url, title: "", description: "" };
          item.images.push(img);
          addImageRow(img);
          markDirty();
          countEl.textContent = `📸 Images (${item.images.length})`;
          toast("✅ Image uploaded");
        } catch (err) {
          toast(err.message, "err");
        }
      },
    });
    uploadBox.append(fileInput);
    form.append(uploadBox);

    const actions = el(
      "div",
      { class: "editor-actions" },
      el("div", { class: "spacer" }),
      el("button", { class: "btn btn-ghost", onclick: () => overlay.remove() }, "Cancel"),
      el(
        "button",
        {
          class: "btn btn-primary",
          onclick: () => {
            const slug = form.querySelector("input[name=slug]").value.trim();
            const existing = store.gallery.findIndex((g) => g.slug === slug);
            if (!slug) {
              toast("Slug is required", "err");
              return;
            }
            if (existing !== -1 && existing !== index) {
              toast("Slug already exists", "err");
              return;
            }
            item.slug = slug;
            item.label = form.querySelector("input[name=label]").value.trim() || slug;
            item.icon = form.querySelector("input[name=icon]").value.trim() || "fa-om";
            item.description = form.querySelector("textarea[name=description]").value;
            item.images = item.images.filter((img) => img.src);
            pushSnapshot();
            if (isNew) store.gallery.push(item);
            else store.gallery[index] = item;
            markDirty();
            overlay.remove();
            render();
            toast(isNew ? "✅ Gallery folder added" : "✅ Gallery folder updated");
          },
        },
        isNew ? "➕ Create Folder" : "💾 Save Folder"
      )
    );
    return [form, actions];
  });
}

function renderFormFor(name, item) {
  const wrap = el("div", {});
  const keys = fieldKeysFor(name);
  const known = new Set(keys.filter((k) => !k.startsWith("__")));
  const defined = keys.filter((k) => !k.startsWith("__"));
  // FIELD_DEFS-only keys (no generic base list) for brand-new items.
  const defs = FIELD_DEFS[name] || {};
  const defOnly = Object.keys(defs).filter((k) => !k.startsWith("__"));
  // Union: existing keys first (stable order), then defined-but-missing keys
  // so older items (e.g. events saved before `date` existed) still show the
  // full current form instead of hiding new fields. Brand-new items show
  // ONLY their FIELD_DEFS fields — never the generic base list.
  const existingKeys = Object.keys(item).filter((k) => known.has(k));
  const isNew = Object.keys(item).length === 0;
  const fieldNames = isNew
    ? (defOnly.length ? defOnly : defined)
    : [...existingKeys, ...defined.filter((k) => !existingKeys.includes(k))];

  for (const key of fieldNames) {
    const def = FIELD_DEFS[name]?.[key];
    const value = item[key];
    wrap.append(renderField(name, key, value, def));
  }
  // Upload widgets only for image-ish keys that are part of the form —
  // collections whose FIELD_DEFS dropped images (e.g. events) stop asking.
  const imgKeys = fieldNames.filter((k) => /image|img|src|avatar|photo/i.test(k));
  if (imgKeys.length) {
    wrap.append(el("hr", { class: "separator" }));
    for (const k of imgKeys) {
      wrap.append(uploadField(k, item));
    }
  }
  return wrap;
}

function fieldKeysFor(name) {
  const defs = FIELD_DEFS[name] || {};
  const defKeys = Object.keys(defs).filter((k) => !k.startsWith("__"));
  const extra = defs.__extra || [];
  const base = ["title", "description", "name", "role", "label", "value", "icon", "href"];
  const seen = new Set([...base, ...defKeys, ...extra]);
  return [...seen];
}

function formatJson(value) {
  if (value === undefined || value === null || value === "") return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

function renderField(name, key, value, def) {
  const isTextarea = def?.type === "textarea" || (typeof value === "string" && value.length > 90);
  const isNumber = def?.type === "number" || typeof value === "number";
  const label = humanize(key);

  let input;
  if (isNumber) {
    input = el("input", { type: "number", name: key, value: value ?? 0 });
  } else if (def?.type === "json") {
    input = el("textarea", { name: key, rows: 6, class: "json-field" }, formatJson(value));
    input.dataset.json = "1";
  } else if (isTextarea) {
    input = el("textarea", { name: key, rows: 4 }, value ?? "");
  } else if (def?.options) {
    input = el(
      "select",
      { name: key },
      ...def.options.map((o) => el("option", { value: o, selected: o === value ? "selected" : null }, o))
    );
  } else {
    input = el("input", { type: "text", name: key, value: value ?? "" });
  }
  return el("div", { class: "field" }, el("label", null, label), input);
}

function collectForm(form, name) {
  const out = {};
  const isArrayCollection = Array.isArray(store[name]);
  const base = isArrayCollection ? {} : { ...(typeof store[name] === "object" ? store[name] : {}) };
  for (const input of form.querySelectorAll("input, textarea, select")) {
    if (!input.name) continue;
    if (input.name.startsWith("__") || input.dataset.tmp) continue;
    const v = input.value;
    if (input.dataset.json) {
      const trimmed = v.trim();
      if (!trimmed) {
        out[input.name] = [];
        continue;
      }
      try {
        out[input.name] = JSON.parse(trimmed);
      } catch {
        toast(`Invalid JSON in "${humanize(input.name)}" — fix it and save again`, "err");
        return null;
      }
      continue;
    }
    const val = input.type === "number" ? (v === "" ? 0 : Number(v)) : v;
    if (isArrayCollection && val === "") continue;
    out[input.name] = val;
  }
  return { ...base, ...out };
}

/* ---------- Delete ---------- */

function deleteItem(name, index) {
  if (!confirm("Delete this item?")) return;
  pushSnapshot();
  store[name].splice(index, 1);
  markDirty();
  render();
  toast("🗑️ Deleted");
}

/* ================================================================
   Site config
   ================================================================ */

function renderSiteConfig(view) {
  const data = store.siteconfig || {};
  const sc = data.siteConfig || {};

  const card = el("div", { class: "card" });
  card.append(
    el(
      "div",
      { class: "card-head" },
      el("div", null, el("h3", null, "⚙️ Site Settings"), el("p", null, "Contact details, social links and identity."))
    )
  );

  const wrap = el("div", {});
  const fields = [
    ["name", "Site Name", "text"],
    ["shortName", "Short Name", "text"],
    ["orgName", "Organisation Name", "text"],
    ["zone", "Zone", "text"],
    ["tagline", "Tagline", "textarea"],
    ["email", "Email", "text"],
    ["phone", "Phone", "text"],
    ["address", "Address", "textarea"],
    ["whatsapp", "WhatsApp Link", "text"],
    ["youtube", "YouTube Link", "text"],
    ["mapsEmbed", "Maps Embed URL", "textarea"],
  ];
  for (const [key, label, type] of fields) {
    wrap.append(
      el(
        "div",
        { class: "field" },
        el("label", null, label),
        type === "textarea"
          ? el("textarea", { name: key, rows: 2 }, sc[key] ?? "")
          : el("input", { type: "text", name: key, value: sc[key] ?? "" })
      )
    );
  }

  // social links
  wrap.append(el("hr", { class: "separator" }));
  wrap.append(el("h3", { style: { fontSize: "14px", marginBottom: "10px", fontWeight: "700" } }, "🔗 Social Links"));
  const socialBox = el("div", {});
  const social = Array.isArray(data.socialLinks) ? data.socialLinks : [];
  social.forEach((link, i) => {
    socialBox.append(
      el(
        "div",
        { class: "sub-item" },
        el("span", {}, `${i + 1}.`),
        el("input", {
          type: "text",
          name: `social-label-${i}`,
          value: link.label || "",
          placeholder: "Label",
          style: { maxWidth: "110px" },
          oninput: () => markDirty(),
        }),
        el("input", {
          type: "text",
          name: `social-icon-${i}`,
          value: link.icon || "",
          placeholder: "Icon key",
          style: { maxWidth: "130px" },
          oninput: () => markDirty(),
        }),
        el("input", {
          type: "text",
          name: `social-href-${i}`,
          value: link.href || "",
          placeholder: "URL",
          oninput: () => markDirty(),
        }),
        el(
          "button",
          {
            class: "btn btn-danger btn-sm",
            onclick: () => {
              social.splice(i, 1);
              markDirty();
              renderSiteConfig(view);
            },
          },
          "✕"
        )
      )
    );
  });
  socialBox.append(
    el(
      "button",
      {
        class: "btn btn-ghost btn-sm",
        style: { marginTop: "6px" },
        onclick: () => {
          social.push({ label: "", icon: "", href: "" });
          markDirty();
          renderSiteConfig(view);
        },
      },
      "+ Add social link"
    )
  );
  wrap.append(socialBox);

  // navigation links
  wrap.append(el("hr", { class: "separator" }));
  wrap.append(el("h3", { style: { fontSize: "14px", marginBottom: "10px", fontWeight: "700" } }, "🧭 Navigation Links"));
  const navBox = el("div", {});
  const nav = Array.isArray(data.navLinks) ? data.navLinks : [];
  nav.forEach((link, i) => {
    navBox.append(
      el(
        "div",
        { class: "sub-item" },
        el("span", {}, `${i + 1}.`),
        el("input", {
          type: "text",
          name: `nav-label-${i}`,
          value: link.label || "",
          placeholder: "Label",
          style: { maxWidth: "110px" },
          oninput: () => markDirty(),
        }),
        el("input", {
          type: "text",
          name: `nav-href-${i}`,
          value: link.href || "",
          placeholder: "#section",
          style: { maxWidth: "170px" },
          oninput: () => markDirty(),
        }),
        el("input", {
          type: "text",
          name: `nav-icon-${i}`,
          value: link.icon || "",
          placeholder: "Icon key",
          style: { maxWidth: "130px" },
          oninput: () => markDirty(),
        }),
        el(
          "button",
          {
            class: "btn btn-danger btn-sm",
            onclick: () => {
              nav.splice(i, 1);
              markDirty();
              renderSiteConfig(view);
            },
          },
          "✕"
        )
      )
    );
  });
  navBox.append(
    el(
      "button",
      {
        class: "btn btn-ghost btn-sm",
        style: { marginTop: "6px" },
        onclick: () => {
          nav.push({ label: "", href: "", icon: "" });
          markDirty();
          renderSiteConfig(view);
        },
      },
      "+ Add nav link"
    )
  );
  wrap.append(navBox);

  // Theme presets (multi-tenant SaaS, session mode only — the legacy dev
  // server has no samithi row to store it in).
  if (sessionMode) {
    const THEMES = [
      { id: "theme-1", label: "Sai Blue", swatch: "linear-gradient(135deg,#1e64d8,#1a56bd)" },
      { id: "theme-2", label: "Temple Gold", swatch: "linear-gradient(135deg,#8a5a00,#6e4700)" },
      { id: "theme-3", label: "Emerald", swatch: "linear-gradient(135deg,#0e7a4f,#0b5f3e)" },
      { id: "theme-4", label: "Maroon", swatch: "linear-gradient(135deg,#a31621,#7f1019)" },
      { id: "theme-5", label: "Ocean Teal", swatch: "linear-gradient(135deg,#0b6e6e,#085858)" },
    ];
    wrap.append(el("hr", { class: "separator" }));
    wrap.append(el("h3", { style: { fontSize: "14px", marginBottom: "10px", fontWeight: "700" } }, "🎨 Site Theme"));
    const themeBox = el("div", { style: { display: "flex", gap: "10px", flexWrap: "wrap" } });
    let pickedTheme = (store.samithi && store.samithi.theme) || "theme-1";
    const paintTheme = () => {
      themeBox.innerHTML = "";
      for (const t of THEMES) {
        const selected = pickedTheme === t.id;
        themeBox.append(
          el("button", {
            class: `btn ${selected ? "btn-primary" : "btn-ghost"} btn-sm`,
            style: { display: "flex", alignItems: "center", gap: "8px" },
            onclick: () => { pickedTheme = t.id; paintTheme(); markDirty(); },
          },
            el("span", { style: { width: "18px", height: "18px", borderRadius: "50%", background: t.swatch, display: "inline-block" } }),
            t.label)
        );
      }
    };
    paintTheme();
    const themeSave = el("button", {
      class: "btn btn-primary btn-sm",
      style: { marginTop: "10px" },
      onclick: async () => {
        pushSnapshot();
        try {
          const res = isOwner()
            ? await api(`/samithis/${encodeURIComponent(activeSamithi)}`, { method: "PUT", body: JSON.stringify({ theme: pickedTheme }) })
            : await api("/samithi", { method: "PUT", body: JSON.stringify({ theme: pickedTheme }) });
          if (store.samithi) store.samithi.theme = res.theme || pickedTheme;
          markDirty();
          toast("✅ Theme applied — reload the website to see it");
        } catch (err) {
          toast(err.message, "err");
        }
      },
    }, "Apply theme");
    wrap.append(themeBox, themeSave);
  }

  card.append(wrap);
  card.append(
    el(
      "div",
      { class: "editor-actions" },
      el("div", { class: "spacer" }),
      el(
        "button",
        {
          class: "btn btn-primary",
          onclick: () => {
            const sc2 = {};
            card.querySelectorAll("input[name], textarea[name]").forEach((input) => {
              if (input.name.startsWith("social-") || input.name.startsWith("nav-")) return;
              sc2[input.name] = input.value;
            });
            const social2 = [];
            card.querySelectorAll("input[name^='social-']").forEach((input) => {
              const [, field, idx] = input.name.split("-");
              const i = Number(idx);
              if (!social2[i]) social2[i] = {};
              social2[i][field] = input.value;
            });
            const nav2 = [];
            card.querySelectorAll("input[name^='nav-']").forEach((input) => {
              const [, field, idx] = input.name.split("-");
              const i = Number(idx);
              if (!nav2[i]) nav2[i] = {};
              nav2[i][field] = input.value;
            });
            pushSnapshot();
            store.siteconfig = {
              siteConfig: sc2,
              socialLinks: social2.filter((s) => s && (s.label || s.href)),
              navLinks: nav2.filter((n) => n && (n.label || n.href)),
            };
            markDirty();
            render();
            toast("✅ Site settings updated");
          },
        },
        "💾 Save Site Settings"
      )
    )
  );
  view.append(card);
}

/* ================================================================
   Field definitions & helpers
   ================================================================ */

const FIELD_DEFS = {
  services: {
    icon: { options: ["fa-om", "fa-drum", "fa-users", "fa-utensils", "fa-bag-shopping", "fa-book-open", "fa-hand-holding-heart"] },
    title: { type: "text" },
    description: { type: "textarea" },
  },
  coordinators: {
    name: { type: "text" },
    role: { type: "text" },
    image: { type: "text" },
    description: { type: "textarea" },
  },
  events: {
    title: { type: "text" },
    date: { type: "text" },
    location: { type: "text" },
    mapsUrl: { type: "text" },
    description: { type: "textarea" },
  },
  stats: {
    icon: { options: ["bi-emoji-smile", "bi-journal-richtext", "bi-house", "bi-people"] },
    value: { type: "number" },
    label: { type: "text" },
    suffix: { type: "text" },
  },
  activities: {
    name: { type: "text" },
    value: { type: "number" },
  },
  gallery: {
    slug: { type: "text" },
    label: { type: "text" },
    icon: { type: "text" },
    description: { type: "textarea" },
  },
  homegallery: {
    src: { type: "text" },
    title: { type: "text" },
    description: { type: "text" },
  },
  members: {
    name: { type: "text" },
    role: { type: "text" },
    phone: { type: "text" },
    email: { type: "text" },
    notes: { type: "textarea" },
  },
  balvikas: {
    name: { type: "text" },
    group: { type: "text" },
    age: { type: "number" },
    parent: { type: "text" },
    notes: { type: "textarea" },
  },
  about: {
    heading: { type: "text" },
    items: { type: "json" },
  },
};

function humanize(key) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

/* ---------- Image upload field ---------- */

function uploadField(key, item) {
  const box = el("div", { class: "field" });
  const label = el("label", null, `${humanize(key)} (upload)`);
  const fileInput = el("input", {
    type: "file",
    accept: "image/*",
    onchange: async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const body = await file.arrayBuffer();
      try {
        const res = await fetch(API + "/upload", {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/octet-stream", "X-Filename": file.name }),
          body,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "upload failed");
        item[key] = json.url;
        renderPreview();
        markDirty();
        toast("✅ Image uploaded");
      } catch (err) {
        toast(err.message, "err");
      }
    },
  });
  const preview = el("div", { class: "image-preview" });
  const renderPreview = () => {
    preview.innerHTML = "";
    if (item[key]) {
      preview.append(el("img", { src: item[key], alt: "", onerror: "this.style.display='none'" }));
      const path = el("span", { class: "path" }, item[key]);
      path.append(
        el(
          "button",
          {
            class: "btn btn-ghost btn-sm",
            style: { marginLeft: "8px" },
            onclick: () => {
              item[key] = "";
              renderPreview();
              markDirty();
            },
          },
          "Clear"
        )
      );
      preview.append(path);
    }
  };
  renderPreview();
  box.append(label, fileInput, preview);
  return box;
}

/* ---------- Overlay ---------- */

function openOverlay(title, contentFn) {
  const overlay = el("div", {
    class: "overlay",
    onclick: (e) => {
      if (e.target === overlay) overlay.remove();
    },
  });
  const editor = el(
    "div",
    { class: "editor" },
    el(
      "div",
      { class: "editor-head" },
      el("h3", null, title),
      el("button", { class: "btn btn-ghost btn-sm", onclick: () => overlay.remove() }, "✕")
    )
  );
  const body = el("div", {});
  const result = contentFn(overlay);
  for (const node of result) body.append(node);
  editor.append(body);
  overlay.append(editor);
  document.body.append(overlay);
}

/* ================================================================
   Owner console + account (multi-tenant SaaS, session mode)
   ================================================================ */

async function apiGet(path) {
  return api(path);
}

// Owner: pick a samithi context, manage samithis + convenors, view audit.
function renderOwner(view) {
  const card = el("div", { class: "card" });
  card.append(
    el("div", { class: "card-head" },
      el("div", null,
        el("h3", null, "👑 Owner Console"),
        el("p", null, `Signed in as ${session.name}. Manage samithis, logins and activity.`)))
  );
  const body = el("div", null, el("p", { style: { color: "var(--muted)", fontSize: "13px" } }, "Loading…"));
  card.append(body);
  view.append(card);

  (async () => {
    try {
      const [dir, audit] = await Promise.all([
        apiGet("/samithis").catch(() => ({ samithis: [] })),
        apiGet("/audit?limit=20").catch(() => ({ entries: [] })),
      ]);
      body.innerHTML = "";

      // --- Samithi picker + onboarding ---
      body.append(el("h3", { style: { fontSize: "14px", margin: "6px 0 10px", fontWeight: "700" } }, "🏛️ Samithis"));
      const list = el("div", { class: "activity-list" });
      for (const s of dir.samithis || []) {
        const managing = activeSamithi === s.slug;
        list.append(
          el("div", { class: "activity-item" },
            el("div", { class: "activity-dot", style: { background: managing ? "var(--green)" : "var(--muted-light)" } }),
            el("div", { style: { flex: "1" } },
              el("div", { style: { fontWeight: "600", fontSize: "13px" } }, `${s.name} (${s.slug})${managing ? " — managing" : ""}`),
              el("div", { style: { fontSize: "12px", color: "var(--muted)", marginTop: "2px" } }, s.district || "")),
            managing ? null : el("button", {
              class: "btn btn-primary btn-sm",
              onclick: async () => {
                setActiveSamithi(s.slug);
                activeCollection = null;
                try {
                  await loadAll();
                  toast(`✅ Managing ${s.name}`);
                } catch (e) { toast(e.message, "err"); }
              },
            }, "Manage"))
        );
      }
      body.append(list);

      const slugIn = el("input", { type: "text", placeholder: "slug, e.g. porur", style: { maxWidth: "160px" } });
      const nameIn = el("input", { type: "text", placeholder: "Samithi name", style: { flex: "1", minWidth: "160px" } });
      const distIn = el("input", { type: "text", placeholder: "District", style: { maxWidth: "140px" } });
      const createBtn = el("button", {
        class: "btn btn-primary btn-sm",
        onclick: async () => {
          const slug = slugIn.value.toLowerCase().trim();
          const name = nameIn.value.trim();
          if (!slug || !name) {
            toast("Slug and name are required", "err");
            return;
          }
          try {
            const r = await api("/samithis", { method: "POST", body: JSON.stringify({ slug, name, district: distIn.value.trim() }) });
            toast(`✅ Created — live at /s/${r.slug}`);
            logActivity("create", `Created samithi <strong>${name}</strong>`);
            render();
          } catch (e) { toast(e.message, "err"); }
        },
      }, "➕ Create samithi");
      body.append(el("div", { class: "sub-item", style: { marginTop: "8px" } }, slugIn, nameIn, distIn, createBtn));

      // --- Convenors ---
      body.append(el("hr", { class: "separator" }));
      body.append(el("h3", { style: { fontSize: "14px", margin: "6px 0 10px", fontWeight: "700" } }, "👥 Convenor logins"));
      const ulist = el("div", { class: "activity-list" });
      const redrawUsers = async () => {
        ulist.innerHTML = "";
        let fresh = [];
        try {
          fresh = (await apiGet("/convenors")).convenors || [];
        } catch (e) { toast(e.message, "err"); return; }
        for (const u of fresh) {
          ulist.append(
            el("div", { class: "activity-item" },
              el("div", { class: "activity-dot", style: { background: u.active ? "var(--green)" : "var(--red)" } }),
              el("div", { style: { flex: "1" } },
                el("div", { style: { fontWeight: "600", fontSize: "13px" } }, `${u.name} (${u.login})`),
                el("div", { style: { fontSize: "12px", color: "var(--muted)", marginTop: "2px" } }, `${u.samithi_id} · ${u.role}${u.active ? "" : " · disabled"}`)),
              el("button", {
                class: "btn btn-ghost btn-sm",
                onclick: async () => {
                  if (!confirm(`Reset password for ${u.login}? A new temporary password will be shown once.`)) return;
                  try {
                    const r = await api(`/convenors/${u.id}`, { method: "PUT", body: JSON.stringify({ resetPassword: true }) });
                    toast(`✅ New temporary password (copy now): ${r.tempPassword}`, "ok");
                    logActivity("update", `Reset password for <strong>${u.login}</strong>`);
                  } catch (e) { toast(e.message, "err"); }
                },
              }, "Reset PW"),
              el("button", {
                class: `btn ${u.active ? "btn-danger" : "btn-ghost"} btn-sm`,
                onclick: async () => {
                  const to = !u.active;
                  if (!confirm(`${to ? "Enable" : "Disable"} login ${u.login}?`)) return;
                  try {
                    await api(`/convenors/${u.id}`, { method: "PUT", body: JSON.stringify({ active: to }) });
                    toast(to ? "✅ Enabled" : "✅ Disabled");
                    redrawUsers();
                  } catch (e) { toast(e.message, "err"); }
                },
              }, u.active ? "Disable" : "Enable"))
          );
        }
      };
      await redrawUsers();
      body.append(ulist);
      const iName = el("input", { type: "text", placeholder: "Name", style: { flex: "1", minWidth: "120px" } });
      const iLogin = el("input", { type: "text", placeholder: "Login id", style: { maxWidth: "130px" } });
      const iSamithi = el("input", { type: "text", placeholder: "samithi slug", style: { maxWidth: "130px" } });
      const iEmail = el("input", { type: "text", placeholder: "Email (optional)", style: { maxWidth: "170px" } });
      const inviteBtn = el("button", {
        class: "btn btn-primary btn-sm",
        onclick: async () => {
          if (!iName.value.trim() || !iLogin.value.trim() || !iSamithi.value.trim()) {
            toast("Name, login id and samithi slug are required", "err");
            return;
          }
          try {
            const r = await api("/convenors", {
              method: "POST",
              body: JSON.stringify({ name: iName.value.trim(), login: iLogin.value.trim(), samithi_id: iSamithi.value.trim(), email: iEmail.value.trim() }),
            });
            toast(`✅ Invited ${r.login} — temporary password (copy now): ${r.tempPassword}`, "ok");
            logActivity("create", `Invited convenor <strong>${r.login}</strong>`);
            iName.value = iLogin.value = iSamithi.value = iEmail.value = "";
            redrawUsers();
          } catch (e) { toast(e.message, "err"); }
        },
      }, "📨 Invite convenor");
      body.append(el("div", { class: "sub-item", style: { marginTop: "8px" } }, iName, iLogin, iSamithi, iEmail, inviteBtn));

      // --- Recent activity ---
      body.append(el("hr", { class: "separator" }));
      body.append(el("h3", { style: { fontSize: "14px", margin: "6px 0 10px", fontWeight: "700" } }, "🕐 Recent activity"));
      const alist = el("div", { class: "activity-list" });
      for (const a of (audit.entries || []).slice(0, 20)) {
        alist.append(
          el("div", { class: "activity-item" },
            el("div", { class: "activity-dot", style: { background: "var(--primary)" } }),
            el("div", { style: { flex: "1", fontSize: "12px" } },
              el("span", { style: { fontWeight: "600" } }, `${a.actor} · ${a.action}`),
              a.samithi_id ? el("span", { style: { color: "var(--muted)" } }, ` · ${a.samithi_id}`) : null,
              a.detail ? el("div", { style: { color: "var(--muted)" } }, String(a.detail).slice(0, 120)) : null))
        );
      }
      if (!alist.children.length) alist.append(el("div", { class: "activity-empty" }, "No activity yet"));
      body.append(alist);

      // --- Suspend / unsuspend ---
      body.append(el("hr", { class: "separator" }));
      const sSlug = el("input", { type: "text", placeholder: "samithi slug", style: { maxWidth: "160px" } });
      const suspBtn = async (to) => {
        if (!sSlug.value.trim()) {
          toast("Enter a samithi slug", "err");
          return;
        }
        if (!confirm(`${to === "suspended" ? "Suspend" : "Re-activate"} ${sSlug.value.trim()}?`)) return;
        try {
          await api(`/samithis/${encodeURIComponent(sSlug.value.trim())}`, { method: "PUT", body: JSON.stringify({ status: to }) });
          toast(to === "suspended" ? "✅ Suspended" : "✅ Re-activated");
          logActivity("update", `${to === "suspended" ? "Suspended" : "Re-activated"} <strong>${sSlug.value.trim()}</strong>`);
        } catch (e) { toast(e.message, "err"); }
      };
      body.append(el("div", { class: "sub-item" }, sSlug,
        el("button", { class: "btn btn-danger btn-sm", onclick: () => suspBtn("suspended") }, "Suspend"),
        el("button", { class: "btn btn-ghost btn-sm", onclick: () => suspBtn("active") }, "Re-activate")));
    } catch (e) {
      body.innerHTML = "";
      body.append(el("div", { class: "empty" }, "Failed to load owner data: " + e.message));
    }
  })();
}

// Account: identity, password rotation, logout.
function renderAccount(view) {
  const card = el("div", { class: "card" });
  card.append(
    el("div", { class: "card-head" },
      el("div", null, el("h3", null, "👤 Account"), el("p", null, "Your sign-in and session.")))
  );
  const wrap = el("div", {});
  if (!session) {
    wrap.append(el("div", { class: "empty" }, "Not signed in."));
  } else {
    wrap.append(
      el("div", { style: { fontSize: "13px", lineHeight: "1.9", marginBottom: "12px" } },
        el("div", null, el("strong", null, "Name: "), session.name || "—"),
        el("div", null, el("strong", null, "Role: "), session.role || "—"),
        el("div", null, el("strong", null, "Mode: "), sessionMode ? "convenor session" : (legacyMode ? "legacy token" : "—")),
        el("div", null, el("strong", null, "Samithi: "), session.role === "owner" ? (activeSamithi || "— (pick one in Owner Console)") : (session.samithi_id || "—")))
    );
    if (sessionMode) {
      const oldIn = el("input", { type: "password", placeholder: "Current password", autocomplete: "current-password", style: { width: "100%" } });
      const newIn = el("input", { type: "password", placeholder: `New password (min ${8} chars)`, autocomplete: "new-password", style: { width: "100%" } });
      wrap.append(
        el("hr", { class: "separator" }),
        el("h3", { style: { fontSize: "14px", marginBottom: "10px", fontWeight: "700" } }, "🔑 Change password"),
        el("div", { class: "field" }, el("label", null, "Current password"), oldIn),
        el("div", { class: "field" }, el("label", null, "New password"), newIn),
        el("button", {
          class: "btn btn-primary btn-sm",
          onclick: async () => {
            try {
              await api("/auth/change-password", {
                method: "POST",
                body: JSON.stringify({ oldPassword: oldIn.value, newPassword: newIn.value }),
              });
              toast("✅ Password changed — please sign in again");
              logActivity("update", "Changed own password");
              await doLogout();
            } catch (e) { toast(e.message, "err"); }
          },
        }, "Change password")
      );
    } else {
      wrap.append(el("p", { style: { fontSize: "12px", color: "var(--muted)" } }, "Legacy token mode: restart the server with a new ADMIN_TOKEN to rotate the secret."));
    }
    wrap.append(
      el("hr", { class: "separator" }),
      el("button", {
        class: "btn btn-danger btn-sm",
        onclick: async () => { await doLogout(); },
      }, "⎋ Sign out")
    );
  }
  card.append(wrap);
  view.append(card);
}

async function doLogout() {
  try {
    if (sessionMode) {
      await fetch(apiUrl("/auth/logout"), {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
      }).catch(() => {});
    }
  } finally {
    clearSession();
    toast("Signed out — Sai Ram");
  }
}

/* ================================================================
   Save all
   ================================================================ */

async function saveAll() {
  const btn = $("#save-all");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Saving...";
  }
  const failed = [];
  try {
    if (sessionMode) {
      // Multi-tenant SaaS path: tenant-scoped content endpoints. Members /
      // balvikas have no content endpoint in v1 — they stay read-only here.
      const jobs = [];
      const put = (collection, body, label) => jobs.push(
        api(`/content/${collection}`, { method: "PUT", body: JSON.stringify(body) })
          .catch((err) => failed.push(`${label}: ${err.message}`))
      );
      for (const name of ["events", "services", "coordinators", "stats", "activities", "homegallery"]) {
        if (Array.isArray(store[name])) put(name, { items: store[name] }, name);
      }
      if (Array.isArray(store.gallery)) put("gallery", { categories: store.gallery }, "gallery");
      if (Array.isArray(store.about)) put("about", { sections: store.about }, "about");
      if (store.siteconfig) {
        put("siteconfig", {
          siteConfig: store.siteconfig.siteConfig || {},
          socialLinks: store.siteconfig.socialLinks || [],
        }, "site settings");
      }
      await Promise.all(jobs);
    } else {
      for (const c of COLLECTIONS) {
        try {
          await api(`/${c.name}`, { method: "PUT", body: JSON.stringify(store[c.name]) });
        } catch (err) {
          // Report per-collection failures instead of abandoning the rest.
          failed.push(`${c.label}: ${err.message}`);
        }
      }
    }
    if (failed.length > 0) {
      for (const f of failed) toast(f, "err");
      const s = $("#save-state");
      if (s) {
        s.textContent = `Save failed (${failed.length} collection(s))`;
        s.className = "save-state error";
      }
    } else {
      clearDirty("All changes saved");
      toast("✅ All changes saved");
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "💾 Save All";
    }
  }
}

/* ================================================================
   Init
   ================================================================ */

window.addEventListener("beforeunload", (e) => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});

$("#menu-btn").addEventListener("click", () => {
  const sidebar = $("#sidebar");
  const backdrop = $("#sidebar-backdrop");
  sidebar.classList.toggle("open");
  backdrop.classList.toggle("visible");
});
$("#sidebar-backdrop").addEventListener("click", () => {
  $("#sidebar").classList.remove("open");
  $("#sidebar-backdrop").classList.remove("visible");
});
$("#save-all").addEventListener("click", saveAll);
// Open the live site. When the admin is served standalone on its own port
// (dev: :3001) "/" is the admin itself, so jump to the site on :3000.
// In production the admin sits behind the site's /admin proxy where "/"
// is already the site.
$("#open-site").addEventListener("click", () => {
  const standalone =
    window.location.port === "3001" && window.location.hostname === "localhost";
  const siteUrl = standalone
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : "/";
  window.open(siteUrl, "_blank");
});

// Quick Add dropdown
$("#quick-add-btn").addEventListener("click", (e) => {
  e.stopPropagation();
  const dd = $("#quick-add-dropdown");
  dd.classList.toggle("open");
});
document.addEventListener("click", (e) => {
  const dd = $("#quick-add-dropdown");
  const btn = $("#quick-add-btn");
  if (dd && !dd.contains(e.target) && !btn.contains(e.target)) {
    dd.classList.remove("open");
  }
});

// Undo / Redo buttons
$("#undo-btn").addEventListener("click", undo);
$("#redo-btn").addEventListener("click", redo);

/* ================================================================
   Theme Toggle (Light / Dark)
   ================================================================ */

function getPreferredTheme() {
  // Light-first: only an explicit stored choice enables dark; the OS
  // preference never auto-switches the admin theme.
  const saved = localStorage.getItem("samithi-admin-theme");
  if (saved) return saved;
  return "light";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("samithi-admin-theme", theme);
  // Toggle icons are owned by CSS (.theme-icon-light/.theme-icon-dark);
  // never overwrite .theme-toggle-thumb content from JS.
}

// Apply theme immediately to avoid flash
applyTheme(getPreferredTheme());

$("#theme-toggle").addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  applyTheme(current === "dark" ? "light" : "dark");
});

/* ================================================================
   Activity Log
   ================================================================ */

const activityLog = [];

function logActivity(type, text) {
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  activityLog.unshift({ type, text, time });
  if (activityLog.length > 50) activityLog.pop();
  renderActivityLog();
}

function renderActivityLog() {
  const body = $("#activity-body");
  if (!body) return;
  if (activityLog.length === 0) {
    body.innerHTML = "";
    body.append(el("div", { class: "activity-empty" }, "No changes yet"));
    return;
  }
  body.innerHTML = "";
  const colors = { create: "var(--green)", update: "var(--primary)", delete: "var(--red)", save: "var(--accent)", reorder: "var(--orange)" };
  for (const entry of activityLog) {
    body.append(
      el(
        "div",
        { class: "activity-entry" },
        el("div", { class: "activity-dot", style: { background: colors[entry.type] || "var(--muted)" } }),
        el("div", { class: "activity-text", html: entry.text }),
        el("span", { class: "activity-time" }, entry.time)
      )
    );
  }
}

$("#activity-toggle").addEventListener("click", () => {
  $("#activity-panel").classList.toggle("open");
});

// Close activity/version panels when clicking outside
document.addEventListener("click", (e) => {
  const actPanel = $("#activity-panel");
  const actToggle = $("#activity-toggle");
  if (actPanel && !actPanel.contains(e.target) && !actToggle.contains(e.target)) {
    actPanel.classList.remove("open");
  }
  const verPanel = $("#version-panel");
  const verToggle = $("#version-toggle");
  if (verPanel && !verPanel.contains(e.target) && !verToggle.contains(e.target)) {
    verPanel.classList.remove("open");
  }
});

/* ================================================================
   Command Palette (Ctrl+K)
   ================================================================ */

let cmdOpen = false;
let cmdActiveIndex = 0;

function openCommandPalette() {
  const overlay = $("#cmd-overlay");
  overlay.innerHTML = "";
  overlay.style.display = "flex";
  cmdOpen = true;
  cmdActiveIndex = 0;

  const palette = el("div", { class: "cmd-palette" });

  // Input
  const inputWrap = el("div", { class: "cmd-input-wrap" });
  const input = el("input", {
    class: "cmd-input",
    type: "text",
    placeholder: "Type a command or search...",
  });
  inputWrap.append(
    el("span", { class: "cmd-icon" }, "🔍"),
    input,
    el("span", { class: "cmd-kbd" }, "ESC")
  );
  palette.append(inputWrap);

  // Results
  const results = el("div", { class: "cmd-results" });
  palette.append(results);

  // Footer
  const footer = el("div", { class: "cmd-footer" });
  footer.append(
    el("span", {}, "Navigate with "),
    el("kbd", {}, "↑↓"),
    el("span", {}, " to select, "),
    el("kbd", {}, "Enter"),
    el("span", {}, " to open")
  );
  palette.append(footer);

  overlay.append(palette);

  // Build commands list
  const commands = buildCommands();

  function renderCmdResults(query) {
    results.innerHTML = "";
    const filtered = query
      ? commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()) || (c.keywords && c.keywords.some((k) => k.includes(query.toLowerCase()))))
      : commands;

    if (filtered.length === 0) {
      results.append(el("div", { class: "cmd-empty" }, `No results for "${query}"`));
      return;
    }

    cmdActiveIndex = 0;
    filtered.forEach((cmd, i) => {
      const item = el(
        "div",
        {
          class: `cmd-item${i === 0 ? " active" : ""}`,
          onclick: () => { closeCommandPalette(); cmd.action(); },
          "data-index": String(i),
        },
        el("span", { class: "cmd-item-icon" }, cmd.icon),
        el("span", { class: "cmd-item-label" }, cmd.label),
        cmd.hint ? el("span", { class: "cmd-item-hint" }, cmd.hint) : null,
        cmd.kbd ? el("span", { class: "cmd-item-kbd" }, cmd.kbd) : null
      );
      results.append(item);
    });
  }

  renderCmdResults("");

  // Input events
  input.addEventListener("input", () => renderCmdResults(input.value));

  input.addEventListener("keydown", (e) => {
    const items = results.querySelectorAll(".cmd-item");
    if (e.key === "ArrowDown") {
      e.preventDefault();
      cmdActiveIndex = Math.min(cmdActiveIndex + 1, items.length - 1);
      updateCmdActive(items);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      cmdActiveIndex = Math.max(cmdActiveIndex - 1, 0);
      updateCmdActive(items);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (items[cmdActiveIndex]) items[cmdActiveIndex].click();
    } else if (e.key === "Escape") {
      closeCommandPalette();
    }
  });

  // Focus input
  setTimeout(() => input.focus(), 50);

  // Click overlay to close
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeCommandPalette();
  });
}

function updateCmdActive(items) {
  items.forEach((item, i) => {
    item.classList.toggle("active", i === cmdActiveIndex);
  });
  // Scroll into view
  if (items[cmdActiveIndex]) items[cmdActiveIndex].scrollIntoView({ block: "nearest" });
}

function closeCommandPalette() {
  $("#cmd-overlay").style.display = "none";
  cmdOpen = false;
}

function buildCommands() {
  const cmds = [
    { icon: "📊", label: "Dashboard", hint: "Overview", action: () => selectCollection(null) },
    { icon: "💾", label: "Save All Changes", kbd: "Ctrl+S", action: () => saveAll() },
    { icon: "👤", label: "Account", keywords: ["account", "password", "logout", "sign out"], action: () => selectCollection("account") },
    { icon: "⎋", label: "Sign Out", keywords: ["logout", "sign out", "exit"], action: () => doLogout() },    { icon: "↩", label: "Undo", kbd: "Ctrl+Z", keywords: ["undo", "revert"], action: () => undo() },
    { icon: "↪", label: "Redo", kbd: "Ctrl+Shift+Z", keywords: ["redo"], action: () => redo() },
    { icon: "☀️", label: "Toggle Dark Mode", action: () => { const t = document.documentElement.getAttribute("data-theme") || "light"; applyTheme(t === "dark" ? "light" : "dark"); } },
    { icon: "↗️", label: "View Live Site", action: () => window.open("/", "_blank") },
    { icon: "📥", label: "Export All Data as JSON", action: () => exportAllData() },
    { icon: "📤", label: "Import Data from JSON", action: () => openImportModal() },
    { icon: "🕐", label: "Version History", kbd: "Ctrl+H", keywords: ["version", "history", "backup", "restore"], action: () => { closeCommandPalette(); openVersionPanel(); } },
    { icon: "💾", label: "Create Named Backup", kbd: "Ctrl+B", keywords: ["backup", "snapshot"], action: () => { closeCommandPalette(); $("#create-backup-btn").click(); } },
    { icon: "📊", label: "Storage Usage", keywords: ["storage", "quota", "size"], action: () => showStorageUsage() },
  ];

  for (const c of COLLECTIONS) {
    const count = Array.isArray(store[c.name]) ? store[c.name].length : null;
    cmds.push({
      icon: c.icon,
      label: `${c.label}${count !== null ? ` (${count})` : ""}`,
      hint: c.group,
      keywords: [c.name, c.group.toLowerCase()],
      action: () => selectCollection(c.name),
    });
  }

  return cmds;
}

// Global keyboard shortcuts
document.addEventListener("keydown", (e) => {
  // Ctrl+K or Cmd+K — Command Palette
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    if (cmdOpen) closeCommandPalette();
    else openCommandPalette();
    return;
  }

  // Ctrl+S or Cmd+S — Save All
  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
    e.preventDefault();
    if (dirty && !isSaving) saveAll();
    return;
  }

  // Ctrl+Z or Cmd+Z — Undo
  if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
    e.preventDefault();
    undo();
    return;
  }

  // Ctrl+Shift+Z or Cmd+Shift+Z — Redo
  if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) {
    e.preventDefault();
    redo();
    return;
  }

  // Ctrl+Y or Cmd+Y — Redo (alternative)
  if ((e.ctrlKey || e.metaKey) && e.key === "y") {
    e.preventDefault();
    redo();
    return;
  }

  // Ctrl+B or Cmd+B — Quick Backup
  if ((e.ctrlKey || e.metaKey) && e.key === "b") {
    e.preventDefault();
    createNamedBackup("Quick backup " + new Date().toLocaleTimeString());
    return;
  }

  // Escape — Close modals/palette
  if (e.key === "Escape") {
    if (cmdOpen) {
      closeCommandPalette();
      return;
    }
    // Close any open overlay
    const overlay = $(".overlay");
    if (overlay) overlay.remove();
  }
});

/* ================================================================
   Loading Spinner
   ================================================================ */

function showSpinner(label = "Saving...") {
  const overlay = el("div", { class: "spinner-overlay" });
  overlay.append(
    el("div", { style: { textAlign: "center" } },
      el("div", { class: "spinner-wrap" },
        el("img", { class: "spinner-emblem", src: "_ui/img/sssso-emblem-192.png", alt: "" }),
        el("div", { class: "spinner-ring" })
      ),
      el("div", { class: "spinner-label" }, label)
    )
  );
  document.body.append(overlay);
  return overlay;
}

/* ================================================================
   Data Validation
   ================================================================ */

function validateForm(form, rules) {
  let valid = true;
  // Clear previous errors
  form.querySelectorAll(".field.error").forEach((f) => f.classList.remove("error"));
  form.querySelectorAll(".field-error").forEach((e) => e.remove());

  for (const [name, rule] of Object.entries(rules)) {
    const input = form.querySelector(`[name="${name}"]`);
    if (!input) continue;
    const value = input.value.trim();
    const field = input.closest(".field");

    if (rule.required && !value) {
      if (field) {
        field.classList.add("error");
        field.append(el("div", { class: "field-error" }, `⚠️ ${rule.message || "This field is required"}`));
      }
      valid = false;
    }

    if (rule.minLength && value.length < rule.minLength) {
      if (field) {
        field.classList.add("error");
        field.append(el("div", { class: "field-error" }, `⚠️ Minimum ${rule.minLength} characters`));
      }
      valid = false;
    }

    if (rule.pattern && !rule.pattern.test(value)) {
      if (field) {
        field.classList.add("error");
        field.append(el("div", { class: "field-error" }, `⚠️ ${rule.message || "Invalid format"}`));
      }
      valid = false;
    }
  }

  return valid;
}

// Validation rules per collection
const VALIDATION_RULES = {
  events: { title: { required: true, message: "Event title is required" } },
  services: { title: { required: true, message: "Service title is required" } },
  coordinators: { name: { required: true, message: "Name is required" } },
  gallery: { slug: { required: true, message: "Slug is required" }, label: { required: true, message: "Label is required" } },
  members: { name: { required: true, message: "Name is required" } },
  stats: { label: { required: true, message: "Label is required" } },
};

/* ================================================================
   Export / Import All Data
   ================================================================ */

function exportAllData() {
  const json = JSON.stringify(store, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `samithi-all-data-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  logActivity("save", "Exported all data as JSON");
  toast("📥 All data exported");
}

function openImportModal() {
  openOverlay("Import Data from JSON", (overlay) => {
    const body = el("div", {});

    const zone = el("div", { class: "import-zone" });
    zone.append(
      el("div", { class: "import-icon" }, "📤"),
      el("div", { class: "import-text", html: "Drag a JSON file here or <strong>click to browse</strong>" })
    );

    const fileInput = el("input", {
      type: "file",
      accept: ".json,application/json",
      style: { display: "none" },
      onchange: (e) => handleImportFile(e.target.files[0], overlay),
    });

    zone.addEventListener("click", () => fileInput.click());
    zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("dragging"); });
    zone.addEventListener("dragleave", () => zone.classList.remove("dragging"));
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("dragging");
      if (e.dataTransfer.files[0]) handleImportFile(e.dataTransfer.files[0], overlay);
    });

    body.append(zone, fileInput);

    const actions = el(
      "div",
      { class: "editor-actions" },
      el("div", { class: "spacer" }),
      el("button", { class: "btn btn-ghost", onclick: () => overlay.remove() }, "Cancel")
    );
    return [body, actions];
  });
}

async function handleImportFile(file, overlay) {
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    // Validate structure
    if (typeof data !== "object" || data === null) {
      toast("Invalid JSON structure", "err");
      return;
    }

    // Schema validation before merging — a malformed import used to be
    // savable straight to the live site.
    const expected = new Set(COLLECTIONS.map((c) => c.name));
    const warnings = [];
    for (const key of Object.keys(data)) {
      if (!expected.has(key)) {
        warnings.push(`Unknown collection "${key}" skipped`);
        continue;
      }
      if (key === "siteconfig") {
        if (typeof data[key] !== "object" || data[key] === null || typeof data[key].siteConfig !== "object") {
          toast(`siteconfig must be an object with a siteConfig object — import aborted`, "err");
          return;
        }
        continue;
      }
      if (!Array.isArray(data[key])) {
        toast(`Collection "${key}" must be an array — import aborted`, "err");
        return;
      }
    }

    // Merge with existing store
    pushSnapshot();
    let imported = 0;
    for (const key of Object.keys(data)) {
      if (expected.has(key)) {
        store[key] = data[key];
        imported++;
      }
    }

    if (imported === 0) {
      toast("No matching collections found in file", "err");
      return;
    }
    for (const w of warnings) toast(w, "err");

    markDirty();
    overlay.remove();
    logActivity("update", `Imported data from <strong>${file.name}</strong> (${imported} collections)`);
    toast(`📤 Imported ${imported} collection(s) from ${file.name}`);
    render();
  } catch (err) {
    toast(`Import failed: ${err.message}`, "err");
  }
}

/* ================================================================
   Enhanced Save with Spinner + Activity Log
   ================================================================ */

const _originalSaveAll = saveAll;
saveAll = async function () {
  if (isSaving) return;
  isSaving = true;
  const spinner = showSpinner("Saving all changes...");
  try {
    await _originalSaveAll();
    logActivity("save", "All changes saved successfully");
    createAutoVersion("Auto-save on save");
  } finally {
    isSaving = false;
    spinner.remove();
  }
};

/* ================================================================
   Patch: Add activity logging to existing actions
   ================================================================ */

const _originalDeleteItem = deleteItem;
deleteItem = function (name, index) {
  const items = Array.isArray(store[name]) ? store[name] : [];
  const title = items[index] ? pickTitle(items[index]) : "item";
  _originalDeleteItem(name, index);
  logActivity("delete", `Deleted <strong>${title}</strong> from ${name}`);
};

const _originalEditItem = editItem;
editItem = function (name, index) {
  _originalEditItem(name, index);
  // Activity logging happens on save via overlay button
};

/* ================================================================
   Version History & Backup/Restore
   ================================================================ */

const VERSION_STORAGE_KEY = "samithi-version-history";
const BACKUP_STORAGE_KEY = "samithi-backups";
const MAX_AUTO_VERSIONS = 30;
let currentVersionTab = "auto";

function getAutoVersions() {
  try {
    return JSON.parse(localStorage.getItem(VERSION_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveAutoVersions(versions) {
  try {
    localStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify(versions));
  } catch {
    toast("Storage full — clearing old auto-saves", "err");
    const trimmed = versions.slice(-10);
    try {
      localStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // Truly full store (private mode etc.): drop this version entirely.
    }
  }
}

function getBackups() {
  try {
    return JSON.parse(localStorage.getItem(BACKUP_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveBackups(backups) {
  try {
    localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(backups));
  } catch {
    toast("Storage full — try deleting some backups", "err");
  }
}

function createAutoVersion(label) {
  const versions = getAutoVersions();
  const snapshot = {
    id: "v" + Date.now(),
    label: label || "Auto-save",
    timestamp: new Date().toISOString(),
    data: cloneStore(),
    summary: getChangeSummary(),
  };
  versions.push(snapshot);
  if (versions.length > MAX_AUTO_VERSIONS) versions.shift();
  saveAutoVersions(versions);
  renderVersionPanel();
}

function createNamedBackup(name) {
  const backups = getBackups();
  const backup = {
    id: "b" + Date.now(),
    name: name || "Backup " + new Date().toLocaleString(),
    timestamp: new Date().toISOString(),
    data: cloneStore(),
    summary: "Full data snapshot",
  };
  backups.push(backup);
  saveBackups(backups);
  renderVersionPanel();
  toast(`💾 Backup "${backup.name}" created`);
  logActivity("save", `Created backup <strong>"${backup.name}"</strong>`);
}

function restoreVersion(id) {
  const allVersions = [...getAutoVersions(), ...getBackups()];
  const version = allVersions.find((v) => v.id === id);
  if (!version) return;

  if (!confirm(`Restore to "${version.label || version.name}"?\n\nCurrent unsaved changes will be lost.`)) return;

  // Save current state as auto-version before restoring
  createAutoVersion("Before restore");

  store = cloneStore(version.data);
  markDirty();
  render();
  toast(`↩ Restored to "${version.label || version.name}"`);
  logActivity("update", `Restored to version <strong>"${version.label || version.name}"</strong>`);
}

function deleteVersion(id) {
  if (!confirm("Delete this version?")) return;
  let versions = getAutoVersions();
  const before = versions.length;
  versions = versions.filter((v) => v.id !== id);
  if (versions.length < before) {
    saveAutoVersions(versions);
  } else {
    let backups = getBackups();
    backups = backups.filter((v) => v.id !== id);
    saveBackups(backups);
  }
  renderVersionPanel();
  toast("🗑️ Version deleted");
}

function getChangeSummary() {
  const parts = [];
  for (const c of COLLECTIONS) {
    const count = Array.isArray(store[c.name]) ? store[c.name].length : null;
    if (count !== null) parts.push(`${c.label}: ${count}`);
  }
  return parts.join(" · ");
}

function computeDiff(oldData, newData) {
  const diffs = [];
  for (const c of COLLECTIONS) {
    const oldArr = Array.isArray(oldData[c.name]) ? oldData[c.name] : [];
    const newArr = Array.isArray(newData[c.name]) ? newData[c.name] : [];
    const oldCount = oldArr.length;
    const newCount = newArr.length;
    if (oldCount !== newCount) {
      const diff = newCount - oldCount;
      diffs.push({
        collection: c.label,
        type: diff > 0 ? "add" : "remove",
        text: `${diff > 0 ? "+" : ""}${diff} item${Math.abs(diff) !== 1 ? "s" : ""}`,
      });
    }
    // Check for content changes (compare JSON of first few items)
    const maxCheck = Math.min(oldCount, newCount, 5);
    for (let i = 0; i < maxCheck; i++) {
      if (JSON.stringify(oldArr[i]) !== JSON.stringify(newArr[i])) {
        const title = pickTitle(newArr[i] || oldArr[i]);
        diffs.push({
          collection: c.label,
          type: "change",
          text: `Modified: ${title}`,
        });
        break; // One change per collection is enough
      }
    }
  }
  return diffs;
}

function showStorageUsage() {
  const autoVersions = getAutoVersions();
  const backups = getBackups();
  const autoSize = new Blob([JSON.stringify(autoVersions)]).size;
  const backupSize = new Blob([JSON.stringify(backups)]).size;
  const totalSize = autoSize + backupSize;

  openOverlay("Storage Usage", (overlay) => {
    const body = el("div", { style: { padding: "16px" } });

    const items = [
      { label: "Auto-save versions", count: autoVersions.length, size: autoSize, color: "var(--primary)" },
      { label: "Named backups", count: backups.length, size: backupSize, color: "var(--green)" },
    ];

    for (const item of items) {
      const row = el("div", { style: { display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: "1px solid var(--border-light)" } });
      row.append(
        el("div", { style: { width: "8px", height: "8px", borderRadius: "50%", background: item.color, flexShrink: 0 } }),
        el("div", { style: { flex: 1 } },
          el("div", { style: { fontWeight: "600", fontSize: "13px" } }, item.label),
          el("div", { style: { fontSize: "11px", color: "var(--muted)" } }, `${item.count} item${item.count !== 1 ? "s" : ""}`)
        ),
        el("div", { style: { fontWeight: "600", fontSize: "13px", color: "var(--text-secondary)" } }, formatBytes(item.size))
      );
      body.append(row);
    }

    // Total
    body.append(el("div", { style: { display: "flex", justifyContent: "space-between", padding: "12px 0 0", fontWeight: "700", fontSize: "14px" } },
      el("span", null, "Total"),
      el("span", null, formatBytes(totalSize))
    ));

    body.append(el("div", { style: { fontSize: "11px", color: "var(--muted)", marginTop: "12px", padding: "8px", background: "var(--panel-2)", borderRadius: "var(--radius-sm)" } },
      "💡 localStorage typically has 5-10MB limit. Auto-saves are capped at 30. Delete old backups if storage is full."
    ));

    const actions = el("div", { class: "editor-actions" },
      el("div", { class: "spacer" }),
      el("button", { class: "btn btn-danger btn-sm", onclick: () => {
        if (confirm("Delete ALL auto-save versions?")) {
          saveAutoVersions([]);
          overlay.remove();
          showStorageUsage();
          toast("🗑️ Auto-saves cleared");
        }
      } }, "Clear Auto-saves"),
      el("button", { class: "btn btn-ghost", onclick: () => overlay.remove() }, "Close")
    );
    return [body, actions];
  });
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function showVersionDiff(versionId) {
  const allVersions = [...getAutoVersions(), ...getBackups()];
  const version = allVersions.find((v) => v.id === versionId);
  if (!version) return;

  const diffs = computeDiff(version.data, store);

  openOverlay(`Changes since "${version.label || version.name}"`, (overlay) => {
    const body = el("div", {});

    if (diffs.length === 0) {
      body.append(el("div", { class: "activity-empty" }, "No changes detected"));
    } else {
      body.append(el("div", { style: { fontSize: "12px", color: "var(--muted)", marginBottom: "8px" } }, `${diffs.length} change(s) since this version:`));
      const diffBox = el("div", { class: "version-diff" });
      for (const d of diffs) {
        const line = el("div", { style: { marginBottom: "4px" } });
        line.append(el("span", { class: "diff-section" }, `${d.collection}: `));
        line.append(el("span", {
          class: d.type === "add" ? "diff-add" : d.type === "remove" ? "diff-remove" : "",
          style: d.type === "change" ? { color: "var(--orange)" } : {},
        }, d.text));
        diffBox.append(line);
      }
      body.append(diffBox);
    }

    // Version summary
    if (version.summary) {
      body.append(el("div", { style: { fontSize: "11px", color: "var(--muted)", marginTop: "12px", padding: "8px", background: "var(--panel-2)", borderRadius: "var(--radius-sm)" } },
        el("strong", null, "Version snapshot: "), version.summary
      ));
    }

    const actions = el("div", { class: "editor-actions" },
      el("div", { class: "spacer" }),
      el("button", { class: "btn btn-ghost", onclick: () => overlay.remove() }, "Close"),
      el("button", { class: "btn btn-primary", onclick: () => { overlay.remove(); restoreVersion(versionId); } }, "↩ Restore This Version")
    );
    return [body, actions];
  });
}

/* ---------- Version History Panel UI ---------- */

let versionPanelOpen = false;

function renderVersionPanel() {
  const body = $("#version-body");
  if (!body) return;
  body.innerHTML = "";

  if (currentVersionTab === "auto") {
    const versions = getAutoVersions();
    if (versions.length === 0) {
      body.append(el("div", { class: "activity-empty" }, "No auto-saves yet\nVersions are created when you save changes."));
      return;
    }
    for (const v of versions.slice().reverse()) {
      body.append(renderVersionEntry(v, "auto"));
    }
  } else {
    const backups = getBackups();
    if (backups.length === 0) {
      body.append(el("div", { class: "activity-empty" }, "No named backups yet\nClick \"💾 Backup\" to create one."));
      return;
    }
    for (const b of backups.slice().reverse()) {
      body.append(renderVersionEntry(b, "backup"));
    }
  }
}

function renderVersionEntry(version, type) {
  const time = new Date(version.timestamp);
  const timeStr = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = time.toLocaleDateString([], { month: "short", day: "numeric" });
  const label = type === "backup" ? version.name : version.label;
  const summary = version.summary || "";

  const entry = el("div", { class: "version-entry" });

  const icon = el("div", { class: `version-icon ${type}` }, type === "backup" ? "💾" : "🕐");
  const info = el("div", { class: "version-info" });
  info.append(el("div", { class: "version-label" }, label || "Untitled"));
  const meta = el("div", { class: "version-meta" });
  meta.append(el("span", null, `${dateStr} ${timeStr}`));
  info.append(meta);
  if (summary) info.append(el("div", { class: "version-summary" }, summary));

  const actions = el("div", { class: "version-actions" });
  actions.append(
    el("button", { class: "btn btn-ghost", title: "View changes", onclick: () => showVersionDiff(version.id) }, "🔍"),
    el("button", { class: "btn btn-ghost", title: "Restore this version", onclick: () => restoreVersion(version.id) }, "↩"),
    el("button", { class: "btn btn-ghost", title: "Delete", onclick: () => deleteVersion(version.id) }, "🗑️")
  );

  entry.append(icon, info, actions);
  return entry;
}

function openVersionPanel() {
  const panel = $("#version-panel");
  panel.classList.add("open");
  versionPanelOpen = true;
  renderVersionPanel();
}

function closeVersionPanel() {
  $("#version-panel").classList.remove("open");
  versionPanelOpen = false;
}

function toggleVersionPanel() {
  if (versionPanelOpen) closeVersionPanel();
  else openVersionPanel();
}

// Tab switching
document.querySelectorAll(".version-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".version-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    currentVersionTab = tab.dataset.tab;
    renderVersionPanel();
  });
});

// Toggle button
$("#version-toggle").addEventListener("click", toggleVersionPanel);

// Create backup button
$("#create-backup-btn").addEventListener("click", () => {
  openOverlay("Create Named Backup", (overlay) => {
    const body = el("div", { style: { padding: "16px" } });
    const input = el("input", {
      type: "text",
      placeholder: "Backup name (e.g., Before event update)",
      style: { width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "13px", fontFamily: "inherit", background: "var(--panel-2)", color: "var(--text)" },
    });
    body.append(el("div", { class: "field" }, el("label", null, "Backup Name"), input));
    body.append(el("div", { style: { fontSize: "11px", color: "var(--muted)", marginTop: "4px" } }, "This saves a full snapshot of all your data."));

    const actions = el("div", { class: "editor-actions" },
      el("div", { class: "spacer" }),
      el("button", { class: "btn btn-ghost", onclick: () => overlay.remove() }, "Cancel"),
      el("button", {
        class: "btn btn-primary",
        onclick: () => {
          const name = input.value.trim() || "Backup " + new Date().toLocaleString();
          createNamedBackup(name);
          overlay.remove();
        },
      }, "💾 Create Backup")
    );
    return [body, actions];
  });
});

// Close panel on outside click
document.addEventListener("click", (e) => {
  const panel = $("#version-panel");
  const toggle = $("#version-toggle");
  if (panel && !panel.contains(e.target) && !toggle.contains(e.target)) {
    panel.classList.remove("open");
    versionPanelOpen = false;
  }
});

// Auto-version on page unload if dirty
window.addEventListener("beforeunload", () => {
  if (dirty) {
    createAutoVersion("Auto-save on exit");
  }
});

/* ================================================================
   Mobile: Swipe-down to close bottom-sheet panels
   ================================================================ */

function addSwipeToClose(panelEl, closeFn) {
  if (!panelEl) return;
  let startY = 0;
  let currentY = 0;
  let isDragging = false;

  panelEl.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return;
    // Only start if touching near the top of the panel
    const rect = panelEl.getBoundingClientRect();
    if (e.touches[0].clientY - rect.top > 60) return;
    startY = e.touches[0].clientY;
    isDragging = true;
    panelEl.style.transition = "none";
  }, { passive: true });

  panelEl.addEventListener("touchmove", (e) => {
    if (!isDragging) return;
    currentY = e.touches[0].clientY - startY;
    if (currentY > 0) {
      panelEl.style.transform = `translateY(${currentY}px)`;
      panelEl.style.opacity = String(1 - currentY / 300);
    }
  }, { passive: true });

  panelEl.addEventListener("touchend", () => {
    if (!isDragging) return;
    isDragging = false;
    panelEl.style.transition = "";
    panelEl.style.transform = "";
    panelEl.style.opacity = "";
    if (currentY > 100) {
      closeFn();
    }
    currentY = 0;
  }, { passive: true });
}

addSwipeToClose($("#activity-panel"), () => {
  $("#activity-panel").classList.remove("open");
});
addSwipeToClose($("#version-panel"), () => {
  $("#version-panel").classList.remove("open");
});

// Boot: a restored session resumes silently; a stored legacy token keeps
// working without forcing the login screen (old bookmarks, e2e harness);
// otherwise show sign-in first.
if (authed && sessionMode) {
  loadAll().catch((err) => {
    toast("Failed to load: " + err.message, "err");
    renderLogin($("#view"));
  });
} else if (sessionStorage.getItem("samithi_admin_token")) {
  legacyMode = true;
  authed = true;
  loadAll().catch((err) => {
    toast("Failed to load: " + err.message, "err");
    renderLogin($("#view"));
  });
} else {
  buildNav();
  render();
  updateUndoRedoButtons();
}

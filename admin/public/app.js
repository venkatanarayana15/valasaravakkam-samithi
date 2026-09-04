const API = "/api";

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

async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (body && body.error) detail = body.error;
    } catch {}
    throw new Error(`${res.status} ${detail}`);
  }
  return res.json();
}

async function loadAll() {
  const data = await api("/site");
  store = data;
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

  // Group by category
  const groups = {};
  for (const c of COLLECTIONS) {
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
  if (activeCollection === null) {
    $("#page-title").textContent = "Dashboard";
    const view = $("#view");
    view.innerHTML = "";
    renderDashboard(view);
  } else {
    const meta = COLLECTIONS.find((c) => c.name === activeCollection);
    $("#page-title").textContent = meta ? meta.label : "";
    const view = $("#view");
    view.innerHTML = "";
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
    const meta = COLLECTIONS.find((c) => c.name === activeCollection);
    bc.append(el("span", { class: "breadcrumb-sep" }, "/"));
    bc.append(el("span", { class: "breadcrumb-current" }, meta ? meta.label : activeCollection));
  }
}

function updateQuickAdd() {
  const dd = $("#quick-add-dropdown");
  if (!dd) return;
  dd.innerHTML = "";
  const addable = COLLECTIONS.filter((c) => c.name !== "siteconfig" && c.name !== "stats" && c.name !== "activities");
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
  s.textContent = "Unsaved changes";
  s.className = "save-state";
}

function clearDirty(msg) {
  dirty = false;
  const s = $("#save-state");
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
            headers: { "Content-Type": "application/octet-stream", "X-Filename": file.name },
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
  const existingKeys = Object.keys(item).filter((k) => known.has(k));
  const fieldNames = existingKeys.length ? existingKeys : keys.filter((k) => !k.startsWith("__"));

  for (const key of fieldNames) {
    const def = FIELD_DEFS[name]?.[key];
    const value = item[key];
    wrap.append(renderField(name, key, value, def));
  }
  const imgKeys = Object.keys(item).filter((k) => /image|img|src|avatar|photo/i.test(k));
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

function renderField(name, key, value, def) {
  const isTextarea = def?.type === "textarea" || (typeof value === "string" && value.length > 90);
  const isNumber = def?.type === "number" || typeof value === "number";
  const label = humanize(key);

  let input;
  if (isNumber) {
    input = el("input", { type: "number", name: key, value: value ?? 0 });
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
  form.querySelectorAll("input, textarea, select").forEach((input) => {
    if (!input.name) return;
    if (input.name.startsWith("__") || input.dataset.tmp) return;
    const v = input.value;
    const val = input.type === "number" ? (v === "" ? 0 : Number(v)) : v;
    if (isArrayCollection && val === "") return;
    out[input.name] = val;
  });
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
              if (input.name.startsWith("social-")) return;
              sc2[input.name] = input.value;
            });
            const social2 = [];
            card.querySelectorAll("input[name^='social-']").forEach((input) => {
              const [, field, idx] = input.name.split("-");
              const i = Number(idx);
              if (!social2[i]) social2[i] = {};
              social2[i][field] = input.value;
            });
            pushSnapshot();
            store.siteconfig = {
              siteConfig: sc2,
              socialLinks: social2.filter((s) => s && (s.label || s.href)),
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
    location: { type: "text" },
    mapsUrl: { type: "text" },
    description: { type: "textarea" },
    image: { type: "text" },
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
    text: { type: "textarea" },
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
          headers: { "Content-Type": "application/octet-stream", "X-Filename": file.name },
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
   Save all
   ================================================================ */

async function saveAll() {
  const btn = $("#save-all");
  btn.disabled = true;
  btn.textContent = "Saving...";
  try {
    for (const c of COLLECTIONS) {
      await api(`/${c.name}`, { method: "PUT", body: JSON.stringify(store[c.name]) });
    }
    clearDirty("All changes saved");
    toast("✅ All changes saved");
  } catch (err) {
    toast(err.message, "err");
    const s = $("#save-state");
    s.textContent = "Save failed";
    s.className = "save-state error";
  } finally {
    btn.disabled = false;
    btn.textContent = "💾 Save All";
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
$("#open-site").addEventListener("click", () => window.open("/", "_blank"));

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
  const saved = localStorage.getItem("samithi-admin-theme");
  if (saved) return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("samithi-admin-theme", theme);
  const thumb = $(".theme-toggle-thumb");
  const label = $("#theme-label");
  if (theme === "dark") {
    thumb.textContent = "🌙";
    label.textContent = "🌙";
  } else {
    thumb.textContent = "☀️";
    label.textContent = "☀️";
  }
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
    { icon: "↩", label: "Undo", kbd: "Ctrl+Z", keywords: ["undo", "revert"], action: () => undo() },
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
      el("div", { class: "spinner" }),
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

    // Merge with existing store
    pushSnapshot();
    let imported = 0;
    for (const key of Object.keys(data)) {
      if (store.hasOwnProperty(key)) {
        store[key] = data[key];
        imported++;
      }
    }

    if (imported === 0) {
      toast("No matching collections found in file", "err");
      return;
    }

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
  } catch (err) {
    toast("Storage full — clearing old auto-saves", "err");
    const trimmed = versions.slice(-10);
    localStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify(trimmed));
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
  } catch (err) {
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
window.addEventListener("beforeunload", (e) => {
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

loadAll().catch((err) => toast("Failed to load: " + err.message, "err"));

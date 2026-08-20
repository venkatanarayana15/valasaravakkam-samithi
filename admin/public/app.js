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
  buildNav();
  render();
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
  buildNav();
  render();
}

/* ================================================================
   Render
   ================================================================ */

function render() {
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

  const grid = el("div", { class: "dashboard-grid" });
  for (const s of statsData) {
    grid.append(
      el(
        "div",
        { class: "stat-card" },
        el("div", { class: `stat-icon ${s.color}` }, s.icon),
        el(
          "div",
          { class: "stat-info" },
          el("div", { class: "stat-value" }, String(s.value)),
          el("div", { class: "stat-label" }, s.label)
        )
      )
    );
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
}

function collectionCard(name, item, index, updateBulkToolbar) {
  const title = pickTitle(item);
  const sub = pickSub(item);
  const preview = pickPreview(item);
  const isSelected = selectedItems.has(index);

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
  return box;
}

function pickTitle(item) {
  if (typeof item !== "object") return String(item);
  return (
    item.title ||
    item.label ||
    item.name ||
    item.heading ||
    item.strong ||
    JSON.stringify(item).slice(0, 60)
  );
}

function pickSub(item) {
  if (typeof item !== "object") return "";
  return item.description || item.role || item.text || item.href || "";
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
  a.click();
  URL.revokeObjectURL(url);
  toast(`📥 Exported ${label} ${meta.label} as JSON`);
}

/* ---------- Edit / create ---------- */

function editItem(name, index) {
  const isNew = index === null;
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
            const value = collectForm(form, name);
            if (isNew) {
              if (Array.isArray(store[name])) store[name].push(value);
              else store[name] = value;
            } else {
              if (Array.isArray(store[name])) store[name][index] = value;
              else store[name] = value;
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

$("#menu-btn").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
$("#save-all").addEventListener("click", saveAll);
$("#open-site").addEventListener("click", () => window.open("/", "_blank"));

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

loadAll().catch((err) => toast("Failed to load: " + err.message, "err"));

const API = "/api";

const COLLECTIONS = [
  { name: "siteconfig", label: "Site Settings", icon: "⚙" },
  { name: "events", label: "Upcoming Events", icon: "📅" },
  { name: "services", label: "Services", icon: "🤝" },
  { name: "coordinators", label: "Coordinators", icon: "👥" },
  { name: "gallery", label: "Gallery", icon: "🖼" },
  { name: "homegallery", label: "Home Gallery", icon: "🏠" },
  { name: "stats", label: "Stats", icon: "📊" },
  { name: "activities", label: "Activities", icon: "📈" },
  { name: "about", label: "About Sections", icon: "📄" },
  { name: "members", label: "Members", icon: "🧑‍🤝‍🧑" },
  { name: "balvikas", label: "Balvikas Children", icon: "🧒" },
];

let store = {};
let activeCollection = "siteconfig";
let dirty = false;

const $ = (sel) => document.querySelector(sel);
const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  attrs = attrs || {};
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
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
  setTimeout(() => t.remove(), 2600);
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

function buildNav() {
  const nav = $("#nav");
  nav.innerHTML = "";
  for (const c of COLLECTIONS) {
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

function selectCollection(name) {
  activeCollection = name;
  $("#menu-btn").parentElement.classList.remove("open");
  $("#sidebar").classList.remove("open");
  buildNav();
  render();
}

function render() {
  const meta = COLLECTIONS.find((c) => c.name === activeCollection);
  $("#page-title").textContent = meta ? meta.label : "";
  const view = $("#view");
  view.innerHTML = "";
  if (activeCollection === "siteconfig") renderSiteConfig(view);
  else renderCollection(view, activeCollection, meta);
}

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

/* ============================================================
   Generic collection editor (arrays of objects)
   ============================================================ */

function renderCollection(view, name, meta) {
  const items = Array.isArray(store[name]) ? store[name] : [];
  const card = el("div", { class: "card" });
  card.append(
    el(
      "div",
      { class: "card-head" },
      el("div", null, el("h3", null, meta.label), el("p", null, `${items.length} item(s)`)),
      el("button", { class: "btn btn-primary btn-sm", onclick: () => editItem(name, null) }, "+ Add Item")
    )
  );

  if (items.length === 0) {
    card.append(el("div", { class: "empty" }, "No items yet. Click \"+ Add Item\" to create one."));
  } else {
    const grid = el("div", { class: "grid" });
    items.forEach((item, i) => {
      grid.append(collectionCard(name, item, i));
    });
    card.append(grid);
  }
  view.append(card);
}

function collectionCard(name, item, index) {
  const title = pickTitle(item);
  const sub = pickSub(item);
  const preview = pickPreview(item);
  const box = el(
    "div",
    { class: "row" },
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
      el("button", { class: "btn btn-ghost btn-sm", onclick: () => editItem(name, index) }, "Edit"),
      el("button", { class: "btn btn-danger btn-sm", onclick: () => deleteItem(name, index) }, "Del")
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
      el("button", { class: "btn btn-danger", onclick: () => overlay.remove() }, "Cancel"),
      el(
        "button",
        { class: "btn btn-primary", onclick: async (e) => {
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
          toast(isNew ? "Added" : "Updated");
        } },
        isNew ? "Create" : "Save"
      )
    );
    return [form, actions];
  });
}

function editGalleryItem(index) {
  const isNew = index === null;
  const item = isNew ? { slug: "", label: "", icon: "fa-om", description: "", images: [] } : { ...store.gallery[index], images: [...store.gallery[index].images] };
  openOverlay(isNew ? "New Gallery Folder" : "Edit Gallery Folder", (overlay) => {
    const form = el("div", {});
    for (const [key, label, type] of [
      ["slug", "Slug (URL path)", "text"],
      ["label", "Label", "text"],
      ["icon", "Icon key", "text"],
      ["description", "Description", "textarea"],
    ]) {
      form.append(
        el("div", { class: "field" }, el("label", null, label),
          type === "textarea" ? el("textarea", { name: key, rows: 3 }, item[key] ?? "") : el("input", { type: "text", name: key, value: item[key] ?? "" }))
      );
    }

    form.append(el("hr", { class: "separator" }));
    form.append(el("h3", { style: "font-size:14px;margin-bottom:10px" }, `Images (${item.images.length})`));
    const imgBox = el("div", {});
    const countEl = form.querySelector("h3");

    const addImageRow = (img) => {
      imgBox.append(
        el(
          "div",
          { class: "sub-item" },
          el("img", { class: "thumb", src: img.src, alt: "", onerror: "this.style.display='none'" }),
          el("input", { type: "text", value: img.src, placeholder: "Image URL", oninput: (e) => (img.src = e.target.value) }),
          el("input", { type: "text", value: img.title || "", placeholder: "Title", style: "max-width:130px", oninput: (e) => (img.title = e.target.value) }),
          el("input", { type: "text", value: img.description || "", placeholder: "Caption", style: "max-width:150px", oninput: (e) => (img.description = e.target.value) }),
          el("button", { class: "btn btn-danger btn-sm", onclick: () => {
            const idx = item.images.indexOf(img);
            if (idx !== -1) item.images.splice(idx, 1);
            img.remove();
            markDirty();
            countEl.textContent = `Images (${item.images.length})`;
          } }, "✕")
        )
      );
    };
    item.images.forEach(addImageRow);
    const addImg = el(
      "button",
      { class: "btn btn-ghost btn-sm", style: "margin-top:8px", onclick: () => {
        const img = { src: "", title: "", description: "" };
        item.images.push(img);
        addImageRow(img);
        markDirty();
        countEl.textContent = `Images (${item.images.length})`;
      } },
      "+ Add image"
    );
    imgBox.append(addImg);
    form.append(imgBox);

    const uploadBox = el("div", { class: "field", style: "margin-top:14px" });
    uploadBox.append(el("label", null, "Upload image (appends to list)"));
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
          countEl.textContent = `Images (${item.images.length})`;
          toast("Image uploaded");
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
      el("button", { class: "btn btn-danger", onclick: () => overlay.remove() }, "Cancel"),
      el(
        "button",
        { class: "btn btn-primary", onclick: () => {
          const slug = form.querySelector("input[name=slug]").value.trim();
          const existing = store.gallery.findIndex((g) => g.slug === slug);
          if (!slug) { toast("Slug is required", "err"); return; }
          if (existing !== -1 && existing !== index) { toast("Slug already exists", "err"); return; }
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
          toast(isNew ? "Gallery folder added" : "Gallery folder updated");
        } },
        isNew ? "Create Folder" : "Save Folder"
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
  // image source helper for common image fields
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
      ...def.options.map((o) =>
        el("option", { value: o, selected: o === value ? "selected" : null }, o)
      )
    );
  } else {
    input = el("input", { type: "text", name: key, value: value ?? "" });
  }
  return el("div", { class: "field" }, el("label", null, label), input);
}

function collectForm(form, name) {
  const out = {};
  const isArrayCollection = Array.isArray(store[name]);
  const base = isArrayCollection
    ? {}
    : { ...(typeof store[name] === "object" ? store[name] : {}) };
  form.querySelectorAll("input, textarea, select").forEach((input) => {
    if (!input.name) return;
    if (input.name.startsWith("__") || input.dataset.tmp) return;
    const v = input.value;
    const val = input.type === "number" ? (v === "" ? 0 : Number(v)) : v;
    if (isArrayCollection && val === "" ) return;
    out[input.name] = val;
  });
  return { ...base, ...out };
}

/* ---------- Delete ---------- */

function deleteItem(name, index) {
  if (!confirm(`Delete this item?`)) return;
  store[name].splice(index, 1);
  markDirty();
  render();
  toast("Deleted");
}

/* ============================================================
   Site config (object with nested siteConfig + socialLinks)
   ============================================================ */

function renderSiteConfig(view) {
  const data = store.siteconfig || {};
  const sc = data.siteConfig || {};

  const card = el("div", { class: "card" });
  card.append(
    el(
      "div",
      { class: "card-head" },
      el("div", null, el("h3", null, "Site Settings"), el("p", null, "Contact details, social links and identity."))
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
  wrap.append(el("h3", { style: "font-size:14px;margin-bottom:10px" }, "Social Links"));
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
          style: "max-width:110px",
          oninput: () => markDirty(),
        }),
        el("input", {
          type: "text",
          name: `social-icon-${i}`,
          value: link.icon || "",
          placeholder: "Icon key",
          style: "max-width:130px",
          oninput: () => markDirty(),
        }),
        el("input", {
          type: "text",
          name: `social-href-${i}`,
          value: link.href || "",
          placeholder: "URL",
          oninput: () => markDirty(),
        }),
        el("button", {
          class: "btn btn-danger btn-sm",
          onclick: () => {
            social.splice(i, 1);
            markDirty();
            renderSiteConfig(view);
          },
        }, "✕")
      )
    );
  });
  socialBox.append(
    el(
      "button",
      {
        class: "btn btn-ghost btn-sm",
        style: "margin-top:6px",
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
            toast("Site settings updated");
          },
        },
        "Save Site Settings"
      )
    )
  );
  view.append(card);
}

/* ============================================================
   Field definitions & helpers
   ============================================================ */

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
        toast("Image uploaded");
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
        el("button", {
          class: "btn btn-ghost btn-sm",
          style: "margin-left:8px",
          onclick: () => {
            item[key] = "";
            renderPreview();
            markDirty();
          },
        }, "Clear")
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
  const overlay = el("div", { class: "overlay", onclick: (e) => { if (e.target === overlay) overlay.remove(); } });
  const editor = el(
    "div",
    { class: "editor" },
    el("div", { class: "editor-head" }, el("h3", null, title), el("button", { class: "btn btn-ghost btn-sm", onclick: () => overlay.remove() }, "✕"))
  );
  const body = el("div", {});
  const result = contentFn(overlay);
  for (const node of result) body.append(node);
  editor.append(body);
  overlay.append(editor);
  document.body.append(overlay);
}

/* ============================================================
   Save all
   ============================================================ */

async function saveAll() {
  const btn = $("#save-all");
  btn.disabled = true;
  btn.textContent = "Saving...";
  try {
    for (const c of COLLECTIONS) {
      await api(`/${c.name}`, { method: "PUT", body: JSON.stringify(store[c.name]) });
    }
    clearDirty("All changes saved");
    toast("All changes saved");
  } catch (err) {
    toast(err.message, "err");
    const s = $("#save-state");
    s.textContent = "Save failed";
    s.className = "save-state error";
  } finally {
    btn.disabled = false;
    btn.textContent = "Save All";
  }
}

/* ============================================================
   Init
   ============================================================ */

window.addEventListener("beforeunload", (e) => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});

$("#menu-btn").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
$("#save-all").addEventListener("click", saveAll);
$("#open-site").addEventListener("click", () => window.open("/", "_blank"));

loadAll().catch((err) => toast("Failed to load: " + err.message, "err"));

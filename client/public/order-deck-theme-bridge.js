/*
 * DRΛKSIDE ORDER DECK · shared runtime bridge
 * The host app remains the source of truth for theme and public Supabase config.
 * Never put service-role or secret keys in this file or in postMessage payloads.
 */
(function () {
  "use strict";

  function hex(value, fallback) {
    return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
  }

  function applyTheme(theme) {
    if (!theme || typeof theme !== "object") return;
    var root = document.documentElement;
    var body = document.body;
    var bg = hex(theme.bg, "#050611");
    var surface = hex(theme.surface, "#101329");
    var primary = hex(theme.primary, "#48f0ff");
    var accent = hex(theme.accent, "#a879ff");
    var text = hex(theme.textPrimary, "#ffffff");
    var muted = hex(theme.textSecondary, "#c9bfd2");
    var radius = Number.isFinite(Number(theme.radius)) ? Number(theme.radius) : 16;
    var glow = Number.isFinite(Number(theme.glow)) ? Number(theme.glow) : 12;

    root.style.setProperty("--shared-theme-bg", bg);
    root.style.setProperty("--shared-theme-surface", surface);
    root.style.setProperty("--shared-theme-primary", primary);
    root.style.setProperty("--shared-theme-accent", accent);
    root.style.setProperty("--shared-theme-text", text);
    root.style.setProperty("--shared-theme-muted", muted);
    root.style.setProperty("--shared-theme-radius", radius + "px");
    root.style.setProperty("--shared-theme-glow", glow + "px");
    root.style.setProperty("--deck-bg", bg);
    root.style.setProperty("--deck-surface", surface);
    root.style.setProperty("--deck-primary", primary);
    root.style.setProperty("--deck-accent", accent);
    root.style.setProperty("--deck-text", text);
    root.style.setProperty("--deck-muted", muted);
    root.style.setProperty("--deck-glow", glow + "px");
    root.style.setProperty("--visual-bg", bg);
    root.style.setProperty("--visual-card", surface);
    root.style.setProperty("--visual-neon", primary);
    root.style.setProperty("--theme-cyan", primary);
    root.style.setProperty("--theme-violet", accent);
    root.style.setProperty("--theme-text", text);
    root.style.setProperty("--theme-muted", muted);
    root.style.setProperty("--code-caret-color", primary);
    root.style.setProperty("--code-border-color", primary + "55");
    root.style.setProperty("--global-graphic", theme.graphicUrl ? "url(" + theme.graphicUrl + ")" : "none");
    root.style.setProperty("--global-font-body", theme.fontBody || "Noto Sans Thai");
    root.style.setProperty("--global-font-heading", theme.fontHeading || "Chakra Petch");
    body.classList.add("shared-runtime-theme");
    body.classList.toggle("shared-runtime-motion", theme.motion !== false);
    body.dataset.sharedThemeKey = String(theme.themeKey || "");

    var badge = document.querySelector(".theme-lab-panel .badge");
    if (badge) badge.textContent = "SHARED · ROOM 04";
    var hint = document.querySelector(".theme-lab-panel .hint");
    if (hint) hint.textContent = "ธีมนี้อ่านจากเว็บหลักและ app_themes ชุดเดียวกัน · แก้ไขที่ THEME CONTROL ROOM";
    var themePanel = document.querySelector(".theme-lab-panel");
    if (themePanel) themePanel.hidden = true;
  }

  function applyProjects(projects) {
    if (!Array.isArray(projects)) return;
    var safe = projects.filter(function (project) {
      return project && typeof project.url === "string" && typeof project.anonKey === "string" && project.url && project.anonKey;
    }).map(function (project) {
      return { url: project.url.replace(/\/+$/, ""), anonKey: project.anonKey, label: project.label || "" };
    });
    window.DARKSIDE_SHARED_PROJECTS = safe;
    window.DARKSIDE_SUPABASE_PROJECTS = safe;
    window.DARKSIDE_SUPABASE_READ = Object.freeze(safe[0] || { url: "", anonKey: "" });
    safe.slice(0, 2).forEach(function (project, index) {
      var suffix = String(index + 1).padStart(2, "0");
      var urlInput = document.getElementById("supabaseProjectUrl" + suffix);
      var keyInput = document.getElementById("supabaseToken" + suffix);
      if (urlInput) { urlInput.value = project.url; urlInput.readOnly = true; }
      if (keyInput) { keyInput.value = project.anonKey; keyInput.readOnly = true; }
    });
    var saveButton = document.getElementById("saveSupabaseConfig");
    var clearButton = document.getElementById("clearSupabaseConfig");
    if (saveButton) saveButton.hidden = true;
    if (clearButton) clearButton.hidden = true;
    var state = document.getElementById("trackingTokenState");
    if (state) { state.textContent = "SHARED CONFIG · เว็บหลักเป็นแหล่งเดียว"; state.classList.add("is-ready"); }
    window.dispatchEvent(new CustomEvent("ST_SHARED_PUBLIC_CONFIG_READY", { detail: { projects: safe } }));
  }

  window.applyOrderDeckSharedRuntime = function (payload) {
    if (!payload || typeof payload !== "object") return;
    if (payload.theme) applyTheme(payload.theme);
    if (payload.projects) applyProjects(payload.projects);
  };

  window.addEventListener("message", function (event) {
    if (event.source !== window.parent || event.origin !== window.location.origin) return;
    if (event.data && event.data.type === "ST_SHARED_RUNTIME") window.applyOrderDeckSharedRuntime(event.data);
  });

  function readStoredRuntime() {
    try {
      var theme = JSON.parse(localStorage.getItem("st-bb-global-theme-payload-v1") || "null");
      var projects = JSON.parse(localStorage.getItem("st-bb-global-public-config-v1") || "null");
      if (theme) applyTheme(theme);
      if (projects) applyProjects(projects);
    } catch (_) { /* unavailable in private or restricted storage */ }
  }
  window.addEventListener("storage", function (event) {
    if (event.key === "st-bb-global-theme-payload-v1" || event.key === "st-bb-global-public-config-v1") readStoredRuntime();
  });
  readStoredRuntime();
})();

// Boot, routing, endnotes drawer.

import { load as loadState, reset as resetState } from "./state.js";
import { renderDashboard, updateProgressBar } from "./dashboard.js";
import { openLesson, countSteps } from "./lesson.js";

const dashEl = document.getElementById("dash");
const lessonEl = document.getElementById("lessonView");
const pctEl = document.getElementById("pct");
const barEl = document.getElementById("barFill");

let manifest = [];
let lessonCache = {};
let lessonCleanup = null;

async function fetchJson(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`Failed to fetch ${url}`);
  return r.json();
}

async function loadLesson(id) {
  if (lessonCache[id]) return lessonCache[id];
  const data = await fetchJson(`content/lessons/${id}.json`);
  lessonCache[id] = data;
  return data;
}

async function init() {
  loadState();
  manifest = await fetchJson("content/manifest.json");

  // Annotate manifest with step counts (best-effort; loaded lazily)
  await Promise.all(manifest.slice(0, 6).map(async (L, i) => {
    try {
      const data = await loadLesson(L.id);
      manifest[i].stepCount = countSteps(data);
    } catch (e) {}
  }));

  renderHome();
  window.addEventListener("hashchange", route);
  route();
  setupChrome();
}

function setupChrome() {
  document.getElementById("brandHome").addEventListener("click", () => { location.hash = "#/"; });
  document.getElementById("resetBtn").addEventListener("click", () => {
    if (confirm("Reset all lesson progress?")) {
      resetState();
      lessonCache = {};
      renderHome();
      location.hash = "#/";
    }
  });

  // Endnotes drawer
  const drawer = document.getElementById("notesDrawer");
  const backdrop = document.getElementById("notesBackdrop");
  const toggle = document.getElementById("notesToggle");
  const close = document.getElementById("closeNotes");
  const openDrawer = () => {
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    backdrop.classList.add("show");
    toggle.setAttribute("aria-expanded", "true");
  };
  const closeDrawer = () => {
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    backdrop.classList.remove("show");
    toggle.setAttribute("aria-expanded", "false");
  };
  toggle.addEventListener("click", openDrawer);
  close.addEventListener("click", closeDrawer);
  backdrop.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); });

  // Footnote clicks open the drawer
  document.body.addEventListener("click", (e) => {
    const ref = e.target.closest(".fn-ref");
    if (!ref) return;
    e.preventDefault();
    openDrawer();
    const note = ref.dataset.note;
    const li = document.getElementById(`note-${note}`);
    if (li) {
      document.querySelectorAll("#notesBody li.highlight").forEach(el => el.classList.remove("highlight"));
      li.classList.add("highlight");
      li.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
}

function renderHome() {
  renderDashboard(manifest, (i) => {
    location.hash = `#/lesson/${i}`;
  });
  updateProgressBar(manifest, pctEl, barEl);
}

async function route() {
  const m = location.hash.match(/^#\/lesson\/(\d+)/);
  if (lessonCleanup) { lessonCleanup(); lessonCleanup = null; }
  if (m) {
    const i = Number(m[1]);
    if (i < 0 || i >= manifest.length) { location.hash = "#/"; return; }
    // Gate by sequential unlock (client-side enforcement; server-side enforcement
    // is the production requirement per BUILD-SPEC §4)
    const { isCompleted } = await import("./state.js");
    if (i > 0 && !isCompleted(manifest[i - 1].id)) {
      location.hash = "#/";
      return;
    }
    dashEl.classList.add("hidden");
    lessonEl.classList.remove("hidden");
    try {
      const lesson = await loadLesson(manifest[i].id);
      lessonCleanup = openLesson({
        lesson,
        manifest,
        lessonIndex: i,
        container: lessonEl,
        onComplete: () => { renderHome(); },
      });
    } catch (e) {
      lessonEl.innerHTML = `<div class="draft-banner"><b>Lesson not available</b> — content file is missing or invalid: <code>content/lessons/${manifest[i].id}.json</code></div>`;
    }
  } else {
    if (lessonEl) { lessonEl.classList.add("hidden"); lessonEl.innerHTML = ""; }
    dashEl.classList.remove("hidden");
    renderHome();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

init().catch(err => {
  console.error(err);
  document.body.insertAdjacentHTML("afterbegin",
    `<div class="draft-banner" style="margin:20px;max-width:none">
      <b>Failed to start the course.</b> Check the browser console — the manifest or a lesson file may be missing.
    </div>`);
});

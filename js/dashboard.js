// Dashboard: lesson grid with locked/available/completed states.

import { isCompleted } from "./state.js";

const escapeHtml = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Lesson i is unlocked iff i===0 OR previous lesson is completed.
export function isUnlocked(manifest, i) {
  if (i === 0) return true;
  const prev = manifest[i - 1];
  return prev ? isCompleted(prev.id) : false;
}

export function renderDashboard(manifest, onOpen) {
  const grid = document.getElementById("lessonGrid");
  if (!grid) return;
  grid.innerHTML = manifest.map((L, i) => {
    const unlocked = isUnlocked(manifest, i);
    const done = isCompleted(L.id);
    const draft = L.status === "draft";

    let pill;
    if (done) {
      pill = `<span class="pill done">✓ Completed</span>`;
    } else if (!unlocked) {
      pill = `<span class="pill lock">Locked</span>`;
    } else if (draft) {
      pill = `<span class="pill draft">Content pending</span>`;
    } else {
      pill = `<span class="pill start">${i === 0 ? "Begin" : "Start"} →</span>`;
    }

    const stepMeta = L.stepCount
      ? `<div class="step-meta">${L.stepCount} steps</div>`
      : "";

    const tag = L.tag || (i === 0 ? "Introduction" : `Chapter ${L.num} · ${L.tagSuffix || ""}`);
    const interactive = unlocked;

    return `<button type="button"
      class="card ${interactive ? "" : "locked"}"
      data-lesson-index="${i}"
      ${interactive ? "" : "disabled aria-disabled=\"true\""}>
      <div class="num">${escapeHtml(L.num || "·")}</div>
      <div class="meta">
        <div class="tag">${escapeHtml(tag)}</div>
        <h3>${escapeHtml(L.title || "")}</h3>
        ${L.subtitle ? `<p>${escapeHtml(L.subtitle)}</p>` : ""}
      </div>
      <div class="status">${pill}${stepMeta}</div>
    </button>`;
  }).join("");

  grid.querySelectorAll(".card[data-lesson-index]").forEach(btn => {
    if (btn.disabled) return;
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.lessonIndex);
      onOpen(idx);
    });
  });
}

export function updateProgressBar(manifest, pctEl, barEl) {
  const total = manifest.length;
  const done = manifest.filter(L => isCompleted(L.id)).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  if (pctEl) pctEl.textContent = pct + "%";
  if (barEl) barEl.style.width = pct + "%";
}

// Lesson view: stepper-based reader (one idea per screen) + gate at the end.

import { decompose, renderStepper, renderStep, wireStep } from "./stepper.js";
import { renderGate, wireGate } from "./quiz.js";
import { isCompleted, markCompleted, getStepIndex, setStepIndex } from "./state.js";

const escapeHtml = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Returns { stepCount: int } for the manifest update.
export function countSteps(lesson) {
  return decompose(lesson.blocks).length;
}

// Hydrate the global endnotes drawer with this lesson's notes.
function setNotes(lesson) {
  const body = document.getElementById("notesBody");
  const toggle = document.getElementById("notesToggle");
  const notes = lesson.notes || [];
  if (!notes.length) {
    body.innerHTML = `<p class="lj-caption">No endnotes for this lesson.</p>`;
    toggle.classList.remove("show");
    return;
  }
  body.innerHTML = `<ol>${notes.map((n, i) => `<li id="note-${i + 1}">${escapeHtml(n)}</li>`).join("")}</ol>`;
  toggle.classList.add("show");
}

export function openLesson({ lesson, manifest, lessonIndex, container, onComplete }) {
  const steps = decompose(lesson.blocks);
  const total = steps.length;
  const gate = lesson.gate;
  // Stage index N+0..N-1 = steps, stage N = gate
  const stageCount = total + 1;
  let stage = isCompleted(lesson.id) ? stageCount - 1 : Math.min(getStepIndex(lesson.id), stageCount - 1);

  setNotes(lesson);

  const draftBanner = lesson.status === "draft"
    ? `<div class="draft-banner"><b>Content pending</b> — this lesson's text needs to be ingested from the book. Run <code>scripts/extract_book.py</code> to populate, then edit <code>content/lessons/${escapeHtml(lesson.id)}.json</code>.</div>`
    : "";

  container.innerHTML = `
    <div class="crumb">
      <button class="crumb-link" id="crumbHome">All lessons</button>
      <span class="sep">›</span>
      <b>${escapeHtml(lesson.title || lesson.id)}</b>
    </div>
    <div class="lesson-head">
      <div class="ch">${escapeHtml(lesson.tag || (lessonIndex === 0 ? "Introduction" : `Chapter ${lesson.num}`))}</div>
      <h2>${escapeHtml(lesson.title || "")}</h2>
      ${lesson.subtitle ? `<div class="sub">${escapeHtml(lesson.subtitle)}</div>` : ""}
    </div>
    ${draftBanner}
    <div id="stepperWrap"></div>
    <div id="stepWrap"></div>
    <div class="step-nav">
      <button class="btn ghost" id="prevBtn" type="button">← Previous</button>
      <button class="btn" id="nextBtn" type="button">Next →</button>
    </div>
    <div id="gateWrap" class="hidden"></div>
    <div id="continueWrap"></div>
  `;
  container.classList.add("active");

  const stepperWrap = container.querySelector("#stepperWrap");
  const stepWrap = container.querySelector("#stepWrap");
  const gateWrap = container.querySelector("#gateWrap");
  const stepNav = container.querySelector(".step-nav");
  const prevBtn = container.querySelector("#prevBtn");
  const nextBtn = container.querySelector("#nextBtn");
  const continueWrap = container.querySelector("#continueWrap");

  function render() {
    if (stage < total) {
      // Render a step
      const step = steps[stage];
      stepperWrap.innerHTML = renderStepper({
        stepIndex: stage,
        totalSteps: total,
        section: step.section,
      });
      stepWrap.innerHTML = renderStep(step);
      stepWrap.classList.remove("hidden");
      stepperWrap.classList.remove("hidden");
      stepNav.classList.remove("hidden");
      gateWrap.classList.add("hidden");
      prevBtn.disabled = stage === 0;
      nextBtn.textContent = stage === total - 1 ? "Continue to assessment →" : "Next →";
      wireStep(stepWrap);
      setStepIndex(lesson.id, stage);
    } else {
      // Render the gate
      stepperWrap.innerHTML = `<div class="stepper">
        <div class="stepper-meta">
          <span>Assessment</span>
          <span class="section">Final step</span>
        </div>
        <div class="dot-rail">${Array.from({ length: total }, () => `<span class="dot done"></span>`).join("")}</div>
      </div>`;
      stepWrap.innerHTML = "";
      stepWrap.classList.add("hidden");
      stepNav.classList.add("hidden");
      gateWrap.classList.remove("hidden");
      gateWrap.innerHTML = renderGate(gate);
      if (gate) {
        wireGate(gateWrap, gate, async (score) => {
          markCompleted(lesson.id, score);
          renderContinue();
          onComplete && onComplete(lesson.id);
        });
      }
      if (isCompleted(lesson.id)) renderContinue();
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderContinue() {
    const next = lessonIndex + 1;
    if (next < manifest.length) {
      const nextL = manifest[next];
      const label = nextL.num && nextL.num !== "·"
        ? `Continue to Chapter ${nextL.num}: ${nextL.title} →`
        : `Continue to next lesson →`;
      continueWrap.innerHTML = `<div class="continue">
        <p class="msg">Lesson complete.</p>
        <button class="btn" id="continueBtn" type="button">${escapeHtml(label)}</button>
      </div>`;
      continueWrap.querySelector("#continueBtn").addEventListener("click", () => {
        location.hash = `#/lesson/${next}`;
      });
    } else {
      continueWrap.innerHTML = `<div class="continue">
        <p class="msg">You've completed every lesson. ל'חיים.</p>
        <button class="btn secondary" id="backHome" type="button">Back to all lessons</button>
      </div>`;
      continueWrap.querySelector("#backHome").addEventListener("click", () => {
        location.hash = "#/";
      });
    }
  }

  prevBtn.addEventListener("click", () => { if (stage > 0) { stage--; render(); } });
  nextBtn.addEventListener("click", () => { if (stage < stageCount - 1) { stage++; render(); } });
  container.querySelector("#crumbHome").addEventListener("click", () => { location.hash = "#/"; });

  // Keyboard navigation
  const onKey = (e) => {
    if (e.target.matches("input, textarea, button")) return;
    if (e.key === "ArrowRight") nextBtn.click();
    if (e.key === "ArrowLeft") prevBtn.click();
  };
  document.addEventListener("keydown", onKey);

  // Return cleanup
  return () => {
    document.removeEventListener("keydown", onKey);
    container.classList.remove("active");
    container.innerHTML = "";
  };
}

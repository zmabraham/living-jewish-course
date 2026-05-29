// Step decomposition + stepper UI per BUILD-SPEC §2:
// "one idea per screen". Blocks → steps using these rules:
//
//   * each `sec` is contextual; it labels the steps that follow (not its own step)
//   * each `keytext`        → own step
//   * each `box` / `deeper` → own step (long ones split via `splitContinued` flag)
//   * each `term`           → attaches to the step that introduces it
//   * each `practice`       → own step
//   * each `summary`        → own step
//   * each `resolutions`    → own step
//   * each numbered `p`     → own step
//   * an un-numbered `p` attaches to the current step (or opens one if there isn't one)

import { renderBlocks, wirePractice } from "./blocks.js";

const escapeHtml = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function decompose(blocks) {
  const steps = [];
  let section = null;
  let current = null;

  const openStep = (headline) => {
    if (current) steps.push(current);
    current = { headline: headline || null, section, blocks: [] };
  };

  for (const b of blocks || []) {
    const t = b.t || b.type;
    switch (t) {
      case "sec":
        section = b.text || b.x || section;
        // doesn't open a step; just updates context
        break;
      case "p":
        if (b.p) {
          openStep(null);
          current.blocks.push(b);
        } else if (!current) {
          openStep(null);
          current.blocks.push(b);
        } else {
          current.blocks.push(b);
        }
        break;
      case "term":
        if (!current) openStep(b.translit || null);
        current.blocks.push(b);
        break;
      case "keytext":
        openStep(b.source || "Source Text");
        current.blocks.push(b);
        break;
      case "box":
        openStep(b.heading || b.label || "Background");
        current.blocks.push(b);
        break;
      case "deeper":
        openStep(b.heading || "A Deeper Perspective");
        current.blocks.push(b);
        break;
      case "practice":
        openStep(b.label || "Quick Check");
        current.blocks.push(b);
        break;
      case "summary":
        openStep(b.label || "Summary");
        current.blocks.push(b);
        break;
      case "resolutions":
        openStep(b.label || "Practical Resolutions");
        current.blocks.push(b);
        break;
      case "caption":
        openStep(null);
        current.blocks.push(b);
        break;
      default:
        if (!current) openStep(null);
        current.blocks.push(b);
    }
  }
  if (current) steps.push(current);
  return steps;
}

export function renderStepper({ stepIndex, totalSteps, section }) {
  const dots = Array.from({ length: totalSteps }, (_, i) => {
    const cls = i < stepIndex ? "dot done" : i === stepIndex ? "dot current" : "dot";
    return `<span class="${cls}" aria-hidden="true"></span>`;
  }).join("");
  return `<div class="stepper">
    <div class="stepper-meta">
      <span>Step ${stepIndex + 1} of ${totalSteps}</span>
      ${section ? `<span class="section">${escapeHtml(section)}</span>` : "<span></span>"}
    </div>
    <div class="dot-rail" role="progressbar" aria-valuemin="1" aria-valuemax="${totalSteps}" aria-valuenow="${stepIndex + 1}">${dots}</div>
  </div>`;
}

export function renderStep(step) {
  return `<div class="step">
    ${step.headline ? `<div class="step-headline">${escapeHtml(step.headline)}</div>` : ""}
    <div class="step-body">${renderBlocks(step.blocks)}</div>
  </div>`;
}

// Wire any interactive elements inside the current step
export function wireStep(root) {
  wirePractice(root);
}

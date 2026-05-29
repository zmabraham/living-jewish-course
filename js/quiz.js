// Lesson gate: acknowledge (no quiz) or quiz (multiple choice).
//
// IMPORTANT: BUILD-SPEC §4 requires server-side grading so answers are not
// shippable in the client bundle. This module does CLIENT-side grading for
// the static prototype. For production, swap `grade()` for an API call.

const escapeHtml = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function renderGate(gate) {
  if (!gate) {
    return `<div class="gate"><h3>No assessment</h3><p class="gsub">This lesson has no gate configured.</p></div>`;
  }
  if (gate.type === "acknowledge") {
    return `<div class="gate ack-gate">
      <div class="gh">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <h3>Ready to continue</h3>
      </div>
      <p class="gsub">${escapeHtml(gate.text || "Mark this lesson complete to unlock the next.")}</p>
      <div class="gate-foot">
        <button class="btn" id="ackBtn" type="button">${escapeHtml(gate.label || "Mark complete")} →</button>
      </div>
    </div>`;
  }
  // quiz
  const pass = Math.round((gate.pass ?? 0.75) * 100);
  const questions = gate.questions || [];
  return `<div class="gate" id="gate" data-pass="${gate.pass ?? 0.75}">
    <div class="gh">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      <h3>Lesson Assessment</h3>
    </div>
    <p class="gsub">Answer all questions. Score ${pass}% or higher to unlock the next lesson.</p>
    ${questions.map((q, qi) => `
      <div class="qblock" data-q="${qi}">
        <div class="qt"><b>${qi + 1}.</b> ${escapeHtml(q.q)}</div>
        ${(q.options || []).map((o, oi) => `
          <button type="button" class="choice" data-opt="${oi}">
            <span class="dot">${"ABCDE"[oi]}</span><span>${escapeHtml(o)}</span>
          </button>`).join("")}
      </div>`).join("")}
    <div class="gate-foot">
      <button class="btn" id="submitBtn" type="button">Submit answers</button>
      <span class="verdict" id="verdict"></span>
    </div>
  </div>`;
}

// Wire the gate. onPass(score) is called when the gate resolves positively.
export function wireGate(root, gate, onPass) {
  if (!gate) return;
  if (gate.type === "acknowledge") {
    const btn = root.querySelector("#ackBtn");
    if (btn) btn.addEventListener("click", () => onPass(1));
    return;
  }
  // quiz
  const picks = {};
  root.querySelectorAll(".qblock").forEach(qb => {
    const qi = Number(qb.dataset.q);
    qb.querySelectorAll(".choice").forEach(choice => {
      choice.addEventListener("click", () => {
        picks[qi] = Number(choice.dataset.opt);
        qb.querySelectorAll(".choice").forEach(c => c.classList.remove("sel", "correct", "incorrect"));
        choice.classList.add("sel");
      });
    });
  });

  const submitBtn = root.querySelector("#submitBtn");
  const verdict = root.querySelector("#verdict");
  const setVerdict = (msg, cls) => { verdict.textContent = msg; verdict.className = "verdict " + cls; };

  submitBtn.addEventListener("click", () => {
    const qs = gate.questions || [];
    if (Object.keys(picks).length < qs.length) {
      setVerdict("Please answer every question.", "fail");
      return;
    }
    let correct = 0;
    qs.forEach((q, qi) => {
      const chosen = picks[qi];
      const block = root.querySelector(`.qblock[data-q="${qi}"]`);
      block.querySelectorAll(".choice").forEach(c => c.classList.remove("sel"));
      const chosenEl = block.querySelector(`.choice[data-opt="${chosen}"]`);
      const correctEl = block.querySelector(`.choice[data-opt="${q.correct}"]`);
      if (chosen === q.correct) { correct++; chosenEl.classList.add("correct"); }
      else { chosenEl.classList.add("incorrect"); correctEl && correctEl.classList.add("correct"); }
    });
    const score = correct / qs.length;
    if (score >= (gate.pass ?? 0.75)) {
      setVerdict(`Passed — ${correct}/${qs.length} correct. Next lesson unlocked.`, "pass");
      submitBtn.disabled = true;
      onPass(score);
    } else {
      setVerdict(`${correct}/${qs.length} correct — not quite. Review the lesson and try again.`, "fail");
      submitBtn.textContent = "Try again";
    }
  });
}

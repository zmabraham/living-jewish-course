// Block renderer — one function per content type per BUILD-SPEC §2 table.

const escapeHtml = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Render inline markup we allow inside prose: emphasis, italics, footnote refs.
// Footnote refs are markers like {fn:3} that turn into clickable superscripts.
function inline(text) {
  if (!text) return "";
  let s = escapeHtml(text);
  s = s.replace(/\{fn:(\d+)\}/g, (_, n) =>
    `<a href="#note-${n}" class="fn-ref" data-note="${n}" aria-label="Footnote ${n}">${n}</a>`);
  // *italic* and _italic_
  s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  return s;
}

function renderP(b) {
  const marker = b.p ? `<span class="pnum">[${escapeHtml(b.p)}]</span>` : "";
  return `<p>${marker}${inline(b.text || b.x || "")}</p>`;
}

function renderSec(b) {
  return `<h3 class="lj-section-head" style="margin-top:0">${escapeHtml(b.text || b.x || "")}</h3>`;
}

function renderKeytext(b) {
  const needsHe = !b.hebrew || /HEBREW_PROOFREADING_NEEDED/i.test(b.hebrew || "");
  const heHtml = needsHe
    ? `<div class="needs-hebrew">Hebrew source text requires proofreading from clean typesetting — not extracted from PDF. ${b.hebrewHint ? `(hint: <em>${escapeHtml(b.hebrewHint)}</em>)` : ""}</div>`
    : `<div class="heb" lang="he">${escapeHtml(b.hebrew)}</div>`;
  return `<div class="keytext">
    <div class="label">Key Text</div>
    ${heHtml}
    ${b.english ? `<div class="en">${inline(b.english)}</div>` : ""}
    ${b.source ? `<div class="src">— ${escapeHtml(b.source)}</div>` : ""}
  </div>`;
}

function renderTerm(b) {
  const needsHe = !b.hebrew || /HEBREW_PROOFREADING_NEEDED/i.test(b.hebrew || "");
  const heHtml = needsHe
    ? `<span class="he" style="font-family:var(--font-sans-text);color:var(--color-bad);font-size:13px;font-style:italic">Hebrew — proofreading needed</span>`
    : `<span class="he" lang="he">${escapeHtml(b.hebrew)}</span>`;
  return `<div class="term">
    <div class="heb-row">
      ${heHtml}
      ${b.translit ? `<span class="tl">${escapeHtml(b.translit)}</span>` : ""}
    </div>
    <div class="rows">
      ${b.translation ? `<div class="r"><span class="k">Translation</span><span>${escapeHtml(b.translation)}</span></div>` : ""}
      ${b.definition ? `<div class="r"><span class="k">Definition</span><span>${inline(b.definition)}</span></div>` : ""}
    </div>
  </div>`;
}

function renderBox(b) {
  return `<div class="box">
    <div class="label">${escapeHtml(b.label || "Background")}</div>
    ${b.heading ? `<h4>${escapeHtml(b.heading)}</h4>` : ""}
    ${(b.paragraphs || (b.text ? [b.text] : [])).map(t => `<p>${inline(t)}</p>`).join("")}
  </div>`;
}

function renderDeeper(b) {
  return `<div class="deeper">
    <div class="label">${escapeHtml(b.label || "A Deeper Perspective")}</div>
    ${b.heading ? `<h4>${escapeHtml(b.heading)}</h4>` : ""}
    ${(b.paragraphs || (b.text ? [b.text] : [])).map(t => `<p>${inline(t)}</p>`).join("")}
  </div>`;
}

function renderSummary(b) {
  const headers = b.headers || [];
  const rows = b.rows || [];
  return `<div class="summary">
    ${b.label ? `<div class="label">${escapeHtml(b.label)}</div>` : ""}
    <table>
      ${headers.length ? `<thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>` : ""}
      <tbody>
        ${rows.map(r => `<tr>${r.map(c => `<td>${inline(String(c))}</td>`).join("")}</tr>`).join("")}
      </tbody>
    </table>
  </div>`;
}

function renderResolutions(b) {
  return `<div class="resolutions">
    <div class="label">${escapeHtml(b.label || "Practical Resolutions")}</div>
    <ol>${(b.items || []).map(x => `<li>${inline(x)}</li>`).join("")}</ol>
  </div>`;
}

function renderPractice(b) {
  return `<div class="practice">
    <div class="label">${escapeHtml(b.label || "Exercise")}</div>
    <div class="desc">Instant feedback — does not affect your progress.</div>
    ${(b.items || []).map((it, qi) => `
      <div class="tf" data-ans="${it.answer === true || it.a === true}">
        <div class="q">${qi + 1}. ${inline(it.q)}</div>
        <div class="opts">
          <button data-pick="true">True</button>
          <button data-pick="false">False</button>
        </div>
        <div class="feedback" hidden></div>
      </div>`).join("")}
  </div>`;
}

function renderCaption(b) {
  return `<figure class="caption">
    ${b.image ? `<img src="${escapeHtml(b.image)}" alt="${escapeHtml(b.alt || "")}">` : ""}
    <figcaption>${inline(b.text || "")}</figcaption>
  </figure>`;
}

function renderUnknown(b) {
  return `<div class="draft-banner"><b>Unknown block</b> — type "${escapeHtml(b.t || b.type || "?")}". Update <code>blocks.js</code> to render it.</div>`;
}

export function renderBlock(b) {
  switch (b.t || b.type) {
    case "p": return renderP(b);
    case "sec": return renderSec(b);
    case "keytext": return renderKeytext(b);
    case "term": return renderTerm(b);
    case "box": return renderBox(b);
    case "deeper": return renderDeeper(b);
    case "summary": return renderSummary(b);
    case "resolutions": return renderResolutions(b);
    case "practice": return renderPractice(b);
    case "caption": return renderCaption(b);
    default: return renderUnknown(b);
  }
}

export function renderBlocks(blocks) {
  return (blocks || []).map(renderBlock).join("");
}

// Wire up ungraded T/F practice (per BUILD-SPEC §4: never gates progress)
export function wirePractice(root) {
  root.querySelectorAll(".tf").forEach(tf => {
    const ans = tf.dataset.ans === "true";
    tf.querySelectorAll(".opts button").forEach(btn => {
      btn.addEventListener("click", () => {
        const picked = btn.dataset.pick === "true";
        tf.querySelectorAll(".opts button").forEach(b => b.classList.remove("sel", "right", "wrong"));
        if (picked === ans) {
          btn.classList.add("right");
          const fb = tf.querySelector(".feedback");
          fb.textContent = "Correct.";
          fb.className = "feedback right"; fb.hidden = false;
        } else {
          btn.classList.add("wrong");
          tf.querySelector(`.opts button[data-pick="${ans}"]`).classList.add("right");
          const fb = tf.querySelector(".feedback");
          fb.textContent = ans ? "The correct answer is True." : "The correct answer is False.";
          fb.className = "feedback wrong"; fb.hidden = false;
        }
      });
    });
  });
}

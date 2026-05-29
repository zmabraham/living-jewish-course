// Demo password gate.
//
// IMPORTANT: this is a friction barrier for a demo deployment, NOT real
// security. The password literally lives in the static bundle below.
// Anyone with browser devtools can read it. For real access control,
// implement BUILD-SPEC §5–§6: server-side auth + enrollment gating.

const DEMO_PASSWORD = "LJ123";
const UNLOCK_KEY = "lj_demo_unlock_v1";

export function isUnlocked() {
  try { return localStorage.getItem(UNLOCK_KEY) === "1"; }
  catch (e) { return false; }
}

function unlock() {
  try { localStorage.setItem(UNLOCK_KEY, "1"); } catch (e) {}
}

export function showGate(onSuccess) {
  // Build the overlay only once
  let overlay = document.getElementById("demoGate");
  if (overlay) { overlay.classList.add("show"); return; }

  overlay = document.createElement("div");
  overlay.id = "demoGate";
  overlay.className = "demo-gate show";
  overlay.innerHTML = `
    <div class="demo-gate-card">
      <div class="kicker">Private demo</div>
      <h1>The Complete Guide<br>to Keeping Kosher</h1>
      <p class="lead">An online course preview from the Living Jewish series. Enter the access code to continue.</p>
      <form id="demoGateForm" autocomplete="off">
        <label for="demoPw">Access code</label>
        <input id="demoPw" type="password" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="••••" />
        <button type="submit" class="btn">Enter</button>
        <div id="demoPwError" class="err" hidden>Incorrect code. Try again.</div>
      </form>
      <p class="fine">Password-gated demo · friction barrier only, not real security.</p>
    </div>
  `;
  document.body.appendChild(overlay);

  const form = overlay.querySelector("#demoGateForm");
  const input = overlay.querySelector("#demoPw");
  const err = overlay.querySelector("#demoPwError");
  setTimeout(() => input.focus(), 50);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (input.value === DEMO_PASSWORD) {
      unlock();
      overlay.classList.remove("show");
      setTimeout(() => overlay.remove(), 350);
      onSuccess && onSuccess();
    } else {
      err.hidden = false;
      input.value = "";
      input.focus();
      overlay.querySelector(".demo-gate-card").animate(
        [{ transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "none" }],
        { duration: 200 }
      );
    }
  });
}

// Add a "Sign out" affordance: clears the unlock flag, reloads.
export function signOut() {
  try { localStorage.removeItem(UNLOCK_KEY); } catch (e) {}
  location.reload();
}

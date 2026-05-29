// Progress state.
// NOTE: localStorage is for the static prototype only. For the production
// version with accounts + cross-device sync (per BUILD-SPEC §5), this module
// is the swap point — replace with API calls to the progress endpoints.

const STORE_KEY = "lj_course_progress_v1";

const empty = () => ({
  completed: [],         // array of lesson ids
  lastStepIndex: {},     // lessonId -> step index (resume)
  scores: {},            // lessonId -> latest quiz score (0-1)
});

let state = empty();

export function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) state = { ...empty(), ...JSON.parse(raw) };
  } catch (e) {
    state = empty();
  }
  return state;
}

export function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
}

export function reset() {
  state = empty();
  save();
  return state;
}

export function isCompleted(lessonId) {
  return state.completed.includes(lessonId);
}

export function markCompleted(lessonId, score) {
  if (!state.completed.includes(lessonId)) state.completed.push(lessonId);
  if (typeof score === "number") state.scores[lessonId] = score;
  save();
}

export function getStepIndex(lessonId) {
  return state.lastStepIndex[lessonId] || 0;
}

export function setStepIndex(lessonId, idx) {
  state.lastStepIndex[lessonId] = idx;
  save();
}

export function getScore(lessonId) {
  return state.scores[lessonId];
}

export function getState() { return state; }

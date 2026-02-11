const counterEl = document.getElementById("counter");
const sideLabelEl = document.getElementById("sideLabel");
const cardTextEl = document.getElementById("cardText");

const prevBtn = document.getElementById("prevBtn");
const flipBtn = document.getElementById("flipBtn");
const nextBtn = document.getElementById("nextBtn");
const closeBtn = document.getElementById("closeBtn");

const flashcards = JSON.parse(localStorage.getItem("ssi_flashcards") || "[]");

let idx = 0;
let showingAnswer = false;

function applySavedTheme() {
  if (window.SSITheme?.syncTheme) {
    window.SSITheme.syncTheme();
  }
  const theme = window.SSITheme?.getTheme ? window.SSITheme.getTheme() : "light";
  const isDark = theme === "dark";
  document.body.classList.toggle("theme-dark", isDark);
  document.body.classList.toggle("theme-light", !isDark);
}

function render() {
  const total = flashcards.length;
  if (!total) {
    counterEl.textContent = "0 / 0";
    sideLabelEl.textContent = "";
    cardTextEl.textContent = "No flashcards found.";
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    flipBtn.disabled = true;
    return;
  }

  const fc = flashcards[idx];
  counterEl.textContent = `${idx + 1} / ${total}`;

  if (showingAnswer) {
    sideLabelEl.textContent = "Answer";
    cardTextEl.textContent = fc.answer ?? "";
    flipBtn.textContent = "Show question";
  } else {
    sideLabelEl.textContent = "Question";
    cardTextEl.textContent = fc.question ?? "";
    flipBtn.textContent = "Flip";
  }

  prevBtn.disabled = idx === 0;
  nextBtn.disabled = idx === total - 1;
}

function prev() {
  if (idx > 0) {
    idx--;
    showingAnswer = false;
    render();
  }
}

function next() {
  if (idx < flashcards.length - 1) {
    idx++;
    showingAnswer = false;
    render();
  }
}

function flip() {
  showingAnswer = !showingAnswer;
  render();
}

prevBtn.addEventListener("click", prev);
nextBtn.addEventListener("click", next);
flipBtn.addEventListener("click", flip);
closeBtn.addEventListener("click", () => window.close());

window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") prev();
  if (e.key === "ArrowRight") next();
  if (e.key === " ") {
    e.preventDefault();
    flip();
  }
});

window.addEventListener("storage", (e) => {
  const themeKey = window.SSITheme?.getStorageKey ? window.SSITheme.getStorageKey() : "ssi_theme";
  const isThemeKey = window.SSITheme?.isThemeKey
    ? window.SSITheme.isThemeKey(e.key || "")
    : (e.key || "").startsWith("ssi_theme_");

  if (e.key === themeKey || isThemeKey || e.key === "user_id" || e.key === "ssi_theme") {
    applySavedTheme();
  }
});

applySavedTheme();
render();

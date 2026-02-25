const userId = getUserId();
if (!userId) window.location.href = "login.html";

document.getElementById("logoutBtn").onclick = logout;

let activeChatId = null;
let latestFlashcards = [];
let chatSessionFlashcards = [];
let panelFlashcards = [];
let panelIdx = 0;
let panelShowingAnswer = false;
let openChatOptions = null;
let panelOpenedFromViewAll = false;
let activeQuizDetail = null;
let quizQuestionIdx = 0;
let quizAnsweredCount = 0;
let quizCorrectCount = 0;
let quizBusy = false;
let analyticsLoading = false;
let analyticsLoaded = false;

const chatList = document.getElementById("chatList");
const messagesDiv = document.getElementById("messages");
const chatForm = document.getElementById("chatForm");
const input = document.getElementById("messageInput");
const chatMain = document.querySelector(".chat-main");
const viewFlashcardsBtn = document.getElementById("viewFlashcardsBtn");
const flashcardStatusEl = document.getElementById("flashcardStatus");
const adminNavLink = document.getElementById("adminNavLink");
const showChatsTabBtn = document.getElementById("showChatsTabBtn");
const showAnalyticsTabBtn = document.getElementById("showAnalyticsTabBtn");
const showSettingsTabBtn = document.getElementById("showSettingsTabBtn");
const chatsPanel = document.getElementById("chatsPanel");
const analyticsPanel = document.getElementById("analyticsPanel");
const settingsPanel = document.getElementById("settingsPanel");
const themeToggle = document.getElementById("themeToggle");
const leftSidebar = document.getElementById("leftSidebar");
const hideSidebarBtn = document.getElementById("hideSidebarBtn");
const showSidebarBtn = document.getElementById("showSidebarBtn");
const flashcardsPanel = document.getElementById("flashcardsPanel");
const closeFlashcardsBtn = document.getElementById("closeFlashcardsBtn");
const flashcardsCounterEl = document.getElementById("flashcardsCounter");
const flashcardsSideLabelEl = document.getElementById("flashcardsSideLabel");
const flashcardsCardTextEl = document.getElementById("flashcardsCardText");
const flashcardsPrevBtn = document.getElementById("flashcardsPrevBtn");
const flashcardsFlipBtn = document.getElementById("flashcardsFlipBtn");
const flashcardsNextBtn = document.getElementById("flashcardsNextBtn");
const flashcardsStudyView = document.getElementById("flashcardsStudyView");
const flashcardsQuizView = document.getElementById("flashcardsQuizView");
const startQuizBtn = document.getElementById("startQuizBtn");
const quizProgressEl = document.getElementById("quizProgress");
const quizQuestionTextEl = document.getElementById("quizQuestionText");
const quizOptionsEl = document.getElementById("quizOptions");
const quizFeedbackEl = document.getElementById("quizFeedback");
const quizSummaryEl = document.getElementById("quizSummary");
const quizBackBtn = document.getElementById("quizBackBtn");
const quizNextBtn = document.getElementById("quizNextBtn");
const refreshAnalyticsBtn = document.getElementById("refreshAnalyticsBtn");
const analyticsSignal = document.getElementById("analyticsSignal");
const analyticsSignalTitle = document.getElementById("analyticsSignalTitle");
const analyticsSignalHint = document.getElementById("analyticsSignalHint");
const kpiTotalQuizzes = document.getElementById("kpiTotalQuizzes");
const kpiAvgScore = document.getElementById("kpiAvgScore");
const kpiLastScore = document.getElementById("kpiLastScore");
const kpiLast10 = document.getElementById("kpiLast10");
const analyticsTrendChart = document.getElementById("analyticsTrendChart");
const analyticsHistoryList = document.getElementById("analyticsHistoryList");
const analyticsMasterySummary = document.getElementById("analyticsMasterySummary");
const analyticsFlashcardsList = document.getElementById("analyticsFlashcardsList");

function applyAdminNavVisibility(userRole) {
  if (!adminNavLink) return;
  const isAdmin = String(userRole ?? "").trim().toLowerCase() === "admin";
  adminNavLink.classList.toggle("d-none", !isAdmin);
}

async function hydrateCurrentUserRole() {
  applyAdminNavVisibility(typeof getUserRole === "function" ? getUserRole() : "user");
  try {
    const me = await apiRequest("/users/me");
    if (typeof setUserRole === "function") {
      setUserRole(me?.user_role ?? "user");
    }
    applyAdminNavVisibility(me?.user_role ?? "user");
  } catch (_) {
    applyAdminNavVisibility("user");
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tokenizeForHighlight(text, minLen = 5, limit = 40) {
  const tokens = (text ?? "").toLowerCase().match(/\b[a-z0-9][a-z0-9-]{2,}\b/g) || [];
  const filtered = tokens.filter(t => t.length >= minLen);
  const unique = [];
  for (const token of filtered) {
    if (!unique.includes(token)) unique.push(token);
    if (unique.length >= limit) break;
  }
  return unique;
}

function highlightText(text, tokens) {
  if (!text) return "";
  if (!tokens || !tokens.length) return escapeHtml(text);

  const escapedTokens = tokens.map(escapeRegExp).sort((a, b) => b.length - a.length);
  const regex = new RegExp(`\\b(${escapedTokens.join("|")})\\b`, "gi");
  let result = "";
  let lastIndex = 0;

  for (const match of text.matchAll(regex)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    result += escapeHtml(text.slice(lastIndex, start));
    result += `<mark>${escapeHtml(match[0])}</mark>`;
    lastIndex = end;
  }

  result += escapeHtml(text.slice(lastIndex));
  return result;
}

function parseEvidenceSource(raw) {
  if (!raw) return null;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function renderSourceDetail(detailEl, source, answerText) {
  const snippet = source?.snippet ?? "";
  const filename = source?.filename || source?.file_id || "Source";
  const score = typeof source?.score === "number" ? source.score.toFixed(3) : null;

  detailEl.innerHTML = "";
  detailEl.classList.remove("d-none");

  const title = document.createElement("div");
  title.className = "source-detail-title";
  title.textContent = filename;

  const meta = document.createElement("div");
  meta.className = "source-detail-meta";
  meta.textContent = score ? `Relevance score: ${score}` : "Relevance score: -";

  const snippetBlock = document.createElement("div");
  snippetBlock.className = "source-detail-block";
  const snippetLabel = document.createElement("div");
  snippetLabel.className = "source-detail-label";
  snippetLabel.textContent = "Source excerpt";
  const snippetText = document.createElement("div");
  snippetText.className = "source-snippet";
  const answerTokens = tokenizeForHighlight(answerText, 5);
  snippetText.innerHTML = highlightText(snippet, answerTokens);
  snippetBlock.appendChild(snippetLabel);
  snippetBlock.appendChild(snippetText);

  const answerBlock = document.createElement("div");
  answerBlock.className = "source-detail-block";
  const answerLabel = document.createElement("div");
  answerLabel.className = "source-detail-label";
  answerLabel.textContent = "Answer (highlighted)";
  const answerTextEl = document.createElement("div");
  answerTextEl.className = "source-answer";
  const snippetTokens = tokenizeForHighlight(snippet, 5);
  answerTextEl.innerHTML = highlightText(answerText, snippetTokens);
  answerBlock.appendChild(answerLabel);
  answerBlock.appendChild(answerTextEl);

  detailEl.appendChild(title);
  detailEl.appendChild(meta);
  detailEl.appendChild(snippetBlock);
  detailEl.appendChild(answerBlock);
}

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.body.classList.toggle("theme-dark", isDark);
  document.body.classList.toggle("theme-light", !isDark);
  if (themeToggle) themeToggle.checked = isDark;
}

function loadTheme() {
  if (window.SSITheme?.syncTheme) {
    window.SSITheme.syncTheme();
  }
  const savedTheme = window.SSITheme?.getTheme ? window.SSITheme.getTheme() : "light";
  applyTheme(savedTheme);
}

function setSideTab(tab) {
  const showChats = tab === "chats";
  const showAnalytics = tab === "analytics";
  const showSettings = tab === "settings";

  chatsPanel.classList.toggle("d-none", !showChats);
  analyticsPanel.classList.toggle("d-none", !showAnalytics);
  settingsPanel.classList.toggle("d-none", !showSettings);

  showChatsTabBtn.classList.toggle("btn-primary", showChats);
  showChatsTabBtn.classList.toggle("btn-outline-secondary", !showChats);

  showAnalyticsTabBtn.classList.toggle("btn-primary", showAnalytics);
  showAnalyticsTabBtn.classList.toggle("btn-outline-secondary", !showAnalytics);

  showSettingsTabBtn.classList.toggle("btn-primary", showSettings);
  showSettingsTabBtn.classList.toggle("btn-outline-secondary", !showSettings);

  if (showAnalytics) {
    loadAnalytics();
  }
}

function formatPct(value, fallback = "-") {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return `${Math.round(n)}%`;
}

function formatDateShort(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function avg(values) {
  if (!values.length) return null;
  const total = values.reduce((acc, v) => acc + v, 0);
  return total / values.length;
}

function clampScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function truncateText(value, maxLen = 72) {
  const text = String(value ?? "").trim();
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 3)}...`;
}

function computeLearningSignal(overview, quizzes, flashcards) {
  const totalQuizzes = Number(overview?.total_quizzes ?? quizzes.length ?? 0);
  const scores = quizzes.map(q => clampScore(q?.score_percent));
  const firstChunk = scores.slice(0, Math.min(3, scores.length));
  const lastChunk = scores.slice(-Math.min(3, scores.length));
  const firstAvg = avg(firstChunk);
  const lastAvg = avg(lastChunk);
  const trendDelta = (lastAvg ?? 0) - (firstAvg ?? 0);
  const recentAccuracy = Number(overview?.accuracy_last_10_questions);

  const attempted = flashcards.filter(fc => Number(fc?.total_attempts) > 0).length;
  const mastered = flashcards.filter(fc => {
    const attempts = Number(fc?.total_attempts || 0);
    const acc = Number(fc?.accuracy);
    return attempts >= 2 && Number.isFinite(acc) && acc >= 80;
  }).length;
  const masteryHint = attempted > 0
    ? `${mastered}/${attempted} practiced flashcards look mastered.`
    : "Keep answering quizzes to build flashcard mastery data.";

  if (totalQuizzes < 2) {
    return {
      tone: "cold",
      title: "Collecting baseline",
      hint: "Run at least two quizzes to estimate learning trend.",
    };
  }

  if ((Number.isFinite(recentAccuracy) && recentAccuracy >= 85) || trendDelta >= 10) {
    return {
      tone: "good",
      title: "Strong improvement",
      hint: `Recent retention is high. ${masteryHint}`,
    };
  }

  if (trendDelta >= 3) {
    return {
      tone: "mid",
      title: "Steady progress",
      hint: "Scores are improving. Continue mixed-topic quizzes to stabilize recall.",
    };
  }

  if (trendDelta <= -6 || (Number.isFinite(recentAccuracy) && recentAccuracy < 55)) {
    return {
      tone: "risk",
      title: "Needs reinforcement",
      hint: "Performance is dropping. Revisit low-accuracy flashcards before new quizzes.",
    };
  }

  return {
    tone: "mid",
    title: "Stable but flat",
    hint: "Learning is stable. Increase challenge to push score growth.",
  };
}

function renderAnalyticsTrend(quizzes) {
  analyticsTrendChart.innerHTML = "";
  if (!quizzes.length) {
    analyticsTrendChart.innerHTML = '<div class="analytics-empty">No quiz scores yet.</div>';
    return;
  }

  const recent = quizzes.slice(-12);
  const bars = document.createElement("div");
  bars.className = "analytics-bars";

  recent.forEach((q, index) => {
    const score = clampScore(q?.score_percent);
    const col = document.createElement("div");
    col.className = "analytics-bar-col";
    col.title = `${q?.title || `Quiz ${index + 1}`} - ${score.toFixed(1)}% (${formatDateShort(q?.created_at)})`;

    const track = document.createElement("div");
    track.className = "analytics-bar-track";

    const fill = document.createElement("div");
    fill.className = "analytics-bar-fill";
    if (score >= 80) fill.classList.add("is-high");
    else if (score >= 60) fill.classList.add("is-mid");
    else fill.classList.add("is-low");
    fill.style.height = `${Math.max(score, 6)}%`;

    const label = document.createElement("div");
    label.className = "analytics-bar-label";
    label.textContent = String(index + 1);

    track.appendChild(fill);
    col.appendChild(track);
    col.appendChild(label);
    bars.appendChild(col);
  });

  const footer = document.createElement("div");
  footer.className = "analytics-trend-foot";
  const first = recent[0];
  const last = recent[recent.length - 1];
  footer.textContent = `From ${formatDateShort(first?.created_at)} to ${formatDateShort(last?.created_at)} | ${recent.length} quizzes`;

  analyticsTrendChart.appendChild(bars);
  analyticsTrendChart.appendChild(footer);
}

function renderAnalyticsHistory(quizzes) {
  analyticsHistoryList.innerHTML = "";
  if (!quizzes.length) {
    analyticsHistoryList.innerHTML = '<div class="analytics-empty">No quizzes completed yet.</div>';
    return;
  }

  const rows = [...quizzes].reverse().slice(0, 8);
  rows.forEach((q, idx) => {
    const score = clampScore(q?.score_percent);
    const row = document.createElement("div");
    row.className = "analytics-history-item";

    const left = document.createElement("div");
    left.className = "analytics-history-left";

    const title = document.createElement("div");
    title.className = "analytics-history-title";
    title.textContent = q?.title || `Quiz #${q?.quiz_id ?? idx + 1}`;

    const meta = document.createElement("div");
    meta.className = "analytics-history-meta";
    meta.textContent = `${formatDateShort(q?.created_at)} - Quiz #${q?.quiz_id ?? "-"}`;

    left.appendChild(title);
    left.appendChild(meta);

    const right = document.createElement("div");
    right.className = "analytics-score-pill";
    if (score >= 80) right.classList.add("is-high");
    else if (score >= 60) right.classList.add("is-mid");
    else right.classList.add("is-low");
    right.textContent = formatPct(score);

    row.appendChild(left);
    row.appendChild(right);
    analyticsHistoryList.appendChild(row);
  });
}

function renderAnalyticsFlashcards(flashcards) {
  analyticsFlashcardsList.innerHTML = "";
  if (!flashcards.length) {
    analyticsMasterySummary.textContent = "No flashcard attempts yet.";
    analyticsFlashcardsList.innerHTML = '<div class="analytics-empty">Answer quiz questions to unlock mastery data.</div>';
    return;
  }

  const attempted = flashcards.filter(fc => Number(fc?.total_attempts) > 0);
  const mastered = attempted.filter(fc => Number(fc?.accuracy) >= 80 && Number(fc?.total_attempts) >= 2);
  analyticsMasterySummary.textContent = `${mastered.length}/${attempted.length} practiced flashcards are at mastery level (>=80%).`;

  const ranked = [...flashcards]
    .sort((a, b) => Number(b?.total_attempts || 0) - Number(a?.total_attempts || 0))
    .slice(0, 8);

  ranked.forEach(fc => {
    const attempts = Number(fc?.total_attempts || 0);
    const accuracy = Number(fc?.accuracy);
    const score = Number.isFinite(accuracy) ? clampScore(accuracy) : 0;

    const card = document.createElement("div");
    card.className = "analytics-flashcard-item";

    const top = document.createElement("div");
    top.className = "analytics-flashcard-top";

    const q = document.createElement("div");
    q.className = "analytics-flashcard-q";
    q.textContent = truncateText(fc?.question || "Untitled question", 78);

    const acc = document.createElement("div");
    acc.className = "analytics-score-pill";
    if (!attempts) {
      acc.textContent = "No data";
    } else {
      if (score >= 80) acc.classList.add("is-high");
      else if (score >= 60) acc.classList.add("is-mid");
      else acc.classList.add("is-low");
      acc.textContent = formatPct(score);
    }

    top.appendChild(q);
    top.appendChild(acc);

    const meta = document.createElement("div");
    meta.className = "analytics-history-meta";
    meta.textContent = `${attempts} attempts - ${Number(fc?.correct_attempts || 0)} correct`;

    const progress = document.createElement("div");
    progress.className = "analytics-mini-progress";

    const fill = document.createElement("div");
    fill.className = "analytics-mini-progress-fill";
    fill.style.width = `${attempts ? Math.max(score, 4) : 0}%`;
    progress.appendChild(fill);

    card.appendChild(top);
    card.appendChild(meta);
    card.appendChild(progress);
    analyticsFlashcardsList.appendChild(card);
  });
}

function renderAnalyticsError(message) {
  analyticsSignal.className = "analytics-signal analytics-tone-risk";
  analyticsSignalTitle.textContent = "Analytics unavailable";
  analyticsSignalHint.textContent = message;
  kpiTotalQuizzes.textContent = "-";
  kpiAvgScore.textContent = "-";
  kpiLastScore.textContent = "-";
  kpiLast10.textContent = "-";
  analyticsTrendChart.innerHTML = '<div class="analytics-empty">Could not load trend data.</div>';
  analyticsHistoryList.innerHTML = '<div class="analytics-empty">Could not load quiz history.</div>';
  analyticsMasterySummary.textContent = "Could not load flashcard mastery.";
  analyticsFlashcardsList.innerHTML = '<div class="analytics-empty">Try refreshing analytics.</div>';
}

async function loadAnalytics({ force = false } = {}) {
  if (analyticsLoading) return;
  if (analyticsLoaded && !force) return;

  analyticsLoading = true;
  refreshAnalyticsBtn.disabled = true;
  refreshAnalyticsBtn.textContent = "Loading...";

  try {
    const [overview, progress, flashcards] = await Promise.all([
      apiRequest(`/users/${userId}/stats/overview`),
      apiRequest(`/users/${userId}/stats/progress`),
      apiRequest(`/users/${userId}/stats/flashcards`),
    ]);

    const quizzes = Array.isArray(progress?.quizzes) ? progress.quizzes : [];
    const flashcardRows = Array.isArray(flashcards) ? flashcards : [];
    const signal = computeLearningSignal(overview, quizzes, flashcardRows);

    analyticsSignal.className = `analytics-signal analytics-tone-${signal.tone}`;
    analyticsSignalTitle.textContent = signal.title;
    analyticsSignalHint.textContent = signal.hint;

    kpiTotalQuizzes.textContent = String(Number(overview?.total_quizzes ?? quizzes.length ?? 0));
    kpiAvgScore.textContent = formatPct(overview?.avg_quiz_score);
    kpiLastScore.textContent = formatPct(overview?.last_quiz_score);
    kpiLast10.textContent = formatPct(overview?.accuracy_last_10_questions);

    renderAnalyticsTrend(quizzes);
    renderAnalyticsHistory(quizzes);
    renderAnalyticsFlashcards(flashcardRows);
    analyticsLoaded = true;
  } catch (err) {
    renderAnalyticsError(err?.message || "Unknown error");
  } finally {
    analyticsLoading = false;
    refreshAnalyticsBtn.disabled = false;
    refreshAnalyticsBtn.textContent = "Refresh";
  }
}

function closeChatOptionsMenu() {
  if (!openChatOptions) return;
  openChatOptions.menu.classList.add("d-none");
  openChatOptions.item.classList.remove("chat-list-item-menu-open");
  openChatOptions = null;
}

function toggleChatOptionsMenu(item, menu) {
  const shouldOpen = menu.classList.contains("d-none");
  closeChatOptionsMenu();
  if (!shouldOpen) return;

  menu.classList.remove("d-none");
  item.classList.add("chat-list-item-menu-open");
  openChatOptions = { item, menu };
}

function setSidebarVisible(visible) {
  leftSidebar.classList.toggle("d-none", !visible);
  showSidebarBtn.classList.toggle("d-none", visible);
}

function isFlashcardsPanelOpen() {
  return !flashcardsPanel.classList.contains("d-none");
}

function renderFlashcardsPanel() {
  const total = panelFlashcards.length;
  if (!total) {
    flashcardsCounterEl.textContent = "0 / 0";
    flashcardsSideLabelEl.textContent = "";
    flashcardsCardTextEl.textContent = "No flashcards found.";
    flashcardsPrevBtn.disabled = true;
    flashcardsNextBtn.disabled = true;
    flashcardsFlipBtn.disabled = true;
    startQuizBtn.disabled = true;
    return;
  }

  const card = panelFlashcards[panelIdx];
  flashcardsCounterEl.textContent = `${panelIdx + 1} / ${total}`;

  if (panelShowingAnswer) {
    flashcardsSideLabelEl.textContent = "Answer";
    flashcardsCardTextEl.textContent = card.answer ?? "";
    flashcardsFlipBtn.textContent = "Show question";
  } else {
    flashcardsSideLabelEl.textContent = "Question";
    flashcardsCardTextEl.textContent = card.question ?? "";
    flashcardsFlipBtn.textContent = "Flip";
  }

  flashcardsPrevBtn.disabled = panelIdx === 0;
  flashcardsNextBtn.disabled = panelIdx === total - 1;
  flashcardsFlipBtn.disabled = false;
  startQuizBtn.disabled = false;
}

function openFlashcardsPanel(
  flashcards,
  { autoStartQuiz = false, source = "message" } = {},
) {
  panelFlashcards = Array.isArray(flashcards) ? flashcards : [];
  panelIdx = 0;
  panelShowingAnswer = false;
  panelOpenedFromViewAll = source === "view-all";
  resetQuizState();

  flashcardsPanel.classList.remove("d-none");
  setSidebarVisible(false);
  renderFlashcardsPanel();

  if (autoStartQuiz && panelFlashcards.length) {
    startMcqQuizFromPanel();
  }
}

function closeFlashcardsPanel({ restoreSidebar = true } = {}) {
  flashcardsPanel.classList.add("d-none");
  resetQuizState();
  panelFlashcards = [];
  panelIdx = 0;
  panelShowingAnswer = false;
  panelOpenedFromViewAll = false;

  if (restoreSidebar) {
    setSidebarVisible(true);
  }
}

function prevFlashcard() {
  if (panelIdx > 0) {
    panelIdx -= 1;
    panelShowingAnswer = false;
    renderFlashcardsPanel();
  }
}

function nextFlashcard() {
  if (panelIdx < panelFlashcards.length - 1) {
    panelIdx += 1;
    panelShowingAnswer = false;
    renderFlashcardsPanel();
  }
}

function flipFlashcard() {
  if (!panelFlashcards.length) return;
  panelShowingAnswer = !panelShowingAnswer;
  renderFlashcardsPanel();
}

function handleFlashcardsKeydown(e) {
  if (!isFlashcardsPanelOpen()) return;
  if (!flashcardsQuizView.classList.contains("d-none")) return;

  const active = document.activeElement;
  const tag = (active?.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || active?.isContentEditable) return;

  if (e.key === "ArrowLeft") {
    prevFlashcard();
  }
  if (e.key === "ArrowRight") {
    nextFlashcard();
  }
  if (e.key === " ") {
    e.preventDefault();
    flipFlashcard();
  }
}

function setChatBlur(blurred) {
  if (!chatMain) return;
  chatMain.classList.toggle("quiz-chat-blur", blurred);
}

function setQuizMode(enabled) {
  flashcardsStudyView.classList.toggle("d-none", enabled);
  flashcardsQuizView.classList.toggle("d-none", !enabled);
  setChatBlur(enabled && panelOpenedFromViewAll);
}

function resetQuizState() {
  activeQuizDetail = null;
  quizQuestionIdx = 0;
  quizAnsweredCount = 0;
  quizCorrectCount = 0;
  quizBusy = false;

  quizProgressEl.textContent = "Question 0 / 0";
  quizQuestionTextEl.textContent = "";
  quizOptionsEl.innerHTML = "";
  quizFeedbackEl.className = "small mt-3";
  quizFeedbackEl.textContent = "";
  quizSummaryEl.classList.add("d-none");
  quizSummaryEl.innerHTML = "";
  quizNextBtn.disabled = true;
  quizNextBtn.textContent = "Next";

  setQuizMode(false);
}

function getDistinctFlashcardIds(flashcards) {
  return [...new Set(
    (Array.isArray(flashcards) ? flashcards : [])
      .map(fc => Number(fc?.id))
      .filter(Number.isInteger)
  )];
}

function normalizeQuizQuestions(questions) {
  const rows = Array.isArray(questions) ? questions : [];
  const normalized = [];

  rows.forEach((q, index) => {
    const optionsRaw = Array.isArray(q?.mcq_options?.options) ? q.mcq_options.options : [];
    const options = optionsRaw
      .map((opt, optIdx) => {
        const label = String(opt?.label ?? ["A", "B", "C", "D"][optIdx] ?? "");
        const text = String(opt?.text ?? "").trim();
        return { label, text };
      })
      .filter(opt => opt.label && opt.text);

    if (!options.length) return;
    normalized.push({
      id: q?.id,
      question_text: String(q?.question_text ?? `Question ${index + 1}`),
      correct_answer: String(q?.correct_answer ?? ""),
      user_answer: q?.user_answer ?? null,
      is_correct: q?.is_correct ?? null,
      options,
    });
  });

  return normalized;
}

function setQuizFeedback(text, variant = "muted") {
  quizFeedbackEl.className = `small mt-3 text-${variant}`;
  quizFeedbackEl.textContent = text;
}

function renderQuizSummary() {
  const total = activeQuizDetail?.questions?.length || 0;
  const scorePercent = total > 0 ? Math.round((quizCorrectCount / total) * 100) : 0;

  quizProgressEl.textContent = "Quiz complete";
  quizQuestionTextEl.textContent = "All questions answered.";
  quizOptionsEl.innerHTML = "";
  setQuizFeedback("", "muted");
  quizSummaryEl.classList.remove("d-none");
  quizSummaryEl.innerHTML = `
    <div class="fw-semibold mb-1">Result</div>
    <div>Score: ${quizCorrectCount} / ${total} (${scorePercent}%)</div>
  `;
  quizNextBtn.disabled = true;
}

function renderQuizQuestion() {
  if (!activeQuizDetail) {
    resetQuizState();
    return;
  }

  const questions = activeQuizDetail.questions;
  const total = questions.length;
  if (!total) {
    renderQuizSummary();
    return;
  }

  const q = questions[quizQuestionIdx];
  if (!q) {
    renderQuizSummary();
    return;
  }

  quizSummaryEl.classList.add("d-none");
  quizSummaryEl.innerHTML = "";
  quizProgressEl.textContent = `Question ${quizQuestionIdx + 1} / ${total}`;
  quizQuestionTextEl.textContent = q.question_text || "";
  quizOptionsEl.innerHTML = "";

  const answered = q.user_answer !== null && q.user_answer !== undefined;
  if (!answered) {
    setQuizFeedback("Pick one option to answer.", "muted");
  } else if (q.is_correct) {
    setQuizFeedback("Correct.", "success");
  } else {
    setQuizFeedback(`Incorrect. Correct answer: ${q.correct_answer}`, "danger");
  }

  q.options.forEach(opt => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "quiz-option-btn";
    btn.textContent = `${opt.label}. ${opt.text}`;

    if (answered) {
      btn.disabled = true;
      if (opt.text.trim() === q.correct_answer.trim()) {
        btn.classList.add("is-correct");
      } else if (q.user_answer && opt.text.trim() === String(q.user_answer).trim()) {
        btn.classList.add("is-wrong");
      }
    } else {
      btn.onclick = () => submitQuizAnswer(opt.text);
    }

    quizOptionsEl.appendChild(btn);
  });

  const isLastQuestion = quizQuestionIdx === total - 1;
  quizNextBtn.textContent = isLastQuestion ? "Finish" : "Next";
  quizNextBtn.disabled = !answered;
}

async function submitQuizAnswer(selectedOptionText) {
  if (!activeQuizDetail || quizBusy) return;

  const q = activeQuizDetail.questions[quizQuestionIdx];
  if (!q || q.user_answer !== null) return;

  const quizId = activeQuizDetail.quiz?.id;
  if (!quizId || !q.id) return;

  quizBusy = true;
  [...quizOptionsEl.querySelectorAll("button")].forEach(btn => {
    btn.disabled = true;
  });
  setQuizFeedback("Checking answer...", "muted");

  try {
    const result = await apiRequest(
      `/quizzes/${quizId}/questions/${q.id}/answer`,
      "POST",
      { user_answer: selectedOptionText },
    );

    q.user_answer = result?.user_answer ?? selectedOptionText;
    q.is_correct = Boolean(result?.is_correct);
    if (q.is_correct) quizCorrectCount += 1;
    quizAnsweredCount += 1;
    analyticsLoaded = false;
    if (!analyticsPanel.classList.contains("d-none")) {
      loadAnalytics({ force: true });
    }
    renderQuizQuestion();
  } catch (err) {
    q.user_answer = null;
    q.is_correct = null;
    setQuizFeedback(`Answer submit failed: ${err.message}`, "danger");
    [...quizOptionsEl.querySelectorAll("button")].forEach(btn => {
      btn.disabled = false;
    });
  } finally {
    quizBusy = false;
  }
}

async function startMcqQuizFromPanel() {
  if (quizBusy) return;

  const flashcardIds = getDistinctFlashcardIds(panelFlashcards);
  if (!flashcardIds.length) {
    flashcardStatusEl.textContent = "No flashcards available for quiz.";
    return;
  }

  quizBusy = true;
  setChatBlur(panelOpenedFromViewAll);
  startQuizBtn.disabled = true;
  startQuizBtn.textContent = "Creating quiz...";
  flashcardStatusEl.textContent = "Creating MCQ quiz...";

  try {
    const quizDetail = await apiRequest(
      `/users/${userId}/quizzes/auto-mcq`,
      "POST",
      {
        title: "MCQ Quiz",
        flashcard_ids: flashcardIds,
      },
    );

    const questions = normalizeQuizQuestions(quizDetail?.questions);
    if (!questions.length) {
      throw new Error("The generated quiz had no questions.");
    }

    activeQuizDetail = {
      quiz: quizDetail?.quiz || {},
      questions,
    };
    quizQuestionIdx = 0;
    quizAnsweredCount = 0;
    quizCorrectCount = 0;

    setQuizMode(true);
    renderQuizQuestion();
    flashcardStatusEl.textContent = `Quiz ready: ${questions.length} questions.`;
  } catch (err) {
    resetQuizState();
    flashcardStatusEl.textContent = `Quiz generation failed: ${err.message}`;
  } finally {
    quizBusy = false;
    startQuizBtn.disabled = panelFlashcards.length === 0;
    startQuizBtn.textContent = "Start MCQ quiz";
  }
}

function goToNextQuizStep() {
  if (!activeQuizDetail) return;
  const total = activeQuizDetail.questions.length;
  if (!total) return;

  if (quizQuestionIdx >= total - 1) {
    renderQuizSummary();
    return;
  }

  quizQuestionIdx += 1;
  renderQuizQuestion();
}

function renderMessage(m, messageFlashcards = []) {
  const wrap = document.createElement("div");
  wrap.className = `mb-3 d-flex ${m.sender_role === "user" ? "justify-content-end" : "justify-content-start"}`;

  const bubble = document.createElement("div");
  bubble.className = "p-3 border rounded app-bubble";
  bubble.style.maxWidth = "720px";
  bubble.style.whiteSpace = "normal";

  const roleEl = document.createElement("div");
  roleEl.className = "small app-bubble-muted mb-1";
  roleEl.textContent = m.sender_role;

  const contentEl = document.createElement("div");
  contentEl.style.whiteSpace = "pre-wrap";
  contentEl.textContent = m.content ?? "";

  bubble.appendChild(roleEl);
  bubble.appendChild(contentEl);

  if (m.sender_role === "assistant" && messageFlashcards.length) {
    const previewBox = document.createElement("div");
    previewBox.className = "mt-3 pt-2 border-top";

    const previewLabel = document.createElement("div");
    previewLabel.className = "small fw-semibold text-muted mb-2";
    previewLabel.textContent = `Flashcards (${messageFlashcards.length})`;
    previewBox.appendChild(previewLabel);

    messageFlashcards.slice(0, 3).forEach((fc, i) => {
      const item = document.createElement("div");
      item.className = "rounded border p-2 mb-2 app-inline-card";

      const q = document.createElement("div");
      q.className = "small fw-semibold";
      q.textContent = `Q${i + 1}: ${fc.question}`;

      const a = document.createElement("div");
      a.className = "small text-muted mt-1";
      a.textContent = `A: ${fc.answer}`;

      item.appendChild(q);
      item.appendChild(a);
      previewBox.appendChild(item);
    });

    if (messageFlashcards.length > 3) {
      const more = document.createElement("div");
      more.className = "small text-muted";
      more.textContent = `+ ${messageFlashcards.length - 3} more`;
      previewBox.appendChild(more);
    }

    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "btn btn-sm btn-outline-secondary mt-2";
    openBtn.textContent = "Open full flashcards";
    openBtn.onclick = () => openFlashcardsPanel(messageFlashcards);
    previewBox.appendChild(openBtn);

    bubble.appendChild(previewBox);
  }

  if (m.sender_role === "assistant") {
    const evidence = parseEvidenceSource(m.evidence_source);
    const sources = Array.isArray(evidence?.sources) ? evidence.sources : [];
    if (sources.length) {
      const sourcesSection = document.createElement("div");
      sourcesSection.className = "mt-3 pt-2 border-top";

      const sourcesLabel = document.createElement("div");
      sourcesLabel.className = "small fw-semibold text-muted mb-2";
      sourcesLabel.textContent = "Sources";

      const bubbles = document.createElement("div");
      bubbles.className = "source-bubbles";

      const detail = document.createElement("div");
      detail.className = "source-detail d-none";

      const buttons = [];
      const answerText = m.content ?? "";

      sources.forEach((source, idx) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "source-bubble";
        const label = source?.filename || source?.file_id || `Source ${idx + 1}`;
        btn.textContent = label.length > 42 ? `${label.slice(0, 39)}...` : label;
        btn.onclick = () => {
          const isActive = btn.classList.contains("active");
          buttons.forEach(b => b.classList.remove("active"));
          if (isActive) {
            detail.classList.add("d-none");
            return;
          }
          btn.classList.add("active");
          renderSourceDetail(detail, source, answerText);
        };
        buttons.push(btn);
        bubbles.appendChild(btn);
      });

      sourcesSection.appendChild(sourcesLabel);
      sourcesSection.appendChild(bubbles);
      sourcesSection.appendChild(detail);
      bubble.appendChild(sourcesSection);
    }
  }

  wrap.appendChild(bubble);
  messagesDiv.appendChild(wrap);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function fetchFlashcardsForChat(chatId) {
  const params = new URLSearchParams({
    chat_session_id: String(chatId),
    only_active: "true",
  });
  return await apiRequest(`/users/${userId}/flashcards?${params.toString()}`);
}

function setLatestFlashcards(flashcards, statusText = "") {
  latestFlashcards = flashcards;
  flashcardStatusEl.textContent = statusText;
}

function setChatSessionFlashcards(flashcards) {
  chatSessionFlashcards = Array.isArray(flashcards) ? flashcards : [];
  viewFlashcardsBtn.disabled = chatSessionFlashcards.length === 0;
}

async function renameChatSession(chatId, title) {
  try {
    return await apiRequest(
      `/users/${userId}/chat-sessions/${chatId}`,
      "PATCH",
      { title },
    );
  } catch (_) {
    return await apiRequest(
      `/users/${userId}/chat-sessions/${chatId}/rename`,
      "POST",
      { title },
    );
  }
}

async function deleteChatSession(chatId) {
  try {
    return await apiRequest(`/users/${userId}/chat-sessions/${chatId}`, "DELETE");
  } catch (_) {
    return await apiRequest(`/users/${userId}/chat-sessions/${chatId}/delete`, "POST");
  }
}

function groupFlashcardsByMessage(flashcards) {
  const grouped = new Map();
  for (const fc of flashcards) {
    const sourceMessageId = fc.source_message_id;
    if (!sourceMessageId) continue;
    if (!grouped.has(sourceMessageId)) grouped.set(sourceMessageId, []);
    grouped.get(sourceMessageId).push(fc);
  }
  return grouped;
}

function applyLatestFlashcardState(messages, grouped) {
  const latestAssistant = [...messages].reverse().find(m => m.sender_role === "assistant");
  if (!latestAssistant) {
    setLatestFlashcards([], "");
    return;
  }

  const latest = grouped.get(latestAssistant.id) || [];
  if (latest.length) {
    setLatestFlashcards(latest, `Ready: ${latest.length} flashcards for latest reply.`);
  } else {
    setLatestFlashcards([], "No flashcards for the latest assistant reply.");
  }
}

async function loadChats() {
  const chats = await apiRequest(`/users/${userId}/chat-sessions`);
  closeChatOptionsMenu();
  chatList.innerHTML = "";

  chats.forEach(c => {
    const item = document.createElement("div");
    item.className = `list-group-item list-group-item-action chat-list-item ${c.id === activeChatId ? "active" : ""}`;
    item.title = c.title || `Chat #${c.id}`;

    const titleBtn = document.createElement("button");
    titleBtn.type = "button";
    titleBtn.className = "chat-list-item-title";
    titleBtn.textContent = c.title || `Chat #${c.id}`;
    titleBtn.onclick = (e) => {
      e.stopPropagation();
      closeChatOptionsMenu();
      loadMessages(c.id);
    };

    const actions = document.createElement("div");
    actions.className = "chat-list-item-actions";

    const menuBtn = document.createElement("button");
    menuBtn.type = "button";
    menuBtn.className = "chat-list-item-menu-btn";
    menuBtn.title = "Chat options";
    menuBtn.setAttribute("aria-label", "Chat options");
    menuBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
        <circle cx="12" cy="5" r="1.8" fill="currentColor"></circle>
        <circle cx="12" cy="12" r="1.8" fill="currentColor"></circle>
        <circle cx="12" cy="19" r="1.8" fill="currentColor"></circle>
      </svg>
    `;

    const menu = document.createElement("div");
    menu.className = "chat-list-item-menu d-none";

    const renameBtn = document.createElement("button");
    renameBtn.type = "button";
    renameBtn.className = "chat-item-option";
    renameBtn.textContent = "Rename chat";
    renameBtn.onclick = async (e) => {
      e.stopPropagation();
      closeChatOptionsMenu();
      const currentTitle = c.title || `Chat #${c.id}`;
      const nextTitleInput = window.prompt("Rename chat", currentTitle);
      if (nextTitleInput === null) return;

      const nextTitle = nextTitleInput.trim();
      if (!nextTitle) {
        flashcardStatusEl.textContent = "Chat title cannot be empty.";
        return;
      }

      try {
        await renameChatSession(c.id, nextTitle);
        await loadChats();
      } catch (err) {
        flashcardStatusEl.textContent = `Rename failed: ${err.message}`;
      }
    };

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "chat-item-option chat-item-option-delete";
    deleteBtn.textContent = "Delete chat";
    deleteBtn.onclick = async (e) => {
      e.stopPropagation();
      closeChatOptionsMenu();

      const confirmed = window.confirm(
        `Delete "${c.title || `Chat #${c.id}`}"?\n\nThis will delete this chat and its messages.`,
      );
      if (!confirmed) return;

      const wasActive = activeChatId === c.id;
      try {
        await deleteChatSession(c.id);

        if (wasActive) {
          activeChatId = null;
          messagesDiv.innerHTML = "";
          setLatestFlashcards([], "");
          setChatSessionFlashcards([]);
          if (isFlashcardsPanelOpen()) closeFlashcardsPanel();
        }

        const remainingChats = await loadChats();
        if (wasActive) {
          if (remainingChats.length) {
            await loadMessages(remainingChats[0].id);
          } else {
            renderMessage({
              sender_role: "assistant",
              content: "Chat deleted. Start a new chat to continue.",
            });
            flashcardStatusEl.textContent = "Chat deleted.";
          }
        }
      } catch (err) {
        flashcardStatusEl.textContent = `Delete failed: ${err.message}`;
      }
    };

    menuBtn.onclick = (e) => {
      e.stopPropagation();
      toggleChatOptionsMenu(item, menu);
    };

    menu.appendChild(renameBtn);
    menu.appendChild(deleteBtn);
    actions.appendChild(menuBtn);
    actions.appendChild(menu);

    item.onclick = () => {
      closeChatOptionsMenu();
      loadMessages(c.id);
    };

    item.appendChild(titleBtn);
    item.appendChild(actions);
    chatList.appendChild(item);
  });

  return chats;
}

async function loadMessages(chatId) {
  const chatChanged = activeChatId !== null && activeChatId !== chatId;
  activeChatId = chatId;
  flashcardStatusEl.textContent = "Loading flashcards...";
  setChatSessionFlashcards([]);

  if (chatChanged && isFlashcardsPanelOpen()) {
    closeFlashcardsPanel();
  }

  try {
    const [msgs, cards] = await Promise.all([
      apiRequest(`/users/${userId}/chat-sessions/${chatId}/messages`),
      fetchFlashcardsForChat(chatId),
    ]);

    const flashcards = Array.isArray(cards) ? cards : [];
    setChatSessionFlashcards(flashcards);
    const grouped = groupFlashcardsByMessage(flashcards);

    messagesDiv.innerHTML = "";
    msgs.forEach(m => {
      const messageFlashcards = m.sender_role === "assistant" ? (grouped.get(m.id) || []) : [];
      renderMessage(m, messageFlashcards);
    });

    applyLatestFlashcardState(msgs, grouped);
  } catch (err) {
    messagesDiv.innerHTML = "";
    renderMessage({ sender_role: "assistant", content: `Error: ${err.message}` });
    setChatSessionFlashcards([]);
    setLatestFlashcards([], `Flashcards unavailable: ${err.message}`);
  } finally {
    await loadChats();
  }
}

document.getElementById("newChatBtn").onclick = async () => {
  if (isFlashcardsPanelOpen()) {
    closeFlashcardsPanel();
  }
  const chat = await apiRequest(`/users/${userId}/chat-sessions`, "POST", { title: "New Chat" });
  await loadChats();
  await loadMessages(chat.id);
};

chatForm.onsubmit = async (e) => {
  e.preventDefault();
  if (!activeChatId) return;

  const content = input.value.trim();
  if (!content) return;

  input.value = "";
  renderMessage({ sender_role: "user", content });
  setLatestFlashcards([], "Generating flashcards...");

  // show typing indicator
  renderMessage({ sender_role: "assistant", content: "Typing..." });
  const typingBubble = messagesDiv.lastChild;

  try {
    await apiRequest(
      `/users/${userId}/chat-sessions/${activeChatId}/messages`,
      "POST",
      { content }
    );

    // remove typing
    typingBubble.remove();

    await loadMessages(activeChatId);
  } catch (err) {
    typingBubble.remove();
    renderMessage({ sender_role: "assistant", content: `Error: ${err.message}` });
    flashcardStatusEl.textContent = `Send failed: ${err.message}`;
  }
};

viewFlashcardsBtn.onclick = () => {
  if (!chatSessionFlashcards.length) {
    flashcardStatusEl.textContent = "No flashcards available for this chat session.";
    return;
  }
  openFlashcardsPanel(chatSessionFlashcards, {
    autoStartQuiz: true,
    source: "view-all",
  });
};

hideSidebarBtn.onclick = () => {
  closeChatOptionsMenu();
  setSidebarVisible(false);
};

showSidebarBtn.onclick = () => {
  closeChatOptionsMenu();
  if (isFlashcardsPanelOpen()) {
    closeFlashcardsPanel({ restoreSidebar: false });
  }
  setSidebarVisible(true);
};

closeFlashcardsBtn.onclick = () => closeFlashcardsPanel();
flashcardsPrevBtn.onclick = () => prevFlashcard();
flashcardsNextBtn.onclick = () => nextFlashcard();
flashcardsFlipBtn.onclick = () => flipFlashcard();
startQuizBtn.onclick = () => startMcqQuizFromPanel();
quizBackBtn.onclick = () => {
  resetQuizState();
  renderFlashcardsPanel();
  flashcardStatusEl.textContent = "Back to flashcards.";
};
quizNextBtn.onclick = () => goToNextQuizStep();

window.addEventListener("keydown", handleFlashcardsKeydown);
document.addEventListener("click", closeChatOptionsMenu);

showChatsTabBtn.onclick = () => setSideTab("chats");
showAnalyticsTabBtn.onclick = () => setSideTab("analytics");
showSettingsTabBtn.onclick = () => setSideTab("settings");
refreshAnalyticsBtn.onclick = () => loadAnalytics({ force: true });
themeToggle.onchange = () => {
  const theme = themeToggle.checked ? "dark" : "light";
  if (window.SSITheme?.setTheme) {
    window.SSITheme.setTheme(theme);
  } else {
    applyTheme(theme);
  }
};

// Initial load
(async () => {
  loadTheme();
  await hydrateCurrentUserRole();
  setSideTab("chats");
  setSidebarVisible(true);
  await loadChats();
})();

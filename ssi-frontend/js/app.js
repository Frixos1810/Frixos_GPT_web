const API_BASE = "http://127.0.0.1:8000";

const userIdEl = document.getElementById("userId");
const chatIdEl = document.getElementById("chatId");
const messageEl = document.getElementById("message");
const sendBtn = document.getElementById("sendBtn");
const statusEl = document.getElementById("status");
const chatLogEl = document.getElementById("chatLog");
const viewFlashcardsBtn = document.getElementById("viewFlashcardsBtn");

let latestFlashcards = [];
let latestAssistantMessageId = null;

function appendBubble(role, text) {
  const wrapper = document.createElement("div");
  wrapper.className = `mb-2 d-flex ${role === "user" ? "justify-content-end" : "justify-content-start"}`;

  const bubble = document.createElement("div");
  bubble.className = `p-2 rounded-3 ${role === "user" ? "bg-primary text-white" : "border app-bubble"}`;
  bubble.style.maxWidth = "80%";
  bubble.style.whiteSpace = "pre-wrap";
  bubble.textContent = text;

  wrapper.appendChild(bubble);
  chatLogEl.appendChild(wrapper);
  chatLogEl.scrollTop = chatLogEl.scrollHeight;
}

async function fetchFlashcardsIfNeeded(userId, chatId, assistantMessageId) {
  // If your POST response already includes flashcards, this won't be called.
  // Otherwise, fetch by source_message_id (flashcards were saved on send).
  const url = `${API_BASE}/users/${userId}/flashcards?source_message_id=${assistantMessageId}`;

  const res = await fetch(url, {
    headers: { "X-User-Id": String(userId) },
  });
  if (!res.ok) throw new Error(`Flashcards fetch failed (${res.status})`);
  return await res.json();
}

function openFlashcardsWindow(flashcards) {
  // store in localStorage so the popup can load it
  localStorage.setItem("ssi_flashcards", JSON.stringify(flashcards));
  const w = window.open("", "flashcards", "width=520,height=720");
  if (w) {
    w.location.replace(`./pages/flashcards.html?v=${Date.now()}`);
  }
  if (!w) {
    alert("Popup blocked. Allow popups for this site.");
  }
}

viewFlashcardsBtn.addEventListener("click", () => {
  if (!latestFlashcards.length) return;
  openFlashcardsWindow(latestFlashcards);
});

sendBtn.addEventListener("click", async () => {
  const userId = Number(userIdEl.value);
  const chatId = Number(chatIdEl.value);
  const content = messageEl.value.trim();

  if (!content) return;

  statusEl.textContent = "Sending...";
  sendBtn.disabled = true;
  viewFlashcardsBtn.disabled = true;
  latestFlashcards = [];
  latestAssistantMessageId = null;

  try {
    appendBubble("user", content);

    const url = `${API_BASE}/users/${userId}/chat-sessions/${chatId}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": String(userId),
      },
      body: JSON.stringify({ content }),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Send failed (${res.status}): ${t}`);
    }

    const data = await res.json();

    // Expected shape based on your backend:
    // { user_message: {...}, assistant_message: {...} }
    const assistantMsg = data.assistant_message?.content ?? "(no assistant text)";
    appendBubble("assistant", assistantMsg);

    latestAssistantMessageId = data.assistant_message?.id ?? null;

    // If your backend includes flashcards directly, use them:
    if (Array.isArray(data.flashcards)) {
      latestFlashcards = data.flashcards;
    } else if (latestAssistantMessageId != null) {
      // Otherwise try to fetch them (requires endpoint)
      try {
        const fcData = await fetchFlashcardsIfNeeded(userId, chatId, latestAssistantMessageId);
        // Accept either {items:[...]} or direct [...]
        latestFlashcards = Array.isArray(fcData) ? fcData : (fcData.items || []);
      } catch (e) {
        // No endpoint yet — no problem, we just disable the button.
        latestFlashcards = [];
      }
    }

    if (latestFlashcards.length) {
      viewFlashcardsBtn.disabled = false;
      statusEl.textContent = `Received ${latestFlashcards.length} flashcards.`;
    } else {
      statusEl.textContent = "Sent. No flashcards found (or flashcard endpoint not wired yet).";
    }

    messageEl.value = "";
  } catch (err) {
    statusEl.textContent = err.message;
  } finally {
    sendBtn.disabled = false;
  }
});

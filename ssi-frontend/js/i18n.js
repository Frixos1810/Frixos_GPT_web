(function () {
  const STORAGE_KEY = "ssi_language";
  const SUPPORTED_LANGS = new Set(["en", "el"]);
  const DEFAULT_LANG = "en";
  const ATTRS = ["placeholder", "title", "aria-label"];
  const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "TEXTAREA"]);
  const textOriginals = new WeakMap();
  const attrOriginals = new WeakMap();
  let originalDocumentTitle = null;

  const EXACT_TRANSLATIONS = Object.freeze({
    "Login": "Σύνδεση",
    "Register": "Εγγραφή",
    "Create account": "Δημιουργία λογαριασμού",
    "Create an account": "Δημιουργία λογαριασμού",
    "Back to login": "Πίσω στη σύνδεση",
    "Name": "Όνομα",
    "Email": "Email",
    "Password": "Κωδικός",
    "Confirm Password": "Επιβεβαίωση κωδικού",
    "SurgiNurse AI logo": "Λογότυπο SurgiNurse AI",
    "Interactive training environment for surgical nurses on infection prevention in the surgical field":
      "Διαδραστικό περιβάλλον εκπαίδευσης για χειρουργικούς νοσηλευτές στην πρόληψη λοιμώξεων στο χειρουργικό πεδίο",
    "Logout": "Αποσύνδεση",
    "+ New Chat": "+ Νέα συνομιλία",
    "Admin - Knowledge Sources": "Διαχείριση - Πηγές γνώσης",
    "Hide sidebar": "Απόκρυψη πλαϊνής στήλης",
    "Open sidebar": "Εμφάνιση πλαϊνής στήλης",
    "Chats": "Συνομιλίες",
    "Analytics": "Αναλύσεις",
    "Settings": "Ρυθμίσεις",
    "Appearance": "Εμφάνιση",
    "Dark theme": "Σκούρο θέμα",
    "Language": "Γλώσσα",
    "Current language": "Τρέχουσα γλώσσα",
    "English": "Αγγλικά",
    "Greek": "Ελληνικά",
    "Learning Analytics": "Αναλύσεις μάθησης",
    "Track quiz performance and study retention": "Παρακολούθηση επίδοσης κουίζ και διατήρησης γνώσης",
    "Refresh": "Ανανέωση",
    "Loading...": "Φόρτωση...",
    "Learning signal": "Σήμα μάθησης",
    "Collecting data": "Συλλογή δεδομένων",
    "Complete a few quizzes to reveal trend quality.": "Ολοκλήρωσε μερικά κουίζ για να εμφανιστεί η ποιότητα τάσης.",
    "Total quizzes": "Σύνολο κουίζ",
    "Average score": "Μέσο σκορ",
    "Last score": "Τελευταίο σκορ",
    "Last 10 accuracy": "Ακρίβεια τελευταίων 10",
    "Score trend": "Τάση σκορ",
    "Recent quizzes": "Πρόσφατα κουίζ",
    "Flashcard mastery": "Κατάκτηση καρτών",
    "Type your message...": "Γράψε το μήνυμά σου...",
    "Send": "Αποστολή",
    "View all flashcards": "Προβολή όλων των καρτών",
    "Flashcards": "Κάρτες",
    "Close": "Κλείσιμο",
    "Question": "Ερώτηση",
    "Answer": "Απάντηση",
    "Previous": "Προηγούμενο",
    "Next": "Επόμενο",
    "Flip": "Αναστροφή",
    "Show question": "Εμφάνιση ερώτησης",
    "Start MCQ quiz": "Έναρξη κουίζ πολλαπλής επιλογής",
    "Back to flashcards": "Πίσω στις κάρτες",
    "Tips: Left/Right to navigate, Space to flip": "Συμβουλές: Αριστερά/Δεξιά για πλοήγηση, Space για αναστροφή",
    "Sources": "Πηγές",
    "Source excerpt": "Απόσπασμα πηγής",
    "Answer (highlighted)": "Απάντηση (τονισμένη)",
    "Open full flashcards": "Άνοιγμα πλήρων καρτών",
    "No flashcards found.": "Δεν βρέθηκαν κάρτες.",
    "No flashcards available for this chat session.": "Δεν υπάρχουν κάρτες για αυτή τη συνεδρία.",
    "No flashcards available for quiz.": "Δεν υπάρχουν κάρτες για κουίζ.",
    "Generating flashcards...": "Δημιουργία καρτών...",
    "Creating quiz...": "Δημιουργία κουίζ...",
    "Creating MCQ quiz...": "Δημιουργία κουίζ πολλαπλής επιλογής...",
    "MCQ Quiz": "Κουίζ πολλαπλής επιλογής",
    "Typing...": "Πληκτρολόγηση...",
    "Quiz complete": "Το κουίζ ολοκληρώθηκε",
    "All questions answered.": "Απαντήθηκαν όλες οι ερωτήσεις.",
    "Result": "Αποτέλεσμα",
    "Pick one option to answer.": "Επίλεξε μία επιλογή για απάντηση.",
    "Correct.": "Σωστό.",
    "Finish": "Τέλος",
    "Checking answer...": "Έλεγχος απάντησης...",
    "The generated quiz had no questions.": "Το παραγόμενο κουίζ δεν είχε ερωτήσεις.",
    "Back to Chat": "Επιστροφή στη συνομιλία",
    "Admin - Knowledge Base Source Control": "Διαχείριση - Έλεγχος πηγών βάσης γνώσης",
    "Not authorized": "Μη εξουσιοδοτημένος χρήστης",
    "This page is only available to admin users.": "Αυτή η σελίδα είναι διαθέσιμη μόνο σε διαχειριστές.",
    "Return to chat": "Επιστροφή στη συνομιλία",
    "Knowledge Sources": "Πηγές γνώσης",
    "Auto-synced from the OpenAI vector store. Use toggles to allow or block files as retrieval references.":
      "Αυτόματος συγχρονισμός από το OpenAI vector store. Χρησιμοποίησε διακόπτες για να επιτρέπεις ή να αποκλείεις αρχεία ως πηγές ανάκτησης.",
    "Sync Vector Store Files": "Συγχρονισμός αρχείων Vector Store",
    "Vector Store Files": "Αρχεία Vector Store",
    "Reload": "Επαναφόρτωση",
    "Filename": "Όνομα αρχείου",
    "Type": "Τύπος",
    "Vector Store File ID": "Αναγνωριστικό αρχείου Vector Store",
    "Enabled": "Ενεργό",
    "Disabled": "Ανενεργό",
    "Verified": "Επαληθευμένο",
    "Unverified": "Μη επαληθευμένο",
    "Notes": "Σημειώσεις",
    "Auto-synced from vector store": "Αυτόματος συγχρονισμός από vector store",
    "No vector store files found (or sync failed).": "Δεν βρέθηκαν αρχεία vector store (ή ο συγχρονισμός απέτυχε).",
    "Knowledge source updated.": "Η πηγή γνώσης ενημερώθηκε.",
    "Syncing...": "Συγχρονισμός...",
    "Vector store sync completed.": "Ο συγχρονισμός του vector store ολοκληρώθηκε.",
    "Unable to verify current user.": "Αδυναμία επαλήθευσης τρέχοντος χρήστη.",
    "SSI Tutor Chat": "Συνομιλία SSI Tutor",
    "User ID": "ID χρήστη",
    "Chat Session ID": "ID συνεδρίας συνομιλίας",
    "Your message": "Το μήνυμά σου",
    "Ask something...": "Ρώτησε κάτι...",
    "View flashcards": "Προβολή καρτών",
    "Conversation": "Συζήτηση",
    "Popup blocked. Allow popups for this site.": "Το αναδυόμενο παράθυρο μπλοκαρίστηκε. Επέτρεψε popups για αυτόν τον ιστότοπο.",
    "Sending...": "Αποστολή...",
    "(no assistant text)": "(χωρίς κείμενο βοηθού)",
    "Sent. No flashcards found (or flashcard endpoint not wired yet).":
      "Στάλθηκε. Δεν βρέθηκαν κάρτες (ή το endpoint καρτών δεν είναι έτοιμο).",
    "Passwords do not match.": "Οι κωδικοί δεν ταιριάζουν.",
    "Creating account...": "Δημιουργία λογαριασμού...",
    "No user id returned.": "Δεν επιστράφηκε αναγνωριστικό χρήστη.",
    "Account created and saved successfully. Please log in.":
      "Ο λογαριασμός δημιουργήθηκε και αποθηκεύτηκε επιτυχώς. Παρακαλώ συνδεθείτε.",
    "Analytics unavailable": "Οι αναλύσεις δεν είναι διαθέσιμες",
    "Could not load trend data.": "Δεν ήταν δυνατή η φόρτωση δεδομένων τάσης.",
    "Could not load quiz history.": "Δεν ήταν δυνατή η φόρτωση ιστορικού κουίζ.",
    "Could not load flashcard mastery.": "Δεν ήταν δυνατή η φόρτωση κατάκτησης καρτών.",
    "Try refreshing analytics.": "Δοκίμασε να ανανεώσεις τις αναλύσεις.",
    "No quiz scores yet.": "Δεν υπάρχουν ακόμη σκορ κουίζ.",
    "No quizzes completed yet.": "Δεν έχουν ολοκληρωθεί κουίζ ακόμη.",
    "No flashcard attempts yet.": "Δεν υπάρχουν ακόμη προσπάθειες καρτών.",
    "Answer quiz questions to unlock mastery data.": "Απάντησε σε ερωτήσεις κουίζ για να εμφανιστούν δεδομένα κατάκτησης.",
    "Collecting baseline": "Συλλογή αρχικής βάσης",
    "Run at least two quizzes to estimate learning trend.": "Κάνε τουλάχιστον δύο κουίζ για εκτίμηση τάσης μάθησης.",
    "Strong improvement": "Ισχυρή βελτίωση",
    "Steady progress": "Σταθερή πρόοδος",
    "Scores are improving. Continue mixed-topic quizzes to stabilize recall.":
      "Τα σκορ βελτιώνονται. Συνέχισε με κουίζ μικτών θεμάτων για σταθεροποίηση ανάκλησης.",
    "Needs reinforcement": "Χρειάζεται ενίσχυση",
    "Performance is dropping. Revisit low-accuracy flashcards before new quizzes.":
      "Η επίδοση πέφτει. Ξαναδούλεψε κάρτες χαμηλής ακρίβειας πριν από νέα κουίζ.",
    "Stable but flat": "Σταθερό αλλά επίπεδο",
    "Learning is stable. Increase challenge to push score growth.":
      "Η μάθηση είναι σταθερή. Αύξησε τη δυσκολία για άνοδο στο σκορ.",
    "Keep answering quizzes to build flashcard mastery data.":
      "Συνέχισε να απαντάς κουίζ για να δημιουργηθούν δεδομένα κατάκτησης καρτών.",
    "No data": "Χωρίς δεδομένα",
    "Untitled question": "Ερώτηση χωρίς τίτλο",
    "Chat options": "Επιλογές συνομιλίας",
    "Rename chat": "Μετονομασία συνομιλίας",
    "Delete chat": "Διαγραφή συνομιλίας",
    "Chat title cannot be empty.": "Ο τίτλος συνομιλίας δεν μπορεί να είναι κενός.",
    "Chat deleted. Start a new chat to continue.": "Η συνομιλία διαγράφηκε. Ξεκίνα νέα συνομιλία για συνέχεια.",
    "Chat deleted.": "Η συνομιλία διαγράφηκε.",
    "Loading flashcards...": "Φόρτωση καρτών...",
    "No flashcards for the latest assistant reply.": "Δεν υπάρχουν κάρτες για την τελευταία απάντηση βοηθού.",
    "Request failed (403 Forbidden). Admin access required": "Αποτυχία αιτήματος (403 Forbidden). Απαιτείται πρόσβαση διαχειριστή",
    "Admin request failed.": "Το αίτημα διαχειριστή απέτυχε.",
    "Failed to load knowledge sources.": "Αποτυχία φόρτωσης πηγών γνώσης.",
    "Failed to update knowledge source.": "Αποτυχία ενημέρωσης πηγής γνώσης.",
    "Failed to sync vector store files.": "Αποτυχία συγχρονισμού αρχείων vector store.",
    "Login | SSI App": "Σύνδεση | SSI App",
    "Register | SSI App": "Εγγραφή | SSI App",
    "Chat | SSI App": "Συνομιλία | SSI App",
    "Admin | Knowledge Sources": "Διαχείριση | Πηγές γνώσης"
  });

  const REGEX_TRANSLATIONS = Object.freeze([
    [ /^Question (\d+) \/ (\d+)$/, (m, a, b) => `Ερώτηση ${a} / ${b}` ],
    [ /^Quiz #(\d+)$/, (m, a) => `Κουίζ #${a}` ],
    [ /^Chat #(\d+)$/, (m, a) => `Συνομιλία #${a}` ],
    [ /^Relevance score: (.+)$/, (m, a) => `Βαθμός συνάφειας: ${a}` ],
    [ /^From (.+) to (.+) \| (\d+) quizzes$/, (m, a, b, c) => `Από ${a} έως ${b} | ${c} κουίζ` ],
    [ /^(\d+) attempts - (\d+) correct$/, (m, a, b) => `${a} προσπάθειες - ${b} σωστές` ],
    [ /^(\d+)\/(\d+) practiced flashcards are at mastery level \(>=80%\)\.$/, (m, a, b) => `${a}/${b} εξασκημένες κάρτες βρίσκονται σε επίπεδο κατάκτησης (>=80%).` ],
    [ /^Ready: (\d+) flashcards for latest reply\.$/, (m, a) => `Έτοιμο: ${a} κάρτες για την τελευταία απάντηση.` ],
    [ /^Quiz ready: (\d+) questions\.$/, (m, a) => `Το κουίζ είναι έτοιμο: ${a} ερωτήσεις.` ],
    [ /^\+ (\d+) more$/, (m, a) => `+ ${a} ακόμη` ],
    [ /^Flashcards \((\d+)\)$/, (m, a) => `Κάρτες (${a})` ],
    [ /^Q(\d+): (.+)$/, (m, a, b) => `Ε${a}: ${b}` ],
    [ /^A: (.+)$/, (m, a) => `Α: ${a}` ],
    [ /^Quiz generation failed: (.+)$/, (m, a) => `Η δημιουργία κουίζ απέτυχε: ${a}` ],
    [ /^Rename failed: (.+)$/, (m, a) => `Η μετονομασία απέτυχε: ${a}` ],
    [ /^Delete failed: (.+)$/, (m, a) => `Η διαγραφή απέτυχε: ${a}` ],
    [ /^Send failed: (.+)$/, (m, a) => `Η αποστολή απέτυχε: ${a}` ],
    [ /^Error: (.+)$/, (m, a) => `Σφάλμα: ${a}` ],
    [ /^Flashcards unavailable: (.+)$/, (m, a) => `Οι κάρτες δεν είναι διαθέσιμες: ${a}` ],
    [ /^Received (\d+) flashcards\.$/, (m, a) => `Λήφθηκαν ${a} κάρτες.` ],
    [ /^Score: (\d+) \/ (\d+) \((\d+)%\)$/, (m, a, b, c) => `Σκορ: ${a} / ${b} (${c}%)` ],
    [ /^Incorrect\. Correct answer: (.+)$/, (m, a) => `Λάθος. Σωστή απάντηση: ${a}` ],
    [ /^Answer submit failed: (.+)$/, (m, a) => `Η υποβολή απάντησης απέτυχε: ${a}` ],
    [ /^Using vector store: (.+)$/, (m, a) => `Χρήση vector store: ${a}` ],
    [ /^Delete "(.+)"\?\n\nThis will delete this chat and its messages\.$/, (m, a) =>
      `Διαγραφή "${a}";\n\nΑυτό θα διαγράψει αυτή τη συνομιλία και τα μηνύματά της.` ],
    [ /^Cannot reach backend at (.+)\. Start FastAPI and try again\.$/, (m, a) =>
      `Αδυναμία σύνδεσης με backend στο ${a}. Εκκίνα το FastAPI και δοκίμασε ξανά.` ]
  ]);

  function normalizeLang(lang) {
    const normalized = String(lang || "").trim().toLowerCase();
    return SUPPORTED_LANGS.has(normalized) ? normalized : DEFAULT_LANG;
  }

  function getLanguage() {
    return normalizeLang(localStorage.getItem(STORAGE_KEY));
  }

  function setLanguage(lang) {
    const next = normalizeLang(lang);
    localStorage.setItem(STORAGE_KEY, next);
    applyLanguage(next);
    try {
      window.dispatchEvent(new CustomEvent("ssi:languagechange", { detail: { language: next } }));
    } catch (_) {
      // ignore event issues
    }
    return next;
  }

  function ensureAttrStore(el) {
    if (!attrOriginals.has(el)) {
      attrOriginals.set(el, {});
    }
    return attrOriginals.get(el);
  }

  function isSkippableNode(node) {
    if (!node) return true;
    const parent = node.parentElement;
    if (!parent) return true;
    if (SKIP_TAGS.has(parent.tagName)) return true;

    let current = parent;
    while (current) {
      if (current.getAttribute && current.getAttribute("data-i18n-skip") === "true") {
        return true;
      }
      current = current.parentElement;
    }
    return false;
  }

  function translateFromEnglish(source) {
    const text = String(source ?? "");
    if (!text.trim()) return text;

    const exact = EXACT_TRANSLATIONS[text];
    if (exact) return exact;

    for (const [pattern, replacer] of REGEX_TRANSLATIONS) {
      if (pattern.test(text)) {
        return text.replace(pattern, replacer);
      }
    }
    return text;
  }

  function getCurrentOrOriginalText(node, language) {
    const current = node.nodeValue || "";
    const stored = textOriginals.get(node);

    if (stored === undefined) {
      textOriginals.set(node, current);
      return current;
    }

    if (language === "en") {
      const translatedStored = translateFromEnglish(stored);
      if (current !== stored && current !== translatedStored) {
        textOriginals.set(node, current);
        return current;
      }
      return stored;
    }

    const translatedStored = translateFromEnglish(stored);
    if (current !== stored && current !== translatedStored) {
      textOriginals.set(node, current);
      return current;
    }
    return stored;
  }

  function getCurrentOrOriginalAttr(el, attrName, language) {
    const current = el.getAttribute(attrName) || "";
    const store = ensureAttrStore(el);
    const stored = store[attrName];

    if (stored === undefined) {
      store[attrName] = current;
      return current;
    }

    if (language === "en") {
      const translatedStored = translateFromEnglish(stored);
      if (current !== stored && current !== translatedStored) {
        store[attrName] = current;
        return current;
      }
      return stored;
    }

    const translatedStored = translateFromEnglish(stored);
    if (current !== stored && current !== translatedStored) {
      store[attrName] = current;
      return current;
    }
    return stored;
  }

  function translateText(text, language = getLanguage()) {
    const lang = normalizeLang(language);
    if (lang === "en") return String(text ?? "");
    return translateFromEnglish(text);
  }

  function applyLanguage(language = getLanguage(), root = document.body || document.documentElement) {
    const lang = normalizeLang(language);
    if (!root) return;

    if (originalDocumentTitle === null) {
      originalDocumentTitle = document.title || "";
    }
    const nextTitle = lang === "el" ? translateFromEnglish(originalDocumentTitle) : originalDocumentTitle;
    if (document.title !== nextTitle) {
      document.title = nextTitle;
    }

    document.documentElement.setAttribute("lang", lang === "el" ? "el" : "en");

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        if (!node || !node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        return isSkippableNode(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      },
    });

    let textNode = walker.nextNode();
    while (textNode) {
      const source = getCurrentOrOriginalText(textNode, lang);
      const next = lang === "el" ? translateFromEnglish(source) : source;
      if ((textNode.nodeValue || "") !== next) {
        textNode.nodeValue = next;
      }
      textNode = walker.nextNode();
    }

    const elements = root.querySelectorAll ? root.querySelectorAll("*") : [];
    elements.forEach((el) => {
      if (!el || !el.getAttribute) return;
      if (el.getAttribute("data-i18n-skip") === "true") return;
      for (const attrName of ATTRS) {
        if (!el.hasAttribute(attrName)) continue;
        const source = getCurrentOrOriginalAttr(el, attrName, lang);
        const next = lang === "el" ? translateFromEnglish(source) : source;
        if ((el.getAttribute(attrName) || "") !== next) {
          el.setAttribute(attrName, next);
        }
      }
    });
  }

  let scheduled = false;
  function scheduleApply() {
    if (scheduled) return;
    scheduled = true;
    const run = () => {
      scheduled = false;
      applyLanguage(getLanguage());
    };
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(run);
    } else {
      setTimeout(run, 0);
    }
  }

  function installObserver() {
    const root = document.body || document.documentElement;
    if (!root || typeof MutationObserver === "undefined") return;

    const observer = new MutationObserver(() => scheduleApply());
    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRS,
    });
  }

  function init() {
    applyLanguage(getLanguage());
    installObserver();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      applyLanguage(getLanguage());
    }
  });

  window.SSII18n = {
    key: STORAGE_KEY,
    getLanguage,
    setLanguage,
    translateText: (text) => translateText(text, getLanguage()),
    applyLanguage: (language, root) => applyLanguage(language, root || document.body || document.documentElement),
    isLanguageKey: (key) => key === STORAGE_KEY,
  };
})();

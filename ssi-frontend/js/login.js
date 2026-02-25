const AUTH_NOTICE_KEY = "ssi_auth_notice";
const form = document.getElementById("loginForm");
const alertBox = document.getElementById("alert");

if (!form || !alertBox) {
  console.error("Login form elements not found.");
} else {
  function showAlert(msg, type = "danger") {
    alertBox.textContent = msg;
    alertBox.classList.remove("d-none", "alert-danger", "alert-success", "alert-info");
    alertBox.classList.add(`alert-${type}`);
  }

  function showError(msg) {
    showAlert(msg, "danger");
  }

  function showSignupNoticeIfAny() {
    const raw = localStorage.getItem(AUTH_NOTICE_KEY);
    if (!raw) return;

    localStorage.removeItem(AUTH_NOTICE_KEY);

    try {
      const notice = JSON.parse(raw);
      const message = typeof notice?.message === "string" ? notice.message : "";
      const type = notice?.type === "success" ? "success" : "info";
      if (message.trim()) showAlert(message, type);
    } catch {
      showAlert(raw, "info");
    }
  }

  showSignupNoticeIfAny();

  form.onsubmit = async (e) => {
    e.preventDefault();
    alertBox.classList.add("d-none");

    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;

    try {
      // Your backend login is POST /users/login (based on your logs)
      const user = await apiRequest("/users/login", "POST", { email, password });

      // Assume it returns user with id. If it returns {user: {...}}, adjust.
      const userId = user.id ?? user.user?.id;
      if (!userId) throw new Error("Login succeeded but no user id returned.");

      if (typeof setUserSession === "function") {
        setUserSession(user);
      } else {
        setUserId(userId);
      }
      window.location.href = "chat.html";
    } catch (err) {
      showError(err.message);
    }
  };
}

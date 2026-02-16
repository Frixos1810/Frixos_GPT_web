function initRegisterPage() {
  const AUTH_NOTICE_KEY = "ssi_auth_notice";
  const form = document.getElementById("registerForm");
  const alertBox = document.getElementById("alert");
  const submitBtn = form?.querySelector('button[type="submit"]');

  if (!form || !alertBox) return;

  function showError(msg) {
    alertBox.textContent = msg;
    alertBox.classList.remove("alert-success");
    alertBox.classList.add("alert-danger");
    alertBox.classList.remove("d-none");
  }

  form.onsubmit = async (e) => {
    e.preventDefault();
    alertBox.classList.add("d-none");

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;
    const confirm_password = document.getElementById("confirm_password").value;

    if (password !== confirm_password) {
      showError("Passwords do not match.");
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Creating account...";
    }

    try {
      const user = await apiRequest("/users", "POST", {
        name,
        email,
        password,
        confirm_password,
      });

      const userId = user.id ?? user.user?.id;
      if (!userId) throw new Error("No user id returned.");

      localStorage.removeItem("user_id");
      localStorage.setItem(
        AUTH_NOTICE_KEY,
        JSON.stringify({
          type: "success",
          message: "Account created and saved successfully. Please log in.",
        })
      );
      window.location.href = "login.html";
    } catch (err) {
      console.error("Registration failed", err);
      showError(err.message);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Register";
      }
    }
  };
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initRegisterPage, { once: true });
} else {
  initRegisterPage();
}

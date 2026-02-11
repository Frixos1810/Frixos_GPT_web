document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");
  const alertBox = document.getElementById("alert");

  function showError(msg) {
    alertBox.textContent = msg;
    alertBox.classList.remove("d-none");
  }

  form.onsubmit = async (e) => {
    e.preventDefault();
    alertBox.classList.add("d-none");

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirm_password = document.getElementById("confirm_password").value;

    if (password !== confirm_password) {
      showError("Passwords do not match.");
      return;
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

      setUserId(userId);
      window.location.href = "chat.html";
    } catch (err) {
      showError(err.message);
    }
  };
});

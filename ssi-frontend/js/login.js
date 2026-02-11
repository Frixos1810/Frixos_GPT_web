const form = document.getElementById("loginForm");
const alertBox = document.getElementById("alert");

function showError(msg) {
  alertBox.textContent = msg;
  alertBox.classList.remove("d-none");
}

form.onsubmit = async (e) => {
  e.preventDefault();
  alertBox.classList.add("d-none");

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    // Your backend login is POST /users/login (based on your logs)
    const user = await apiRequest("/users/login", "POST", { email, password });

    // Assume it returns user with id. If it returns {user: {...}}, adjust.
    const userId = user.id ?? user.user?.id;
    if (!userId) throw new Error("Login succeeded but no user id returned.");

    setUserId(userId);
    window.location.href = "chat.html";
  } catch (err) {
    showError(err.message);
  }
};

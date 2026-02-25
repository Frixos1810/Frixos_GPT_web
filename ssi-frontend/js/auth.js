function setUserId(userId) {
  localStorage.setItem("user_id", String(userId));
}

function setUserRole(userRole) {
  const normalized = String(userRole ?? "").trim().toLowerCase() === "admin"
    ? "admin"
    : "user";
  localStorage.setItem("user_role", normalized);
}

function setUserSession(user) {
  const userId = Number(user?.id ?? user?.user?.id);
  if (!Number.isFinite(userId) || userId <= 0) {
    throw new Error("Cannot store auth session: invalid user id.");
  }
  setUserId(userId);
  setUserRole(user?.user_role ?? user?.user?.user_role ?? "user");
}

function getUserId() {
  const v = localStorage.getItem("user_id");
  return v ? Number(v) : null;
}

function getUserRole() {
  const v = localStorage.getItem("user_role");
  return String(v ?? "").trim().toLowerCase() === "admin" ? "admin" : "user";
}

function clearAuthSession() {
  localStorage.removeItem("user_id");
  localStorage.removeItem("user_role");
}

function logout() {
  clearAuthSession();
  window.location.href = "login.html";
}

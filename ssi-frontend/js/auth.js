function setUserId(userId) {
  localStorage.setItem("user_id", String(userId));
}

function getUserId() {
  const v = localStorage.getItem("user_id");
  return v ? Number(v) : null;
}

function logout() {
  localStorage.removeItem("user_id");
  window.location.href = "login.html";
}

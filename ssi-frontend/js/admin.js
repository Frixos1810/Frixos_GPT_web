const adminUserId = typeof getUserId === "function" ? getUserId() : null;
if (!adminUserId) window.location.href = "login.html";

const logoutBtn = document.getElementById("logoutBtn");
const adminAlertEl = document.getElementById("adminAlert");
const notAuthorizedCard = document.getElementById("notAuthorizedCard");
const adminApp = document.getElementById("adminApp");
const reindexBtn = document.getElementById("reindexBtn");
const refreshSourcesBtn = document.getElementById("refreshSourcesBtn");
const sourcesTableBody = document.getElementById("sourcesTableBody");
const sourcesEmptyState = document.getElementById("sourcesEmptyState");

if (logoutBtn) logoutBtn.onclick = logout;

const adminState = {
  loading: false,
  sources: [],
};

function showAlert(message, type = "info") {
  if (!adminAlertEl) return;
  if (!message) {
    adminAlertEl.className = "alert d-none";
    adminAlertEl.textContent = "";
    return;
  }
  adminAlertEl.textContent = message;
  adminAlertEl.className = `alert alert-${type}`;
}

function setUnauthorized(message = "Not authorized") {
  if (adminApp) adminApp.classList.add("d-none");
  if (notAuthorizedCard) notAuthorizedCard.classList.remove("d-none");
  showAlert(message, "danger");
}

function setAuthorized() {
  if (notAuthorizedCard) notAuthorizedCard.classList.add("d-none");
  if (adminApp) adminApp.classList.remove("d-none");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderSources() {
  if (!sourcesTableBody || !sourcesEmptyState) return;
  const rows = Array.isArray(adminState.sources) ? adminState.sources : [];
  sourcesTableBody.innerHTML = "";

  if (!rows.length) {
    sourcesEmptyState.classList.remove("d-none");
    return;
  }
  sourcesEmptyState.classList.add("d-none");

  rows.forEach((source) => {
    const tr = document.createElement("tr");

    const enabledChecked = source.enabled ? "checked" : "";
    const verifiedChecked = source.verified ? "checked" : "";
    const enabledBadge = source.enabled
      ? '<span class="badge text-bg-success">Enabled</span>'
      : '<span class="badge text-bg-secondary">Disabled</span>';
    const verifiedBadge = source.verified
      ? '<span class="badge text-bg-primary">Verified</span>'
      : '<span class="badge text-bg-warning text-dark">Unverified</span>';

    tr.innerHTML = `
      <td class="small text-muted">${source.id}</td>
      <td>
        <div class="fw-semibold">${escapeHtml(source.title)}</div>
        <div class="small text-muted">${enabledBadge} ${verifiedBadge}</div>
      </td>
      <td><code>${escapeHtml(source.source_type)}</code></td>
      <td class="admin-source-ref-cell"><code>${escapeHtml(source.source_ref)}</code></td>
      <td>
        <div class="form-check form-switch m-0">
          <input class="form-check-input js-enabled-toggle" type="checkbox" ${enabledChecked}>
        </div>
      </td>
      <td>
        <div class="form-check form-switch m-0">
          <input class="form-check-input js-verified-toggle" type="checkbox" ${verifiedChecked}>
        </div>
      </td>
      <td class="small text-muted">Auto-synced from vector store</td>
    `;

    tr.querySelector(".js-enabled-toggle").addEventListener("change", async (e) => {
      await updateSource(source.id, { enabled: Boolean(e.target.checked) });
    });

    tr.querySelector(".js-verified-toggle").addEventListener("change", async (e) => {
      await updateSource(source.id, { verified: Boolean(e.target.checked) });
    });

    sourcesTableBody.appendChild(tr);
  });
}

async function handleAdminApiError(err, fallback = "Admin request failed.") {
  const message = err?.message || fallback;
  if (String(message).includes("(403")) {
    setUnauthorized(message);
    return;
  }
  showAlert(message, "danger");
}

async function loadSources() {
  if (adminState.loading) return;
  adminState.loading = true;
  if (refreshSourcesBtn) {
    refreshSourcesBtn.disabled = true;
    refreshSourcesBtn.textContent = "Loading...";
  }

  try {
    const data = await apiRequest("/admin/knowledge-sources?sync=true");
    adminState.sources = Array.isArray(data) ? data : [];
    renderSources();
    showAlert("", "info");
  } catch (err) {
    await handleAdminApiError(err, "Failed to load knowledge sources.");
  } finally {
    adminState.loading = false;
    if (refreshSourcesBtn) {
      refreshSourcesBtn.disabled = false;
      refreshSourcesBtn.textContent = "Reload";
    }
  }
}

async function updateSource(sourceId, patch) {
  try {
    await apiRequest(`/admin/knowledge-sources/${sourceId}`, "PATCH", patch);
    showAlert("Knowledge source updated.", "success");
    await loadSources();
  } catch (err) {
    await handleAdminApiError(err, "Failed to update knowledge source.");
    await loadSources();
  }
}

async function reindexSources() {
  if (!reindexBtn) return;
  reindexBtn.disabled = true;
  reindexBtn.textContent = "Syncing...";
  try {
    const result = await apiRequest("/admin/knowledge-sources/reindex", "POST", {});
    const msg = result?.message || "Vector store sync completed.";
    showAlert(msg, "success");
    await loadSources();
  } catch (err) {
    await handleAdminApiError(err, "Failed to sync vector store files.");
  } finally {
    reindexBtn.disabled = false;
    reindexBtn.textContent = "Sync Vector Store Files";
  }
}

async function initAdminPage() {
  if (typeof getUserRole === "function" && getUserRole() === "admin") {
    setAuthorized();
  }

  try {
    const me = await apiRequest("/users/me");
    const role = String(me?.user_role ?? "").trim().toLowerCase() === "admin" ? "admin" : "user";
    if (typeof setUserRole === "function") setUserRole(role);

    if (role !== "admin") {
      setUnauthorized("Request failed (403 Forbidden). Admin access required");
      return;
    }

    setAuthorized();
    await loadSources();
  } catch (err) {
    const message = err?.message || "Unable to verify current user.";
    if (String(message).includes("(401")) {
      if (typeof clearAuthSession === "function") clearAuthSession();
      window.location.href = "login.html";
      return;
    }
    if (String(message).includes("(403")) {
      setUnauthorized(message);
      return;
    }
    showAlert(message, "danger");
  }
}

if (refreshSourcesBtn) refreshSourcesBtn.addEventListener("click", () => loadSources());
if (reindexBtn) reindexBtn.addEventListener("click", reindexSources);

initAdminPage();

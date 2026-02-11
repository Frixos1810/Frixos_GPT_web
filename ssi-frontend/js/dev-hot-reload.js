(function () {
  const isLocalhost =
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost";

  if (!isLocalhost) return;

  const POLL_MS = 1200;
  const watched = new Set();
  const stamps = new Map();
  let isChecking = false;

  function addTarget(raw) {
    if (!raw) return;

    try {
      const url = new URL(raw, window.location.href);
      if (url.origin !== window.location.origin) return;

      const path = url.pathname.toLowerCase();
      if (!path.endsWith(".html") && !path.endsWith(".css") && !path.endsWith(".js")) {
        return;
      }

      watched.add(url.pathname);
    } catch (_) {
      // Ignore malformed URLs.
    }
  }

  function withCacheBypass(path) {
    return `${path}${path.includes("?") ? "&" : "?"}__watch=${Date.now()}`;
  }

  async function getStamp(path) {
    const url = withCacheBypass(path);

    try {
      let response = await fetch(url, { method: "HEAD", cache: "no-store" });
      if (response.ok) {
        const etag = response.headers.get("etag") || "";
        const modified = response.headers.get("last-modified") || "";
        const length = response.headers.get("content-length") || "";
        if (etag || modified || length) {
          return `head:${etag}:${modified}:${length}`;
        }
      }

      response = await fetch(url, { cache: "no-store" });
      if (!response.ok) return null;

      const text = await response.text();
      return `body:${text.length}:${text.slice(0, 120)}`;
    } catch (_) {
      return null;
    }
  }

  async function prime() {
    for (const path of watched) {
      const stamp = await getStamp(path);
      if (stamp) stamps.set(path, stamp);
    }
  }

  async function checkForChanges() {
    if (isChecking) return;
    isChecking = true;

    try {
      for (const path of watched) {
        const next = await getStamp(path);
        const prev = stamps.get(path);

        if (prev && next && prev !== next) {
          const nextUrl = new URL(window.location.href);
          nextUrl.searchParams.set("__reload", String(Date.now()));
          window.location.replace(nextUrl.toString());
          return;
        }

        if (next) stamps.set(path, next);
      }
    } finally {
      isChecking = false;
    }
  }

  addTarget(window.location.pathname);

  document
    .querySelectorAll('link[rel="stylesheet"][href], script[src]')
    .forEach((el) => {
      const attr = el.tagName.toLowerCase() === "link" ? "href" : "src";
      addTarget(el.getAttribute(attr));
    });

  if (!watched.size) return;

  prime().then(() => {
    setInterval(checkForChanges, POLL_MS);
  });
})();

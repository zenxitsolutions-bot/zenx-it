export function navigate(to) {
  if (to.startsWith("http") || to.startsWith("mailto")) {
    window.location.href = to;
    return;
  }

  if (to.startsWith("#")) {
    if (window.location.pathname !== "/") {
      window.history.pushState({}, "", `/${to}`);
      window.dispatchEvent(new PopStateEvent("popstate"));
      requestAnimationFrame(() =>
        document.querySelector(to)?.scrollIntoView({ behavior: "smooth", block: "start" })
      );
      return;
    }
    document.querySelector(to)?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  window.history.pushState({}, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo(0, 0);
}

export function handleAppLink(event, href) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
  if (href.startsWith("http") || href.startsWith("mailto")) return;
  event.preventDefault();
  navigate(href);
}

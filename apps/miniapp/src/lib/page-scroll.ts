function activePage() {
  return document.querySelector<HTMLElement>(
    "#root .app-shell > main.page:not([hidden])",
  );
}
export function pageScrollTop() {
  return activePage()?.scrollTop ?? window.scrollY ?? 0;
}
export function restorePageScroll(top: number) {
  const page = activePage();
  if (page) {
    window.scrollTo(0, 0);
    page.scrollTo({ top, behavior: "auto" });
  } else window.scrollTo(0, top);
}

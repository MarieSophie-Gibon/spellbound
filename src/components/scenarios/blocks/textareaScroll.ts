export function getChapitreScrollContainer() {
  return document.querySelector('[data-chapitre-scroll="true"]') as HTMLElement | null;
}

// Le passage temporaire à height:auto replie le textarea, ce qui raccourcit le
// conteneur et fait remonter le scroll : on le restaure de façon synchrone,
// avant le repaint, pour éviter tout saut visuel pendant la frappe.
export function resizeTextareaPreserveScroll(target: HTMLTextAreaElement) {
  const sc = getChapitreScrollContainer();
  const savedTop = sc?.scrollTop ?? null;
  target.style.height = "auto";
  target.style.height = `${target.scrollHeight}px`;
  if (sc && savedTop !== null) sc.scrollTop = savedTop;
}

// Applique un changement en gardant la position de scroll du chapitre.
export function preserveScroll(fn: () => void) {
  const sc = getChapitreScrollContainer();
  const savedTop = sc?.scrollTop ?? null;
  const savedWindow = window.scrollY;
  fn();
  requestAnimationFrame(() => {
    if (sc && savedTop !== null) sc.scrollTop = savedTop;
    if (window.scrollY !== savedWindow) window.scrollTo({ top: savedWindow, behavior: "auto" });
  });
}

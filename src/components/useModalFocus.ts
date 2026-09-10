import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'button, a[href], input, select, textarea, summary, [tabindex], [contenteditable="true"]';

/** Keep the side panel modal for keyboard, screen-reader and touch users alike. */
export function useModalFocus(
  panelRef: RefObject<HTMLElement>,
  initialFocusRef: RefObject<HTMLElement>,
  onClose: () => void,
) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const background: { element: HTMLElement; inert: boolean }[] = [];

    // Isolate siblings at every ancestor level without making the panel (or its
    // clickable backdrop) inert. Preserve pre-existing inert state on cleanup.
    let activeBranch: HTMLElement = panel;
    while (activeBranch.parentElement) {
      for (const sibling of activeBranch.parentElement.children) {
        if (!(sibling instanceof HTMLElement) || sibling === activeBranch || sibling.hasAttribute("data-modal-backdrop")) continue;
        background.push({ element: sibling, inert: sibling.inert });
        sibling.inert = true;
      }
      if (activeBranch.parentElement === document.body) break;
      activeBranch = activeBranch.parentElement;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusInitial = () => (initialFocusRef.current ?? panel).focus({ preventScroll: true });
    focusInitial();

    const focusable = () => Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (element) => element.tabIndex >= 0 && !element.matches(":disabled") &&
        !element.closest("[inert]") && element.getClientRects().length > 0 &&
        getComputedStyle(element).visibility !== "hidden",
    );
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const controls = focusable();
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first || !last) {
        event.preventDefault();
        panel.focus({ preventScroll: true });
      } else if (!panel.contains(document.activeElement) || document.activeElement === panel) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const onFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !panel.contains(event.target)) focusInitial();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocus);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocus);
      for (const { element, inert } of background) element.inert = inert;
      document.body.style.overflow = previousOverflow;
      if (returnTo?.isConnected && !returnTo.closest("[inert]")) {
        returnTo.focus({ preventScroll: true });
      }
    };
  }, [panelRef, initialFocusRef]);
}

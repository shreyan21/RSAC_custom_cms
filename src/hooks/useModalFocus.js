import { useEffect, useLayoutEffect, useRef } from "react";

const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

export default function useModalFocus({ isOpen, onClose }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  useLayoutEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!isOpen || !dialogRef.current) return undefined;
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const controls = () => Array.from(dialog.querySelectorAll(focusableSelector))
      .filter(element => element.tabIndex >= 0 && !element.closest('[hidden], [inert]') && element.getClientRects().length > 0);
    const focusFirst = () => (controls()[0] || dialog).focus();
    const onKey = event => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current?.();
      } else if (event.key === "Tab") {
        const elements = controls();
        const first = elements[0], last = elements.at(-1);
        const active = document.activeElement;
        if (!first || !dialog.contains(active) || (event.shiftKey ? active === first : active === last)) {
          event.preventDefault();
          event.stopPropagation();
          (event.shiftKey ? last : first)?.focus();
        }
      }
    };
    document.body.style.overflow = "hidden";
    focusFirst();
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus();
    };
  }, [isOpen]);

  return dialogRef;
}

import { useEffect, useRef } from "react";

// Native <dialog>: the focus trap, the Escape key and the backdrop come with the
// element, so there is no keyboard handling to get wrong here.
export function ConfirmDialog({
  open,
  title,
  body,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  body: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog className="confirm" ref={ref} onCancel={(e) => { e.preventDefault(); onCancel(); }} aria-labelledby="confirm-h">
      <h2 id="confirm-h">{title}</h2>
      <p>{body}</p>
      <div className="confirm-actions">
        <button className="btn" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button className="btn btn-primary" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

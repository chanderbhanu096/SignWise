import type { ReactNode } from "react";

// A collapsible secondary section. <details> carries the expanded state, keyboard
// support and screen-reader semantics natively — no aria bookkeeping of our own.
export function Section({
  title,
  sub,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  sub?: string;
  count?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="sec block" open={defaultOpen}>
      <summary className="sec-head">
        <span className="sec-titles">
          <span className="sec-title">{title}</span>
          {sub && <span className="sec-sub">{sub}</span>}
        </span>
        {count && <span className="sec-count">{count}</span>}
        <span className="sec-chevron" aria-hidden="true">
          ⌄
        </span>
      </summary>
      <div className="sec-body">{children}</div>
    </details>
  );
}

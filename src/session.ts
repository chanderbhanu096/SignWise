import type { Analysis, Lang } from "./types";

// Work and translations belong to one contract. A cancelled request may still
// resolve, so callers check the ticket before changing anything on screen.
export class ContractSession {
  private controller = new AbortController();
  readonly translations = new Map<Lang, Analysis>();

  ticket() {
    const controller = this.controller;
    return {
      signal: controller.signal,
      isCurrent: () => this.controller === controller && !controller.signal.aborted,
    };
  }

  reset() {
    this.controller.abort();
    this.controller = new AbortController();
    this.translations.clear();
  }

  cancel() {
    this.controller.abort();
    this.translations.clear();
  }
}

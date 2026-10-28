/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

/** Shown in the workbench when no proposal is selected. */
export function WorkbenchEmptyState() {
  return (
    <div className="hf-workbench-empty">
      <div className="hf-workbench-empty__icon" aria-hidden>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="11" r="7" stroke="var(--hf-border-strong)" strokeWidth="1.5" />
          <path d="M11 8v3l2 2" stroke="var(--hf-text-muted)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <h3>No proposal selected</h3>
      <p>Select a change proposal from the canvas or attention queue to begin review.</p>
    </div>
  );
}

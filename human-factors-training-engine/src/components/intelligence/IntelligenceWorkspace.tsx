/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { ReactNode } from 'react';

type Props = {
  commandBar: ReactNode;
  contextRail: ReactNode;
  canvas: ReactNode;
  workbench: ReactNode;
  lineage: ReactNode;
};

/** Top-level Intelligence Workspace shell. D-069 §9. */
export function IntelligenceWorkspace({ commandBar, contextRail, canvas, workbench, lineage }: Props) {
  return (
    <div className="hf-workspace" data-theme="dark">
      <header className="hf-workspace__command">{commandBar}</header>
      <aside className="hf-workspace__context">{contextRail}</aside>
      <main className="hf-workspace__canvas">{canvas}</main>
      <aside className="hf-workspace__workbench">{workbench}</aside>
      <footer className="hf-workspace__lineage">{lineage}</footer>
    </div>
  );
}

import { describe, it, expect } from 'vitest';
import { runAllPanels } from './panels';

describe('test dashboard panels', () => {
  it('all fourteen panels report green', async () => {
    const panels = await runAllPanels();

    const failing = panels
      .filter((p) => !p.passed)
      .map(
        (p) =>
          `${p.id} ${p.title}: ${p.rows
            .filter((r) => !r.passed)
            .map((r) => `${r.label} — ${r.detail}`)
            .join(' | ')}`
      );

    expect(failing).toEqual([]);
    expect(panels).toHaveLength(14);
  });

  it('every panel states what it proves', async () => {
    const panels = await runAllPanels();
    for (const p of panels) {
      expect(p.proves.length).toBeGreaterThan(20);
      expect(p.rows.length).toBeGreaterThan(0);
    }
  });
});

import { useEffect, useState } from 'react';
import { runAllPanels, panelDocumentPreview, type PanelResult } from './panels';

/**
 * The test dashboard.
 *
 * A deliverable, not a debug page. Every panel states what it proves, so green
 * means that claim can be trusted without reading the code.
 *
 * Dev and staging only. The production build asserts this route is absent from
 * the bundle — shipping it would hand a customer the fixture data and the
 * internal rule logic.
 */
export default function TestDashboard() {
  const [panels, setPanels] = useState<PanelResult[] | null>(null);
  const [showRecord, setShowRecord] = useState(false);

  useEffect(() => {
    void runAllPanels().then(setPanels);
  }, []);

  if (panels === null) {
    return <main className="p-6 font-sans">Running panels…</main>;
  }

  const failing = panels.filter((p) => !p.passed).length;
  const preview = panelDocumentPreview();

  return (
    <main className="mx-auto max-w-5xl p-4 font-sans sm:p-6">
      <header className="mb-6 border-b pb-4">
        <h1 className="text-2xl font-semibold">Receiving Inspection — test dashboard</h1>
        <p className="mt-1 text-sm opacity-70">
          Dev and staging only. Excluded from production by build flag; CI asserts its absence from
          the bundle.
        </p>
        <p
          className={`mt-3 inline-block rounded px-3 py-1 text-sm font-medium ${
            failing === 0 ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'
          }`}
        >
          {failing === 0
            ? `All ${panels.length} panels green`
            : `${failing} of ${panels.length} panels failing`}
        </p>
      </header>

      <div className="space-y-5">
        {panels.map((panel) => (
          <section
            key={panel.id}
            className={`rounded border-l-4 p-4 ${
              panel.passed ? 'border-green-600 bg-green-50/40' : 'border-red-600 bg-red-50/40'
            }`}
          >
            <h2 className="text-base font-semibold">
              <span className="opacity-50">{panel.id}.</span> {panel.title}{' '}
              <span className={panel.passed ? 'text-green-700' : 'text-red-700'}>
                {panel.passed ? '✓' : '✗'}
              </span>
            </h2>
            <p className="mt-1 text-sm italic opacity-75">Proves: {panel.proves}</p>

            <ul className="mt-3 space-y-1 text-sm">
              {panel.rows.map((row, index) => (
                <li key={`${panel.id}-${index}`} className="flex gap-2">
                  <span className={row.passed ? 'text-green-700' : 'text-red-700'}>
                    {row.passed ? '✓' : '✗'}
                  </span>
                  <span className="font-medium">{row.label}</span>
                  <span className="opacity-70">— {row.detail}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="mt-6 rounded border p-4">
        <h2 className="text-base font-semibold">Record preview (structured JSON)</h2>
        <p className="mt-1 text-sm italic opacity-75">
          This is the artefact an ERP consumes. The PDF rendering is not yet built — see
          HANDOVER.md.
        </p>
        <button
          type="button"
          className="mt-2 min-h-touch rounded border px-3 py-2 text-sm"
          onClick={() => setShowRecord((v) => !v)}
        >
          {showRecord ? 'Hide' : 'Show'} signed record JSON
        </button>
        {showRecord && preview.record !== null && (
          <pre className="mt-3 max-h-96 overflow-auto rounded bg-black/5 p-3 text-xs">
            {JSON.stringify(preview.record, null, 2)}
          </pre>
        )}
      </section>
    </main>
  );
}

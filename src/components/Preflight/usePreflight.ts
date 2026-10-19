import { useCallback, useEffect, useState } from 'react';
import type { PreflightResult } from '../../main-functions/preflight';

// Runs the go-live checks and keeps the latest result. Purely a read-only
// diagnostic: main.ts's run-preflight handler only gathers and evaluates
// signals, it never moves a window, starts a server or changes match state,
// so running it on mount (to colour the Go live tab) is safe. "Run again"
// re-runs it after the operator has fixed something.
export function usePreflight() {
  const [result, setResult] = useState<PreflightResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const run = useCallback(() => {
    // Optional chaining on the method as well: the dashboard also renders
    // under test harnesses that stub only part of the bridge.
    const runPreflight = window?.electronAPI?.runPreflight;
    if (!runPreflight) return;
    setLoading(true);
    setLoadError(false);
    runPreflight()
      .then((preflightResult) => setResult(preflightResult))
      .catch((error: unknown) => {
        console.error('Failed to run preflight check:', error);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    run();
  }, [run]);

  return { result, loading, loadError, run };
}

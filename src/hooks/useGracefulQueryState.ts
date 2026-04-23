import { useEffect, useRef, useState } from 'react';

interface Params {
  isPending: boolean;
  isError: boolean;
  /** Keep skeleton visible at least this long after a load begins. */
  minPendingMs?: number;
  /** When an error happens, keep showing skeleton for this long before revealing error. */
  errorGraceMs?: number;
}

export function useGracefulQueryState({
  isPending,
  isError,
  minPendingMs = 1500,
  errorGraceMs = 2000,
}: Params) {
  const [pendingGateOpen, setPendingGateOpen] = useState(true);
  const [errorGateOpen, setErrorGateOpen] = useState(true);
  const pendingTimer = useRef<number | null>(null);
  const errorTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pendingTimer.current != null)
        window.clearTimeout(pendingTimer.current);
      if (errorTimer.current != null) window.clearTimeout(errorTimer.current);
    };
  }, []);

  useEffect(() => {
    if (isPending) {
      // Avoid synchronous setState in effects (eslint rule); schedule it.
      window.setTimeout(() => setPendingGateOpen(true), 0);
      if (pendingTimer.current != null)
        window.clearTimeout(pendingTimer.current);
      pendingTimer.current = window.setTimeout(() => {
        setPendingGateOpen(false);
      }, minPendingMs);
      return;
    }
    // Not pending anymore; allow content immediately if minimum time already passed
    // (timer will flip the gate when it fires).
    if (pendingTimer.current == null) {
      window.setTimeout(() => setPendingGateOpen(false), 0);
    }
  }, [isPending, minPendingMs]);

  useEffect(() => {
    if (isError) {
      window.setTimeout(() => setErrorGateOpen(true), 0);
      if (errorTimer.current != null) window.clearTimeout(errorTimer.current);
      errorTimer.current = window.setTimeout(() => {
        setErrorGateOpen(false);
      }, errorGraceMs);
      return;
    }
    // Clear error grace when error disappears
    if (errorTimer.current != null) window.clearTimeout(errorTimer.current);
    errorTimer.current = null;
    window.setTimeout(() => setErrorGateOpen(true), 0);
  }, [isError, errorGraceMs]);

  const showSkeleton =
    isPending || (isError && errorGateOpen) || pendingGateOpen;
  const showError = isError && !errorGateOpen && !isPending;

  return { showSkeleton, showError };
}

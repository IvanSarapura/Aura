'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="main">
      <div className="error-page">
        <h1>Something went wrong</h1>
        <p className="error-message">{error.message}</p>
        <button className="error-retry" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}

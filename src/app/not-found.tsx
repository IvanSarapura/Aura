import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="main">
      <div className="error-page">
        <h1>404</h1>
        <p className="error-message">This page could not be found.</p>
        <Link href="/" className="error-retry">
          Back to home
        </Link>
      </div>
    </main>
  );
}

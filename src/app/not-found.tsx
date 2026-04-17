import Link from 'next/link';
import styles from './error.module.css';

export default function NotFound() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>404</h1>
      <p className={styles.message}>This page could not be found.</p>
      <Link href="/" className={styles.button}>
        Back to home
      </Link>
    </div>
  );
}

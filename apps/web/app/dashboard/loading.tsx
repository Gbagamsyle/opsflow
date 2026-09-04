import styles from "./dashboard.module.css";

export default function Loading() {
  return (
    <main className={styles.loadingPage} aria-label="Loading dashboard">
      <div className={styles.loadingBar} />
      <p>Preparing your workspace...</p>
    </main>
  );
}

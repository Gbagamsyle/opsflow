import { SignIn, SignUp } from '@clerk/nextjs';
import styles from './auth.module.css';

export default async function AuthPage({
  params,
}: {
  params: Promise<{ rest?: string[] }>;
}) {
  const { rest } = await params;
  const isSignUp = rest?.[0] === 'sign-up';

  return (
    <main className={styles.page}>
      <div className={styles.aside}>
        <div className={styles.brand}><span>O</span> OPSFLOW</div>
        <div className={styles.message}>
          <p>OPERATIONS, WITH INTENTION</p>
          <h1>Make room<br />for <em>momentum.</em></h1>
          <span className={styles.rule} />
          <small>A calmer command center for the work that matters.</small>
        </div>
        <footer>Private by design <span>2026</span></footer>
      </div>
      <section className={styles.formArea}>
        <div className={styles.formHeader}><span>{isSignUp ? 'Create your account' : 'Welcome back'}</span><span className={styles.index}>{isSignUp ? '01' : '00'} / 01</span></div>
        {isSignUp ? <SignUp routing="path" path="/auth/sign-up" signInUrl="/auth" /> : <SignIn routing="path" path="/auth" signUpUrl="/auth/sign-up" />}
      </section>
    </main>
  );
}

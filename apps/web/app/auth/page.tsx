import { SignIn } from '@clerk/nextjs';

export default function AuthPage() {
  return (
    <main
      style={{
        alignItems: 'center',
        background: '#f7f7f5',
        display: 'flex',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '24px',
      }}
    >
      <SignIn />
    </main>
  );
}

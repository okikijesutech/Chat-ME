import AuthForm from '@/components/auth-form';

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-bg-main)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(79,70,229,0.05),transparent_50%)] pointer-events-none" />
      <AuthForm type="login" />
    </main>
  );
}

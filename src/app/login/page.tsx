import { Suspense } from 'react';
import { LoginForm } from './login-form';

export const metadata = { title: 'Sign in · Ajaia Docs' };

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Ajaia Docs</h1>
          <p className="text-sm text-slate-500 mt-1">
            Sign in to create and share documents.
          </p>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
        <div className="mt-6 rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
          <p className="font-medium text-slate-700 mb-1">Demo accounts</p>
          <ul className="space-y-0.5 font-mono">
            <li>alice@demo.test · demo1234</li>
            <li>bob@demo.test · demo1234</li>
            <li>carol@demo.test · demo1234</li>
          </ul>
        </div>
      </div>
    </main>
  );
}

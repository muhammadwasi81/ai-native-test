'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';

export function AppHeader({ user }: { user: { id: string; name: string; email: string } }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/documents" className="text-base font-semibold tracking-tight">
          Ajaia Docs
        </Link>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium leading-tight">{user.name}</div>
            <div className="text-xs text-slate-500 leading-tight">{user.email}</div>
          </div>
          <div className="h-9 w-9 rounded-full bg-brand-100 text-brand-700 grid place-items-center font-semibold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-xs text-slate-600 hover:text-slate-900 underline underline-offset-4 ml-1"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

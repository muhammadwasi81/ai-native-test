import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AppHeader } from '@/components/app-header';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader
        user={{
          id: session.user.id,
          name: session.user.name ?? 'You',
          email: session.user.email ?? '',
        }}
      />
      <div className="flex-1">{children}</div>
    </div>
  );
}

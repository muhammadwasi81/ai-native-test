import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { DocumentsList } from './documents-list';

export const dynamic = 'force-dynamic';

export default async function DocumentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const userId = session.user.id;
  const [owned, shared] = await Promise.all([
    prisma.document.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, updatedAt: true },
    }),
    prisma.document.findMany({
      where: { shares: { some: { userId } } },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        owner: { select: { name: true, email: true } },
      },
    }),
  ]);

  return (
    <DocumentsList
      owned={owned.map((d) => ({ ...d, updatedAt: d.updatedAt.toISOString() }))}
      shared={shared.map((d) => ({ ...d, updatedAt: d.updatedAt.toISOString() }))}
    />
  );
}

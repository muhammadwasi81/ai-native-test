import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { DocumentEditor } from './document-editor';

export const dynamic = 'force-dynamic';

export default async function DocumentPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const doc = await prisma.document.findUnique({
    where: { id: params.id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      shares: { select: { userId: true } },
    },
  });
  if (!doc) notFound();
  const userId = session.user.id;
  const isOwner = doc.ownerId === userId;
  const isShared = doc.shares.some((s) => s.userId === userId);
  if (!isOwner && !isShared) notFound();

  return (
    <DocumentEditor
      id={doc.id}
      initialTitle={doc.title}
      initialContent={doc.content as object}
      isOwner={isOwner}
      owner={doc.owner}
    />
  );
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError, loadAccessibleDocument, requireUser } from '@/lib/api';

type Params = { params: { id: string; userId: string } };

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    await loadAccessibleDocument(params.id, user.id, { requireOwner: true });
    await prisma.share
      .delete({
        where: { documentId_userId: { documentId: params.id, userId: params.userId } },
      })
      .catch(() => null);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleError(err);
  }
}

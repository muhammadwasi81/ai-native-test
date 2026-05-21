import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError, HttpError, loadAccessibleDocument, requireUser } from '@/lib/api';
import { shareSchema } from '@/lib/schemas';

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    await loadAccessibleDocument(params.id, user.id, { requireOwner: true });
    const shares = await prisma.share.findMany({
      where: { documentId: params.id },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(shares.map((s) => s.user));
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    await loadAccessibleDocument(params.id, user.id, { requireOwner: true });
    const { email } = shareSchema.parse(await req.json());

    const target = await prisma.user.findUnique({ where: { email } });
    if (!target) throw new HttpError(404, 'No user with that email');
    if (target.id === user.id) throw new HttpError(400, "You can't share with yourself");

    const existing = await prisma.share.findUnique({
      where: { documentId_userId: { documentId: params.id, userId: target.id } },
    });
    if (existing) throw new HttpError(409, 'Already shared with this user');

    await prisma.share.create({ data: { documentId: params.id, userId: target.id } });
    return NextResponse.json(
      { id: target.id, name: target.name, email: target.email },
      { status: 201 },
    );
  } catch (err) {
    return handleError(err);
  }
}

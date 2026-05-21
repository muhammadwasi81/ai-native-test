import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError, requireUser } from '@/lib/api';
import { createDocumentSchema } from '@/lib/schemas';

export async function GET() {
  try {
    const user = await requireUser();

    const [owned, shared] = await Promise.all([
      prisma.document.findMany({
        where: { ownerId: user.id },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, title: true, updatedAt: true, createdAt: true },
      }),
      prisma.document.findMany({
        where: { shares: { some: { userId: user.id } } },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          updatedAt: true,
          createdAt: true,
          owner: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    return NextResponse.json({ owned, shared });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = createDocumentSchema.parse(await req.json().catch(() => ({})));

    const doc = await prisma.document.create({
      data: {
        title: body.title ?? 'Untitled document',
        ownerId: user.id,
        content: { type: 'doc', content: [{ type: 'paragraph' }] },
      },
      select: { id: true, title: true, updatedAt: true, createdAt: true },
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}

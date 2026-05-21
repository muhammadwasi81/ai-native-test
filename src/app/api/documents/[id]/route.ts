import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { handleError, loadAccessibleDocument, requireUser } from '@/lib/api';
import { updateDocumentSchema } from '@/lib/schemas';

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { doc, isOwner } = await loadAccessibleDocument(params.id, user.id);
    return NextResponse.json({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      ownerId: doc.ownerId,
      owner: { id: doc.owner.id, name: doc.owner.name, email: doc.owner.email },
      updatedAt: doc.updatedAt,
      createdAt: doc.createdAt,
      isOwner,
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    await loadAccessibleDocument(params.id, user.id);
    const body = updateDocumentSchema.parse(await req.json());

    const updated = await prisma.document.update({
      where: { id: params.id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.content !== undefined
          ? { content: body.content as Prisma.InputJsonValue }
          : {}),
      },
      select: { id: true, title: true, updatedAt: true },
    });
    return NextResponse.json(updated);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    await loadAccessibleDocument(params.id, user.id, { requireOwner: true });
    await prisma.document.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleError(err);
  }
}

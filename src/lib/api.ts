import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new HttpError(401, 'Unauthorized');
  return { id: session.user.id, email: session.user.email!, name: session.user.name! };
}

/**
 * Loads a document the current user has access to (owner OR shared).
 * `requireOwner` upgrades the check so non-owners get 403.
 */
export async function loadAccessibleDocument(
  documentId: string,
  userId: string,
  opts: { requireOwner?: boolean } = {},
) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { shares: { select: { userId: true } }, owner: true },
  });
  if (!doc) throw new HttpError(404, 'Not found');
  const isOwner = doc.ownerId === userId;
  const isShared = doc.shares.some((s) => s.userId === userId);
  if (opts.requireOwner && !isOwner) throw new HttpError(403, 'Forbidden');
  if (!isOwner && !isShared) throw new HttpError(403, 'Forbidden');
  return { doc, isOwner };
}

export function handleError(err: unknown) {
  if (err instanceof HttpError) return jsonError(err.status, err.message);
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: 'Invalid request', issues: err.flatten() },
      { status: 400 },
    );
  }
  console.error(err);
  return jsonError(500, 'Internal error');
}

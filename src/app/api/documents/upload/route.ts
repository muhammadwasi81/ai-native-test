import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError, HttpError, requireUser } from '@/lib/api';
import { importFile, MAX_UPLOAD_BYTES } from '@/lib/import-file';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const form = await req.formData().catch(() => null);
    const file = form?.get('file');
    if (!file || !(file instanceof File)) {
      throw new HttpError(400, 'Missing file');
    }
    if (file.size === 0) throw new HttpError(400, 'File is empty');
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new HttpError(413, 'File is larger than 5 MB');
    }

    const allowed = /\.(txt|md|markdown|docx)$/i.test(file.name);
    if (!allowed) throw new HttpError(415, 'Unsupported file type. Use .txt, .md, or .docx.');

    let imported;
    try {
      imported = await importFile(file);
    } catch (err) {
      throw new HttpError(400, err instanceof Error ? err.message : 'Failed to parse file');
    }

    const doc = await prisma.document.create({
      data: {
        title: imported.title,
        ownerId: user.id,
        content: imported.doc as object,
      },
      select: { id: true, title: true },
    });
    return NextResponse.json(doc, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}

'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { formatRelative } from '@/lib/format';

type OwnedDoc = { id: string; title: string; updatedAt: string };
type SharedDoc = OwnedDoc & { owner: { name: string; email: string } };

export function DocumentsList({ owned, shared }: { owned: OwnedDoc[]; shared: SharedDoc[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function createBlank() {
    setBusy(true);
    try {
      const res = await fetch('/api/documents', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to create');
      const doc = await res.json();
      router.push(`/documents/${doc.id}`);
    } catch {
      toast.error('Could not create document');
    } finally {
      setBusy(false);
    }
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/documents/upload', { method: 'POST', body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Upload failed');
      }
      const doc = await res.json();
      toast.success(`Imported "${doc.title}"`);
      router.push(`/documents/${doc.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your documents</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Create, upload, and share documents with your team.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 px-3.5 py-2 text-sm font-medium disabled:opacity-50"
          >
            Upload file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.markdown,.docx"
            onChange={onUpload}
            className="hidden"
          />
          <button
            onClick={createBlank}
            disabled={busy}
            className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white px-3.5 py-2 text-sm font-medium disabled:opacity-50"
          >
            New document
          </button>
        </div>
      </div>

      <Section
        title="My documents"
        empty="You haven't created any documents yet. Click 'New document' to start."
        items={owned}
      />
      <div className="h-8" />
      <Section
        title="Shared with me"
        empty="No one has shared a document with you yet."
        items={shared.map((d) => ({ ...d, subtitle: `Owned by ${d.owner.name}` }))}
        showOwner
      />
    </div>
  );
}

function Section({
  title,
  items,
  empty,
  showOwner,
}: {
  title: string;
  items: (OwnedDoc & { subtitle?: string })[];
  empty: string;
  showOwner?: boolean;
}) {
  return (
    <section>
      <h2 className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-3">
        {title}
        <span className="ml-2 text-slate-400 font-normal">({items.length})</span>
      </h2>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-10 px-6 text-center text-sm text-slate-500">
          {empty}
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((doc) => (
            <li key={doc.id}>
              <Link
                href={`/documents/${doc.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-500 hover:shadow-sm transition"
              >
                <div className="font-medium text-slate-900 truncate">{doc.title}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {showOwner ? doc.subtitle : 'Updated'} · {formatRelative(doc.updatedAt)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

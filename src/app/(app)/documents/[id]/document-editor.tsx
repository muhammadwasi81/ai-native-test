'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { EditorToolbar } from './editor-toolbar';
import { ShareDialog } from './share-dialog';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type Props = {
  id: string;
  initialTitle: string;
  initialContent: object;
  isOwner: boolean;
  owner: { id: string; name: string; email: string };
};

const SAVE_DEBOUNCE_MS = 800;

export function DocumentEditor({ id, initialTitle, initialContent, isOwner, owner }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [savedTitle, setSavedTitle] = useState(initialTitle);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [shareOpen, setShareOpen] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
    ],
    content: initialContent,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'tiptap focus:outline-none',
        spellcheck: 'true',
      },
    },
    onUpdate: ({ editor }) => {
      scheduleSave({ content: editor.getJSON() });
    },
  });

  const scheduleSave = useCallback(
    (payload: { title?: string; content?: object }) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setStatus('saving');
      saveTimer.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/documents/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error('Save failed');
          setStatus('saved');
        } catch {
          setStatus('error');
          toast.error('Failed to save changes');
        }
      }, SAVE_DEBOUNCE_MS);
    },
    [id],
  );

  function onTitleBlur() {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitle(savedTitle);
      return;
    }
    if (trimmed === savedTitle) return;
    setTitle(trimmed);
    setSavedTitle(trimmed);
    scheduleSave({ title: trimmed });
  }

  async function onDelete() {
    if (!confirm('Delete this document permanently?')) return;
    const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Document deleted');
      router.push('/documents');
      router.refresh();
    } else {
      toast.error('Failed to delete');
    }
  }

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const statusLabel = useMemo(() => statusText(status), [status]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-3">
        <Link href="/documents" className="text-xs text-slate-500 hover:text-slate-700">
          ← All documents
        </Link>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={onTitleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            className="w-full text-3xl font-semibold tracking-tight bg-transparent border-0 focus:outline-none focus:ring-0 px-0 py-1"
            placeholder="Untitled document"
            maxLength={200}
          />
          {!isOwner && (
            <p className="text-xs text-slate-500 mt-0.5">
              Shared with you by <span className="font-medium">{owner.name}</span> ({owner.email})
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <StatusPill status={status} label={statusLabel} />
          {isOwner && (
            <>
              <button
                onClick={() => setShareOpen(true)}
                className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 text-sm font-medium"
              >
                Share
              </button>
              <button
                onClick={onDelete}
                className="rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700 px-3 py-1.5 text-sm"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <EditorToolbar editor={editor as Editor | null} />
        <div className="p-6">
          <EditorContent editor={editor} />
        </div>
      </div>

      {shareOpen && isOwner && (
        <ShareDialog documentId={id} onClose={() => setShareOpen(false)} />
      )}
    </div>
  );
}

function statusText(s: SaveStatus) {
  switch (s) {
    case 'saving':
      return 'Saving…';
    case 'saved':
      return 'All changes saved';
    case 'error':
      return 'Couldn’t save';
    default:
      return '';
  }
}

function StatusPill({ status, label }: { status: SaveStatus; label: string }) {
  if (status === 'idle') return null;
  const color =
    status === 'saving'
      ? 'bg-slate-100 text-slate-600'
      : status === 'saved'
      ? 'bg-emerald-50 text-emerald-700'
      : 'bg-red-50 text-red-700';
  return (
    <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full ${color}`}>
      {label}
    </span>
  );
}

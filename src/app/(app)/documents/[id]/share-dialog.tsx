'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

type Collaborator = { id: string; name: string; email: string };

export function ShareDialog({
  documentId,
  onClose,
}: {
  documentId: string;
  onClose: () => void;
}) {
  const [email, setEmail] = useState('');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/documents/${documentId}/shares`);
      if (res.ok) setCollaborators(await res.json());
      setLoading(false);
    }
    load();
  }, [documentId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Failed to share');
      setCollaborators((prev) => [...prev, body]);
      setEmail('');
      toast.success(`Shared with ${body.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to share');
    } finally {
      setSubmitting(false);
    }
  }

  async function onRemove(userId: string) {
    const res = await fetch(`/api/documents/${documentId}/shares/${userId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setCollaborators((prev) => prev.filter((c) => c.id !== userId));
      toast.success('Access revoked');
    } else {
      toast.error('Failed to revoke access');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Share document"
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">Share document</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Add a teammate by email. They&apos;ll be able to view and edit.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 -mt-1 -mr-1 p-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onAdd} className="mt-5 flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@demo.test"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
          <button
            type="submit"
            disabled={submitting || !email.trim()}
            className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white px-3 text-sm font-medium disabled:opacity-50"
          >
            Add
          </button>
        </form>

        <div className="mt-6">
          <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">
            People with access
          </h3>
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : collaborators.length === 0 ? (
            <p className="text-sm text-slate-500">Only you can see this document.</p>
          ) : (
            <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
              {collaborators.map((c) => (
                <li key={c.id} className="flex items-center justify-between p-3">
                  <div>
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-slate-500">{c.email}</div>
                  </div>
                  <button
                    onClick={() => onRemove(c.id)}
                    className="text-xs text-slate-500 hover:text-red-600 underline-offset-4 hover:underline"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

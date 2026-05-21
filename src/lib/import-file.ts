import { marked } from 'marked';
import mammoth from 'mammoth';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export type ImportResult = {
  title: string;
  doc: unknown;
};

const TIPTAP_EXTENSIONS = [StarterKit, Underline];

let jsdomReady = false;
async function ensureDom() {
  if (jsdomReady) return;
  if (typeof globalThis.window !== 'undefined' && typeof globalThis.document !== 'undefined') {
    jsdomReady = true;
    return;
  }
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  // Cast through unknown — JSDOM types and lib.dom types do not align.
  const g = globalThis as unknown as {
    window?: unknown;
    document?: unknown;
    DOMParser?: unknown;
  };
  g.window = dom.window;
  g.document = dom.window.document;
  g.DOMParser = dom.window.DOMParser;
  jsdomReady = true;
}

async function htmlToTiptap(html: string) {
  await ensureDom();
  const { generateJSON } = await import('@tiptap/html');
  return generateJSON(html || '<p></p>', TIPTAP_EXTENSIONS);
}

function escapeHtml(input: string) {
  return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function titleFromFilename(filename: string) {
  const base = filename.replace(/\\/g, '/').split('/').pop() ?? filename;
  return base.replace(/\.(txt|md|markdown|docx)$/i, '').trim() || 'Untitled document';
}

export async function importFile(file: File): Promise<ImportResult> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('File is larger than 5 MB');
  }
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  let html: string;
  if (name.endsWith('.docx')) {
    const result = await mammoth.convertToHtml({ buffer });
    html = result.value;
  } else if (name.endsWith('.md') || name.endsWith('.markdown')) {
    const text = buffer.toString('utf8');
    html = await marked.parse(text, { async: true });
  } else if (name.endsWith('.txt')) {
    const text = buffer.toString('utf8');
    html = text
      .split(/\r?\n\r?\n/)
      .map((p) => `<p>${escapeHtml(p).replace(/\r?\n/g, '<br/>')}</p>`)
      .join('');
  } else {
    throw new Error('Unsupported file type. Use .txt, .md, or .docx.');
  }

  return {
    title: titleFromFilename(file.name),
    doc: await htmlToTiptap(html),
  };
}

import { z } from 'zod';

export const titleSchema = z.string().trim().min(1).max(200);

export const tiptapDocSchema = z
  .object({ type: z.literal('doc') })
  .passthrough();

export const createDocumentSchema = z.object({
  title: titleSchema.optional(),
});

export const updateDocumentSchema = z.object({
  title: titleSchema.optional(),
  content: tiptapDocSchema.optional(),
});

export const shareSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

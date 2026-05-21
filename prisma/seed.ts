import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_USERS = [
  { email: 'alice@demo.test', name: 'Alice Alvarez' },
  { email: 'bob@demo.test', name: 'Bob Brennan' },
  { email: 'carol@demo.test', name: 'Carol Chen' },
];

async function main() {
  const passwordHash = await bcrypt.hash('demo1234', 10);

  for (const u of DEMO_USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, passwordHash },
      create: { ...u, passwordHash },
    });
  }

  const alice = await prisma.user.findUniqueOrThrow({ where: { email: 'alice@demo.test' } });
  const bob = await prisma.user.findUniqueOrThrow({ where: { email: 'bob@demo.test' } });

  // Seed one shared welcome doc so the sharing flow is visible on first login.
  const existing = await prisma.document.findFirst({
    where: { ownerId: alice.id, title: 'Welcome to your editor' },
  });
  if (!existing) {
    const doc = await prisma.document.create({
      data: {
        title: 'Welcome to your editor',
        ownerId: alice.id,
        content: {
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 1 },
              content: [{ type: 'text', text: 'Welcome to your editor' }],
            },
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'This is a seeded document. Try the toolbar: ' },
                { type: 'text', marks: [{ type: 'bold' }], text: 'bold' },
                { type: 'text', text: ', ' },
                { type: 'text', marks: [{ type: 'italic' }], text: 'italic' },
                { type: 'text', text: ', ' },
                { type: 'text', marks: [{ type: 'underline' }], text: 'underline' },
                { type: 'text', text: ', headings, and lists.' },
              ],
            },
            {
              type: 'bulletList',
              content: [
                {
                  type: 'listItem',
                  content: [
                    { type: 'paragraph', content: [{ type: 'text', text: 'Create new documents' }] },
                  ],
                },
                {
                  type: 'listItem',
                  content: [
                    { type: 'paragraph', content: [{ type: 'text', text: 'Upload .txt / .md / .docx' }] },
                  ],
                },
                {
                  type: 'listItem',
                  content: [
                    { type: 'paragraph', content: [{ type: 'text', text: 'Share with another user' }] },
                  ],
                },
              ],
            },
          ],
        },
      },
    });
    await prisma.share.create({ data: { documentId: doc.id, userId: bob.id } });
  }

  console.log('Seed complete. Users: alice@demo.test, bob@demo.test, carol@demo.test (password: demo1234)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

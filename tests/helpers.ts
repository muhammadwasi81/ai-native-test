import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export type TestUser = { id: string; email: string; name: string };

export async function resetDb() {
  // Order matters: shares depend on documents and users.
  await prisma.share.deleteMany();
  await prisma.document.deleteMany();
  await prisma.user.deleteMany();
}

export async function seedUsers(): Promise<{ alice: TestUser; bob: TestUser; carol: TestUser }> {
  const passwordHash = await bcrypt.hash('demo1234', 4);
  const [alice, bob, carol] = await Promise.all([
    prisma.user.create({
      data: { email: 'alice@test.local', name: 'Alice', passwordHash },
    }),
    prisma.user.create({
      data: { email: 'bob@test.local', name: 'Bob', passwordHash },
    }),
    prisma.user.create({
      data: { email: 'carol@test.local', name: 'Carol', passwordHash },
    }),
  ]);
  return {
    alice: { id: alice.id, email: alice.email, name: alice.name },
    bob: { id: bob.id, email: bob.email, name: bob.name },
    carol: { id: carol.id, email: carol.email, name: carol.name },
  };
}

/**
 * Mocked session state for tests. The vi.mock at the top of each test file
 * makes `auth()` return whatever is in `currentUser`.
 */
export const session = { current: null as TestUser | null };

export function actAs(user: TestUser | null) {
  session.current = user;
}

export function makeRequest(url: string, init: RequestInit = {}): Request {
  return new Request(`http://localhost${url}`, init);
}

export function jsonRequest(url: string, method: string, body: unknown): Request {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

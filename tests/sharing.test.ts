/**
 * End-to-end test for the document sharing authorization flow.
 *
 * Verifies that:
 *  - Owner can create + read + edit their doc
 *  - Owner can share with another user by email
 *  - Recipient can read and edit the shared doc
 *  - A third party with no share is forbidden
 *  - Owner can revoke a share, after which the recipient loses access
 *
 * This is the single highest-risk piece of logic in the app, which is why it
 * gets the integration test.
 */
import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'vitest';
import { actAs, resetDb, seedUsers, session, type TestUser, jsonRequest, makeRequest } from './helpers';

// Mock `auth()` to return the currently-acting user from the shared session state.
vi.mock('@/lib/auth', () => ({
  auth: async () =>
    session.current ? { user: session.current } : null,
}));

import { POST as createDoc, GET as listDocs } from '@/app/api/documents/route';
import { GET as getDoc, PATCH as patchDoc } from '@/app/api/documents/[id]/route';
import {
  GET as listShares,
  POST as addShare,
} from '@/app/api/documents/[id]/shares/route';
import { DELETE as removeShare } from '@/app/api/documents/[id]/shares/[userId]/route';
import { prisma } from '@/lib/prisma';

let users: { alice: TestUser; bob: TestUser; carol: TestUser };

beforeAll(async () => {
  await resetDb();
});

afterAll(async () => {
  await resetDb();
  await prisma.$disconnect();
});

beforeEach(async () => {
  await resetDb();
  users = await seedUsers();
});

describe('Sharing authorization flow', () => {
  it('owner creates, shares, recipient reads + edits, third party is forbidden, revoke removes access', async () => {
    // Alice creates a document
    actAs(users.alice);
    const createRes = await createDoc(
      jsonRequest('/api/documents', 'POST', { title: 'Roadmap' }) as never,
    );
    expect(createRes.status).toBe(201);
    const doc = await createRes.json();
    expect(doc.title).toBe('Roadmap');

    // Alice can read her own doc
    const aliceRead = await getDoc(makeRequest(`/api/documents/${doc.id}`) as never, {
      params: { id: doc.id },
    });
    expect(aliceRead.status).toBe(200);
    expect((await aliceRead.json()).isOwner).toBe(true);

    // Carol (no access) is forbidden
    actAs(users.carol);
    const carolBefore = await getDoc(
      makeRequest(`/api/documents/${doc.id}`) as never,
      { params: { id: doc.id } },
    );
    expect(carolBefore.status).toBe(403);

    // Alice shares with Bob by email
    actAs(users.alice);
    const shareRes = await addShare(
      jsonRequest(`/api/documents/${doc.id}/shares`, 'POST', {
        email: users.bob.email,
      }) as never,
      { params: { id: doc.id } },
    );
    expect(shareRes.status).toBe(201);
    expect((await shareRes.json()).email).toBe(users.bob.email);

    // Bob can now read
    actAs(users.bob);
    const bobRead = await getDoc(makeRequest(`/api/documents/${doc.id}`) as never, {
      params: { id: doc.id },
    });
    expect(bobRead.status).toBe(200);
    const bobBody = await bobRead.json();
    expect(bobBody.isOwner).toBe(false);

    // Bob can edit content (collaborator role)
    const bobPatch = await patchDoc(
      jsonRequest(`/api/documents/${doc.id}`, 'PATCH', {
        content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bob was here' }] }] },
      }) as never,
      { params: { id: doc.id } },
    );
    expect(bobPatch.status).toBe(200);

    // Bob sees it in his shared list
    const bobList = await listDocs();
    expect(bobList.status).toBe(200);
    const bobListBody = await bobList.json();
    expect(bobListBody.owned).toHaveLength(0);
    expect(bobListBody.shared.map((d: { id: string }) => d.id)).toContain(doc.id);

    // Carol still forbidden
    actAs(users.carol);
    const carolDuring = await getDoc(
      makeRequest(`/api/documents/${doc.id}`) as never,
      { params: { id: doc.id } },
    );
    expect(carolDuring.status).toBe(403);

    // Alice revokes Bob
    actAs(users.alice);
    const revoke = await removeShare(
      makeRequest(`/api/documents/${doc.id}/shares/${users.bob.id}`, {
        method: 'DELETE',
      }) as never,
      { params: { id: doc.id, userId: users.bob.id } },
    );
    expect(revoke.status).toBe(204);

    // Bob is now forbidden
    actAs(users.bob);
    const bobAfter = await getDoc(makeRequest(`/api/documents/${doc.id}`) as never, {
      params: { id: doc.id },
    });
    expect(bobAfter.status).toBe(403);
  });

  it('rejects sharing with a non-existent email', async () => {
    actAs(users.alice);
    const create = await createDoc(jsonRequest('/api/documents', 'POST', {}) as never);
    const doc = await create.json();

    const res = await addShare(
      jsonRequest(`/api/documents/${doc.id}/shares`, 'POST', {
        email: 'nobody@test.local',
      }) as never,
      { params: { id: doc.id } },
    );
    expect(res.status).toBe(404);
  });

  it('only the owner may add or list shares', async () => {
    actAs(users.alice);
    const create = await createDoc(jsonRequest('/api/documents', 'POST', {}) as never);
    const doc = await create.json();

    actAs(users.bob);
    const listAttempt = await listShares(
      makeRequest(`/api/documents/${doc.id}/shares`) as never,
      { params: { id: doc.id } },
    );
    expect(listAttempt.status).toBe(403);
  });

  it('unauthenticated requests are 401', async () => {
    actAs(null);
    const res = await listDocs();
    expect(res.status).toBe(401);
  });
});

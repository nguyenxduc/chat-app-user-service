import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import { createApp } from '@/app';
import { env } from '@/config/env';
import { closeDatabase, initializeDatabase } from '@/db';

const app = createApp();
const uniqueEmail = () => `e2e-${randomUUID()}@example.com`;

beforeAll(async () => {
  await initializeDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

describe('User e2e: create -> get -> search', () => {
  it('creates a user and fetches it by id', async () => {
    const email = uniqueEmail();

    const createRes = await request(app)
      .post('/users')
      .set('x-internal-token', env.INTERNAL_API_TOKEN)
      .send({ email, displayName: 'E2E User' });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data).toMatchObject({ email, displayName: 'E2E User' });
    const userId: string = createRes.body.data.id;

    const getRes = await request(app)
      .get(`/users/${userId}`)
      .set('x-internal-token', env.INTERNAL_API_TOKEN);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data).toMatchObject({ id: userId, email });
  });

  it('returns a 404 for an unknown user id', async () => {
    const res = await request(app)
      .get(`/users/${randomUUID()}`)
      .set('x-internal-token', env.INTERNAL_API_TOKEN);
    expect(res.status).toBe(404);
  });

  it('rejects creating the same email twice with a 409', async () => {
    const email = uniqueEmail();
    const payload = { email, displayName: 'Dup User' };

    const firstRes = await request(app)
      .post('/users')
      .set('x-internal-token', env.INTERNAL_API_TOKEN)
      .send(payload);
    expect(firstRes.status).toBe(201);

    const secondRes = await request(app)
      .post('/users')
      .set('x-internal-token', env.INTERNAL_API_TOKEN)
      .send(payload);
    expect(secondRes.status).toBe(409);
  });

  it('finds a created user via search by displayName', async () => {
    const uniqueName = `Findme-${randomUUID()}`;
    await request(app)
      .post('/users')
      .set('x-internal-token', env.INTERNAL_API_TOKEN)
      .send({ email: uniqueEmail(), displayName: uniqueName });

    const searchRes = await request(app)
      .get('/users/search')
      .query({ query: uniqueName })
      .set('x-internal-token', env.INTERNAL_API_TOKEN);

    expect(searchRes.status).toBe(200);
    expect(searchRes.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ displayName: uniqueName })]),
    );
  });

  it('rejects unauthenticated requests with a 401', async () => {
    const res = await request(app).get('/users');
    expect(res.status).toBe(401);
  });
});

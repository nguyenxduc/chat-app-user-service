import { describe, expect, it } from 'vitest';

import { createUserSchema, searchUsersQuerySchema, userIdParamsSchema } from '@/validation/user.schema';

describe('createUserSchema', () => {
  it('accepts a valid payload', () => {
    const result = createUserSchema.safeParse({ email: 'a@b.com', displayName: 'Test User' });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = createUserSchema.safeParse({ email: 'not-an-email', displayName: 'Test User' });
    expect(result.success).toBe(false);
  });

  it('rejects a displayName shorter than 3 characters', () => {
    const result = createUserSchema.safeParse({ email: 'a@b.com', displayName: 'ab' });
    expect(result.success).toBe(false);
  });

  it('rejects a displayName longer than 255 characters', () => {
    const result = createUserSchema.safeParse({ email: 'a@b.com', displayName: 'a'.repeat(256) });
    expect(result.success).toBe(false);
  });
});

describe('userIdParamsSchema', () => {
  it('accepts a valid UUID', () => {
    const result = userIdParamsSchema.safeParse({ id: '123e4567-e89b-12d3-a456-426614174000' });
    expect(result.success).toBe(true);
  });

  it('rejects a non-UUID string', () => {
    const result = userIdParamsSchema.safeParse({ id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });
});

describe('searchUsersQuerySchema', () => {
  it('rejects a query shorter than 3 characters', () => {
    const result = searchUsersQuerySchema.safeParse({ query: 'ab' });
    expect(result.success).toBe(false);
  });

  it('trims a valid query', () => {
    const result = searchUsersQuerySchema.safeParse({ query: '  test  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query).toBe('test');
    }
  });

  it('defaults exclude to an empty array when omitted', () => {
    const result = searchUsersQuerySchema.safeParse({ query: 'test' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.exclude).toEqual([]);
    }
  });

  it('wraps a single UUID exclude value into a one-element array', () => {
    const id = '123e4567-e89b-12d3-a456-426614174000';
    const result = searchUsersQuerySchema.safeParse({ query: 'test', exclude: id });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.exclude).toEqual([id]);
    }
  });

  it('accepts an array of UUIDs for exclude', () => {
    const ids = ['123e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174000'];
    const result = searchUsersQuerySchema.safeParse({ query: 'test', exclude: ids });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.exclude).toEqual(ids);
    }
  });

  // Documents existing bug (see refactor plan "known bugs" list): the `limit` field's
  // .transform((value) => Number()) is missing its argument, so `limit` always becomes
  // NaN, which always fails the subsequent .refine(Number.isInteger(...)) check. This
  // means any caller who passes a `limit` value currently gets a validation error,
  // regardless of the value. This test captures that CURRENT behavior — do not fix it here.
  it('currently rejects any provided limit value due to a pre-existing transform bug (NaN)', () => {
    const result = searchUsersQuerySchema.safeParse({ query: 'test', limit: '5' });
    expect(result.success).toBe(false);
  });
});

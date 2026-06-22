import { describe, expect, it, vi } from 'vitest';

vi.mock('@/messaging/event-publisher', () => ({
  publishUserCreatedEvent: vi.fn().mockResolvedValue(undefined),
}));

import { UniqueConstraintError } from 'sequelize';

import { UserService } from '@/services/user.service';
import { publishUserCreatedEvent } from '@/messaging/event-publisher';
import type { User } from '@/types/user';

const fakeUser: User = {
  id: 'user-1',
  email: 'a@b.com',
  displayName: 'Test User',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
};

const createMockRepository = () => ({
  findById: vi.fn(),
  findAll: vi.fn(),
  create: vi.fn(),
  searchByQuery: vi.fn(),
  upsertFromAuthEvent: vi.fn(),
});

describe('UserService', () => {
  describe('getUserById', () => {
    it('returns the user when the repository finds one', async () => {
      const repository = createMockRepository();
      repository.findById.mockResolvedValue(fakeUser);
      const service = new UserService(repository as never);

      await expect(service.getUserById('user-1')).resolves.toEqual(fakeUser);
    });

    it('throws a 404 HttpError when the repository returns null', async () => {
      const repository = createMockRepository();
      repository.findById.mockResolvedValue(null);
      const service = new UserService(repository as never);

      await expect(service.getUserById('missing')).rejects.toMatchObject({
        statusCode: 404,
        message: 'User not found',
      });
    });
  });

  describe('getAllUsers', () => {
    it('returns whatever the repository returns', async () => {
      const repository = createMockRepository();
      repository.findAll.mockResolvedValue([fakeUser]);
      const service = new UserService(repository as never);

      await expect(service.getAllUsers()).resolves.toEqual([fakeUser]);
    });
  });

  describe('createUser', () => {
    it('creates the user and publishes a user.created event', async () => {
      const repository = createMockRepository();
      repository.create.mockResolvedValue(fakeUser);
      const service = new UserService(repository as never);

      const result = await service.createUser({ email: fakeUser.email, displayName: fakeUser.displayName });

      expect(result).toEqual(fakeUser);
      expect(publishUserCreatedEvent).toHaveBeenCalledWith({
        id: fakeUser.id,
        email: fakeUser.email,
        displayName: fakeUser.displayName,
        createdAt: fakeUser.createdAt.toISOString(),
        updatedAt: fakeUser.updatedAt.toISOString(),
      });
    });

    it('throws a 409 HttpError when the repository raises a unique-constraint error', async () => {
      const repository = createMockRepository();
      repository.create.mockRejectedValue(new UniqueConstraintError({} as never));
      const service = new UserService(repository as never);

      await expect(
        service.createUser({ email: fakeUser.email, displayName: fakeUser.displayName }),
      ).rejects.toMatchObject({ statusCode: 409, message: 'User already exists' });
    });

    it('propagates other errors unchanged', async () => {
      const repository = createMockRepository();
      const genericError = new Error('boom');
      repository.create.mockRejectedValue(genericError);
      const service = new UserService(repository as never);

      await expect(
        service.createUser({ email: fakeUser.email, displayName: fakeUser.displayName }),
      ).rejects.toBe(genericError);
    });
  });

  describe('searchUsers', () => {
    it('returns an empty array without calling the repository for a blank query', async () => {
      const repository = createMockRepository();
      const service = new UserService(repository as never);

      await expect(service.searchUsers({ query: '   ' })).resolves.toEqual([]);
      expect(repository.searchByQuery).not.toHaveBeenCalled();
    });

    it('trims the query and delegates to the repository', async () => {
      const repository = createMockRepository();
      repository.searchByQuery.mockResolvedValue([fakeUser]);
      const service = new UserService(repository as never);

      const result = await service.searchUsers({ query: '  test  ', limit: 5, excludeIds: ['x'] });

      expect(result).toEqual([fakeUser]);
      expect(repository.searchByQuery).toHaveBeenCalledWith('test', { limit: 5, excludeIds: ['x'] });
    });
  });

  describe('syncFromAuthUser', () => {
    it('upserts the user and publishes a user.created event', async () => {
      const repository = createMockRepository();
      repository.upsertFromAuthEvent.mockResolvedValue(fakeUser);
      const service = new UserService(repository as never);

      const payload = {
        id: fakeUser.id,
        email: fakeUser.email,
        displayName: fakeUser.displayName,
        createdAt: fakeUser.createdAt.toISOString(),
      };

      const result = await service.syncFromAuthUser(payload as never);

      expect(repository.upsertFromAuthEvent).toHaveBeenCalledWith(payload);
      expect(result).toEqual(fakeUser);
      expect(publishUserCreatedEvent).toHaveBeenCalledWith({
        id: fakeUser.id,
        email: fakeUser.email,
        displayName: fakeUser.displayName,
        createdAt: fakeUser.createdAt.toISOString(),
        updatedAt: fakeUser.updatedAt.toISOString(),
      });
    });
  });
});

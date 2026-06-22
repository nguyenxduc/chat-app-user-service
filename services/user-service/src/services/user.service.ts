import type { UserRepository } from '@/repositories/user.repository';
import type { CreateUserInput, User } from '@/types/user';

import { userRepository } from '@/repositories/user.repository';
import { AuthUserRegisteredPayload, HttpError } from '@chatapp/common';
import { UniqueConstraintError } from 'sequelize';
import { publishUserCreatedEvent } from '@/messaging/event-publisher';
import { logger } from '@/utils/logger';

export class UserService {
  constructor(private readonly repository: UserRepository) {}

  async getUserById(id: string): Promise<User> {
    const user = await this.repository.findById(id);
    if (!user) {
      logger.warn({ userId: id }, 'User not found');
      throw new HttpError(404, 'User not found');
    }
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return this.repository.findAll();
  }

  async createUser(input: CreateUserInput): Promise<User> {
    try {
      const user = await this.repository.create(input);

      void publishUserCreatedEvent({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      });

      logger.info({ userId: user.id }, 'User created');

      return user;
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        logger.warn({ email: input.email }, 'Create user failed: email already exists');
        throw new HttpError(409, 'User already exists');
      }
      logger.error({ err: error, email: input.email }, 'Create user failed');
      throw error;
    }
  }

  async searchUsers(params: {
    query: string;
    limit?: number;
    excludeIds?: string[];
  }): Promise<User[]> {
    const query = params.query.trim();
    if (query.length === 0) {
      return [];
    }

    return this.repository.searchByQuery(query, {
      limit: params.limit,
      excludeIds: params.excludeIds,
    });
  }

  async syncFromAuthUser(payload: AuthUserRegisteredPayload): Promise<User> {
    const user = await this.repository.upsertFromAuthEvent(payload);

    void publishUserCreatedEvent({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    });
    logger.info({ userId: user.id }, 'User synced from auth.registered event');
    return user;
  }
}

export const userService = new UserService(userRepository);

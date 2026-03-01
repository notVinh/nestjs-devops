import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptions } from 'src/utils/types/find-options.type';
import { DeepPartial, Not, Repository } from 'typeorm';
import { Session } from './entities/session.entity';
import { NullableType } from '../utils/types/nullable.type';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  async findOne(options: FindOptions<Session>): Promise<NullableType<Session>> {
    return this.sessionRepository.findOne({
      where: options.where,
    });
  }

  async findMany(options: FindOptions<Session>): Promise<Session[]> {
    return this.sessionRepository.find({
      where: options.where,
    });
  }

  async create(data: DeepPartial<Session>): Promise<Session> {
    return this.sessionRepository.save(this.sessionRepository.create(data));
  }

  async softDelete({
    excludeId,
    ...criteria
  }: {
    id?: Session['id'];
    user?: Pick<User, 'id'>;
    excludeId?: Session['id'];
  }): Promise<void> {
    // Build where condition using QueryBuilder for better performance
    const queryBuilder = this.sessionRepository.createQueryBuilder('session');

    // Handle user condition (quote column name for PostgreSQL case sensitivity)
    if (criteria.user?.id) {
      queryBuilder.andWhere('"session"."userId" = :userId', {
        userId: criteria.user.id,
      });
    }

    // Handle id or excludeId condition
    if (criteria.id) {
      queryBuilder.andWhere('"session"."id" = :id', { id: criteria.id });
    } else if (excludeId) {
      queryBuilder.andWhere('"session"."id" != :excludeId', { excludeId });
    }

    // Soft delete matching sessions
    await queryBuilder.softDelete().execute();
  }
}

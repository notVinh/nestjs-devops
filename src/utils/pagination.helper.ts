import { Repository, FindManyOptions, ObjectLiteral } from 'typeorm';
import { IPaginationOptions, IPaginationMeta, IPaginationResult } from './types/pagination-options.type';

export class PaginationHelper {
  /**
   * Tạo pagination metadata
   */
  static createMeta(
    page: number,
    limit: number,
    total: number,
  ): IPaginationMeta {
    const totalPages = Math.ceil(total / limit);
    
    return {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  /**
   * Tạo pagination result với data và metadata
   */
  static createResult<T>(
    data: T[],
    meta: IPaginationMeta,
  ): IPaginationResult<T> {
    return {
      data,
      meta,
    };
  }

  /**
   * Tạo FindManyOptions cho TypeORM với pagination
   */
  static createFindOptions<T>(
    options: IPaginationOptions,
  ): FindManyOptions<T> {
    const findOptions: FindManyOptions<T> = {
      skip: (options.page - 1) * options.limit,
      take: options.limit,
    };

    if (options.sortBy) {
      findOptions.order = {
        [options.sortBy]: options.sortOrder || 'ASC',
      } as any;
    }

    return findOptions;
  }

  /**
   * Thực hiện pagination với repository
   */
  static async paginate<T extends ObjectLiteral>(
    repository: Repository<T>,
    options: IPaginationOptions,
    where?: any,
    relations?: string[],
  ): Promise<IPaginationResult<T>> {
    // Đếm tổng số records
    const total = await repository.count({ where });

    // Tạo find options
    const findOptions = this.createFindOptions(options);
    if (where) {
      findOptions.where = where;
    }
    if (relations) {
      findOptions.relations = relations;
    }

    // Lấy data
    const data = await repository.find(findOptions);

    // Tạo metadata
    const meta = this.createMeta(options.page, options.limit, total);

    // Trả về result
    return this.createResult(data, meta);
  }
}

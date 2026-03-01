import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityCondition } from 'src/utils/types/entity-condition.type';
import { IPaginationOptions } from 'src/utils/types/pagination-options';
import { DeepPartial, Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { NullableType } from '../utils/types/nullable.type';
import { Employee } from '../employee/entities/employee.entity';
import { Factory } from '../factory/entities/factory.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(Factory)
    private factoryRepository: Repository<Factory>,
  ) {}

  // Hàm tạo user mới
  create(createProfileDto: CreateUserDto): Promise<User> {
    return this.usersRepository.save(
      this.usersRepository.create(createProfileDto),
    );
  }

  // Hàm lấy nhiều user với phân trang
  findManyWithPagination(
    paginationOptions: IPaginationOptions,
  ): Promise<User[]> {
    return this.usersRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });
  }

  // Hàm lấy user theo điều kiện
  findOne(fields: EntityCondition<User>): Promise<NullableType<User>> {
    return this.usersRepository.findOne({
      where: fields,
    });
  }

  // Hàm cập nhật user
  update(id: User['id'], payload: DeepPartial<User>): Promise<User> {
    // KHÔNG tự động set passwordChangedAt ở đây
    // Để service gọi update() quyết định có set passwordChangedAt hay không
    return this.usersRepository.save(
      this.usersRepository.create({
        id,
        ...payload,
      }),
    );
  }

  // Hàm xóa user
  async softDelete(id: User['id']): Promise<void> {
    await this.usersRepository.softDelete(id);
  }

  // Hàm lấy nhà máy của user
  // Optimized: Single query với JOIN sử dụng raw SQL join
  async getUserFactory(userId: number): Promise<any> {
    // Vì Employee entity không có relation factory, dùng raw join với factory table
    const result = await this.employeeRepository
      .createQueryBuilder('employee')
      .innerJoin('factory', 'factory', 'factory.id = employee.factoryId')
      .select([
        'factory.id as id',
        'factory.name as name',
        'factory.address as address',
        // Giữ nguyên camelCase cho dữ liệu trả về
        'factory."branchLocations" as "branchLocations"',
        'factory.phone as phone',
        'factory.location as location',
        'factory.hourStartWork as "hourStartWork"',
        'factory.hourEndWork as "hourEndWork"',
        'factory.maxEmployees as "maxEmployees"',
        'factory.radiusMeters as "radiusMeters"',
        'factory.workDays as "workDays"',
        'factory.isGTG as "isGTG"',
      ])
      .where('employee.userId = :userId', { userId })
      .getRawOne();

    return result || null;
  }
}

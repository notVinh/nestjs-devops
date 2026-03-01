import { Injectable, NotFoundException } from '@nestjs/common';
import {
  throwBadRequestError,
  throwNotFoundError,
} from '../utils/error.helper';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Factory } from './entities/factory.entity';
import { CreateFactoryDto } from './dto/create-factory.dto';
import { UpdateFactoryDto } from './dto/update-factory.dto';
import { PaginationHelper } from 'src/utils/pagination.helper';
import {
  IPaginationOptions,
  IPaginationResult,
} from 'src/utils/types/pagination-options.type';
import { Employee } from '../employee/entities/employee.entity';
import { User } from '../users/entities/user.entity';
import { RoleEnum } from '../roles/roles.enum';
import { StatusEnum } from '../statuses/statuses.enum';
import {
  DEPARTMENT_DEFAULT,
  PASSWORD_FACTORY_ADMIN_DEFAULT,
  POSITION_DEFAULT,
} from 'src/utils/constant';
import { PositionEmployee } from 'src/position-employee/entities/position-employee.entity';
import { Department } from 'src/deparments/entities/deparment.entity';

@Injectable()
export class FactoryService {
  constructor(
    @InjectRepository(Factory)
    private factoryRepository: Repository<Factory>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(PositionEmployee)
    private positionRepository: Repository<PositionEmployee>,
    @InjectRepository(Department)
    private departmentRepository: Repository<Department>
  ) {}

  // Hàm tạo nhà máy
  async create(createFactoryDto: CreateFactoryDto): Promise<Factory> {
    // Tạo dữ liệu nhà máy
    const factoryData: any = {
      ...createFactoryDto,
      location: `(
        ${createFactoryDto.location.longitude},
        ${createFactoryDto.location.latitude}
      )`,
      workDays: createFactoryDto.workDays || [1, 2, 3, 4, 5], // Default to Mon-Fri
    };

    // Chỉ thêm branchLocations nếu có giá trị
    if (createFactoryDto.branchLocations) {
      factoryData.branchLocations = createFactoryDto.branchLocations;
    }

    // Kiểm tra số điện thoại nhà máy đã tồn tại chưa
    const userExists = await this.userRepository.findOne({
      where: { phone: factoryData.phone },
    });

    // Nếu số điện thoại nhà máy đã tồn tại, trả về lỗi
    if (userExists) {
      throwBadRequestError('Số điện thoại nhà máy đã tồn tại');
    }

    // Tạo nhà máy
    const factory = (await this.factoryRepository.save(
      this.factoryRepository.create(factoryData)
    )) as unknown as Factory;

    // Tạo user record để liên kết factory admin với nhà máy
    const factoryAdmin = await this.userRepository.save(
      this.userRepository.create({
        fullName: `Admin ${factory.name}`, // Tên admin nhà máy
        phone: factory.phone, // Số điện thoại admin nhà máy
        password: PASSWORD_FACTORY_ADMIN_DEFAULT, // Mật khẩu admin nhà máy
        email: factoryData.email,
        role: {
          id: RoleEnum.factoryAdmin,
          name: 'Factory Admin',
        },
        status: {
          id: StatusEnum.active,
          name: 'Active',
        },
      })
    );

    // Tạo phòng ban mặc định nhà máy
    const department = await this.departmentRepository.save(
      this.departmentRepository.create({
        name: DEPARTMENT_DEFAULT.name, // Tên phòng ban nhà máy
        description: '', // Mô tả phòng ban nhà máy
        factoryId: factory.id, // ID nhà máy
      })
    );

    // Tạo vị trí nhân sự mặc định nhà máy
    const position = await this.positionRepository.save(
      this.positionRepository.create({
        name: POSITION_DEFAULT.name, // Tên vị trí nhân sự nhà máy
        description: '', // Mô tả vị trí nhân sự nhà máy
        departmentId: department.id, // ID phòng ban nhà máy
        factoryId: factory.id, // ID nhà máy
      })
    );

    // Tạo nhân viên mặc định nhà máy
    await this.employeeRepository.save(
      this.employeeRepository.create({
        factoryId: factory.id, // ID nhà máy
        userId: factoryAdmin.id, // ID admin nhà máy
        positionId: position.id,
        salary: 0,
        status: 'Chính thức',
        startDateJob: new Date(),
        isManager: true,
        departmentId: department.id,
      })
    );

    // Trả về nhà máy
    return factory;
  }

  // Hàm lấy danh sách nhà máy
  async findAllWithPagination(
    options: IPaginationOptions, // Thông tin phân trang
    searchTerm?: string // Từ khóa tìm kiếm
  ): Promise<IPaginationResult<any>> {
    // Tạo query builder với JOIN để lấy email của user admin
    const queryBuilder = this.factoryRepository
      .createQueryBuilder('factory')
      .leftJoin('user', 'user', 'user.phone = factory.phone')
      .addSelect('user.email', 'adminEmail')
      .addSelect('user.id', 'adminId')
      .addSelect('factory.branchLocations', 'factory_branchLocations');

    // Thêm bộ lọc tìm kiếm
    if (searchTerm) {
      queryBuilder.where(
        'factory.name ILIKE :searchTerm OR factory.address ILIKE :searchTerm OR factory.phone ILIKE :searchTerm',
        { searchTerm: `%${searchTerm}%` }
      );
    }

    // Thêm bộ lọc sắp xếp
    queryBuilder.orderBy('factory.createdAt', 'DESC');

    // Đếm tổng số records (không JOIN để tránh duplicate count)
    const countQuery = this.factoryRepository.createQueryBuilder('factory');
    if (searchTerm) {
      countQuery.where(
        'factory.name ILIKE :searchTerm OR factory.address ILIKE :searchTerm OR factory.phone ILIKE :searchTerm',
        { searchTerm: `%${searchTerm}%` }
      );
    }
    const total = await countQuery.getCount();

    // Áp dụng phân trang
    queryBuilder.skip((options.page - 1) * options.limit);
    queryBuilder.take(options.limit);

    // Lấy data với email đã được JOIN
    const rawResults = await queryBuilder.getRawMany();

    // Transform raw results to proper format
    const data = rawResults.map(row => ({
      id: row.factory_id,
      name: row.factory_name,
      phone: row.factory_phone,
      address: row.factory_address,
      location: row.factory_location,
      hourStartWork: row.factory_hourStartWork,
      hourEndWork: row.factory_hourEndWork,
      maxEmployees: row.factory_maxEmployees,
      workDays: row.factory_workDays,
      radiusMeters: row.factory_radiusMeters,
      createdAt: row.factory_createdAt,
      updatedAt: row.factory_updatedAt,
      email: row.adminEmail || null,
      branchLocations: row.factory_branchLocations || [],
    }));

    // Tạo metadata
    const meta = {
      page: options.page,
      limit: options.limit,
      total,
      totalPages: Math.ceil(total / options.limit),
      hasNextPage: options.page < Math.ceil(total / options.limit),
      hasPreviousPage: options.page > 1,
    };

    return { data, meta };
  }

  // Hàm lấy nhà máy theo id
  async findOne(id: number): Promise<any> {
    // Lấy nhà máy theo id
    const factory = await this.factoryRepository.findOne({ where: { id } });
    console.log('qunakm', factory);
    // Nếu nhà máy không tồn tại, trả về lỗi
    if (!factory) {
      throwNotFoundError('Nhà máy không tồn tại');
    }

    // Lấy email của user admin
    const factoryAdmin = await this.userRepository
      .createQueryBuilder('user')
      .select('user.email')
      .where('user.phone = :phone', { phone: factory.phone })
      .getOne();

    return {
      ...factory,
      email: factoryAdmin?.email || null,
    };
  }

  async update(id: number, updateFactoryDto: UpdateFactoryDto): Promise<any> {
    const factory = await this.factoryRepository.findOne({ where: { id } });

    if (!factory) {
      throwNotFoundError('Nhà máy không tồn tại');
    }

    // Tìm user admin của factory này
    const factoryAdmin = await this.userRepository.findOne({
      where: { phone: factory.phone },
    });

    // Nếu có email trong updateFactoryDto, cập nhật email của user admin
    if (updateFactoryDto.email !== undefined && factoryAdmin) {
      await this.userRepository.update(factoryAdmin.id, {
        email: updateFactoryDto.email,
      });
    }

    // Cập nhật thông tin factory (không bao gồm email)
    const { email, location, branchLocations, ...factoryUpdateData } =
      updateFactoryDto;
    const factoryData: any = {
      ...factory,
      ...factoryUpdateData,
    };

    // Cập nhật location nếu có
    if (location) {
      factoryData.location = `(
        ${location.longitude},
        ${location.latitude}
      )`;
    }

    // Cập nhật branchLocations nếu có
    if (branchLocations !== undefined) {
      factoryData.branchLocations = branchLocations;
    }

    const updatedFactory = (await this.factoryRepository.save(
      this.factoryRepository.create(factoryData)
    )) as unknown as Factory;

    // Lấy email của user admin sau khi update
    const updatedFactoryAdmin = await this.userRepository
      .createQueryBuilder('user')
      .select('user.email')
      .where('user.phone = :phone', { phone: updatedFactory.phone })
      .getOne();

    return {
      ...updatedFactory,
      email: updatedFactoryAdmin?.email || null,
    };
  }

  // Hàm cập nhật ngày làm việc và giờ làm việc
  async updateWorkSchedule(
    id: number,
    workDays?: number[],
    hourStartWork?: string,
    hourEndWork?: string
  ): Promise<Factory> {
    // Kiểm tra nhà máy có tồn tại không
    const factory = await this.findOne(id);

    // Chuẩn bị object update
    const updateData: any = {};
    if (workDays !== undefined) {
      updateData.workDays = workDays;
    }
    if (hourStartWork !== undefined) {
      updateData.hourStartWork = hourStartWork;
    }
    if (hourEndWork !== undefined) {
      updateData.hourEndWork = hourEndWork;
    }

    // Cập nhật nếu có data
    if (Object.keys(updateData).length > 0) {
      await this.factoryRepository
        .createQueryBuilder()
        .update(Factory)
        .set(updateData)
        .where('id = :id', { id })
        .execute();
    }

    // Trả về factory đã cập nhật
    return this.findOne(id);
  }

  // Hàm cập nhật ngày làm việc (giữ lại để backward compatible)
  async updateWorkDays(id: number, workDays: number[]): Promise<Factory> {
    return this.updateWorkSchedule(id, workDays);
  }

  async softDelete(id: number) {
    await this.findOne(id);
    const result = await this.factoryRepository.softDelete(id);
    return result;
  }
}

import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { MisaCustomer } from 'src/misa-token/entities/misa-customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { Employee } from 'src/employee/entities/employee.entity';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(MisaCustomer)
    private readonly customerRepository: Repository<MisaCustomer>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  // ===================================================================
  // CREATE
  // ===================================================================
  async create(dto: CreateCustomerDto): Promise<MisaCustomer> {
    // Kiểm tra mã khách hàng đã tồn tại chưa
    const existing = await this.customerRepository.findOne({
      where: { accountObjectCode: dto.accountObjectCode },
    });

    if (existing) {
      throw new ConflictException(
        `Mã khách hàng "${dto.accountObjectCode}" đã tồn tại trong hệ thống`,
      );
    }

    // Tự tính nextCareAt nếu không truyền nhưng có lastCaredAt + careIntervalDays
    let nextCareAt = dto.nextCareAt ?? null;
    if (!nextCareAt && dto.lastCaredAt && dto.careIntervalDays) {
      const d = new Date(dto.lastCaredAt);
      d.setDate(d.getDate() + dto.careIntervalDays);
      nextCareAt = d;
    }

    const customer = this.customerRepository.create({
      ...dto,
      accountObjectId: uuidv4(),
      isCustomer: dto.isCustomer ?? true,
      isVendor: dto.isVendor ?? false,
      inactive: false,
      accountObjectType: dto.accountObjectType ?? 0,
      rank: dto.rank ?? 'D',
      currentMonthRevenue: 0,
      avgMonthlyRevenue: 0,
      careIntervalDays: dto.careIntervalDays ?? null,
      careById: dto.careById ?? null,
      lastCaredAt: dto.lastCaredAt ?? null,
      nextCareAt,
      careNote: dto.careNote ?? null,
    });

    return this.customerRepository.save(customer);
  }

  // ===================================================================
  // READ - Danh sách có phân trang + tìm kiếm + lọc
  // ===================================================================
  async findAll(query: QueryCustomerDto): Promise<{
    data: MisaCustomer[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 20,
      search,
      rank,
      inactive,
      accountObjectType,
      careById,
      sortBy = 'accountObjectName',
      sortOrder = 'ASC',
    } = query;

    const qb = this.customerRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.employee', 'employee')
      .leftJoinAndSelect('employee.user', 'employeeUser')
      .where('c.deletedAt IS NULL');

    // ---- Tìm kiếm full-text ----
    if (search && search.trim()) {
      const keyword = `%${search.trim()}%`;
      qb.andWhere(
        `(
          c.accountObjectName ILIKE :keyword
          OR c.accountObjectCode ILIKE :keyword
          OR c.tel ILIKE :keyword
          OR c.address ILIKE :keyword
          OR c.contactName ILIKE :keyword
          OR c.contactMobile ILIKE :keyword
          OR c.taxCode ILIKE :keyword
        )`,
        { keyword },
      );
    }

    // ---- Lọc rank ----
    if (rank) {
      qb.andWhere('c.rank = :rank', { rank });
    }

    // ---- Lọc inactive ----
    if (inactive !== undefined) {
      qb.andWhere('c.inactive = :inactive', { inactive });
    }

    // ---- Lọc loại khách hàng ----
    if (accountObjectType !== undefined) {
      qb.andWhere('c.accountObjectType = :accountObjectType', {
        accountObjectType,
      });
    }

    // ---- Lọc người chăm sóc ----
    if (careById !== undefined) {
      qb.andWhere('c.careById = :careById', { careById });
    }

    // ---- Đếm tổng ----
    const total = await qb.getCount();

    // ---- Sắp xếp ----
    const allowedSortFields = [
      'accountObjectName',
      'accountObjectCode',
      'rank',
      'currentMonthRevenue',
      'avgMonthlyRevenue',
      'createdAt',
      'updatedAt',
    ];
    const safeSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : 'accountObjectName';

    qb.orderBy(`c.${safeSortBy}`, sortOrder);

    // ---- Phân trang ----
    const offset = (page - 1) * limit;
    qb.skip(offset).take(limit);

    const data = await qb.getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ===================================================================
  // READ - Chi tiết 1 khách hàng theo ID (bigint primary key)
  // ===================================================================
  async findOne(id: number): Promise<MisaCustomer> {
    const customer = await this.customerRepository.findOne({
      where: { id } as any,
      relations: ['employee', 'employee.user'],
    });

    if (!customer) {
      throw new NotFoundException(`Không tìm thấy khách hàng có ID = ${id}`);
    }

    return customer;
  }

  // ===================================================================
  // READ - Tìm theo accountObjectId (UUID từ MISA hoặc nội bộ)
  // ===================================================================
  async findByAccountObjectId(accountObjectId: string): Promise<MisaCustomer> {
    const customer = await this.customerRepository.findOne({
      where: { accountObjectId },
      relations: ['employee', 'employee.user'],
    });

    if (!customer) {
      throw new NotFoundException(
        `Không tìm thấy khách hàng có accountObjectId = ${accountObjectId}`,
      );
    }

    return customer;
  }

  // ===================================================================
  // UPDATE
  // ===================================================================
  async update(id: number, dto: UpdateCustomerDto): Promise<MisaCustomer> {
    const customer = await this.findOne(id);

    // Nếu thay đổi mã → kiểm tra trùng
    if (dto.accountObjectCode && dto.accountObjectCode !== customer.accountObjectCode) {
      const conflict = await this.customerRepository.findOne({
        where: { accountObjectCode: dto.accountObjectCode },
      });
      if (conflict && conflict.id !== customer.id) {
        throw new ConflictException(
          `Mã khách hàng "${dto.accountObjectCode}" đã được dùng bởi khách hàng khác`,
        );
      }
    }

    // Tự tính nextCareAt khi update nếu:
    // - Không truyền nextCareAt mới
    // - Có thay đổi lastCaredAt hoặc careIntervalDays
    if (!dto.nextCareAt) {
      const newLastCaredAt = dto.lastCaredAt ?? customer.lastCaredAt;
      const newInterval = dto.careIntervalDays ?? customer.careIntervalDays;
      if (newLastCaredAt && newInterval) {
        const d = new Date(newLastCaredAt);
        d.setDate(d.getDate() + newInterval);
        dto.nextCareAt = d;
      }
    }

    Object.assign(customer, dto);
    return this.customerRepository.save(customer);
  }

  // ===================================================================
  // SOFT DELETE
  // ===================================================================
  async remove(id: number): Promise<{ message: string }> {
    const customer = await this.findOne(id);
    await this.customerRepository.softRemove(customer);
    return {
      message: `Đã xóa khách hàng "${customer.accountObjectName}" (ID: ${id})`,
    };
  }

  // ===================================================================
  // TOGGLE INACTIVE (Active / Ngừng hoạt động)
  // ===================================================================
  async toggleInactive(id: number): Promise<MisaCustomer> {
    const customer = await this.findOne(id);
    customer.inactive = !customer.inactive;
    return this.customerRepository.save(customer);
  }

  // ===================================================================
  // Tìm kiếm nhanh (autocomplete) - trả về tối đa 20 kết quả
  // ===================================================================
  async search(keyword: string): Promise<MisaCustomer[]> {
    if (!keyword || !keyword.trim()) return [];

    const kw = `%${keyword.trim()}%`;

    return this.customerRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.employee', 'employee')
      .leftJoinAndSelect('employee.user', 'employeeUser')
      .where('c.deletedAt IS NULL')
      .andWhere('c.inactive = false')
      .andWhere(
        `(
          c.accountObjectName ILIKE :kw
          OR c.accountObjectCode ILIKE :kw
          OR c.tel ILIKE :kw
        )`,
        { kw },
      )
      .orderBy('c.accountObjectName', 'ASC')
      .take(20)
      .getMany();
  }

  // ===================================================================
  // Lấy danh sách NV Kinh Doanh (positionId = 13) và số lượng khách
  // ===================================================================
  async getSalesStaffStats() {
    const qb = this.employeeRepository
      .createQueryBuilder('e')
      .leftJoin('e.user', 'u')
      .leftJoin('u.photo', 'photo')
      .leftJoin('misaCustomer', 'c', 'c.careById = e.id AND c.deletedAt IS NULL')
      .leftJoin('customerCare', 'cc', 'cc.employeeId = e.id')
      .select([
        'e.id as "employeeId"',
        'u.fullName as "fullName"',
        'photo.path as "avatarUrl"',
        'COUNT(DISTINCT c.id) as "totalCustomers"',
        'COUNT(DISTINCT cc.id) as "totalCares"',
      ])
      .where('e.positionId = :positionId', { positionId: 13 })
      .groupBy('e.id')
      .addGroupBy('u.id')
      .addGroupBy('photo.id')
      .orderBy('"totalCustomers"', 'DESC');

    const result = await qb.getRawMany();

    return result.map((row) => ({
      employeeId: parseInt(row.employeeId, 10),
      fullName: row.fullName || null,
      // avatarUrl: row.avatarUrl || null,
      totalCustomers: parseInt(row.totalCustomers || '0', 10),
      totalCares: parseInt(row.totalCares || '0', 10),
    }));
  }
}

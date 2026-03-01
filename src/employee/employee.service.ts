import { Injectable, NotFoundException } from '@nestjs/common';
import {
  throwNotFoundError,
  throwConflictError,
  throwBadRequestError,
} from '../utils/error.helper';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { PaginationHelper } from '../utils/pagination.helper';
import {
  IPaginationOptions,
  IPaginationResult,
} from '../utils/types/pagination-options.type';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { User } from '../users/entities/user.entity';
import { CreateEmployeeWithUserDto } from './dto/create-employee-with-user.dto';
import { PASSWORD_EMPLOYEE_DEFAULT } from 'src/utils/constant';
import { Factory } from 'src/factory/entities/factory.entity';
import { RoleEnum } from 'src/roles/roles.enum';
import { StatusEnum } from 'src/statuses/statuses.enum';
import { Department } from '../deparments/entities/deparment.entity';
import { PositionEmployee } from '../position-employee/entities/position-employee.entity';
import { Team } from '../team/entities/team.entity';
import { SessionService } from '../session/session.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Factory)
    private factoryRepository: Repository<Factory>,
    @InjectRepository(Department)
    private departmentRepository: Repository<Department>,
    @InjectRepository(PositionEmployee)
    private positionRepository: Repository<PositionEmployee>,
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    private sessionService: SessionService,
  ) {}

  // Hàm tạo nhân viên với user
  async createWithUser(payload: CreateEmployeeWithUserDto) {
    return await this.employeeRepository.manager.transaction(async trx => {
      const userRepo = trx.getRepository(User);
      const empRepo = trx.getRepository(Employee);
      const factoryRepo = trx.getRepository(Factory);

      // Kiểm tra số điện thoại user đã tồn tại chưa
      const userExists = await userRepo.findOne({
        where: { phone: payload.phone },
      });

      // Kiểm tra nhà máy
      const factory = await factoryRepo.findOne({
        where: { id: payload.factoryId },
      });

      if (!factory) {
        throwNotFoundError('Nhà máy không tồn tại');
      }

      // Nếu đã tồn tại, trả về lỗi
      if (userExists) {
        throwConflictError('Số điện thoại đã tồn tại');
      }

      // Kiểm tra email đã tồn tại chưa
      if (payload.email) {
        const emailExists = await userRepo.findOne({
          where: { email: payload.email },
        });

        if (emailExists) {
          throwConflictError('Email đã tồn tại trong hệ thống');
        }
      }

      // Kiểm tra mã nhân viên đã tồn tại trong nhà máy chưa
      if (payload.employeeCode) {
        const employeeCodeExists = await empRepo.findOne({
          where: {
            employeeCode: payload.employeeCode,
            factoryId: payload.factoryId,
          },
        });

        if (employeeCodeExists) {
          throwConflictError(`Mã nhân viên "${payload.employeeCode}" đã tồn tại trong nhà máy`);
        }
      }

      // Tạo user với mật khẩu mặc định
      const user = await userRepo.save(
        userRepo.create({
          fullName: payload.fullName,
          phone: payload.phone,
          email: payload.email,
          password: PASSWORD_EMPLOYEE_DEFAULT,
          provider: 'email',
          role: {
            id: factory.isGTG ? RoleEnum.employee_gtg : RoleEnum.employee,
            name: factory.isGTG ? 'Employee GTG' : 'Employee',
          },
          status: {
            id: StatusEnum.active,
            name: 'Active',
          },
        })
      );

      // Tạo nhân viên với thông tin user vừa tạo
      const employee = await empRepo.save(
        empRepo.create({
          factoryId: payload.factoryId,
          userId: Number(user.id),
          employeeCode: payload.employeeCode ?? null,
          gender: payload.gender ?? null,
          positionId: payload.positionId,
          departmentId: payload.departmentId,
          teamId: payload.teamId ?? null,
          salary: payload.salary,
          status: payload.status ?? 'Chính thức',
          salaryType: payload.salaryType ?? 'daily',
          startDateJob: payload.startDateJob
            ? new Date(payload.startDateJob)
            : new Date(),
          endDateJob: payload.endDateJob
            ? (new Date(payload.endDateJob) as any)
            : null,
          isManager: payload.isManager ?? false,
          hourStartWork: payload.hourStartWork ?? null,
          hourEndWork: payload.hourEndWork ?? null,
          allowedAttendanceMethods: payload.allowedAttendanceMethods ?? [
            'location',
          ],
          requireLocationCheck: payload.requireLocationCheck ?? true,
          requirePhotoVerification: payload.requirePhotoVerification ?? false,
          requireFingerprintVerification:
            payload.requireFingerprintVerification ?? false,
          allowRemoteAttendance: payload.allowRemoteAttendance ?? false,
        })
      );

      // Lấy lại bản ghi đã tạo kèm quan hệ trong cùng transaction
      const createdWithRelations = await empRepo
        .createQueryBuilder('employee')
        .leftJoinAndSelect('employee.user', 'user')
        .leftJoinAndSelect('employee.position', 'position')
        .leftJoinAndSelect('employee.department', 'department')
        .leftJoinAndSelect('employee.team', 'team')
        .leftJoinAndSelect('employee.roleGroups', 'roleGroups')
        .where('employee.id = :id', { id: employee.id })
        .getOne();

      return createdWithRelations as any;
    });
  }

  // Hàm lấy tất cả nhân viên theo factory với chi tiết
  async findAllByFactoryWithDetails(
    options: IPaginationOptions, // Thông tin phân trang
    factoryId: number, // ID của factory
    filters?: {
      search?: string;
      positionId?: number;
      status?: string;
      departmentId?: number;
      teamId?: number;
      isManager?: boolean;
    } // Các bộ lọc
  ): Promise<IPaginationResult<any>> {
    // Tạo query builder
    const queryBuilder = this.employeeRepository
      .createQueryBuilder('employee')
      .leftJoinAndSelect('employee.user', 'user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('user.photo', 'photo')
      .leftJoinAndSelect('employee.position', 'position')
      .leftJoinAndSelect('employee.department', 'department')
      .leftJoinAndSelect('employee.team', 'team')
      .leftJoinAndSelect('employee.roleGroups', 'roleGroups')
      .where('employee.factoryId = :factoryId', { factoryId })
      .orderBy('employee.createdAt', 'DESC');

    // Thêm bộ lọc tìm kiếm
    if (filters?.search) {
      const search = `%${filters.search.toLowerCase()}%`;
      queryBuilder.andWhere('(LOWER(user.fullName) LIKE :search)', { search });
    }

    // Thêm bộ lọc theo positionId
    if (filters?.positionId) {
      queryBuilder.andWhere('employee.positionId = :positionId', {
        positionId: filters.positionId,
      });
    }

    // Thêm bộ lọc theo status
    if (filters?.status) {
      queryBuilder.andWhere('employee.status = :status', {
        status: filters.status,
      });
    }

    // Thêm bộ lọc theo departmentId
    if (filters?.departmentId) {
      queryBuilder.andWhere('employee.departmentId = :departmentId', {
        departmentId: filters.departmentId,
      });
    }

    // Thêm bộ lọc theo teamId
    if (filters?.teamId) {
      queryBuilder.andWhere('employee.teamId = :teamId', {
        teamId: filters.teamId,
      });
    }

    // Thêm bộ lọc theo isManager
    if (filters?.isManager !== undefined) {
      queryBuilder.andWhere('employee.isManager = :isManager', {
        isManager: filters.isManager,
      });
    }

    // Lấy dữ liệu và tổng số lượng
    const [data, total] = await queryBuilder
      .skip((options.page - 1) * options.limit)
      .take(options.limit)
      .getManyAndCount();

    // Get status counts for filtered results
    const statusCountsQuery = this.employeeRepository
      .createQueryBuilder('employee')
      .select('employee.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('employee.factoryId = :factoryId', { factoryId })
      .groupBy('employee.status');

    // Apply same filters for status counts
    if (filters?.search) {
      const search = `%${filters.search.toLowerCase()}%`;
      statusCountsQuery
        .leftJoin('employee.user', 'user')
        .andWhere('(LOWER(user.fullName) LIKE :search)', { search });
    }
    if (filters?.positionId) {
      statusCountsQuery.andWhere('employee.positionId = :positionId', {
        positionId: filters.positionId,
      });
    }
    // Don't apply status filter to counts - we want to show breakdown by status
    if (filters?.departmentId) {
      statusCountsQuery.andWhere('employee.departmentId = :departmentId', {
        departmentId: filters.departmentId,
      });
    }
    if (filters?.teamId) {
      statusCountsQuery.andWhere('employee.teamId = :teamId', {
        teamId: filters.teamId,
      });
    }
    if (filters?.isManager !== undefined) {
      statusCountsQuery.andWhere('employee.isManager = :isManager', {
        isManager: filters.isManager,
      });
    }

    const statusCounts = await statusCountsQuery.getRawMany();

    // Calculate working and other counts
    let workingCount = 0;
    let otherCount = 0;
    statusCounts.forEach((item: any) => {
      const count = Number(item.count) || 0;
      if (item.status === 'Chính thức') {
        workingCount = count;
      } else {
        otherCount += count;
      }
    });
    
    // Trả về dữ liệu và thông tin phân trang
    return {
      data,
      meta: {
        page: options.page,
        limit: options.limit,
        total,
        totalPages: Math.ceil(total / options.limit),
        hasNextPage: options.page < Math.ceil(total / options.limit),
        hasPreviousPage: options.page > 1,
        workingCount,
        otherCount,
      },
    };
  }

  // Hàm lấy nhân viên theo id
  async findOne(id: number) {
    const employee = await this.employeeRepository.findOne({ where: { id } });
    if (!employee) {
      throwNotFoundError('Nhân viên không tồn tại');
    }
    return employee;
  }

  // Hàm lấy nhân viên theo id với các bảng liên quan
  async findOneWithRelations(id: number) {
    const employee = await this.employeeRepository
      .createQueryBuilder('employee')
      .leftJoinAndSelect('employee.user', 'user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('user.photo', 'photo')
      .leftJoinAndSelect('employee.position', 'position')
      .leftJoinAndSelect('employee.department', 'department')
      .leftJoinAndSelect('employee.team', 'team')
      .leftJoinAndSelect('employee.roleGroups', 'roleGroups')
      .where('employee.id = :id', { id })
      .getOne();

    if (!employee) {
      throwNotFoundError('Nhân viên không tồn tại');
    }
    return employee;
  }

  async findEmployeeByFactorySalaryType(
    factoryId: number,
    salaryType: 'daily' | 'production'
  ) {
    const employee = await this.employeeRepository.find({
      where: { factoryId, salaryType },
      relations: ['user', 'position', 'department', 'team', 'roleGroups'],
    });

    if (!employee) {
      throwNotFoundError('Nhân viên không tồn tại');
    }
    return employee;
  }

  // Hàm cập nhật nhân viên
  async update(id: number, updateEmployeeDto: UpdateEmployeeDto) {
    // Lấy nhân viên theo id
    const employee = await this.findOne(id);

    // Nếu nhân viên không tồn tại, trả về lỗi
    if (!employee) {
      throwNotFoundError('Nhân viên không tồn tại');
    }

    // Kiểm tra mã nhân viên đã tồn tại trong nhà máy chưa (trừ nhân viên hiện tại)
    if (updateEmployeeDto.employeeCode !== undefined && updateEmployeeDto.employeeCode) {
      const employeeCodeExists = await this.employeeRepository.findOne({
        where: {
          employeeCode: updateEmployeeDto.employeeCode,
          factoryId: employee.factoryId,
        },
      });

      if (employeeCodeExists && employeeCodeExists.id !== id) {
        throwConflictError(`Mã nhân viên "${updateEmployeeDto.employeeCode}" đã tồn tại trong nhà máy`);
      }
    }

    // Cập nhật thông tin user (phone, email, fullName)
    const userUpdateData: { phone?: string; email?: string; fullName?: string } = {};

    // Debug log
    console.log('🔄 Update employee - DTO received:', JSON.stringify(updateEmployeeDto, null, 2));
    console.log('🔄 Employee userId:', employee.userId);

    // Nếu có phone trong updateEmployeeDto, cập nhật phone của user
    if (updateEmployeeDto.phone !== undefined) {
      // Kiểm tra phone có bị trùng không (trừ user hiện tại)
      const existingUser = await this.userRepository.findOne({
        where: { phone: updateEmployeeDto.phone },
      });

      if (existingUser && existingUser.id !== employee.userId) {
        throwConflictError('Số điện thoại đã tồn tại');
      }

      userUpdateData.phone = updateEmployeeDto.phone;
    }

    // Nếu có email trong updateEmployeeDto, cập nhật email của user
    if (updateEmployeeDto.email !== undefined) {
      // Kiểm tra email có bị trùng không (trừ user hiện tại)
      if (updateEmployeeDto.email) {
        const existingUserWithEmail = await this.userRepository.findOne({
          where: { email: updateEmployeeDto.email },
        });

        if (existingUserWithEmail && existingUserWithEmail.id !== employee.userId) {
          throwConflictError('Email đã tồn tại trong hệ thống');
        }
      }

      userUpdateData.email = updateEmployeeDto.email;
    }

    // Nếu có fullName trong updateEmployeeDto, cập nhật fullName của user
    if (updateEmployeeDto.fullName !== undefined) {
      userUpdateData.fullName = updateEmployeeDto.fullName;
    }

    // Cập nhật user nếu có dữ liệu
    console.log('🔄 User update data:', JSON.stringify(userUpdateData, null, 2));
    if (Object.keys(userUpdateData).length > 0) {
      console.log('🔄 Updating user with ID:', employee.userId);
      await this.userRepository.update(employee.userId, userUpdateData);
      console.log('✅ User updated successfully');
    }

    // Tạo dữ liệu nhân viên (loại bỏ các trường đã xử lý riêng cho user)
    const { phone, email, fullName, ...employeeUpdateData } = updateEmployeeDto as any;

    // Cập nhật nhân viên trực tiếp
    await this.employeeRepository.update(id, employeeUpdateData as any);

    // Trả về nhân viên đã cập nhật với các bảng liên quan
    return this.findOneWithRelations(id);
  }

  // Hàm lấy factoryId theo userId
  async getEmployeeByUserId(userId: number): Promise<Employee> {
    // Lấy nhân viên theo userId
    const employee = await this.employeeRepository.findOne({
      where: { userId },
    });
    // Nếu nhân viên không tồn tại, trả về lỗi
    if (!employee) {
      throwNotFoundError('Không tìm thấy nhân viên của user hiện tại');
    }
    return employee;
  }

  // Hàm reset mật khẩu cho nhân viên
  async resetPassword(id: number, newPassword: string) {
    // Lấy nhân viên với user relation
    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    // Nếu nhân viên không tồn tại, trả về lỗi
    if (!employee) {
      throwNotFoundError('Nhân viên không tồn tại');
    }

    // Nếu user không tồn tại, trả về lỗi
    if (!employee.user) {
      throwNotFoundError('Không tìm thấy tài khoản người dùng');
    }

    // Cập nhật mật khẩu và passwordChangedAt (sẽ tự động hash bởi User entity hooks)
    employee.user.password = newPassword;
    employee.user.passwordChangedAt = new Date();
    await this.userRepository.save(employee.user);

    // Xóa TẤT CẢ sessions của user này để logout khỏi tất cả thiết bị
    await this.sessionService.softDelete({
      user: {
        id: employee.user.id,
      },
    });

    return { message: 'Đã cập nhật mật khẩu thành công' };
  }

  // Hàm xóa nhân viên
  async softDelete(id: number) {
    // Lấy nhân viên theo id
    const employee = await this.employeeRepository.findOne({ where: { id } });

    // Nếu nhân viên không tồn tại, trả về lỗi
    if (!employee) {
      throwNotFoundError('Nhân viên không tồn tại');
    }

    // Xóa nhân viên
    return this.employeeRepository.softDelete(id);
  }

  // Hàm import nhân viên từ file Excel
  async importFromExcel(buffer: Buffer, factoryId: number) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets[0]; // Lấy sheet đầu tiên

    if (!worksheet) {
      throwBadRequestError('File Excel không hợp lệ hoặc không có dữ liệu');
    }

    // Kiểm tra factory tồn tại
    const factory = await this.factoryRepository.findOne({
      where: { id: factoryId },
    });
    if (!factory) {
      throwNotFoundError('Nhà máy không tồn tại');
    }

    const results = {
      total: 0,
      success: 0,
      failed: 0,
      errors: [] as Array<{
        row: number;
        fullName: string;
        phone: string;
        error: string;
      }>,
      created: [] as Array<{ fullName: string; phone: string }>,
    };

    // Đọc header (hàng thứ 2, vì hàng 1 là ghi chú)
    const headerRow = worksheet.getRow(2);
    const headers = headerRow.values as any[];

    // Map header indices
    const getColIndex = (name: string) => {
      const idx = headers.findIndex(h => h && String(h).trim() === name);
      return idx; // headers trong ExcelJS là 1-indexed array, findIndex trả về index thực
    };

    const colIndices = {
      employeeCode: getColIndex('Mã nhân viên'),
      fullName: getColIndex('Họ Tên'),
      gender: getColIndex('Giới tính'),
      phone: getColIndex('Số điện thoại'),
      email: getColIndex('Email'),
      department: getColIndex('Phòng ban'),
      team: getColIndex('Tổ/Nhóm'),
      position: getColIndex('Chức vụ'),
      salary: getColIndex('Lương cơ bản'),
      salaryType: getColIndex('Loại lương'),
      status: getColIndex('Trạng thái'),
      startDateJob: getColIndex('Ngày bắt đầu làm việc'),
      isManager: getColIndex('Là quản lý'),
      hourStartWork: getColIndex('Giờ vào riêng'),
      hourEndWork: getColIndex('Giờ ra riêng'),
      allowRemoteAttendance: getColIndex('Cho phép chấm công từ xa'),
    };

    // Validate required columns
    if (
      colIndices.fullName === -1 ||
      colIndices.phone === -1 ||
      colIndices.department === -1 ||
      colIndices.position === -1
    ) {
      throwBadRequestError(
        `File Excel thiếu các cột bắt buộc. Headers tìm thấy: ${headers.filter(h => h).join(', ')}`
      );
    }

    // Cache để tránh query nhiều lần
    const departmentCache = new Map<string, Department>();
    const positionCache = new Map<string, PositionEmployee>();
    const teamCache = new Map<string, Team>();

    // Đọc từng dòng (bỏ qua hàng 1 ghi chú và hàng 2 header)
    for (let rowNumber = 3; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);

      // Skip empty rows
      if (!row.getCell(colIndices.fullName).value) {
        continue;
      }

      results.total++;

      try {
        // Đọc dữ liệu từ row
        const employeeCode =
          colIndices.employeeCode !== -1
            ? String(row.getCell(colIndices.employeeCode).value || '').trim()
            : '';
        const fullName = String(
          row.getCell(colIndices.fullName).value || ''
        ).trim();
        const gender =
          colIndices.gender !== -1
            ? String(row.getCell(colIndices.gender).value || '').trim()
            : '';
        const phone = String(row.getCell(colIndices.phone).value || '').trim();
        const email =
          colIndices.email !== -1
            ? String(row.getCell(colIndices.email).value || '').trim()
            : '';
        const departmentName = String(
          row.getCell(colIndices.department).value || ''
        ).trim();
        const positionName = String(
          row.getCell(colIndices.position).value || ''
        ).trim();
        const teamName =
          colIndices.team !== -1
            ? String(row.getCell(colIndices.team).value || '').trim()
            : '';
        const salary =
          colIndices.salary !== -1
            ? Number(row.getCell(colIndices.salary).value || 0)
            : 0;
        const salaryType =
          colIndices.salaryType !== -1
            ? String(row.getCell(colIndices.salaryType).value || 'daily').trim()
            : 'daily';
        const status =
          colIndices.status !== -1
            ? String(
                row.getCell(colIndices.status).value || 'Chính thức'
              ).trim()
            : 'Chính thức';
        const startDateJobValue =
          colIndices.startDateJob !== -1
            ? row.getCell(colIndices.startDateJob).value
            : null;
        const isManagerValue =
          colIndices.isManager !== -1
            ? String(row.getCell(colIndices.isManager).value || 'Không').trim()
            : 'Không';
        const hourStartWork =
          colIndices.hourStartWork !== -1
            ? String(row.getCell(colIndices.hourStartWork).value || '').trim()
            : '';
        const hourEndWork =
          colIndices.hourEndWork !== -1
            ? String(row.getCell(colIndices.hourEndWork).value || '').trim()
            : '';
        const allowRemoteValue =
          colIndices.allowRemoteAttendance !== -1
            ? String(
                row.getCell(colIndices.allowRemoteAttendance).value || 'Không'
              ).trim()
            : 'Không';

        // Validate required fields
        if (!fullName || !phone || !departmentName || !positionName) {
          throw new Error('Thiếu thông tin bắt buộc');
        }

        // Kiểm tra phone đã tồn tại chưa
        const existingUser = await this.userRepository.findOne({
          where: { phone },
        });
        if (existingUser) {
          throw new Error(`Số điện thoại ${phone} đã tồn tại`);
        }

        // Tìm hoặc tạo Department
        let department = departmentCache.get(departmentName);
        if (!department) {
          department =
            (await this.departmentRepository.findOne({
              where: { name: departmentName, factoryId },
            })) ?? undefined;

          if (!department) {
            // Tự động tạo department mới
            department = await this.departmentRepository.save(
              this.departmentRepository.create({
                name: departmentName,
                factoryId,
                description: `Tự động tạo từ import`,
                status: 'active',
              })
            );
          }
          departmentCache.set(departmentName, department);
        }
        // Tìm hoặc tạo Position
        const positionCacheKey = `${departmentName}::${positionName}`;
        let position = positionCache.get(positionCacheKey);
        if (!position) {
          position =
            (await this.positionRepository.findOne({
              where: {
                name: positionName,
                departmentId: department.id,
                factoryId,
              },
            })) ?? undefined;

          if (!position) {
            // Tự động tạo position mới
            position = await this.positionRepository.save(
              this.positionRepository.create({
                name: positionName,
                factoryId,
                departmentId: department.id,
                description: `Tự động tạo từ import`,
                status: 'active',
              })
            );
          }
          positionCache.set(positionCacheKey, position);
        }

        // Tìm hoặc tạo Team (nếu có)
        let teamId: number | null = null;
        if (teamName) {
          const teamCacheKey = `${department.id}::${teamName}`;
          let team = teamCache.get(teamCacheKey);
          if (!team) {
            team =
              (await this.teamRepository.findOne({
                where: {
                  name: teamName,
                  departmentId: department.id,
                  factoryId,
                },
              })) ?? undefined;

            if (!team) {
              // Tự động tạo team mới
              team = await this.teamRepository.save(
                this.teamRepository.create({
                  name: teamName,
                  factoryId,
                  departmentId: department.id,
                  description: `Tự động tạo từ import`,
                  status: 'active',
                })
              );
            }
            teamCache.set(teamCacheKey, team);
          }
          teamId = team.id;
        }

        // Parse dates
        let startDateJob: Date | undefined;
        if (startDateJobValue) {
          if (startDateJobValue instanceof Date) {
            startDateJob = startDateJobValue;
          } else if (typeof startDateJobValue === 'string') {
            startDateJob = new Date(startDateJobValue);
          }
        }

        // Parse boolean values
        const isManager =
          isManagerValue.toLowerCase() === 'có' ||
          isManagerValue.toLowerCase() === 'yes';
        const allowRemoteAttendance =
          allowRemoteValue.toLowerCase() === 'có' ||
          allowRemoteValue.toLowerCase() === 'yes';

        // Format time fields (if provided)
        const formatTimeForDB = (time: string): string | null => {
          if (!time) return null;
          // Nếu có format H:mm:ss hoặc HH:mm:ss thì chuẩn hóa
          if (/^\d{1,2}:\d{2}:\d{2}$/.test(time)) {
            const [h, m, s] = time.split(':');
            return `${h.padStart(2, '0')}:${m.padStart(2, '0')}:${s.padStart(2, '0')}`;
          }
          // Nếu là H:mm hoặc HH:mm thì thêm :00
          if (/^\d{1,2}:\d{2}$/.test(time)) {
            const [h, m] = time.split(':');
            return `${h.padStart(2, '0')}:${m.padStart(2, '0')}:00`;
          }
          return null;
        };

        const hourStartWorkFormatted = formatTimeForDB(hourStartWork);
        const hourEndWorkFormatted = formatTimeForDB(hourEndWork);

        // Tạo nhân viên
        await this.createWithUser({
          factoryId,
          employeeCode: employeeCode || undefined,
          fullName,
          gender: gender || undefined,
          phone,
          email: email || undefined,
          positionId: position.id,
          departmentId: department.id,
          teamId: teamId || undefined,
          salary: salary || undefined,
          salaryType: (salaryType === 'production'
            ? 'production'
            : 'daily') as any,
          status,
          startDateJob: startDateJob
            ? startDateJob.toISOString().split('T')[0]
            : undefined,
          isManager,
          hourStartWork: hourStartWorkFormatted,
          hourEndWork: hourEndWorkFormatted,
          allowRemoteAttendance,
          requireLocationCheck: !allowRemoteAttendance, // Nếu cho phép remote thì không cần check location
        } as any);

        results.success++;
        results.created.push({ fullName, phone });
      } catch (error: any) {
        results.failed++;

        // Extract error message from HttpException or regular Error
        let errorMessage = 'Lỗi không xác định';
        if (error.response) {
          // HttpException from NestJS
          const response = error.response;
          if (typeof response === 'string') {
            errorMessage = response;
          } else if (response.message) {
            errorMessage = response.message;
          } else if (response.errors?.message) {
            errorMessage = response.errors.message;
          }
        } else if (error.message && error.message !== 'Http Exception') {
          errorMessage = error.message;
        }

        results.errors.push({
          row: rowNumber,
          fullName: String(row.getCell(colIndices.fullName).value || ''),
          phone: String(row.getCell(colIndices.phone).value || ''),
          error: errorMessage,
        });
      }
    }

    return results;
  }

  /**
   * Lấy thống kê số lượng nhân viên theo từng factory (cho Super Admin Dashboard)
   * Trả về 1 query duy nhất thay vì gọi nhiều lần
   */
  async getDashboardStats(): Promise<{
    totalEmployees: number;
    totalFactories: number;
    employeesByFactory: { factoryId: number; factoryName: string; count: number }[];
  }> {
    // Count employees grouped by factory in a single query
    // Note: Employee entity doesn't have factory relation, so we join on factoryId manually
    const stats = await this.employeeRepository
      .createQueryBuilder('employee')
      .leftJoin(Factory, 'factory', 'factory.id = employee.factoryId')
      .select('employee.factoryId', 'factoryId')
      .addSelect('factory.name', 'factoryName')
      .addSelect('COUNT(employee.id)', 'count')
      .where('employee.deletedAt IS NULL')
      .groupBy('employee.factoryId')
      .addGroupBy('factory.name')
      .getRawMany();

    const employeesByFactory = stats.map(s => ({
      factoryId: Number(s.factoryId),
      factoryName: s.factoryName || '',
      count: Number(s.count) || 0,
    }));

    const totalEmployees = employeesByFactory.reduce((sum, f) => sum + f.count, 0);
    const totalFactories = employeesByFactory.length;

    return {
      totalEmployees,
      totalFactories,
      employeesByFactory,
    };
  }
}

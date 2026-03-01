import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import {
  throwNotFoundError,
  throwBadRequestError,
} from '../utils/error.helper';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Factory } from 'src/factory/entities/factory.entity';
import { Attendance } from './entities/attendance.entity';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { PaginationHelper } from 'src/utils/pagination.helper';
import {
  IPaginationOptions,
  IPaginationResult,
} from 'src/utils/types/pagination-options.type';
import {
  isLocationWithinRadius,
  isLocationWithinAnyRadius,
  calculateDistance,
  formatDistance,
} from 'src/utils/location.utils';
import { Employee } from '../employee/entities/employee.entity';
import { User } from '../users/entities/user.entity';
import { PositionEmployee } from '../position-employee/entities/position-employee.entity';
import { Department } from '../deparments/entities/deparment.entity';
import { Holiday } from '../holiday/entities/holiday.entity';
import { SupportType } from '../support-type/entities/support-type.entity';
import { SupportRequest } from '../support-request/entities/support-request.entity';
import { Overtime } from '../overtime/entities/overtime.entity';
import ExcelJS from 'exceljs';
import { OvertimeService } from '../overtime/overtime.service';

@Injectable()
export class AttendanceService {
  private readonly context = 'AttendanceService';

  constructor(
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    @InjectRepository(Factory)
    private factoryRepository: Repository<Factory>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(Holiday)
    private holidayRepository: Repository<Holiday>,
    @InjectRepository(SupportType)
    private supportTypeRepository: Repository<SupportType>,
    @InjectRepository(SupportRequest)
    private supportRequestRepository: Repository<SupportRequest>,
    @InjectRepository(Overtime)
    private overtimeRepository: Repository<Overtime>,
    private overtimeService: OvertimeService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  // Helper methods để log với context
  private log(message: string) {
    this.logger.info(message, { context: this.context });
  }

  private debug(message: string) {
    this.logger.debug(message, { context: this.context });
  }

  private warn(message: string) {
    this.logger.warn(message, { context: this.context });
  }

  private error(message: string, trace?: any) {
    if (trace) {
      this.logger.error(message, { context: this.context, trace: trace?.stack || trace });
    } else {
      this.logger.error(message, { context: this.context });
    }
  }

  async checkIn(checkInDto: CheckInDto): Promise<Attendance> {
    // Lấy thông tin nhà máy để kiểm tra vị trí
    const factory = await this.factoryRepository.findOne({
      where: { id: checkInDto.factoryId },
    });

    if (!factory) {
      throwNotFoundError('Không tìm thấy nhà máy');
    }

    // Lấy thông tin nhân viên để kiểm tra requireLocationCheck
    const employee = await this.employeeRepository.findOne({
      where: { id: checkInDto.employeeId },
    });

    if (!employee) {
      throwNotFoundError('Không tìm thấy nhân viên');
    }

    this.checkRequiredMethodsAttendance(employee, factory, checkInDto);

    // Tạo date với time 00:00:00 để so sánh với DB
    const attendanceDateStart = new Date(checkInDto.attendanceDate);
    attendanceDateStart.setHours(0, 0, 0, 0);

    const existingAttendance = await this.attendanceRepository.findOne({
      where: {
        factoryId: checkInDto.factoryId,
        employeeId: +checkInDto.employeeId,
        attendanceDate: attendanceDateStart,
      },
    });

    if (existingAttendance && existingAttendance.checkInTime) {
      throwBadRequestError('Bạn đã chấm công vào ngày này');
    }

    if (existingAttendance) {
      // Cập nhật record hiện tại (có thể là overtime_approved trước đó)
      existingAttendance.checkInTime = checkInDto.checkInTime;
      existingAttendance.checkInLocation = {
        longitude: checkInDto.checkInLocation.longitude,
        latitude: checkInDto.checkInLocation.latitude,
      };
      existingAttendance.checkInAddress = checkInDto.checkInAddress;
      existingAttendance.checkInPhotoUrl = checkInDto.checkInPhotoUrl;
      existingAttendance.checkInDeviceInfo = checkInDto.checkInDeviceInfo
        ? JSON.stringify(checkInDto.checkInDeviceInfo)
        : null;
      existingAttendance.checkInMethod = checkInDto.checkInMethod;

      // Tính đi muộn theo giờ của employee (nếu có) hoặc nhà máy
      let isLate = false;
      const effectiveStartHour = this.getEffectiveStartHour(employee, factory);
      if (effectiveStartHour) {
        isLate = this.checkIfLateByFactory(
          checkInDto.checkInTime,
          effectiveStartHour
        );
        existingAttendance.isLate = isLate;
        existingAttendance.lateMinutes = isLate
          ? this.calculateLateMinutesByFactory(
              checkInDto.checkInTime,
              effectiveStartHour
            )
          : 0;
      }

      // Nếu status đang là overtime_approved (đã duyệt OT nhưng chưa chấm công)
      // Cần update thành status thực tế dựa vào việc có đi muộn hay không
      if (existingAttendance.status === 'overtime_approved') {
        existingAttendance.status = isLate ? 'late' : 'present';
      }
      // Giữ nguyên overtimeHours nếu có (đã được set khi duyệt đơn OT)

      return this.attendanceRepository.save(existingAttendance);
    } else {
      // Tạo record mới
      const attendanceData = {
        ...checkInDto,
        attendanceDate: attendanceDateStart, // Sử dụng datetime với time 00:00:00
        checkInLocation: {
          longitude: checkInDto.checkInLocation.longitude,
          latitude: checkInDto.checkInLocation.latitude,
        },
        checkInDeviceInfo: checkInDto.checkInDeviceInfo
          ? JSON.stringify(checkInDto.checkInDeviceInfo)
          : null,
      };

      // Kiểm tra đi muộn theo giờ của employee (nếu có) hoặc nhà máy
      const effectiveStartHour = this.getEffectiveStartHour(employee, factory);
      if (effectiveStartHour) {
        const isLate = this.checkIfLateByFactory(
          checkInDto.checkInTime,
          effectiveStartHour
        );
        (attendanceData as any).isLate = isLate;
        (attendanceData as any).lateMinutes = isLate
          ? this.calculateLateMinutesByFactory(
              checkInDto.checkInTime,
              effectiveStartHour
            )
          : 0;
      }

      return this.attendanceRepository.save(
        this.attendanceRepository.create(attendanceData)
      );
    }
  }

  async checkOut(checkOutDto: CheckOutDto): Promise<Attendance> {
    const attendance = await this.attendanceRepository.findOne({
      where: { id: checkOutDto.attendanceId },
    });

    if (!attendance) {
      throwNotFoundError('Không tìm thấy bản ghi chấm công');
    }

    // Lấy thông tin nhà máy để kiểm tra vị trí
    const factory = await this.factoryRepository.findOne({
      where: { id: attendance.factoryId },
    });

    if (!factory) {
      throwNotFoundError('Không tìm thấy nhà máy');
    }

    // Lấy thông tin nhân viên để kiểm tra requireLocationCheck
    const employee = await this.employeeRepository.findOne({
      where: { id: attendance.employeeId },
    });

    if (!employee) {
      throwNotFoundError('Không tìm thấy nhân viên');
    }

    this.checkRequiredMethodsAttendance(employee, factory, checkOutDto);

    if (!attendance.checkInTime) {
      throwBadRequestError('Bạn chưa chấm công vào');
    }

    if (attendance.checkOutTime) {
      throwBadRequestError('Bạn đã chấm công ra rồi');
    }

    // Không cho phép chấm công ra sớm hơn giờ vào
    if (
      attendance.checkInTime &&
      checkOutDto.checkOutTime < attendance.checkInTime
    ) {
      throwBadRequestError('Giờ ra không thể trước giờ vào');
    }

    // Tính toán giờ làm việc
    const workHours = this.calculateWorkHours(
      attendance.checkInTime,
      checkOutDto.checkOutTime
    );

    // Tính toán về sớm theo giờ của employee (nếu có) hoặc nhà máy
    const effectiveEndHour = this.getEffectiveEndHour(employee, factory);
    if (effectiveEndHour) {
      const isEarlyLeave = this.checkIfEarlyLeaveByFactory(
        checkOutDto.checkOutTime,
        effectiveEndHour
      );
      attendance.isEarlyLeave = isEarlyLeave;
      attendance.earlyLeaveMinutes = isEarlyLeave
        ? this.calculateEarlyLeaveMinutesByFactory(
            checkOutDto.checkOutTime,
            effectiveEndHour
          )
        : 0;
    }

    // Chỉ update các field cần thiết, không động vào checkInLocation
    attendance.checkOutTime = checkOutDto.checkOutTime;
    attendance.checkOutLocation = {
      longitude: checkOutDto.checkOutLocation.longitude,
      latitude: checkOutDto.checkOutLocation.latitude,
    };
    attendance.checkOutAddress = checkOutDto.checkOutAddress;
    attendance.checkOutPhotoUrl = checkOutDto.checkOutPhotoUrl;
    attendance.checkOutDeviceInfo = checkOutDto.checkOutDeviceInfo
      ? JSON.stringify(checkOutDto.checkOutDeviceInfo)
      : null;
    attendance.checkOutMethod = checkOutDto.checkOutMethod;
    attendance.workHours = workHours;

    const savedAttendance = await this.attendanceRepository.save(attendance);

    // Tính toán và cập nhật giờ tăng ca thực tế nếu có đơn tăng ca đã duyệt
    try {
      await this.overtimeService.updateActualOvertimeHours(
        attendance.employeeId,
        attendance.factoryId,
        attendance.attendanceDate,
        checkOutDto.checkOutTime,
      );
    } catch (error) {
      // Log error nhưng không fail toàn bộ checkout process
      this.error('Error updating actual overtime hours:', error);
    }

    return savedAttendance;
  }

  async getAttendanceByEmployee(
    employeeId: number,
    options: IPaginationOptions,
    startDate?: string,
    endDate?: string
  ): Promise<IPaginationResult<Attendance>> {
    const where: any = { employeeId };

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.attendanceDate = Between(start, end);
    }

    return PaginationHelper.paginate(this.attendanceRepository, options, where);
  }

  async getAttendanceByFactory(
    factoryId: number,
    options: IPaginationOptions,
    startDate?: string,
    endDate?: string
  ): Promise<IPaginationResult<Attendance>> {
    const where: any = {
      factoryId,
      // Chỉ lấy attendance của nhân viên đang làm việc (Chính thức/Thử việc)
      employee: { status: In(['Chính thức', 'Thử việc']) },
    };

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.attendanceDate = Between(start, end);
    }

    // Load relations để lấy thông tin nhân viên
    return PaginationHelper.paginate(
      this.attendanceRepository,
      options,
      where,
      ['employee']
    );
  }

  async getTodayAttendance(
    employeeId: number,
    factoryId: number
  ): Promise<Attendance | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.attendanceRepository.findOne({
      where: {
        employeeId,
        factoryId,
        attendanceDate: today,
      },
    });
  }

  async updateAttendance(
    attendanceId: number,
    updateData: {
      checkInTime?: Date;
      checkOutTime?: Date;
      overtimeHours?: number;
    }
  ): Promise<Attendance> {
    const attendance = await this.attendanceRepository.findOne({
      where: { id: attendanceId },
    });

    if (!attendance) {
      throwNotFoundError('Không tìm thấy bản ghi chấm công');
    }

    // Lấy thông tin nhà máy để tính toán lại các chỉ số
    const factory = await this.factoryRepository.findOne({
      where: { id: attendance.factoryId },
    });

    if (!factory) {
      throwNotFoundError('Không tìm thấy nhà máy');
    }

    // Lấy thông tin nhân viên để lấy giờ làm việc riêng (nếu có)
    const employee = await this.employeeRepository.findOne({
      where: { id: attendance.employeeId },
    });

    if (!employee) {
      throwNotFoundError('Không tìm thấy nhân viên');
    }

    // Update checkInTime và tính lại lateMinutes
    if (updateData.checkInTime) {
      attendance.checkInTime = updateData.checkInTime;

      const effectiveStartHour = this.getEffectiveStartHour(employee, factory);
      if (effectiveStartHour) {
        const isLate = this.checkIfLateByFactory(
          updateData.checkInTime,
          effectiveStartHour
        );
        attendance.isLate = isLate;
        attendance.lateMinutes = isLate
          ? this.calculateLateMinutesByFactory(
              updateData.checkInTime,
              effectiveStartHour
            )
          : 0;
      }
    }

    // Update checkOutTime và tính lại earlyLeaveMinutes
    if (updateData.checkOutTime) {
      // Validate không cho phép checkout trước checkin
      if (attendance.checkInTime && updateData.checkOutTime < attendance.checkInTime) {
        throwBadRequestError('Giờ ra không thể trước giờ vào');
      }

      attendance.checkOutTime = updateData.checkOutTime;

      const effectiveEndHour = this.getEffectiveEndHour(employee, factory);
      if (effectiveEndHour) {
        const isEarlyLeave = this.checkIfEarlyLeaveByFactory(
          updateData.checkOutTime,
          effectiveEndHour
        );
        attendance.isEarlyLeave = isEarlyLeave;
        attendance.earlyLeaveMinutes = isEarlyLeave
          ? this.calculateEarlyLeaveMinutesByFactory(
              updateData.checkOutTime,
              effectiveEndHour
            )
          : 0;
      }
    }

    // Tính lại workHours nếu có cả checkIn và checkOut
    if (attendance.checkInTime && attendance.checkOutTime) {
      attendance.workHours = this.calculateWorkHours(
        attendance.checkInTime,
        attendance.checkOutTime
      );
    }

    // Update overtimeHours
    if (updateData.overtimeHours !== undefined) {
      attendance.overtimeHours = updateData.overtimeHours;
    }

    return this.attendanceRepository.save(attendance);
  }

  private calculateWorkHours(checkInTime: Date, checkOutTime: Date): number {
    const diffMs = checkOutTime.getTime() - checkInTime.getTime();
    // Nếu vì bất kỳ lý do nào đó ra kết quả âm, trả về 0 để tránh lỗi lưu DB
    if (diffMs <= 0) {
      return 0;
    }
    let diffHours = diffMs / (1000 * 60 * 60);
    // Giới hạn hợp lý trong một ngày làm việc
    if (diffHours > 24) {
      diffHours = 24;
    }
    return Math.round(diffHours * 100) / 100; // Làm tròn 2 chữ số thập phân
  }

  private parseFactoryHourWork(checkInTime: Date, hourWork: string): Date {
    // hourEndWork: 'HH:MM' hoặc 'HH:MM:SS'
    const [hh, mm = '0', ss = '0'] = hourWork.split(':');
    const expected = new Date(checkInTime);
    expected.setHours(parseInt(hh, 10), parseInt(mm, 10), parseInt(ss, 10), 0);
    return expected;
  }

  private calculateOvertimeHours(
    checkOutTime: Date,
    hourEndWork: string
  ): number {
    const expectedEnd = this.parseFactoryHourWork(checkOutTime, hourEndWork);
    const diffMs = checkOutTime.getTime() - expectedEnd.getTime();
    if (diffMs <= 0) {
      return 0;
    }
    let diffHours = diffMs / (1000 * 60 * 60);
    // Giới hạn OT tối đa một ngày (ví dụ 16h để tránh outlier)
    if (diffHours > 16) {
      diffHours = 16;
    }
    return Math.round(diffHours * 100) / 100;
  }

  // Helper: Lấy giờ bắt đầu làm việc (ưu tiên employee trước, nếu không có thì dùng factory)
  private getEffectiveStartHour(
    employee: Employee,
    factory: Factory
  ): string | null {
    return employee.hourStartWork || factory.hourStartWork || null;
  }

  // Helper: Lấy giờ kết thúc làm việc (ưu tiên employee trước, nếu không có thì dùng factory)
  private getEffectiveEndHour(
    employee: Employee,
    factory: Factory
  ): string | null {
    return employee.hourEndWork || factory.hourEndWork || null;
  }

  // Kiểm tra đi muộn
  private checkIfLateByFactory(
    checkInTime: Date,
    hourStartWork: string
  ): boolean {
    const expectedCheckIn = this.parseFactoryHourWork(
      checkInTime,
      hourStartWork
    );
    // 8:00:xx vẫn đúng giờ, 8:01:00 trở đi mới tính muộn
    // So sánh theo phút (bỏ qua giây): checkIn phút > expected phút
    const checkInMinutes = checkInTime.getHours() * 60 + checkInTime.getMinutes();
    const expectedMinutes = expectedCheckIn.getHours() * 60 + expectedCheckIn.getMinutes();
    return checkInMinutes > expectedMinutes;
  }

  // Tính số phút đi muộn
  private calculateLateMinutesByFactory(
    checkInTime: Date,
    hourStartWork: string
  ): number {
    const expectedCheckIn = this.parseFactoryHourWork(
      checkInTime,
      hourStartWork
    );
    // Tính theo phút (bỏ qua giây)
    const checkInMinutes = checkInTime.getHours() * 60 + checkInTime.getMinutes();
    const expectedMinutes = expectedCheckIn.getHours() * 60 + expectedCheckIn.getMinutes();
    return Math.max(0, checkInMinutes - expectedMinutes);
  }

  // Kiểm tra các phương thức chấm công cần thiết
  private checkRequiredMethodsAttendance(
    employee: Employee,
    factory: Factory,
    dto: CheckInDto | CheckOutDto
  ) {
    if (employee.requireLocationCheck) {
      // Thu thập tất cả các vị trí (vị trí chính + các chi nhánh)
      const factoryLocations: Array<{ latitude: number; longitude: number }> = [];

      // Thêm vị trí chính nếu có
      if (
        factory.location &&
        typeof factory.location === 'object' &&
        ('x' in factory.location && 'y' in factory.location)
      ) {
        // PostGIS point: x = longitude, y = latitude
        factoryLocations.push({
          latitude: Number(factory.location.y), // y = latitude
          longitude: Number(factory.location.x), // x = longitude
        });
      }

      // Thêm các vị trí chi nhánh nếu có
      if (factory.branchLocations && Array.isArray(factory.branchLocations)) {
        factory.branchLocations.forEach((branch) => {
          if (branch && branch.latitude && branch.longitude) {
            factoryLocations.push({
              latitude: Number(branch.latitude),
              longitude: Number(branch.longitude),
            });
          }
        });
      }

      // Kiểm tra xem có ít nhất một vị trí hợp lệ không
      if (factoryLocations.length === 0) {
        throwBadRequestError('Vị trí nhà máy không hợp lệ');
      }

      let userLocation: { latitude: number; longitude: number };

      if (dto instanceof CheckOutDto) {
        userLocation = {
          latitude: dto.checkOutLocation.latitude,
          longitude: dto.checkOutLocation.longitude,
        };
      } else {
        userLocation = {
          latitude: dto.checkInLocation.latitude,
          longitude: dto.checkInLocation.longitude,
        };
      }

      // Kiểm tra xem vị trí người dùng có nằm trong bán kính của bất kỳ vị trí nào không
      const result = isLocationWithinAnyRadius(
        userLocation,
        factoryLocations,
        factory.radiusMeters || 200
      );

      if (!result.isWithinRadius) {
        const formattedDistance = formatDistance(result.distance || 0);
        const allowedRadius = formatDistance(factory.radiusMeters || 200);

        throwBadRequestError(`Vị trí chấm công không hợp lệ. Bạn đang cách vị trí công ty gần nhất ${formattedDistance}, bán kính cho phép là ${allowedRadius}`);
      }
    }
  }

  private checkIfEarlyLeaveByFactory(
    checkOutTime: Date,
    hourEndWork: string
  ): boolean {
    const expectedCheckOut = this.parseFactoryHourWork(
      checkOutTime,
      hourEndWork
    );
    // 17:00:xx là đúng giờ, 16:59:xx trở về trước là về sớm
    // So sánh theo phút (bỏ qua giây): checkOut phút < expected phút
    const checkOutMinutes = checkOutTime.getHours() * 60 + checkOutTime.getMinutes();
    const expectedMinutes = expectedCheckOut.getHours() * 60 + expectedCheckOut.getMinutes();
    return checkOutMinutes < expectedMinutes;
  }

  private calculateEarlyLeaveMinutesByFactory(
    checkOutTime: Date,
    hourEndWork: string
  ): number {
    const expectedCheckOut = this.parseFactoryHourWork(
      checkOutTime,
      hourEndWork
    );
    // Tính theo phút (bỏ qua giây)
    const checkOutMinutes = checkOutTime.getHours() * 60 + checkOutTime.getMinutes();
    const expectedMinutes = expectedCheckOut.getHours() * 60 + expectedCheckOut.getMinutes();
    return Math.max(0, expectedMinutes - checkOutMinutes);
  }

  // ========== EXPORT METHODS ==========

  // Lấy dữ liệu chấm công theo tháng
  async getAttendanceData(factoryId: number, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Lấy danh sách nhân viên của nhà máy
    const employees = await this.employeeRepository.find({
      where: { factoryId },
      relations: ['user', 'position', 'department', 'team'],
    });

    // Lấy dữ liệu chấm công trong tháng
    const attendances = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.employee', 'employee')
      .leftJoinAndSelect('employee.user', 'user')
      .where('attendance.factoryId = :factoryId', { factoryId })
      .andWhere('attendance.checkInTime >= :startDate', { startDate })
      .andWhere('attendance.checkInTime <= :endDate', { endDate })
      .getMany();

    // Tạo map dữ liệu chấm công theo employeeId và ngày
    const attendanceMap = new Map();
    attendances.forEach(attendance => {
      if (attendance.checkInTime) {
        const date = new Date(attendance.checkInTime);
        const dayKey = `${attendance.employeeId}_${date.getDate()}`;
        attendanceMap.set(dayKey, attendance);
      }
    });

    return { employees, attendanceMap, startDate, endDate };
  }

  // ========== XLSX EXPORT (styled) ==========
  private getStatusFill(
    status: string | undefined,
    isHoliday: boolean,
    isWorkDay: boolean
  ): ExcelJS.Fill | undefined {
    if (!status) return undefined;
    const normalized = status.toLowerCase();

    // Ngày lễ: màu xám (giống ngày nghỉ)
    if (normalized === 'l' || isHoliday) {
      return {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEFEFEF' },
      }; // gray light
    }

    // Ngày đi làm đủ: không màu
    if (normalized === 'x') {
      return undefined; // no fill
    }

    // Chấm công thiếu: màu vàng
    if (normalized.includes('thiếu')) {
      return {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF4CC' },
      }; // yellow
    }

    // Không chấm công ở ngày làm việc: màu đỏ
    if (normalized === '-' && isWorkDay) {
      return {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFD6D6' },
      }; // red light
    }

    // Ngày nghỉ (không phải ngày làm việc): màu xám
    if (!isWorkDay) {
      return {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEFEFEF' },
      }; // gray light
    }

    return undefined;
  }

  private setThinBorder(cell: ExcelJS.Cell) {
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    };
  }

  private getNonWorkdayFill(): ExcelJS.Fill {
    return { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } };
  }

  // Xuất bảng chấm công theo tháng
  async generateAttendanceXLSX(
    factoryId: number,
    year: number,
    month: number
  ): Promise<ArrayBuffer> {
    const { employees, attendanceMap } = await this.getAttendanceData(
      factoryId,
      year,
      month
    );
    const factory = await this.factoryRepository.findOne({
      where: { id: factoryId },
    });

    // Load holidays for the month
    const holidays = await this.holidayRepository.find({
      where: {
        factoryId: factoryId,
        year: year,
        isActive: true,
      },
    });

    // Create a map of date -> holiday for quick lookup
    const holidayMap = new Map<string, Holiday>();
    holidays.forEach(h => {
      // Convert Date to YYYY-MM-DD format
      const dateKey =
        h.date instanceof Date
          ? h.date.toISOString().split('T')[0]
          : String(h.date).split('T')[0];
      holidayMap.set(dateKey, h);
    });

    const daysInMonth = new Date(year, month, 0).getDate();
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Chấm công');

    const totalCols = 4 + daysInMonth; // 4 = STT chung + STT phòng ban + Tên + Vị trí

    // Factory name at row 1 (bold, larger font)
    sheet.addRow([factory?.name ?? 'Nhà máy']);
    sheet.mergeCells(1, 1, 1, totalCols + 3);
    const factoryNameCell = sheet.getCell(1, 1);
    factoryNameCell.font = { bold: true, size: 16 };
    factoryNameCell.alignment = { horizontal: 'left' };

    // Title at row 2
    sheet.addRow([`Bảng chấm công CBNV tháng ${month}/${year}`]);
    sheet.mergeCells(2, 1, 2, totalCols + 3); // +3 for Công ngày, Công phép, Công lễ
    const titleCell = sheet.getCell(2, 1);
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };

    // Header rows (row 3 and row 4) - now with 2 STT columns
    const headerRow1 = sheet.addRow([
      'STT',
      '',
      'Tên nhân viên',
      'Vị trí',
      ...Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`),
      'Công ngày',
      'Công phép',
      'Công lễ',
    ]);
    const headerRow2 = sheet.addRow([
      '',
      '',
      '',
      '',
      ...Array.from({ length: daysInMonth }, (_, i) =>
        this.getDayOfWeek(new Date(year, month - 1, i + 1).getDay())
      ),
      '',
      '',
      '',
    ]);

    // Merge header
    sheet.mergeCells(3, 1, 3, 2); // STT header merged across both STT columns (row 3 only)
    sheet.mergeCells(3, 3, 4, 3); // Tên nhân viên
    sheet.mergeCells(3, 4, 4, 4); // Vị trí
    sheet.mergeCells(3, totalCols + 1, 4, totalCols + 1); // Công ngày
    sheet.mergeCells(3, totalCols + 2, 4, totalCols + 2); // Công phép
    sheet.mergeCells(3, totalCols + 3, 4, totalCols + 3); // Công lễ

    // Style headers
    [headerRow1, headerRow2].forEach(r => {
      r.eachCell(cell => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        this.setThinBorder(cell);
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE6F0FF' },
        };
      });
    });

    // Column widths
    sheet.getColumn(1).width = 6; // STT chung
    sheet.getColumn(2).width = 6; // STT phòng ban
    sheet.getColumn(3).width = 24; // Tên
    sheet.getColumn(4).width = 16; // Vị trí
    for (let col = 5; col <= totalCols; col++) {
      sheet.getColumn(col).width = 6; // Day columns (wider for time in/out)
    }
    sheet.getColumn(totalCols + 1).width = 10; // Công ngày
    sheet.getColumn(totalCols + 2).width = 10; // Công phép
    sheet.getColumn(totalCols + 3).width = 10; // Công lễ

    // Determine non-work days
    const workDays = Array.isArray((factory as any)?.workDays)
      ? ((factory as any).workDays as number[])
      : undefined;
    const isWorkDay = (dow: number) =>
      workDays ? workDays.includes(dow) : dow !== 0; // default Mon-Sat

    // Shade non-workday columns (from header rows downwards)
    for (let day = 1; day <= daysInMonth; day++) {
      const dow = new Date(year, month - 1, day).getDay();
      if (!isWorkDay(dow)) {
        const col = 4 + day; // day column index (A=1), 4 cột đầu + ngày
        for (let row = 3; row <= sheet.rowCount; row++) {
          const cell = sheet.getRow(row).getCell(col);
          cell.fill = this.getNonWorkdayFill();
        }
      }
    }

    // Group employees by department name, then by team
    const employeesByDepartment = employees.reduce(
      (groups: Record<string, Record<string, Employee[]>>, e) => {
        const dept = (e as any).department?.name || 'Chưa xác định';
        const team = (e as any).team?.name || 'Chưa phân tổ';
        if (!groups[dept]) groups[dept] = {};
        if (!groups[dept][team]) groups[dept][team] = [];
        groups[dept][team].push(e);
        return groups;
      },
      {}
    );
    const sortedDepartments = Object.keys(employeesByDepartment).sort();

    let index = 1; // STT chung
    for (const deptName of sortedDepartments) {
      // Department header row
      const deptRow = sheet.addRow([deptName]);
      sheet.mergeCells(deptRow.number, 1, deptRow.number, totalCols + 3);
      const cell = sheet.getCell(deptRow.number, 1);
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'left' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F0FF' },
      };

      // Get teams in this department and sort them
      const teamsInDept = Object.keys(employeesByDepartment[deptName]).sort((a, b) => {
        // Put "Chưa phân tổ" at the end
        if (a === 'Chưa phân tổ') return 1;
        if (b === 'Chưa phân tổ') return -1;
        return a.localeCompare(b);
      });

      // Employees rows
      let deptIndex = 1; // STT theo phòng ban
      for (const teamName of teamsInDept) {
        // Team header row (only if there are multiple teams or team is defined)
        if (teamsInDept.length > 1 || teamName !== 'Chưa phân tổ') {
          const teamRow = sheet.addRow([`  ${teamName}`]);
          sheet.mergeCells(teamRow.number, 1, teamRow.number, totalCols + 3);
          const teamCell = sheet.getCell(teamRow.number, 1);
          teamCell.font = { bold: true, italic: true };
          teamCell.alignment = { horizontal: 'left' };
          teamCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF0F4C3' }, // Light yellow for team
          };
        }

        for (const e of employeesByDepartment[deptName][teamName]) {
          // Prepare 2 rows data for each employee
          // Row 1: Check-in time / Check-out time (red if late/early)
          // Row 2: Status (x/Thiếu)
          const row1Values: (string | number)[] = [
            index,
            deptIndex,
            (e as any).user?.fullName || '',
            (e as any).position?.name || 'Chưa xác định',
          ];
          const row2Values: (string | number)[] = ['', '', '', ''];

          // Store late/early info for styling
          const dayInfo: { isLate: boolean; isEarly: boolean }[] = [];

          let workCount = 0;
          let leaveCount = 0;
          let holidayCount = 0;

          for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(
              day
            ).padStart(2, '0')}`;
            const isHoliday = holidayMap.has(dateStr);

            const key = `${(e as any).id}_${day}`;
            const att = (attendanceMap as any).get(key) as Attendance | undefined;
            let status: string = '-';
            let timeRange: string = '';
            let isLate = false;
            let isEarly = false;

            // If it's a holiday, display 'L'
            if (isHoliday) {
              status = 'L';
              // If employee has attendance on holiday, count it as holiday work
              if (att && this.getAttendanceStatus(att).toLowerCase() === 'x') {
                holidayCount++;
              }
            } else if (att) {
              status = this.getAttendanceStatus(att);

              // Format check-in/out time (xuống dòng)
              const checkIn = att.checkInTime ? this.formatTimeHHMM(att.checkInTime) : '';
              const checkOut = att.checkOutTime ? this.formatTimeHHMM(att.checkOutTime) : '';
              if (checkIn || checkOut) {
                timeRange = checkIn + '\n' + checkOut;
              }

              // Check late/early for coloring
              isLate = att.isLate || false;
              isEarly = att.isEarlyLeave || false;
            }

            // count totals (excluding holidays)
            if (status.toLowerCase() === 'x' && !isHoliday) workCount++;
            if (status.toLowerCase() === 'off') leaveCount++;

            row1Values.push(timeRange);
            row2Values.push(status);
            dayInfo.push({ isLate, isEarly });
          }

          // push totals columns: Công ngày, Công phép, Công lễ
          row1Values.push(workCount);
          row1Values.push(leaveCount);
          row1Values.push(holidayCount);
          row2Values.push('', '', '');

          // Add 2 rows for this employee
          const r1 = sheet.addRow(row1Values);
          const r2 = sheet.addRow(row2Values);

          // Merge cells for STT, Name, Position across 2 rows
          const startRowNum = r1.number;
          sheet.mergeCells(startRowNum, 1, startRowNum + 1, 1); // STT chung
          sheet.mergeCells(startRowNum, 2, startRowNum + 1, 2); // STT phòng ban
          sheet.mergeCells(startRowNum, 3, startRowNum + 1, 3); // Tên nhân viên
          sheet.mergeCells(startRowNum, 4, startRowNum + 1, 4); // Vị trí
          // Merge totals columns across 2 rows
          sheet.mergeCells(startRowNum, totalCols + 1, startRowNum + 1, totalCols + 1); // Công ngày
          sheet.mergeCells(startRowNum, totalCols + 2, startRowNum + 1, totalCols + 2); // Công phép
          sheet.mergeCells(startRowNum, totalCols + 3, startRowNum + 1, totalCols + 3); // Công lễ

          // Style all 2 rows
          [r1, r2].forEach((r, rowIdx) => {
            for (let c = 1; c <= totalCols + 3; c++) {
              const rc = r.getCell(c);
              this.setThinBorder(rc);

              // STT columns (1 and 2) and Name/Position columns (3 and 4)
              if (c >= 1 && c <= 4) {
                rc.alignment = { horizontal: 'center', vertical: 'middle' };
              }
              // day cells range (now starting from column 5)
              else if (c >= 5 && c <= 4 + daysInMonth) {
                const day = c - 4;
                const dayIdx = day - 1;
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(
                  day
                ).padStart(2, '0')}`;
                const isHolidayCell = holidayMap.has(dateStr);
                const dow = new Date(year, month - 1, day).getDay();
                const isWorkDayBool = isWorkDay(dow);

                // Apply status fill only to row 2 (status row)
                if (rowIdx === 1) {
                  const status = String(rc.value ?? '').trim();
                  const fill = this.getStatusFill(status, isHolidayCell, isWorkDayBool);
                  if (fill) rc.fill = fill;
                  rc.alignment = { horizontal: 'center', vertical: 'middle' };
                } else {
                  // Row 1 (time in/out)
                  if (!isWorkDayBool) {
                    rc.fill = this.getNonWorkdayFill();
                  }
                  rc.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

                  // Apply red color if late or early leave
                  const info = dayInfo[dayIdx];
                  if (info && (info.isLate || info.isEarly)) {
                    rc.font = { color: { argb: 'FFFF0000' } }; // Red color
                  }
                }
              } else if (c > 4 + daysInMonth) {
                // totals columns alignment
                rc.alignment = { horizontal: 'center', vertical: 'middle' };
              }
            }
          });

          index++;
          deptIndex++;
        }
      }
    }

    return await workbook.xlsx.writeBuffer();
  }

  async generateOvertimeXLSX(
    factoryId: number,
    year: number,
    month: number
  ): Promise<ArrayBuffer> {
    const { employees, attendanceMap } = await this.getAttendanceData(
      factoryId,
      year,
      month
    );
    const factory = await this.factoryRepository.findOne({
      where: { id: factoryId },
    });

    // Load holidays for the month
    const holidays = await this.holidayRepository.find({
      where: {
        factoryId: factoryId,
        year: year,
        isActive: true,
      },
    });

    // Create a map of date -> holiday for quick lookup
    const holidayMap = new Map<string, Holiday>();
    holidays.forEach(h => {
      // Convert Date to YYYY-MM-DD format
      const dateKey =
        h.date instanceof Date
          ? h.date.toISOString().split('T')[0]
          : String(h.date).split('T')[0];
      holidayMap.set(dateKey, h);
    });

    const daysInMonth = new Date(year, month, 0).getDate();
    
    // Lấy danh sách support types (active) của factory
    const supportTypes = await this.supportTypeRepository.find({
      where: {
        factoryId,
        isActive: true,
      },
      order: { code: 'ASC' },
    });

    // Tính ngày đầu và cuối tháng
    const startDate = new Date(year, month - 1, 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(year, month, 0);
    endDate.setHours(23, 59, 59, 999);

    // Lấy tất cả overtime đã approved trong tháng để lấy reason
    const approvedOvertimes = await this.overtimeRepository.find({
      where: {
        factoryId,
        status: 'approved',
        overtimeDate: Between(startDate, endDate),
      },
    });

    // Group overtime by employee and date để lấy reason
    const overtimeReasonMap = new Map<string, string>();
    for (const ot of approvedOvertimes) {
      const otDate =
        ot.overtimeDate instanceof Date
          ? ot.overtimeDate
          : new Date(ot.overtimeDate);
      const day = otDate.getDate();
      const key = `${ot.employeeId}_${day}`;
      if (ot.reason) {
        // Nếu đã có reason, nối thêm
        const existing = overtimeReasonMap.get(key);
        if (existing) {
          overtimeReasonMap.set(key, `${existing}; ${ot.reason}`);
        } else {
          overtimeReasonMap.set(key, ot.reason);
        }
      }
    }

    // Lấy tất cả support requests đã approved trong tháng
    const supportRequests = await this.supportRequestRepository.find({
      where: {
        factoryId,
        status: 'approved',
        requestDate: Between(startDate, endDate),
      },
      relations: ['items', 'items.supportType'],
    });

    // Group support requests by employee and support type
    const supportByEmployeeAndType = new Map<string, Map<number, number>>();
    for (const request of supportRequests) {
      const key = `${request.employeeId}`;
      if (!supportByEmployeeAndType.has(key)) {
        supportByEmployeeAndType.set(key, new Map());
      }
      const typeMap = supportByEmployeeAndType.get(key)!;
      for (const item of request.items || []) {
        const typeId = Number(item.supportTypeId);
        const currentTotal = typeMap.get(typeId) || 0;
        typeMap.set(typeId, currentTotal + Number(item.quantity || 1));
      }
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Tăng ca');

    const totalCols = 4 + daysInMonth; // 4 = STT chung + STT phòng ban + Tên + Vị trí
    const supportTypeCols = Math.min(5, supportTypes.length); // 5 cột tổng hợp

    // Factory name at row 1 (bold, larger font)
    sheet.addRow([factory?.name ?? 'Nhà máy']);
    sheet.mergeCells(1, 1, 1, totalCols + 3 + supportTypeCols);
    const factoryNameCell = sheet.getCell(1, 1);
    factoryNameCell.font = { bold: true, size: 16 };
    factoryNameCell.alignment = { horizontal: 'left' };

    // Title at row 2
    sheet.addRow([`Bảng tăng ca CBNV tháng ${month}/${year}`]);
    sheet.mergeCells(2, 1, 2, totalCols + 3 + supportTypeCols); // +3 for Tổng (ngày thường), Tổng (CN), Tổng (lễ) + supportTypeCols
    const titleCell = sheet.getCell(2, 1);
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };

    // Header rows (row 3 and row 4) - now with 2 STT columns
    const headerRow1 = sheet.addRow([
      'STT',
      '',
      'Tên nhân viên',
      'Vị trí',
      ...Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`),
      'Tăng ca ngày thường (giờ)',
      'Tăng ca Chủ nhật (giờ)',
      'Tăng ca ngày lễ (giờ)',
      ...supportTypes.slice(0, supportTypeCols).map(st => st.name), // 5 cột tổng hợp loại hỗ trợ
      
    ]);
    const headerRow2 = sheet.addRow([
      '',
      '',
      '',
      '',
      ...Array.from({ length: daysInMonth }, (_, i) =>
        this.getDayOfWeek(new Date(year, month - 1, i + 1).getDay())
      ),
      '',
      '',
      '',
      ...Array.from({ length: supportTypeCols }, () => ''), // Cột tổng hợp loại hỗ trợ
    ]);

    // Merge header
    sheet.mergeCells(3, 1, 3, 2); // STT header merged across both STT columns (row 3 only)
    sheet.mergeCells(3, 3, 4, 3); // Tên nhân viên
    sheet.mergeCells(3, 4, 4, 4); // Vị trí
    sheet.mergeCells(3, totalCols + 1, 4, totalCols + 1); // Tổng (ngày thường)
    sheet.mergeCells(3, totalCols + 2, 4, totalCols + 2); // Tổng (CN)
    sheet.mergeCells(3, totalCols + 3, 4, totalCols + 3); // Tổng (lễ)
    // Merge các cột tổng hợp loại hỗ trợ
    for (let i = 0; i < supportTypeCols; i++) {
      sheet.mergeCells(3, totalCols + 4 + i, 4, totalCols + 4 + i);
    }

    // Style headers
    [headerRow1, headerRow2].forEach((r, rowIndex) => {
      r.eachCell((cell, colNumber) => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        this.setThinBorder(cell);
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE6F0FF' },
        };
        
        // Wrap text cho 5 cột tổng hợp loại hỗ trợ (chỉ ở header row 1)
        if (rowIndex === 0 && colNumber >= totalCols + 4 && colNumber <= totalCols + 3 + supportTypeCols) {
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        }
      });
    });
    
    // Tính toán chiều cao hàng header dựa trên text trong các cột tổng hợp loại hỗ trợ
    let maxTextLength = 0;
    for (let i = 0; i < supportTypeCols; i++) {
      const supportType = supportTypes[i];
      if (supportType && supportType.name) {
        // Tính số dòng cần thiết dựa trên độ rộng cột (8) và độ dài text
        const columnWidth = 8; // Độ rộng cột đã set
        const charsPerLine = Math.floor(columnWidth * 1.5); // Ước tính số ký tự mỗi dòng
        const linesNeeded = Math.ceil(supportType.name.length / charsPerLine);
        maxTextLength = Math.max(maxTextLength, linesNeeded);
      }
    }
    
    // Set chiều cao hàng dựa trên số dòng text (mỗi dòng ~ 15 points, tối thiểu 30)
    if (maxTextLength > 1) {
      const estimatedHeight = Math.max(30, maxTextLength * 15 + 10); // Thêm 10 points cho padding
      headerRow1.height = estimatedHeight;
    } else {
      headerRow1.height = 30; // Chiều cao mặc định
    }
    headerRow2.height = 20; // Hàng 2 không cần cao

    // Column widths
    sheet.getColumn(1).width = 6; // STT chung
    sheet.getColumn(2).width = 6; // STT phòng ban
    sheet.getColumn(3).width = 24; // Tên
    sheet.getColumn(4).width = 16; // Vị trí
    for (let col = 5; col <= totalCols; col++) {
      sheet.getColumn(col).width = 6; // Day columns
    }
    sheet.getColumn(totalCols + 1).width = 8; // Tổng (ngày thường)
    sheet.getColumn(totalCols + 2).width = 8; // Tổng (CN)
    sheet.getColumn(totalCols + 3).width = 8; // Tổng (lễ)
    for (let i = 0; i < supportTypeCols; i++) {
      sheet.getColumn(totalCols + 4 + i).width = 8; // Cột tổng hợp loại hỗ trợ
    }

    // Determine non-work days
    const workDays = Array.isArray((factory as any)?.workDays)
      ? ((factory as any).workDays as number[])
      : undefined;
    const isWorkDay = (dow: number) =>
      workDays ? workDays.includes(dow) : dow !== 0; // default Mon-Sat

    // Shade non-workday columns (from header rows downwards)
    for (let day = 1; day <= daysInMonth; day++) {
      const dow = new Date(year, month - 1, day).getDay();
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(
        day
      ).padStart(2, '0')}`;
      const isHoliday = holidayMap.has(dateStr);

      if (!isWorkDay(dow) || isHoliday) {
        const col = 4 + day; // day column index (A=1), 4 cột đầu + ngày
        for (let row = 3; row <= sheet.rowCount; row++) {
          const cell = sheet.getRow(row).getCell(col);
          // Use purple/lavender color for holidays
          if (isHoliday) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFE6D5FF' }, // Light purple for holidays
            };
          } else {
            cell.fill = this.getNonWorkdayFill();
          }
        }
      }
    }

    // Group employees by department name, then by team
    const employeesByDepartment = employees.reduce(
      (groups: Record<string, Record<string, Employee[]>>, e) => {
        const dept = (e as any).department?.name || 'Chưa xác định';
        const team = (e as any).team?.name || 'Chưa phân tổ';
        if (!groups[dept]) groups[dept] = {};
        if (!groups[dept][team]) groups[dept][team] = [];
        groups[dept][team].push(e);
        return groups;
      },
      {}
    );
    const sortedDepartments = Object.keys(employeesByDepartment).sort();

    let index = 1; // STT chung
    for (const deptName of sortedDepartments) {
      // Department header row
      const deptRow = sheet.addRow([deptName]);
      sheet.mergeCells(deptRow.number, 1, deptRow.number, totalCols + 3 + supportTypeCols);
      const cell = sheet.getCell(deptRow.number, 1);
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'left' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F0FF' },
      };

      // Get teams in this department and sort them
      const teamsInDept = Object.keys(employeesByDepartment[deptName]).sort((a, b) => {
        // Put "Chưa phân tổ" at the end
        if (a === 'Chưa phân tổ') return 1;
        if (b === 'Chưa phân tổ') return -1;
        return a.localeCompare(b);
      });

      // Employees rows
      let deptIndex = 1; // STT theo phòng ban
      let deptHasOT = false; // Track if department has any OT employees

      for (const teamName of teamsInDept) {
        // Team header row (only if there are multiple teams or team is defined)
        if (teamsInDept.length > 1 || teamName !== 'Chưa phân tổ') {
          const teamRow = sheet.addRow([`  ${teamName}`]);
          sheet.mergeCells(teamRow.number, 1, teamRow.number, totalCols + 3 + supportTypeCols);
          const teamCell = sheet.getCell(teamRow.number, 1);
          teamCell.font = { bold: true, italic: true };
          teamCell.alignment = { horizontal: 'left' };
          teamCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF0F4C3' }, // Light yellow for team
          };
        }

        for (const e of employeesByDepartment[deptName][teamName]) {
          // Calculate overtime first to check if employee has any OT
          const dayHours: number[] = [];
          const dayNotes: string[] = [];
          let normalTotal = 0; // tổng giờ OT ngày thường
          let sundayTotal = 0; // tổng giờ OT Chủ nhật
          let holidayTotal = 0; // tổng giờ OT ngày lễ
          let hasAnyNote = false;

          for (let day = 1; day <= daysInMonth; day++) {
            const key = `${(e as any).id}_${day}`;
            const att = (attendanceMap as any).get(key);
            const hours =
              att && (att as any).overtimeHours
                ? Number((att as any).overtimeHours)
                : 0;
            const dow = new Date(year, month - 1, day).getDay();
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(
              day
            ).padStart(2, '0')}`;
            const isHoliday = holidayMap.has(dateStr);

            if (hours > 0) {
              if (isHoliday) {
                holidayTotal += hours;
              } else if (dow === 0) {
                sundayTotal += hours;
              } else {
                normalTotal += hours;
              }
            }
            dayHours.push(hours);

            // Collect notes từ bảng Overtime (reason)
            const noteKey = `${(e as any).id}_${day}`;
            const note = overtimeReasonMap.get(noteKey) || '';
            if (note) {
              hasAnyNote = true;
            }
            dayNotes.push(note);
          }

          // Tính tổng hỗ trợ cho từng loại của nhân viên này
          const employeeSupportTotals = new Map<number, number>();
          const employeeKey = `${(e as any).id}`;
          const employeeSupportMap = supportByEmployeeAndType.get(employeeKey);
          let totalSupport = 0; // Tổng tất cả hỗ trợ
          if (employeeSupportMap) {
            for (const [typeId, total] of employeeSupportMap.entries()) {
              employeeSupportTotals.set(typeId, total);
              totalSupport += total;
            }
          }

          // Tính tổng tăng ca
          const totalOT = normalTotal + sundayTotal + holidayTotal;

          // Chỉ hiển thị nhân viên có tăng ca hoặc có hỗ trợ
          if (totalOT === 0 && totalSupport === 0) {
            continue;
          }

          if (totalOT > 0 || totalSupport > 0) {
            deptHasOT = true; // Mark department has OT or support employees
          }

          // Row 1: Overtime hours
          const row1Values: (string | number)[] = [
            index,
            deptIndex,
            (e as any).user?.fullName || '',
            (e as any).position?.name || 'Chưa xác định',
          ];

          // Row 2: Notes (only if hasAnyNote)
          const row2Values: (string | number)[] = ['', '', '', ''];

          for (let day = 1; day <= daysInMonth; day++) {
            const hours = dayHours[day - 1];
            row1Values.push(hours > 0 ? Number(hours.toFixed(2)) : '-');
            row2Values.push(dayNotes[day - 1]);
          }
          row1Values.push(Number(normalTotal.toFixed(2)));
          row1Values.push(Number(sundayTotal.toFixed(2)));
          row1Values.push(Number(holidayTotal.toFixed(2)));
          row2Values.push('', '', '');

          // Thêm 5 cột tổng hợp loại hỗ trợ
          for (let i = 0; i < supportTypeCols; i++) {
            const supportType = supportTypes[i];
            const typeId = Number(supportType.id);
            const total = employeeSupportTotals.get(typeId) || 0;
            row1Values.push(total > 0 ? Number(total.toFixed(2)) : '');
            row2Values.push('');
          }

          // Determine number of rows for this employee (1 or 2 based on notes)
          const numRows = hasAnyNote ? 2 : 1;

          const r1 = sheet.addRow(row1Values);
          const r2 = hasAnyNote ? sheet.addRow(row2Values) : null;

          // Merge cells if we have 2 rows
          if (hasAnyNote) {
            const startRowNum = r1.number;
            const endRowNum = startRowNum + 1;
            sheet.mergeCells(startRowNum, 1, endRowNum, 1); // STT chung
            sheet.mergeCells(startRowNum, 2, endRowNum, 2); // STT phòng ban
            sheet.mergeCells(startRowNum, 3, endRowNum, 3); // Tên nhân viên
            sheet.mergeCells(startRowNum, 4, endRowNum, 4); // Vị trí
            // Merge totals columns
            sheet.mergeCells(startRowNum, totalCols + 1, endRowNum, totalCols + 1); // Tổng ngày thường
            sheet.mergeCells(startRowNum, totalCols + 2, endRowNum, totalCols + 2); // Tổng CN
            sheet.mergeCells(startRowNum, totalCols + 3, endRowNum, totalCols + 3); // Tổng lễ
            // Merge support type columns
            for (let i = 0; i < supportTypeCols; i++) {
              sheet.mergeCells(startRowNum, totalCols + 4 + i, endRowNum, totalCols + 4 + i);
            }
          }

          // Style all rows
          const rowsToStyle = hasAnyNote ? [r1, r2!] : [r1];
          rowsToStyle.forEach((r, rowIdx) => {
            for (let c = 1; c <= totalCols + 3 + supportTypeCols; c++) {
              const rc = r.getCell(c);
              this.setThinBorder(rc);

              // STT columns (1 and 2)
              if (c === 1 || c === 2) {
                rc.alignment = { horizontal: 'center', vertical: 'middle' };
              }
              // day cells range (now starting from column 5)
              else if (c >= 5 && c <= 4 + daysInMonth) {
                const day = c - 4; // 4 cột đầu + ngày
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(
                  day
                ).padStart(2, '0')}`;
                const isHoliday = holidayMap.has(dateStr);
                const dow = new Date(year, month - 1, day).getDay();
                const isWorkDayBool = isWorkDay(dow);

                if (rowIdx === 0) {
                  // Row 1 (hours)
                  rc.alignment = { horizontal: 'center', vertical: 'middle' };
                  rc.numFmt = '0.00';
                  // Only apply fill if cell is empty
                  if (
                    rc.value === null ||
                    rc.value === undefined ||
                    rc.value === '' ||
                    rc.value === '-'
                  ) {
                    if (isHoliday) {
                      rc.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFE6D5FF' }, // Light purple for holidays
                      };
                    } else if (!isWorkDayBool) {
                      rc.fill = this.getNonWorkdayFill();
                    }
                  }
                } else if (rowIdx === 1) {
                  // Row 2 (notes)
                  rc.alignment = { horizontal: 'left', vertical: 'middle' };
                  rc.font = { italic: true, size: 9, color: { argb: 'FF666666' } };
                }
              } else if (c > 4 + daysInMonth && c <= totalCols + 3) {
                // totals columns alignment (Tổng ngày thường, CN, lễ)
                rc.alignment = { horizontal: 'center', vertical: 'middle' };
                if (rowIdx === 0) {
                  rc.numFmt = '0.00';
                  // Màu nền chung cho các ô tổng hợp tăng ca
                  rc.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFFE6CC' }, // Màu cam nhạt
                  };
                }
              } else if (c > totalCols + 3) {
                // support type totals columns alignment
                rc.alignment = { horizontal: 'center', vertical: 'middle' };
                if (rowIdx === 0) {
                  rc.numFmt = '0.00';
                  // Màu nền chung cho các ô tổng hợp loại hỗ trợ
                  rc.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFFE6CC' }, // Màu cam nhạt (cùng màu với tổng hợp tăng ca)
                  };
                }
              }
            }
          });

          index++;
          deptIndex++;
        }
      }

      // Không hiển thị message "Không có nhân viên nào tăng ca" vì đã hiển thị tất cả nhân viên
    }

    return await workbook.xlsx.writeBuffer();
  }

  // Lấy trạng thái chấm công
  private getAttendanceStatus(attendance: Attendance): string {
    if (!attendance.checkInTime && !attendance.checkOutTime) {
      return '-';
    }
    
    if (!attendance.checkInTime || !attendance.checkOutTime) {
      return 'Thiếu';
    }
  
    return 'x';
  }

  // Lấy thứ trong tuần
  private getDayOfWeek(day: number): string {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return days[day];
  }

  // Format time to HH:MM
  private formatTimeHHMM(date: Date): string {
    const d = new Date(date);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}

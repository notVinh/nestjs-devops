import { Injectable, Inject } from '@nestjs/common';
import { throwBadRequestError, throwNotFoundError } from '../utils/error.helper';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { BulkOvertimeRequest } from './entities/bulk-overtime-request.entity';
import { BulkOvertimeRequestEmployee } from './entities/bulk-overtime-request-employee.entity';
import { OvertimeCoefficient } from 'src/overtime-coefficient/entities/overtime-coefficient.entity';
import { Overtime } from 'src/overtime/entities/overtime.entity';
import { Attendance } from 'src/attendance/entities/attendance.entity';
import { Employee } from 'src/employee/entities/employee.entity';
import { CreateBulkOvertimeRequestDto } from './dto/create-bulk-overtime-request.dto';
import { UpdateBulkOvertimeRequestDto } from './dto/update-bulk-overtime-request.dto';
import { ConfirmBulkOvertimeRequestDto } from './dto/confirm-bulk-overtime-request.dto';
import { NotificationService } from 'src/notification/notification.service';
import { NOTIFICATION_TYPE } from 'src/notification/constants/notification-type.constant';

@Injectable()
export class BulkOvertimeRequestService {
  private readonly context = 'BulkOvertimeRequestService';

  constructor(
    @InjectRepository(BulkOvertimeRequest)
    private readonly bulkOvertimeRequestRepository: Repository<BulkOvertimeRequest>,
    @InjectRepository(BulkOvertimeRequestEmployee)
    private readonly bulkEmployeeRepository: Repository<BulkOvertimeRequestEmployee>,
    @InjectRepository(OvertimeCoefficient)
    private readonly coefficientRepository: Repository<OvertimeCoefficient>,
    @InjectRepository(Overtime)
    private readonly overtimeRepository: Repository<Overtime>,
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly notificationService: NotificationService,
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

  /**
   * Tạo đơn tăng ca hàng loạt (draft)
   */
  async create(dto: CreateBulkOvertimeRequestDto, creatorEmployeeId: number) {
    // Validate coefficient
    const coefficient = await this.coefficientRepository.findOne({
      where: { id: dto.overtimeCoefficientId },
    });

    if (!coefficient) {
      throwBadRequestError('Hệ số làm thêm không tồn tại');
    }

    if (!coefficient.isActive) {
      throwBadRequestError('Hệ số làm thêm đã bị tắt');
    }

    // Validate danh sách nhân viên không trống
    if (!dto.employeeIds || dto.employeeIds.length === 0) {
      throwBadRequestError('Phải chọn ít nhất 1 nhân viên');
    }

    // Tính tổng số giờ
    const totalHours = this.calculateTotalHours(dto.startTime, dto.endTime);

    // Chuyển coefficient từ % sang decimal (150 -> 1.5)
    const overtimeRate = coefficient.coefficient / 100;

    // Tạo bulk overtime request với status = draft
    const bulkRequest = this.bulkOvertimeRequestRepository.create({
      factoryId: dto.factoryId,
      creatorEmployeeId,
      approverEmployeeId: dto.approverEmployeeId,
      title: dto.title,
      overtimeDate: new Date(dto.overtimeDate),
      startTime: dto.startTime,
      endTime: dto.endTime,
      totalHours,
      overtimeCoefficientId: dto.overtimeCoefficientId,
      coefficientName: coefficient.shiftName,
      overtimeRate,
      reason: dto.reason ?? null,
      status: 'draft', // Tạo nháp trước
    });

    const savedBulkRequest = await this.bulkOvertimeRequestRepository.save(bulkRequest);

    // Tạo records cho từng nhân viên
    const employeeRecords = dto.employeeIds.map((employeeId) =>
      this.bulkEmployeeRepository.create({
        bulkOvertimeRequestId: savedBulkRequest.id,
        employeeId,
      })
    );

    await this.bulkEmployeeRepository.save(employeeRecords);

    // Load lại với relations
    return this.findOne(savedBulkRequest.id);
  }

  /**
   * Lấy danh sách đơn tăng ca hàng loạt theo factory
   */
  async findAllByFactory(factoryId: number) {
    return this.bulkOvertimeRequestRepository.find({
      where: { factoryId },
      relations: [
        'creator',
        'creator.user',
        'approver',
        'approver.user',
        'confirmedBy',
        'confirmedBy.user',
        'employees',
        'employees.employee',
        'employees.employee.user',
        'employees.overtime',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Lấy chi tiết 1 đơn tăng ca hàng loạt
   */
  async findOne(id: number) {
    const found = await this.bulkOvertimeRequestRepository.findOne({
      where: { id },
      relations: [
        'creator',
        'creator.user',
        'approver',
        'approver.user',
        'confirmedBy',
        'confirmedBy.user',
        'employees',
        'employees.employee',
        'employees.employee.user',
        'employees.employee.department',
        'employees.employee.position',
        'employees.overtime',
        'overtimeCoefficient',
      ],
    });

    if (!found) {
      throwNotFoundError('Đơn tăng ca hàng loạt không tồn tại');
    }

    return found;
  }

  /**
   * Cập nhật đơn tăng ca hàng loạt (chỉ cho draft)
   */
  async update(id: number, dto: UpdateBulkOvertimeRequestDto) {
    const found = await this.findOne(id);

    // Chỉ cho phép update nếu còn draft
    if (found.status !== 'draft') {
      throwBadRequestError('Chỉ có thể chỉnh sửa đơn ở trạng thái nháp (draft)');
    }

    // Nếu update employeeIds, cập nhật lại danh sách nhân viên
    if (dto.employeeIds) {
      // Xóa danh sách cũ
      await this.bulkEmployeeRepository.delete({
        bulkOvertimeRequestId: id,
      });

      // Tạo danh sách mới
      const employeeRecords = dto.employeeIds.map((employeeId) =>
        this.bulkEmployeeRepository.create({
          bulkOvertimeRequestId: id,
          employeeId,
        })
      );

      await this.bulkEmployeeRepository.save(employeeRecords);
    }

    // Nếu update overtimeCoefficientId, load lại coefficient
    let coefficientName = found.coefficientName;
    let overtimeRate = found.overtimeRate;

    if (dto.overtimeCoefficientId) {
      const coefficient = await this.coefficientRepository.findOne({
        where: { id: dto.overtimeCoefficientId },
      });

      if (!coefficient) {
        throwBadRequestError('Hệ số làm thêm không tồn tại');
      }

      if (!coefficient.isActive) {
        throwBadRequestError('Hệ số làm thêm đã bị tắt');
      }

      coefficientName = coefficient.shiftName;
      overtimeRate = coefficient.coefficient / 100;
    }

    // Nếu update startTime hoặc endTime, tính lại totalHours
    let totalHours = found.totalHours;
    const newStartTime = dto.startTime ?? found.startTime;
    const newEndTime = dto.endTime ?? found.endTime;

    if (dto.startTime || dto.endTime) {
      totalHours = this.calculateTotalHours(newStartTime, newEndTime);
    }

    // Update bulk request (exclude all relations to avoid cascade issues)
    const {
      employees,
      creator,
      approver,
      confirmedBy,
      overtimeCoefficient,
      ...foundWithoutRelations
    } = found;

    const updated = await this.bulkOvertimeRequestRepository.save({
      ...foundWithoutRelations,
      ...dto,
      totalHours,
      coefficientName,
      overtimeRate,
    });

    return this.findOne(updated.id);
  }

  /**
   * Xác nhận đơn tăng ca hàng loạt và tạo overtime records thực sự
   */
  async confirm(id: number, dto: ConfirmBulkOvertimeRequestDto) {
    const bulkRequest = await this.findOne(id);

    // Chỉ cho phép confirm nếu còn draft
    if (bulkRequest.status !== 'draft') {
      throwBadRequestError('Chỉ có thể xác nhận đơn ở trạng thái nháp (draft)');
    }

    // Kiểm tra có nhân viên không
    if (!bulkRequest.employees || bulkRequest.employees.length === 0) {
      throwBadRequestError('Không có nhân viên nào trong đơn tăng ca này');
    }

    // Tạo overtime records cho từng nhân viên
    const overtimeRecords: Overtime[] = [];
    const autoApprove = dto.autoApprove ?? false;

    for (const empRecord of bulkRequest.employees) {
      const overtime = this.overtimeRepository.create({
        factoryId: bulkRequest.factoryId,
        employeeId: empRecord.employeeId,
        approverEmployeeId: bulkRequest.approverEmployeeId,
        coefficientName: bulkRequest.coefficientName,
        overtimeDate: bulkRequest.overtimeDate,
        startTime: bulkRequest.startTime,
        endTime: bulkRequest.endTime,
        totalHours: bulkRequest.totalHours,
        overtimeRate: bulkRequest.overtimeRate,
        reason: bulkRequest.reason,
        status: autoApprove ? 'approved' : 'pending', // Nếu autoApprove, duyệt luôn
        decidedAt: autoApprove ? new Date() : null, // Set decidedAt nếu auto approve
      });

      const savedOvertime = await this.overtimeRepository.save(overtime);
      overtimeRecords.push(savedOvertime);

      // Cập nhật overtimeId vào junction table
      empRecord.overtimeId = savedOvertime.id;
      await this.bulkEmployeeRepository.save(empRecord);

      // Nếu auto approve, tạo attendance record ngay
      if (autoApprove) {
        await this.addOvertimeHoursToAttendance(
          empRecord.employeeId,
          bulkRequest.factoryId,
          bulkRequest.overtimeDate,
          Number(bulkRequest.totalHours),
        );

        // Gửi thông báo cho nhân viên
        try {
          const employee = await this.employeeRepository.findOne({
            where: { id: empRecord.employeeId },
            relations: ['user'],
          });

          if (employee?.userId) {
            const overtimeDate = new Date(bulkRequest.overtimeDate);
            await this.notificationService.sendNotificationToUser(
              employee.userId,
              'Đơn tăng ca đã được duyệt',
              `Đơn tăng ca của bạn ngày ${overtimeDate.toLocaleDateString('vi-VN')} (${bulkRequest.startTime} - ${bulkRequest.endTime}) đã được duyệt`,
              NOTIFICATION_TYPE.OVERTIME_APPROVED,
              savedOvertime.id,
              {
                status: 'approved',
                overtimeDate: overtimeDate.toISOString(),
                startTime: bulkRequest.startTime,
                endTime: bulkRequest.endTime,
                totalHours: bulkRequest.totalHours,
                coefficientName: bulkRequest.coefficientName,
                bulkRequestTitle: bulkRequest.title,
              }
            );
          }
        } catch (error) {
          this.error(`Error sending notification to employee ${empRecord.employeeId}`, error);
          // Không throw error để không ảnh hưởng đến việc confirm bulk overtime
        }
      }
    }

    // Cập nhật trạng thái bulk request sang confirmed
    bulkRequest.status = 'confirmed';
    bulkRequest.confirmedAt = new Date();
    bulkRequest.confirmedByEmployeeId = dto.confirmedByEmployeeId;

    await this.bulkOvertimeRequestRepository.save(bulkRequest);

    // Load lại với relations đầy đủ
    return this.findOne(id);
  }

  /**
   * Hủy đơn tăng ca hàng loạt (chỉ cho draft)
   */
  async cancel(id: number) {
    const found = await this.findOne(id);

    if (found.status !== 'draft') {
      throwBadRequestError('Chỉ có thể hủy đơn ở trạng thái nháp (draft)');
    }

    found.status = 'cancelled';
    await this.bulkOvertimeRequestRepository.save(found);

    return this.findOne(id);
  }

  /**
   * Xóa mềm đơn tăng ca hàng loạt
   */
  async softDelete(id: number) {
    const found = await this.findOne(id);

    // Chỉ cho phép xóa nếu là draft hoặc cancelled
    if (!['draft', 'cancelled'].includes(found.status)) {
      throwBadRequestError('Không thể xóa đơn đã xác nhận');
    }

    return this.bulkOvertimeRequestRepository.softDelete(id);
  }

  /**
   * Cộng số giờ tăng ca vào attendance (khi auto approve)
   */
  private async addOvertimeHoursToAttendance(
    employeeId: number,
    factoryId: number,
    overtimeDate: Date,
    totalHours: number,
  ) {
    // Tìm attendance record cho ngày này
    const attendanceDate = new Date(overtimeDate);
    attendanceDate.setHours(0, 0, 0, 0);

    let attendance = await this.attendanceRepository.findOne({
      where: {
        employeeId,
        attendanceDate,
      },
    });

    if (!attendance) {
      // Nếu chưa có attendance, tạo mới với status overtime_approved
      // Nhân viên chưa chấm công thực tế, chỉ được duyệt đơn tăng ca
      attendance = this.attendanceRepository.create({
        employeeId,
        factoryId,
        attendanceDate,
        overtimeHours: totalHours,
        status: 'overtime_approved', // Status đặc biệt: đã duyệt OT nhưng chưa chấm công
      });
    } else {
      // Nếu đã có attendance (đã chấm công), cộng thêm overtime hours
      const currentOT = Number(attendance.overtimeHours || 0);
      attendance.overtimeHours = currentOT + totalHours;

      // Nếu status đang là overtime_approved và bây giờ có thêm OT, giữ nguyên status
      // Nếu đã có status khác (present, late, etc.), giữ nguyên status đó
    }

    await this.attendanceRepository.save(attendance);
  }

  /**
   * Tính tổng số giờ từ startTime đến endTime
   * Format: "HH:mm"
   * Hỗ trợ ca qua đêm: nếu endTime < startTime, tự động cộng 24h
   */
  private calculateTotalHours(startTime: string, endTime: string): number {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMinute;
    let endMinutes = endHour * 60 + endMinute;

    // Nếu endTime < startTime, nghĩa là ca qua đêm
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60; // 1440 phút = 24 giờ
    }

    const diffMinutes = endMinutes - startMinutes;
    return Number((diffMinutes / 60).toFixed(2));
  }
}

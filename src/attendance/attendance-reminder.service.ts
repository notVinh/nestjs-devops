import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Employee } from '../employee/entities/employee.entity';
import { Attendance } from './entities/attendance.entity';
import { Factory } from '../factory/entities/factory.entity';
import { NotificationService } from '../notification/notification.service';
import { NOTIFICATION_TYPE } from '../notification/constants/notification-type.constant';

@Injectable()
export class AttendanceReminderService {
  private readonly context = 'AttendanceReminderService';

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    @InjectRepository(Factory)
    private factoryRepository: Repository<Factory>,
    private notificationService: NotificationService,
  ) {}

  // Helper methods để log
  private log(message: string) {
    this.logger.info(message, { context: this.context });
  }

  private warn(message: string) {
    this.logger.warn(message, { context: this.context });
  }

  private error(message: string, trace?: any) {
    if (trace) {
      this.logger.error(message, {
        context: this.context,
        trace: trace?.stack || trace,
      });
    } else {
      this.logger.error(message, { context: this.context });
    }
  }

  /**
   * Helper: Lấy giờ hiện tại theo timezone Việt Nam (HH:mm)
   */
  private getCurrentTimeVN(): string {
    const now = new Date();
    return now.toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Helper: Lấy ngày hôm nay (set về 00:00:00)
   * Sử dụng cách tương tự như attendance.service.ts để đảm bảo nhất quán
   */
  private getTodayVN(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  /**
   * Helper: Kiểm tra nhân viên đã check-in hôm nay chưa
   */
  private async hasCheckedInToday(employeeId: number, factoryId: number): Promise<boolean> {
    const today = this.getTodayVN();
    const attendance = await this.attendanceRepository.findOne({
      where: {
        employeeId,
        factoryId,
        attendanceDate: today,
      },
    });
    return attendance?.checkInTime != null;
  }

  /**
   * Helper: Kiểm tra nhân viên đã check-out hôm nay chưa
   */
  private async hasCheckedOutToday(employeeId: number, factoryId: number): Promise<boolean> {
    const today = this.getTodayVN();
    const attendance = await this.attendanceRepository.findOne({
      where: {
        employeeId,
        factoryId,
        attendanceDate: today,
      },
    });
    return attendance?.checkOutTime != null;
  }

  /**
   * Helper: Lấy thứ trong tuần hiện tại theo timezone Việt Nam (0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7)
   */
  private getCurrentDayOfWeekVN(): number {
    // Lấy thời gian hiện tại theo timezone Việt Nam
    const now = new Date();
    const vnTimeString = now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
    const vnDate = new Date(vnTimeString);
    return vnDate.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7
  }

  /**
   * Helper: Kiểm tra hôm nay có phải ngày làm việc của factory không
   * @param factoryId ID của factory
   * @param factoryCache Cache để tránh query nhiều lần cho cùng một factory
   * @returns true nếu hôm nay là ngày làm việc, false nếu không
   */
  private async isWorkingDay(
    factoryId: number,
    factoryCache?: Map<number, Factory | null>,
  ): Promise<boolean> {
    try {
      let factory: Factory | null | undefined;

      // Nếu có cache, kiểm tra cache trước
      if (factoryCache?.has(factoryId)) {
        factory = factoryCache.get(factoryId);
      } else {
        // Query từ database
        factory = await this.factoryRepository.findOne({
          where: { id: factoryId },
          select: ['id', 'workDays'],
        });

        // Lưu vào cache nếu có
        if (factoryCache) {
          factoryCache.set(factoryId, factory);
        }
      }

      if (!factory) {
        this.warn(`Factory ${factoryId} not found`);
        return false;
      }

      // Nếu factory không có workDays hoặc workDays rỗng, mặc định là làm việc tất cả các ngày
      if (!factory.workDays || factory.workDays.length === 0) {
        return true;
      }

      const currentDayOfWeek = this.getCurrentDayOfWeekVN();
      const isWorkingDay = factory.workDays.includes(currentDayOfWeek);

      return isWorkingDay;
    } catch (error) {
      this.error(`Error checking working day for factory ${factoryId}`, error);
      return false;
    }
  }

  /**
   * Cronjob: Gửi reminder check-in lúc 7h25
   * Gửi thông báo cho nhân viên chưa check-in ngày hôm nay
   */
  @Cron('25 7 * * *', {
    name: 'check-in-reminder-7h25',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async handleCheckInReminder7h25() {
    const currentTime = this.getCurrentTimeVN();
    this.log(`[CHECK-IN 7:25] Cronjob triggered at ${currentTime}`);

    await this.handleReminder('7:25', 'check_in');
  }

  /**
   * Cronjob: Gửi reminder check-in lúc 7h55
   * Gửi thông báo cho nhân viên chưa check-in ngày hôm nay
   */
  @Cron('55 7 * * *', {
    name: 'check-in-reminder-7h55',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async handleCheckInReminder7h55() {
    const currentTime = this.getCurrentTimeVN();
    this.log(`[CHECK-IN 7:55] Cronjob triggered at ${currentTime}`);

    await this.handleReminder('7:55', 'check_in');
  }

  async handleReminder(reminderTime: string, reminderType: string) {
    try {
      // Lấy tất cả employees đang làm việc (status = 'Chính thức' hoặc 'Thử việc')
      const employees = await this.employeeRepository.find({
        where: [
          { status: 'Chính thức' },
          { status: 'Thử việc' },
        ],
        relations: ['user'],
      });

      this.log(`[${reminderType} ${reminderTime}] Found ${employees.length} working employees`);

      if (employees.length === 0) {
        return;
      }

      let notificationsSent = 0;
      let skipped = 0;

      // Cache factory để tránh query nhiều lần cho cùng một factory
      const factoryCache = new Map<number, Factory | null>();

      for (const employee of employees) {
        try {
          if (!employee.userId || !employee.factoryId) {
            skipped++;
            continue;
          }

          // Kiểm tra hôm nay có phải ngày làm việc của factory không
          const isWorkingDay = await this.isWorkingDay(Number(employee.factoryId), factoryCache);
          if (!isWorkingDay) {
            skipped++;
            continue;
          }

          // Kiểm tra xem nhân viên đã check-in chưa
          const hasCheckedIn = await this.hasCheckedInToday(employee.id, Number(employee.factoryId));

          if (!hasCheckedIn) {
            this.log(`[${reminderType} ${reminderTime}] Sending to employee ${employee.id} (userId: ${employee.userId}) - chưa check-in`);

            await this.notificationService.sendFCMOnly(
              employee.userId,
              `Nhắc nhở ${reminderType}`,
              `Bạn chưa ${reminderType} ngày hôm nay. Vui lòng ${reminderType} sớm nhé!`,
              NOTIFICATION_TYPE.ATTENDANCE_CHECK_IN_REMINDER,
              undefined,
              { reminderType: reminderType, reminderTime: reminderTime },
            );

            notificationsSent++;
          }
        } catch (err) {
          this.error(`[${reminderType} ${reminderTime}] Error sending to employee ${employee.id}`, err);
        }
      }

      this.log(`[CHECK-IN 7:55] Summary: sent=${notificationsSent}, skipped=${skipped}, total=${employees.length}`);
    } catch (error) {
      this.error('[CHECK-IN 7:55] Cronjob error', error);
    }
  }
  
  /**
   * Cronjob: Gửi reminder check-out lúc 17h05
   * Gửi thông báo cho nhân viên chưa check-out ngày hôm nay
   */
  @Cron('5 17 * * *', {
    name: 'check-out-reminder-17h05',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async handleCheckOutReminder17h05() {
    const currentTime = this.getCurrentTimeVN();
    this.log(`[CHECK-OUT 17:05] Cronjob triggered at ${currentTime}`);

    await this.handleReminder('17:05', 'check_out');
  }

  /**
   * Cronjob: Gửi reminder check-out lúc 17h05
   * Gửi thông báo cho nhân viên chưa check-out ngày hôm nay
   */
  @Cron('35 17 * * *', {
    name: 'check-out-reminder-17h35',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async handleCheckOutReminder17h35() {
    const currentTime = this.getCurrentTimeVN();
    this.log(`[CHECK-OUT 17:35] Cronjob triggered at ${currentTime}`);

    await this.handleReminder('17:35', 'check_out');
  }
}

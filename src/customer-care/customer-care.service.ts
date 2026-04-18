import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerCare } from './entities/customer-care.entity';
import { MisaCustomer } from 'src/misa-token/entities/misa-customer.entity';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';

@Injectable()
export class CustomerCareService {
  constructor(
    @InjectRepository(CustomerCare)
    private readonly customerCareRepository: Repository<CustomerCare>,
    @InjectRepository(MisaCustomer)
    private readonly customerRepository: Repository<MisaCustomer>,
  ) {}

  // Haversine distance (meters)
  private calculateDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371000; // meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return Math.round(d * 100) / 100;
  }

  // Check-in
  async checkIn(employeeId: number, dto: CheckInDto): Promise<CustomerCare> {
    const customer = await this.customerRepository.findOne({
      where: { id: dto.customerId } as any,
    });

    if (!customer) {
      throw new NotFoundException('Không tìm thấy khách hàng này');
    }

    // Nếu customer có location và dto có checkIn location, kiểm tra khoảng cách
    if (customer.location && dto.location) {
      const dist = this.calculateDistanceMeters(
        customer.location.latitude,
        customer.location.longitude,
        dto.location.latitude,
        dto.location.longitude
      );

      // Rule: 50m
      if (dist > 50) {
        throw new BadRequestException(
          `Lỗi check-in: Bạn đang ở quá xa khách hàng (${dist}m > 50m)`
        );
      }
    }

    // Kiểm tra xem có đang check-in dở dang không
    const existing = await this.customerCareRepository.findOne({
      where: {
        employeeId,
        customerId: dto.customerId,
        status: 'checking_in',
      },
    });

    if (existing) {
      throw new BadRequestException('Bạn đang có lượt check-in chưa check-out tại khách hàng này');
    }

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const care = this.customerCareRepository.create({
      customerId: dto.customerId,
      employeeId,
      date: today,
      checkInTime: now,
      checkInLocation: dto.location || null,
      checkInNote: dto.note || undefined,
      checkInPhotoUrls: dto.photoUrls || undefined,
      status: 'checking_in',
    });

    return this.customerCareRepository.save(care);
  }

  // Check-out
  async checkOut(employeeId: number, careId: number, dto: CheckOutDto): Promise<CustomerCare> {
    const care = await this.customerCareRepository.findOne({
      where: { id: careId, employeeId, status: 'checking_in' } as any,
      relations: ['customer'],
    });

    if (!care) {
      throw new NotFoundException('Không tìm thấy phiên check-in hợp lệ để check-out');
    }

    const now = new Date();
    
    // Tính toán thời gian lưu trú
    const stayDurationMinutes = Math.max(
      0,
      Math.round((now.getTime() - care.checkInTime.getTime()) / 60000)
    );

    // Tính toán khoảng cách di chuyển từ điểm check-in đến điểm check-out
    let distanceMeters: number | null = null;
    if (care.checkInLocation && dto.location) {
      distanceMeters = this.calculateDistanceMeters(
        care.checkInLocation.latitude,
        care.checkInLocation.longitude,
        dto.location.latitude,
        dto.location.longitude
      );
    }

    care.checkOutTime = now;
    care.checkOutLocation = dto.location || null;
    care.checkOutNote = dto.note || undefined;
    care.checkOutPhotoUrls = dto.photoUrls || undefined;
    care.stayDurationMinutes = stayDurationMinutes;
    care.distanceMeters = distanceMeters;
    care.status = 'completed';

    const savedCare = await this.customerCareRepository.save(care);

    // Cập nhật thông tin chăm sóc trên khách hàng gốc
    if (care.customer) {
      care.customer.lastCaredAt = now;
      if (care.customer.careIntervalDays) {
        const nextCare = new Date(now);
        nextCare.setDate(now.getDate() + care.customer.careIntervalDays);
        care.customer.nextCareAt = nextCare;
      }
      await this.customerRepository.save(care.customer);
    }

    return savedCare;
  }

  // Lấy lịch sử chăm sóc (cho mình hoặc filter)
  async getHistory(employeeId: number, customerId?: number) {
    const qb = this.customerCareRepository
      .createQueryBuilder('c')
      .leftJoin('c.customer', 'customer')
      .leftJoin('c.employee', 'employee')
      .leftJoin('employee.user', 'user')
      .select([
        'c.id',
        'c.date',
        'c.checkInTime',
        'c.checkInLocation',
        'c.checkInNote',
        'c.checkOutTime',
        'c.checkOutLocation',
        'c.checkOutNote',
        'c.stayDurationMinutes',
        'c.distanceMeters',
        'c.status',
        'customer.id',
        'customer.accountObjectName',
        'employee.id',
        'user.fullName',
      ])
      .where('c.employeeId = :employeeId', { employeeId });

    if (customerId) {
      qb.andWhere('c.customerId = :customerId', { customerId });
    }

    qb.orderBy('c.checkInTime', 'DESC');

    return qb.getMany();
  }
}

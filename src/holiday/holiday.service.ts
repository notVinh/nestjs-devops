import { Injectable, NotFoundException } from '@nestjs/common';
import { throwNotFoundError } from '../utils/error.helper';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Holiday } from './entities/holiday.entity';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';

@Injectable()
export class HolidayService {
  constructor(
    @InjectRepository(Holiday)
    private holidayRepository: Repository<Holiday>,
  ) {}

  async create(createHolidayDto: CreateHolidayDto): Promise<Holiday> {
    const holiday = this.holidayRepository.create(createHolidayDto);
    return this.holidayRepository.save(holiday);
  }

  async findAll(factoryId?: number, year?: number): Promise<Holiday[]> {
    const where: any = {};

    if (factoryId) {
      where.factoryId = factoryId;
    }

    if (year) {
      where.year = year;
    }

    return this.holidayRepository.find({
      where,
      order: { date: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Holiday> {
    const holiday = await this.holidayRepository.findOne({
      where: { id },
    });

    if (!holiday) {
      throwNotFoundError('Không tìm thấy ngày nghỉ lễ');
    }

    return holiday;
  }

  async findByFactoryAndDateRange(
    factoryId: number,
    startDate: Date,
    endDate: Date
  ): Promise<Holiday[]> {
    return this.holidayRepository.find({
      where: {
        factoryId,
        date: Between(startDate, endDate),
        isActive: true,
      },
      order: { date: 'ASC' },
    });
  }

  async update(id: number, updateHolidayDto: UpdateHolidayDto): Promise<Holiday> {
    const holiday = await this.findOne(id);

    Object.assign(holiday, updateHolidayDto);

    return this.holidayRepository.save(holiday);
  }

  async remove(id: number): Promise<void> {
    const holiday = await this.findOne(id);
    await this.holidayRepository.softDelete(id);
  }

  async isHoliday(factoryId: number, date: Date): Promise<boolean> {
    const count = await this.holidayRepository.count({
      where: {
        factoryId,
        date,
        isActive: true,
      },
    });

    return count > 0;
  }

  async getHolidayByDate(factoryId: number, date: Date): Promise<Holiday | null> {
    return this.holidayRepository.findOne({
      where: {
        factoryId,
        date,
        isActive: true,
      },
    });
  }
}

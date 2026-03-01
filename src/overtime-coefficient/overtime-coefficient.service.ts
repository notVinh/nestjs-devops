import { Injectable } from '@nestjs/common';
import { throwNotFoundError } from '../utils/error.helper';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OvertimeCoefficient } from './entities/overtime-coefficient.entity';
import { CreateOvertimeCoefficientDto } from './dto/create-overtime-coefficient.dto';
import { UpdateOvertimeCoefficientDto } from './dto/update-overtime-coefficient.dto';
import { QueryOvertimeCoefficientDto } from './dto/query-overtime-coefficient.dto';

@Injectable()
export class OvertimeCoefficientService {
  constructor(
    @InjectRepository(OvertimeCoefficient)
    private readonly coefficientRepository: Repository<OvertimeCoefficient>,
  ) {}

  async create(dto: CreateOvertimeCoefficientDto) {
    const entity: Partial<OvertimeCoefficient> = {
      factoryId: dto.factoryId,
      shiftName: dto.shiftName,
      coefficient: dto.coefficient,
      shiftType: dto.shiftType,
      dayType: dto.dayType,
      hasWorkedDayShift: dto.hasWorkedDayShift ?? false,
      description: dto.description ?? null,
      isActive: dto.isActive ?? true,
    };

    return this.coefficientRepository.save(
      this.coefficientRepository.create(entity),
    );
  }

  async findAll(query: QueryOvertimeCoefficientDto) {
    const where: any = {};

    if (query.factoryId) {
      where.factoryId = query.factoryId;
    }

    if (query.shiftType) {
      where.shiftType = query.shiftType;
    }

    if (query.dayType) {
      where.dayType = query.dayType;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    return this.coefficientRepository.find({
      where,
      relations: ['factory'],
      order: {
        factoryId: 'ASC',
        dayType: 'ASC',
        shiftType: 'ASC',
        coefficient: 'ASC',
      },
    });
  }

  async findOne(id: number) {
    const found = await this.coefficientRepository.findOne({
      where: { id },
      relations: ['factory'],
    });

    if (!found) {
      throwNotFoundError('Hệ số làm thêm không tồn tại');
    }

    return found;
  }

  async findByFactory(factoryId: number) {
    return this.coefficientRepository.find({
      where: { factoryId, isActive: true },
      order: {
        dayType: 'ASC',
        shiftType: 'ASC',
        coefficient: 'ASC',
      },
    });
  }

  async update(id: number, dto: UpdateOvertimeCoefficientDto) {
    const found = await this.findOne(id);

    const next: Partial<OvertimeCoefficient> = {
      ...found,
      ...dto,
    } as any;

    return this.coefficientRepository.save(
      this.coefficientRepository.create(next),
    );
  }

  async softDelete(id: number) {
    await this.findOne(id);
    return this.coefficientRepository.softDelete(id);
  }

  async hardDelete(id: number) {
    await this.findOne(id);
    return this.coefficientRepository.delete(id);
  }

  /**
   * Tìm hệ số phù hợp dựa trên loại ca và loại ngày
   */
  async findMatchingCoefficient(
    factoryId: number,
    shiftType: string,
    dayType: string,
    hasWorkedDayShift: boolean = false,
  ): Promise<OvertimeCoefficient | null> {
    const found = await this.coefficientRepository.findOne({
      where: {
        factoryId,
        shiftType: shiftType as any,
        dayType: dayType as any,
        hasWorkedDayShift,
        isActive: true,
      },
    });

    return found ?? null;
  }
}

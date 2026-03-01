import { Injectable } from '@nestjs/common';
import { throwNotFoundError, throwBadRequestError } from '../utils/error.helper';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaveType } from './entities/leave-type.entity';
import { CreateLeaveTypeDto } from './dto/create-leave-type.dto';
import { UpdateLeaveTypeDto } from './dto/update-leave-type.dto';
import { QueryLeaveTypeDto } from './dto/query-leave-type.dto';

@Injectable()
export class LeaveTypeService {
  constructor(
    @InjectRepository(LeaveType)
    private readonly leaveTypeRepository: Repository<LeaveType>,
  ) {}

  async create(dto: CreateLeaveTypeDto) {
    // Kiểm tra code đã tồn tại trong factory chưa
    const existing = await this.leaveTypeRepository.findOne({
      where: {
        factoryId: dto.factoryId,
        code: dto.code,
      },
    });

    if (existing) {
      throwBadRequestError(`Mã loại nghỉ phép "${dto.code}" đã tồn tại trong nhà máy này`);
    }

    const entity: Partial<LeaveType> = {
      factoryId: dto.factoryId,
      code: dto.code,
      name: dto.name,
      isPaid: dto.isPaid ?? true,
      deductsFromAnnualLeave: dto.deductsFromAnnualLeave ?? true,
      description: dto.description ?? null,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    };

    return this.leaveTypeRepository.save(
      this.leaveTypeRepository.create(entity),
    );
  }

  async findAll(query: QueryLeaveTypeDto) {
    const where: any = {};

    if (query.factoryId) {
      where.factoryId = query.factoryId;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.isPaid !== undefined) {
      where.isPaid = query.isPaid;
    }

    return this.leaveTypeRepository.find({
      where,
      relations: ['factory'],
      order: {
        factoryId: 'ASC',
        sortOrder: 'ASC',
        name: 'ASC',
      },
    });
  }

  async findOne(id: number) {
    const found = await this.leaveTypeRepository.findOne({
      where: { id },
      relations: ['factory'],
    });

    if (!found) {
      throwNotFoundError('Loại nghỉ phép không tồn tại');
    }

    return found;
  }

  async findByFactory(factoryId: number) {
    return this.leaveTypeRepository.find({
      where: { factoryId, isActive: true },
      order: {
        sortOrder: 'ASC',
        name: 'ASC',
      },
    });
  }

  async findByCode(factoryId: number, code: string) {
    return this.leaveTypeRepository.findOne({
      where: { factoryId, code, isActive: true },
    });
  }

  async update(id: number, dto: UpdateLeaveTypeDto) {
    const found = await this.findOne(id);

    // Nếu đổi code, kiểm tra code mới đã tồn tại chưa
    if (dto.code && dto.code !== found.code) {
      const existing = await this.leaveTypeRepository.findOne({
        where: {
          factoryId: found.factoryId,
          code: dto.code,
        },
      });

      if (existing) {
        throwBadRequestError(`Mã loại nghỉ phép "${dto.code}" đã tồn tại trong nhà máy này`);
      }
    }

    const next: Partial<LeaveType> = {
      ...found,
      ...dto,
    } as any;

    return this.leaveTypeRepository.save(
      this.leaveTypeRepository.create(next),
    );
  }

  async softDelete(id: number) {
    await this.findOne(id);
    return this.leaveTypeRepository.softDelete(id);
  }

  async hardDelete(id: number) {
    await this.findOne(id);
    return this.leaveTypeRepository.delete(id);
  }
}

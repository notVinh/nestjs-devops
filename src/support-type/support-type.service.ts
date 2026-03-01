import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { SupportType } from './entities/support-type.entity';
import { CreateSupportTypeDto } from './dto/create-support-type.dto';
import { UpdateSupportTypeDto } from './dto/update-support-type.dto';

@Injectable()
export class SupportTypeService {
  private readonly context = 'SupportTypeService';

  constructor(
    @InjectRepository(SupportType)
    private readonly supportTypeRepository: Repository<SupportType>,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  private log(message: string) {
    this.logger.info(message, { context: this.context });
  }

  private error(message: string, trace?: any) {
    this.logger.error(message, {
      context: this.context,
      trace: trace?.stack || trace,
    });
  }

  // Tạo loại hỗ trợ mới
  async create(dto: CreateSupportTypeDto): Promise<SupportType> {
    // Kiểm tra trùng code trong cùng factory
    const existing = await this.supportTypeRepository.findOne({
      where: { factoryId: dto.factoryId, code: dto.code },
    });

    if (existing) {
      throw new ConflictException(
        `Loại hỗ trợ với mã "${dto.code}" đã tồn tại trong nhà máy này`,
      );
    }

    const supportType = this.supportTypeRepository.create({
      ...dto,
      requirePhoto: dto.requirePhoto ?? false,
      requireQuantity: dto.requireQuantity ?? false,
      isActive: true,
    });

    return this.supportTypeRepository.save(supportType);
  }

  // Lấy danh sách loại hỗ trợ theo factory
  async findByFactory(
    factoryId: number,
    includeInactive = false,
  ): Promise<SupportType[]> {
    const where: any = { factoryId };
    if (!includeInactive) {
      where.isActive = true;
    }

    return this.supportTypeRepository.find({
      where,
      order: { createdAt: 'ASC' },
    });
  }

  // Lấy chi tiết loại hỗ trợ
  async findOne(id: number): Promise<SupportType> {
    const supportType = await this.supportTypeRepository.findOne({
      where: { id },
    });

    if (!supportType) {
      throw new NotFoundException('Không tìm thấy loại hỗ trợ');
    }

    return supportType;
  }

  // Lấy loại hỗ trợ theo code và factory
  async findByCode(factoryId: number, code: string): Promise<SupportType> {
    const supportType = await this.supportTypeRepository.findOne({
      where: { factoryId, code, isActive: true },
    });

    if (!supportType) {
      throw new NotFoundException(`Không tìm thấy loại hỗ trợ với mã "${code}"`);
    }

    return supportType;
  }

  // Cập nhật loại hỗ trợ
  async update(id: number, dto: UpdateSupportTypeDto): Promise<SupportType> {
    const supportType = await this.findOne(id);

    Object.assign(supportType, dto);

    return this.supportTypeRepository.save(supportType);
  }

  // Xóa loại hỗ trợ (soft delete - set isActive = false)
  async remove(id: number): Promise<void> {
    const supportType = await this.findOne(id);
    supportType.isActive = false;
    await this.supportTypeRepository.save(supportType);
  }

  // Seed dữ liệu mặc định cho factory
  async seedDefaultTypes(factoryId: number): Promise<SupportType[]> {
    const defaultTypes = [
      {
        code: 'overnight_x50',
        name: 'Qua đêm x50',
        unit: 'ngày',
        requirePhoto: false,
        requireQuantity: false,
      },
      {
        code: 'overnight_x100',
        name: 'Qua đêm x100',
        unit: 'ngày',
        requirePhoto: false,
        requireQuantity: false,
      },
      {
        code: 'after_2030',
        name: 'Làm quá 20h30',
        unit: 'ngày',
        requirePhoto: false,
        requireQuantity: false,
      },
      {
        code: 'km_motorbike',
        name: 'Km xe máy',
        unit: 'km',
        requirePhoto: true,
        requireQuantity: true,
      },
      {
        code: 'km_car',
        name: 'Km ô tô',
        unit: 'km',
        requirePhoto: true,
        requireQuantity: true,
      },
    ];

    const results: SupportType[] = [];

    for (const type of defaultTypes) {
      const existing = await this.supportTypeRepository.findOne({
        where: { factoryId, code: type.code },
      });

      if (!existing) {
        const supportType = this.supportTypeRepository.create({
          factoryId,
          ...type,
          isActive: true,
        });
        results.push(await this.supportTypeRepository.save(supportType));
      } else {
        results.push(existing);
      }
    }

    this.log(`Seeded ${results.length} support types for factory ${factoryId}`);
    return results;
  }
}

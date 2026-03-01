import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptions } from 'src/utils/types/find-options.type';
import { DeepPartial, Repository } from 'typeorm';
import { Forgot } from './entities/forgot.entity';
import { NullableType } from '../utils/types/nullable.type';

@Injectable()
export class ForgotService {
  constructor(
    @InjectRepository(Forgot)
    private readonly forgotRepository: Repository<Forgot>,
  ) {}

  async findOne(options: FindOptions<Forgot>): Promise<NullableType<Forgot>> {
    return this.forgotRepository.findOne({
      where: options.where,
    });
  }

  async findMany(options: FindOptions<Forgot>): Promise<Forgot[]> {
    return this.forgotRepository.find({
      where: options.where,
    });
  }

  async create(data: DeepPartial<Forgot>): Promise<Forgot> {
    return this.forgotRepository.save(this.forgotRepository.create(data));
  }

  async update(id: Forgot['id'], data: DeepPartial<Forgot>): Promise<Forgot | null> {
    await this.forgotRepository.update(id, data);
    return this.forgotRepository.findOne({ where: { id } as any });
  }

  async softDelete(id: Forgot['id']): Promise<void> {
    await this.forgotRepository.softDelete(id);
  }
}

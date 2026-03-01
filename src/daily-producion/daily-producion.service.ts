import { Injectable } from '@nestjs/common';
import { throwNotFoundError } from '../utils/error.helper';
import { DailyProduction } from './entities/daily-production.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDailyProductionDto } from './dto/create-daily-production.dto';
import { UpdateDailyProductionDto } from './dto/update-daily-production.dto';

@Injectable()
export class DailyProducionService {
  constructor(
    @InjectRepository(DailyProduction)
    private readonly dailyProductionRepository: Repository<DailyProduction>
  ) {}

  async createDailyProduction(
    createDailyProductionDto: CreateDailyProductionDto
  ): Promise<DailyProduction> {
    const dailyProduction = this.dailyProductionRepository.create(
      createDailyProductionDto
    );
    return this.dailyProductionRepository.save(dailyProduction);
  }

  async getAllDailyProduction(
    factoryId?: number,
    employeeId?: number,
    date?: Date
  ): Promise<DailyProduction[]> {
    const queryBuilder = this.dailyProductionRepository.createQueryBuilder('dailyProduction');
    
    if (factoryId) {
      queryBuilder.andWhere('dailyProduction.factoryId = :factoryId', { factoryId });
    }
    if (employeeId) {
      queryBuilder.andWhere('dailyProduction.employeeId = :employeeId', { employeeId });
    }
    if (date) {
      queryBuilder.andWhere('DATE(dailyProduction.date) = DATE(:date)', { date });
    }

    return queryBuilder.getMany();
  }

  async getDailyProductionByFactory(factoryId: number): Promise<DailyProduction[]> {
    return this.dailyProductionRepository.find({
      where: { factoryId },
      relations: ['employee', 'employee.user'],
      order: { date: 'DESC' }
    });
  }

  async getDailyProductionByEmployee(employeeId: number): Promise<DailyProduction[]> {
    return this.dailyProductionRepository.find({
      where: { employeeId },
      relations: ['employee', 'employee.user'],
      order: { date: 'DESC' }
    });
  }

  async getDailyProduction(id: number): Promise<DailyProduction> {
    const dailyProduction = await this.dailyProductionRepository.findOne({
      where: { id },
    });
    if (!dailyProduction) {
      throwNotFoundError('Không tìm thấy sản lượng sản xuất');
    }
    return dailyProduction;
  }

  async updateDailyProduction(
    id: number,
    updateDailyProductionDto: UpdateDailyProductionDto
  ): Promise<DailyProduction> {
    const dailyProduction = await this.dailyProductionRepository.findOne({
      where: { id },
    });
    if (!dailyProduction) {
      throwNotFoundError('Không tìm thấy sản lượng sản xuất');
    }
    this.dailyProductionRepository.merge(
      dailyProduction,
      updateDailyProductionDto
    );
    return this.dailyProductionRepository.save(dailyProduction);
  }

  async remove(id: number): Promise<void> {
    await this.dailyProductionRepository.delete(id);
  }

  async getEmployeesWithProduction(factoryId: number): Promise<any[]> {
    const queryBuilder = this.dailyProductionRepository
      .createQueryBuilder('dp')
      .leftJoinAndSelect('dp.employee', 'employee')
      .leftJoinAndSelect('employee.user', 'user')
      .where('dp.factoryId = :factoryId', { factoryId })
      .groupBy('dp.employeeId, employee.id, user.id, user.fullName, employee.salaryType')
      .select([
        'dp.employeeId as employeeId',
        'employee.id as id',
        'user.fullName as fullName',
        'employee.salaryType as salaryType',
        'COUNT(dp.id) as totalRecords',
        'SUM(dp.quantity) as totalQuantity',
        'SUM(dp.totalPrice) as totalValue'
      ])
      .orderBy('user.fullName', 'ASC');

    return queryBuilder.getRawMany();
  }
}

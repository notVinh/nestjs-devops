import { Injectable, NotFoundException } from '@nestjs/common';
import { throwNotFoundError } from '../utils/error.helper';
import { PositionEmployee } from './entities/position-employee.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePositionEmployeeDto } from './dto/create-postion-employee.dto';
import { UpdatePositionEmployeeDto } from './dto/update-postion-employee.dto';

@Injectable()
export class PositionEmployeeService {
  constructor(
    @InjectRepository(PositionEmployee)
    private positionEmployeeRepository: Repository<PositionEmployee>
  ) {}

  // Hàm tạo vị trí nhân viên mới
  async create(createPositionEmployeeDto: CreatePositionEmployeeDto) {
    return this.positionEmployeeRepository.save(
      this.positionEmployeeRepository.create(createPositionEmployeeDto)
    );
  }

  // Hàm lấy vị trí nhân viên theo id
  async findOne(id: number) {
    const position = await this.positionEmployeeRepository.findOne({
      where: { id },
    });
    if (!position) {
      throwNotFoundError('Vị trí nhân viên không tồn tại');
    }
    return position;
  }

  // Hàm lấy vị trí nhân viên theo nhà máy và phòng ban
  async findAll(factoryId: number, departmentId?: number) {
    const whereCondition: any = { factoryId };
    if (departmentId) {
      whereCondition.departmentId = departmentId;
    }
    
    return this.positionEmployeeRepository.find({ 
      where: whereCondition,
      relations: ['department', 'employees']
    });
  }

  // Hàm cập nhật vị trí nhân viên
  async update(
    id: number,
    updatePositionEmployeeDto: UpdatePositionEmployeeDto
  ) {
    const position = await this.positionEmployeeRepository.findOne({
      where: { id },
    });
    if (!position) {
      throwNotFoundError('Vị trí nhân viên không tồn tại');
    }
    const positionData = {
      ...position,
      ...updatePositionEmployeeDto,
    };
    return this.positionEmployeeRepository.save(
      this.positionEmployeeRepository.create(positionData)
    );
  }

  // Hàm xóa vị trí nhân viên
  async softDelete(id: number) {
    const position = await this.positionEmployeeRepository.findOne({
      where: { id },
    });
    if (!position) {
      throwNotFoundError('Vị trí nhân viên không tồn tại');
    }
    return this.positionEmployeeRepository.softDelete(id);
  }
}

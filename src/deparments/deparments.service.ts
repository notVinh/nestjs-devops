import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/deparment.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { PositionEmployee } from 'src/position-employee/entities/position-employee.entity';

@Injectable()
export class DeparmentsService {
  constructor(
    @InjectRepository(Department)
    private departmentRepository: Repository<Department>,
    @InjectRepository(PositionEmployee)
    private positionRepository: Repository<PositionEmployee>
  ) {}

  // Hàm tạo phòng ban
  async create(createDepartmentDto: CreateDepartmentDto) {
    const department = await this.departmentRepository.save(
      this.departmentRepository.create(createDepartmentDto)
    );
    await this.positionRepository.save(
      this.positionRepository.create({
        name: 'Quản lý',
        factoryId: createDepartmentDto.factoryId,
        departmentId: department.id,
      })
    );
    await this.positionRepository.save(
      this.positionRepository.create({
        name: 'Nhân viên',
        factoryId: createDepartmentDto.factoryId,
        departmentId: department.id,
      })
    );
    return department;
  }

  // Hàm lấy tất cả phòng ban
  async findAll(factoryId: number) {
    return this.departmentRepository.find({
      where: { factoryId },
      relations: ['positions'],
    });
  }

  // Hàm lấy phòng ban theo id
  async findOne(id: number) {
    return this.departmentRepository.findOne({ where: { id } });
  }

  // Hàm cập nhật phòng ban
  async update(id: number, updateDepartmentDto: UpdateDepartmentDto) {
    return this.departmentRepository.update(id, updateDepartmentDto);
  }

  // Hàm xóa phòng ban
  async softDelete(id: number) {
    return this.departmentRepository.softDelete(id);
  }
}

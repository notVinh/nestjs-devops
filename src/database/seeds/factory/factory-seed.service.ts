import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Department } from 'src/deparments/entities/deparment.entity';
import { Employee } from 'src/employee/entities/employee.entity';
import { Factory } from 'src/factory/entities/factory.entity';
import { PositionEmployee } from 'src/position-employee/entities/position-employee.entity';
import { DEPARTMENT_DEFAULT, POSITION_DEFAULT } from 'src/utils/constant';
import { Repository } from 'typeorm';

@Injectable()
export class FactorySeedService {
  constructor(
    @InjectRepository(Factory)
    private repository: Repository<Factory>,
    @InjectRepository(Department)
    private departmentRepository: Repository<Department>,
    @InjectRepository(PositionEmployee)
    private positionRepository: Repository<PositionEmployee>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>
  ) {}

  // Hàm chạy seed tạo master factory
  async run() {
    // Kiểm tra factory có tồn tại không
    const countFactory = await this.repository.count();

    // Nếu không tồn tại, tạo super admin
    if (!countFactory) {
      const factory = await this.repository.save(
        this.repository.create({
          name: 'CÔNG TY CỔ PHẦN ĐẦU TƯ PHÁT TRIỂN GIANG THÀNH',
            phone: '0967118879',
            address: 'Lô TT03-03, số 190 Sài Đồng, Phường Phúc Lợi, TP. Hà Nội',
          location: '(105.913105,21.03971)',
          maxEmployees: 500,
          hourStartWork: '08:00:00',
          hourEndWork: '17:00:00',
          workDays: [1, 2, 3, 4, 5, 6],
          radiusMeters: 200,
          isGTG: true,
        })
      );
      // Tạo phòng ban mặc định
      const department = await this.departmentRepository.save(
        this.departmentRepository.create({
          name: DEPARTMENT_DEFAULT.name,
          description: '',
          factoryId: factory.id,
        })
      );

      // Tạo vị trí nhân sự mặc định
      const position = await this.positionRepository.save(
        this.positionRepository.create({
          name: POSITION_DEFAULT.name,
          description: '',
          departmentId: department.id,
          factoryId: factory.id,
        })
      );

      // Tạo nhân viên mặc định
      await this.employeeRepository.save(
        this.employeeRepository.create({
          factoryId: factory.id,
          userId: 1,
          positionId: position.id,
          departmentId: department.id,
          salary: 1000000,
          status: 'Chính thức',
          startDateJob: new Date(),
          endDateJob: null,
          isManager: true,
        })
      );
    }
  }
}

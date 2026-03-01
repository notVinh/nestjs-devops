import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from 'src/roles/entities/role.entity';
import { RoleEnum } from 'src/roles/roles.enum';
import { Repository } from 'typeorm';

@Injectable()
export class RoleSeedService {
  constructor(
    @InjectRepository(Role)
    private repository: Repository<Role>,
  ) {}

  // Hàm chạy seed tạo master role
  async run() {
    // Kiểm tra super admin có tồn tại không
    const countSuperAdmin = await this.repository.count({
      where: {
        id: RoleEnum.superAdmin,
      },
    });

    // Nếu không tồn tại, tạo super admin
    if (!countSuperAdmin) {
      await this.repository.save(
        this.repository.create({
          id: RoleEnum.superAdmin,
          name: 'Super Admin',
        }),
      );
    }

    // Kiểm tra factory admin có tồn tại không
    const countFactoryAdmin = await this.repository.count({
      where: {
        id: RoleEnum.factoryAdmin,
      },
    });

    // Nếu không tồn tại, tạo factory admin
    if (!countFactoryAdmin) {
      await this.repository.save(
        this.repository.create({
          id: RoleEnum.factoryAdmin,
          name: 'Factory Admin',
        }),
      );
    }

    // Kiểm tra employee có tồn tại không
    const countEmployee = await this.repository.count({
      where: {
        id: RoleEnum.employee,
      },
    });

    // Nếu không tồn tại, tạo employee
    if (!countEmployee) {
      await this.repository.save(
        this.repository.create({
          id: RoleEnum.employee,
          name: 'Employee',
        }),
      );
    }

    // Kiểm tra employee gtg có tồn tại không
    const countEmployeeGtg = await this.repository.count({
      where: {
        id: RoleEnum.employee_gtg,
      },
    });
    
    // Nếu không tồn tại, tạo employee gtg
    if (!countEmployeeGtg) {
      await this.repository.save(
        this.repository.create({
          id: RoleEnum.employee_gtg,
          name: 'Employee GTG',
        }),
      );
    }
  }
}

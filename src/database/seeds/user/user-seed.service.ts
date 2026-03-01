import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RoleEnum } from 'src/roles/roles.enum';
import { StatusEnum } from 'src/statuses/statuses.enum';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UserSeedService {
  constructor(
    @InjectRepository(User)
    private repository: Repository<User>,
  ) {}

  // Hàm chạy seed tạo master user
  async run() {
    // Kiểm tra super admin có tồn tại không
    const countSuperAdmin = await this.repository.count({
      where: {
        role: {
          id: RoleEnum.superAdmin,
        },
      },
    });

    // Nếu không tồn tại, tạo super admin
    if (!countSuperAdmin) {
      await this.repository.save(
        this.repository.create({
          fullName: 'Super Admin',
          phone: '6868686868',
          password: 'P@ssw0rd',
          role: {
            id: RoleEnum.superAdmin,
            name: 'Super Admin',
          },
          status: {
            id: StatusEnum.active,
            name: 'Active',
          },
        }),
      );
    }
  }
}

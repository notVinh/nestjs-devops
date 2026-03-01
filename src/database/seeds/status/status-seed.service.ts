import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Status } from 'src/statuses/entities/status.entity';
import { StatusEnum } from 'src/statuses/statuses.enum';
import { Repository } from 'typeorm';

@Injectable()
export class StatusSeedService {
  constructor(
    @InjectRepository(Status)
    private repository: Repository<Status>,
  ) {}

  // Hàm chạy seed tạo master status
  async run() {
    // Kiểm tra status có tồn tại không
    const count = await this.repository.count();

    // Nếu không tồn tại, tạo status
    if (!count) {
      await this.repository.save([
        this.repository.create({
          id: StatusEnum.active,
          name: 'Active',
        }),
        this.repository.create({
          id: StatusEnum.inactive,
          name: 'Inactive',
        }),
      ]);
    }
  }
}

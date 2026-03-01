import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from './entities/team.entity';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

@Injectable()
export class TeamService {
  constructor(
    @InjectRepository(Team)
    private teamRepository: Repository<Team>
  ) {}

  // Tạo tổ mới
  async create(createTeamDto: CreateTeamDto) {
    return this.teamRepository.save(
      this.teamRepository.create(createTeamDto)
    );
  }

  // Lấy tất cả tổ theo factoryId
  async findAll(factoryId: number) {
    return this.teamRepository.find({
      where: { factoryId },
      relations: ['department', 'employees'],
    });
  }

  // Lấy tất cả tổ theo departmentId
  async findByDepartment(departmentId: number) {
    return this.teamRepository.find({
      where: { departmentId },
      relations: ['employees'],
    });
  }

  // Lấy tổ theo id
  async findOne(id: number) {
    return this.teamRepository.findOne({
      where: { id },
      relations: ['department', 'employees'],
    });
  }

  // Cập nhật tổ
  async update(id: number, updateTeamDto: UpdateTeamDto) {
    return this.teamRepository.update(id, updateTeamDto);
  }

  // Xóa mềm tổ
  async softDelete(id: number) {
    return this.teamRepository.softDelete(id);
  }
}

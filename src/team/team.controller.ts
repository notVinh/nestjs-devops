import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TeamService } from './team.service';
import { UpdateTeamDto } from './dto/update-team.dto';
import { CreateTeamDto } from './dto/create-team.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/roles/roles.decorator';
import { RoleEnum } from 'src/roles/roles.enum';
import { RolesGuard } from 'src/roles/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { Team } from './entities/team.entity';
import { BaseResponse, ResponseHelper } from 'src/utils/base-response';

@Controller({
  path: 'teams',
  version: '1',
})
@ApiTags('Teams')
@Roles(
  RoleEnum.superAdmin,
  RoleEnum.factoryAdmin,
  RoleEnum.employee,
  RoleEnum.employee_gtg
)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Post()
  async create(
    @Body() createTeamDto: CreateTeamDto
  ): Promise<BaseResponse<Team>> {
    const team = await this.teamService.create(createTeamDto);
    return ResponseHelper.success(
      team,
      'Tạo tổ/nhóm thành công',
      HttpStatus.CREATED
    );
  }

  @Get()
  async findAll(@Query('factoryId') factoryId: number) {
    const teams = await this.teamService.findAll(factoryId);
    return ResponseHelper.success(
      teams,
      'Lấy danh sách tổ/nhóm thành công',
      HttpStatus.OK
    );
  }

  @Get('by-department/:departmentId')
  async findByDepartment(@Param('departmentId') departmentId: number) {
    const teams = await this.teamService.findByDepartment(departmentId);
    return ResponseHelper.success(
      teams,
      'Lấy danh sách tổ/nhóm theo phòng ban thành công',
      HttpStatus.OK
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: number) {
    const team = await this.teamService.findOne(id);
    return ResponseHelper.success(
      team,
      'Lấy thông tin tổ/nhóm thành công',
      HttpStatus.OK
    );
  }

  @Patch(':id')
  async update(
    @Param('id') id: number,
    @Body() updateTeamDto: UpdateTeamDto
  ) {
    const team = await this.teamService.update(id, updateTeamDto);
    return ResponseHelper.success(
      team,
      'Cập nhật tổ/nhóm thành công',
      HttpStatus.OK
    );
  }

  @Delete(':id')
  async remove(@Param('id') id: number) {
    await this.teamService.softDelete(id);
    return ResponseHelper.success(
      null,
      'Xóa tổ/nhóm thành công',
      HttpStatus.OK
    );
  }
}

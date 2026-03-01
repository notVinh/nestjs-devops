import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DeparmentsService } from './deparments.service';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/roles/roles.decorator';
import { RoleEnum } from 'src/roles/roles.enum';
import { RolesGuard } from 'src/roles/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { Department } from './entities/deparment.entity';
import { BaseResponse, ResponseHelper } from 'src/utils/base-response';

@Controller({
  path: 'departments',
  version: '1',
})
@ApiTags('Departments')
@Roles(
  RoleEnum.superAdmin,
  RoleEnum.factoryAdmin,
  RoleEnum.employee,
  RoleEnum.employee_gtg
)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class DeparmentsController {
  constructor(private readonly deparmentsService: DeparmentsService) {}

  @Post()
  async create(
    @Body() createDepartmentDto: CreateDepartmentDto
  ): Promise<BaseResponse<Department>> {
    const department = await this.deparmentsService.create(createDepartmentDto);
    return ResponseHelper.success(
      department,
      'Department created successfully',
      HttpStatus.CREATED
    );
  }

  @Get()
  async findAll(@Query('factoryId') factoryId: number) {
    const departments = await this.deparmentsService.findAll(factoryId);
    return ResponseHelper.success(
      departments,
      'Departments fetched successfully',
      HttpStatus.OK
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: number) {
    const department = await this.deparmentsService.findOne(id);
    return ResponseHelper.success(
      department,
      'Department fetched successfully',
      HttpStatus.OK
    );
  }

  @Patch(':id')
  async update(
    @Param('id') id: number,
    @Body() updateDepartmentDto: UpdateDepartmentDto
  ) {
    const department = await this.deparmentsService.update(
      id,
      updateDepartmentDto
    );
    return ResponseHelper.success(
      department,
      'Department updated successfully',
      HttpStatus.OK
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: number) {
    await this.deparmentsService.softDelete(id);
    return ResponseHelper.success(
      null,
      'Department deleted successfully',
      HttpStatus.OK
    );
  }
}

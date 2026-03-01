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
import { RoleGroupService } from './role-group.service';
import { CreateRoleGroupDto } from './dto/create-role-group.dto';
import { UpdateRoleGroupDto } from './dto/update-role-group.dto';
import { AddEmployeesDto } from './dto/add-employees.dto';
import { RemoveEmployeesDto } from './dto/remove-employees.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/roles/roles.decorator';
import { RoleEnum } from 'src/roles/roles.enum';
import { RolesGuard } from 'src/roles/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { RoleGroup } from './entities/role-group.entity';
import { BaseResponse, ResponseHelper } from 'src/utils/base-response';
import { HTTP_STATUS_CODE } from 'src/utils/constant';

@Controller({
  path: 'role-group',
  version: '1',
})
@ApiTags('Role Group')
@Roles(
  RoleEnum.superAdmin,
  RoleEnum.factoryAdmin,
  RoleEnum.employee,
  RoleEnum.employee_gtg,
)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class RoleGroupController {
  constructor(private readonly roleGroupService: RoleGroupService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo nhóm phân quyền mới' })
  async create(
    @Body() createRoleGroupDto: CreateRoleGroupDto
  ): Promise<BaseResponse<RoleGroup>> {
    const roleGroup = await this.roleGroupService.create(createRoleGroupDto);
    return ResponseHelper.success(
      roleGroup,
      'Tạo nhóm phân quyền thành công',
      HTTP_STATUS_CODE.CREATED
    );
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách nhóm phân quyền theo factoryId' })
  async findAll(@Query('factoryId') factoryId: number): Promise<BaseResponse<RoleGroup[]>> {
    const roleGroups = await this.roleGroupService.findAll(factoryId);
    return ResponseHelper.success(
      roleGroups,
      'Lấy danh sách nhóm phân quyền thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết nhóm phân quyền' })
  async findOne(@Param('id') id: number): Promise<BaseResponse<RoleGroup>> {
    const roleGroup = await this.roleGroupService.findOne(id);
    return ResponseHelper.success(
      roleGroup,
      'Lấy thông tin nhóm phân quyền thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cập nhật thông tin nhóm phân quyền' })
  async update(
    @Param('id') id: number,
    @Body() updateRoleGroupDto: UpdateRoleGroupDto
  ): Promise<BaseResponse<RoleGroup>> {
    const roleGroup = await this.roleGroupService.update(id, updateRoleGroupDto);
    return ResponseHelper.success(
      roleGroup,
      'Cập nhật nhóm phân quyền thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa nhóm phân quyền' })
  async delete(@Param('id') id: number): Promise<BaseResponse<null>> {
    await this.roleGroupService.delete(id);
    return ResponseHelper.success(
      null,
      'Xóa nhóm phân quyền thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Patch(':id/permissions-and-menu-keys')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cập nhật cả permissions và admin menu keys cùng lúc' })
  async updatePermissionsAndMenuKeys(
    @Param('id') id: number,
    @Body() body: { permissions: string[]; adminMenuKeys: string[] }
  ): Promise<BaseResponse<RoleGroup>> {
    const roleGroup = await this.roleGroupService.updatePermissionsAndMenuKeys(
      id,
      body.permissions,
      body.adminMenuKeys
    );
    return ResponseHelper.success(
      roleGroup,
      'Cập nhật quyền thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Post(':id/employees')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Thêm employees vào nhóm' })
  async addEmployees(
    @Param('id') id: number,
    @Body() addEmployeesDto: AddEmployeesDto
  ): Promise<BaseResponse<RoleGroup>> {
    const roleGroup = await this.roleGroupService.addEmployees(id, addEmployeesDto);
    return ResponseHelper.success(
      roleGroup,
      'Thêm nhân viên vào nhóm thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Delete(':id/employees')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa employees khỏi nhóm' })
  async removeEmployees(
    @Param('id') id: number,
    @Body() removeEmployeesDto: RemoveEmployeesDto
  ): Promise<BaseResponse<RoleGroup>> {
    const roleGroup = await this.roleGroupService.removeEmployees(id, removeEmployeesDto);
    return ResponseHelper.success(
      roleGroup,
      'Xóa nhân viên khỏi nhóm thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Get(':id/employees')
  @ApiOperation({ summary: 'Lấy danh sách employees trong nhóm' })
  async getEmployees(@Param('id') id: number) {
    const employees = await this.roleGroupService.getEmployees(id);
    return ResponseHelper.success(
      employees,
      'Lấy danh sách nhân viên thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Get('employee/:employeeId/permissions')
  @ApiOperation({ summary: 'Lấy permissions thực tế của employee (từ tất cả groups)' })
  async getEmployeePermissions(@Param('employeeId') employeeId: number) {
    const permissions = await this.roleGroupService.getEmployeePermissions(employeeId);
    return ResponseHelper.success(
      permissions,
      'Lấy permissions của nhân viên thành công',
      HTTP_STATUS_CODE.OK
    );
  }
}


import {
  Controller,
  HttpStatus,
  HttpCode,
  Delete,
  Param,
  Post,
  Get,
  Patch,
  Body,
  DefaultValuePipe,
  ParseIntPipe,
  Query,
  UseGuards,
  Request,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EmployeeService } from './employee.service';
import { BaseResponse, ResponseHelper } from '../utils/base-response';
import { Employee } from './entities/employee.entity';
import { HTTP_STATUS_CODE } from '../utils/constant';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UpdateAttendanceConfigDto } from './dto/update-attendance-config.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { IPaginationResult } from '../utils/types/pagination-options.type';
import { CreateEmployeeWithUserDto } from './dto/create-employee-with-user.dto';
import { Roles } from 'src/roles/roles.decorator';
import { RoleEnum } from 'src/roles/roles.enum';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/roles/roles.guard';
import { PaginationLimitPipe } from 'src/utils/pipes/pagination-limit.pipe';
import { PaginationPagePipe } from 'src/utils/pipes/pagination-page.pipe';

@Controller({
  path: 'employee',
  version: '1',
})
@ApiTags('Employee')
@Roles(
  RoleEnum.superAdmin,
  RoleEnum.factoryAdmin,
  RoleEnum.employee,
  RoleEnum.employee_gtg
)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post('create-with-user')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo user mới và gắn vào employee' })
  async createWithUser(
    @Body() payload: CreateEmployeeWithUserDto,
    @Request() req: any
  ): Promise<BaseResponse<Employee>> {
    // Lấy factoryId từ user
    const employeeInfo = await this.employeeService.getEmployeeByUserId(
      Number(req.user.id)
    );
    // Tạo nhân viên với user
    const employee = await this.employeeService.createWithUser({
      ...payload,
      factoryId: employeeInfo.factoryId,
    } as any);
    return ResponseHelper.success(
      employee,
      'Tạo nhân viên kèm user thành công',
      HTTP_STATUS_CODE.CREATED
    );
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy danh sách nhân viên theo nhà máy' })
  async findAllByFactoryWithPagination(
    @Query('page', new PaginationPagePipe()) page: number, // Trang
    @Query('limit', new PaginationLimitPipe(20, 10000)) limit: number, // Số lượng (max 10000 for attendance view)
    @Request() req: any, // Request user
    @Query('search') search?: string, // Tìm kiếm
    @Query('positionId') positionId?: number, // ID vị trí
    @Query('status') status?: string, // Trạng thái
    @Query('departmentId') departmentId?: number, // ID phòng ban
    @Query('teamId') teamId?: number, // ID tổ
    @Query('isManager') isManager?: string // Là quản lý
  ): Promise<BaseResponse<IPaginationResult<Employee>>> {
    // Lấy factoryId từ user
    const employeeInfo = await this.employeeService.getEmployeeByUserId(
      req.user.id
    );

    // Parse isManager to boolean
    let isManagerBool: boolean | undefined;
    if (isManager === 'true') isManagerBool = true;
    else if (isManager === 'false') isManagerBool = false;

    // Lấy danh sách nhân viên theo factory
    const result = await this.employeeService.findAllByFactoryWithDetails(
      { page, limit },
      employeeInfo.factoryId,
      { search, positionId, status, departmentId, teamId, isManager: isManagerBool }
    );

    // Trả về danh sách nhân viên
    return ResponseHelper.success(
      result,
      'Lấy danh sách nhân viên thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy thông tin employee của user hiện tại' })
  @Roles(
    RoleEnum.superAdmin,
    RoleEnum.factoryAdmin,
    RoleEnum.employee,
    RoleEnum.employee_gtg
  )
  async getMyEmployee(
    @Request() req: any
  ): Promise<BaseResponse<Employee | null>> {
    const employee = await this.employeeService.getEmployeeByUserId(
      Number(req.user.id)
    );
    if (!employee) {
      return ResponseHelper.success(
        null,
        'Không tìm thấy nhân viên',
        HTTP_STATUS_CODE.OK
      );
    }
    const detail = await this.employeeService.findOneWithRelations(employee.id);
    return ResponseHelper.success(
      detail as any,
      'Lấy thông tin nhân viên hiện tại thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Get('dashboard-stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy thống kê nhân viên cho Super Admin Dashboard' })
  @Roles(RoleEnum.superAdmin)
  async getDashboardStats(): Promise<BaseResponse<{
    totalEmployees: number;
    totalFactories: number;
    employeesByFactory: { factoryId: number; factoryName: string; count: number }[];
  }>> {
    const stats = await this.employeeService.getDashboardStats();
    return ResponseHelper.success(
      stats,
      'Lấy thống kê thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Get('factory/:factoryId/salary-type/:salaryType')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lấy danh sách nhân viên theo nhà máy và loại lương',
  })
  async findEmployeeByFactorySalaryType(
    @Param('factoryId') factoryId: number,
    @Param('salaryType') salaryType: 'daily' | 'production'
  ): Promise<BaseResponse<Employee[]>> {
    const employees =
      await this.employeeService.findEmployeeByFactorySalaryType(
        factoryId,
        salaryType
      );
    return ResponseHelper.success(
      employees,
      'Lấy danh sách nhân viên thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy thông tin nhân viên theo id' })
  async findOneEmployee(
    @Param('id') id: number
  ): Promise<BaseResponse<Employee | null>> {
    // lấy thông tin nhân viên theo id với các bảng liên quan
    const employee = await this.employeeService.findOneWithRelations(id);

    // Trả về thông tin nhân viên
    return ResponseHelper.success(
      employee,
      'Lấy thông tin nhân viên thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cập nhật thông tin nhân viên theo id' })
  async update(
    @Param('id') id: number,
    @Body() updateEmployeeDto: UpdateEmployeeDto
  ): Promise<BaseResponse<Employee>> {
    // Cập nhật thông tin nhân viên
    const employee = await this.employeeService.update(id, updateEmployeeDto);

    // Trả về thông tin nhân viên
    return ResponseHelper.success(
      employee,
      'Cập nhật thông tin nhân viên thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Patch(':id/admin-permissions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cập nhật quyền admin phạm vi nhà máy cho nhân viên',
  })
  async updateAdminPermissions(
    @Param('id') id: number,
    @Body() body: { canAccessAdmin?: boolean; adminMenuKeys?: string[] }
  ): Promise<BaseResponse<Employee>> {
    const employee = await this.employeeService.update(id, body as any);
    return ResponseHelper.success(
      employee,
      'Cập nhật quyền admin nhân viên thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Patch(':id/permissions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cập nhật permissions cho nhân viên (MISA orders, etc.) - CHỈ SUPER ADMIN',
  })
  @Roles(RoleEnum.superAdmin)
  async updatePermissions(
    @Param('id') id: number,
    @Body() body: { permissions: string[] }
  ): Promise<BaseResponse<Employee>> {
    const employee = await this.employeeService.update(id, body as any);
    return ResponseHelper.success(
      employee,
      'Cập nhật quyền nhân viên thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset mật khẩu cho nhân viên - CHỈ ADMIN',
  })
  @Roles(RoleEnum.superAdmin, RoleEnum.factoryAdmin)
  async resetPassword(
    @Param('id') id: number,
    @Body() resetPasswordDto: ResetPasswordDto
  ): Promise<BaseResponse<{ message: string }>> {
    const result = await this.employeeService.resetPassword(
      id,
      resetPasswordDto.newPassword
    );
    return ResponseHelper.success(
      result,
      result.message,
      HTTP_STATUS_CODE.OK
    );
  }

  @Patch(':id/attendance-config')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cập nhật cấu hình chấm công cho nhân viên',
  })
  async updateAttendanceConfig(
    @Param('id') id: number,
    @Body() updateAttendanceConfigDto: UpdateAttendanceConfigDto
  ): Promise<BaseResponse<Employee>> {
    const employee = await this.employeeService.update(
      id,
      updateAttendanceConfigDto as any
    );
    return ResponseHelper.success(
      employee,
      'Cập nhật cấu hình chấm công thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Post('import-excel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Import nhân viên từ file Excel' })
  @UseInterceptors(FileInterceptor('file'))
  async importFromExcel(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any
  ): Promise<BaseResponse<any>> {
    if (!file) {
      return ResponseHelper.error(
        'Vui lòng chọn file Excel để import',
        HTTP_STATUS_CODE.BAD_REQUEST
      );
    }

    // Lấy factoryId từ user
    const employeeInfo = await this.employeeService.getEmployeeByUserId(
      Number(req.user.id)
    );

    // Import từ Excel
    const results = await this.employeeService.importFromExcel(
      file.buffer,
      employeeInfo.factoryId
    );

    return ResponseHelper.success(
      results,
      `Import hoàn tất: ${results.success} thành công, ${results.failed} thất bại`,
      HTTP_STATUS_CODE.OK
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa nhân viên theo id' })
  async softDelete(@Param('id') id: number): Promise<BaseResponse<null>> {
    // Xóa nhân viên
    await this.employeeService.softDelete(id);

    // Trả về thông báo
    return ResponseHelper.success(
      null,
      'Xóa nhân viên thành công',
      HTTP_STATUS_CODE.OK
    );
  }
}

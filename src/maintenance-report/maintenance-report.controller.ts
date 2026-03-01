import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  HttpStatus,
  HttpCode,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { MaintenanceReportService } from './maintenance-report.service';
import { CreateMaintenanceReportDto } from './dto/create-maintenance-report.dto';
import { UpdateMaintenanceReportDto } from './dto/update-maintenance-report.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { MaintenanceReportStatus } from './entities/maintenance-report.entity';
import { EmployeeService } from 'src/employee/employee.service';
import { PaginationLimitPipe } from 'src/utils/pipes/pagination-limit.pipe';
import { PaginationPagePipe } from 'src/utils/pipes/pagination-page.pipe';
import { HTTP_STATUS_CODE } from 'src/utils/constant';
import { ResponseHelper } from 'src/utils/base-response';

@Controller({
  path: 'maintenance-report',
  version: '1',
})
@ApiTags('Maintenance Report')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
export class MaintenanceReportController {
  constructor(
    private readonly maintenanceReportService: MaintenanceReportService,
    private readonly employeeService: EmployeeService
  ) {}

  // Nhân viên tạo báo cáo máy hỏng
  @Post('report')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo báo cáo máy hỏng' })
  async create(@Request() req, @Body() createDto: CreateMaintenanceReportDto) {
    const employee = await this.employeeService.getEmployeeByUserId(
      req.user.id
    );
    const result = await this.maintenanceReportService.create(employee?.id, createDto);

    return ResponseHelper.success(
      result,
      'Tạo báo cáo máy hỏng thành công',
      HTTP_STATUS_CODE.CREATED,
    );
  }

  // Xem lịch sử báo cáo của mình
  @Get('my-reports')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xem lịch sử báo cáo của mình' })
  async findMyReports(
    @Request() req,
    @Query('page', new PaginationPagePipe()) page: number,
    @Query('limit', new PaginationLimitPipe(20, 20)) limit: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: MaintenanceReportStatus,
    @Query('priority') priority?: string
  ) {
    const employee = await this.employeeService.getEmployeeByUserId(req.user.id);

    const result = await this.maintenanceReportService.findMyReports(
      employee.id,
      { page, limit },
      { startDate, endDate, status, priority }
    );

    return ResponseHelper.success(
      result,
      'Lấy lịch sử báo cáo của mình thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  // Xem báo cáo được giao cho mình xử lý
  @Get('assigned-to-me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xem báo cáo được giao cho mình xử lý' })
  async findAssignedToMe(
    @Request() req,
    @Query('page', new PaginationPagePipe()) page: number,
    @Query('limit', new PaginationLimitPipe(20, 20)) limit: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: MaintenanceReportStatus,
    @Query('priority') priority?: string
  ) {
    const employee = await this.employeeService.getEmployeeByUserId(req.user.id);

    const result = await this.maintenanceReportService.findAssignedToMe(
      employee?.id,
      { page, limit },
      { startDate, endDate, status, priority }
    );

    return ResponseHelper.success(
      result,
      'Lấy danh sách báo cáo được giao cho mình xử lý thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  // Quản lý xem tất cả báo cáo của factory
  @Get('factory/:factoryId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xem tất cả báo cáo của factory' })
  async findByFactory(
    @Param('factoryId', ParseIntPipe) factoryId: number,
    @Query('page', new PaginationPagePipe()) page: number,
    @Query('limit', new PaginationLimitPipe(20, 20)) limit: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('employeeId', new DefaultValuePipe(0), ParseIntPipe)
    employeeId?: number,
    @Query('assignedEmployeeId', new DefaultValuePipe(0), ParseIntPipe)
    assignedEmployeeId?: number,
    @Query('departmentId', new DefaultValuePipe(0), ParseIntPipe)
    departmentId?: number,
    @Query('status') status?: MaintenanceReportStatus,
    @Query('priority') priority?: string
  ) {
    const result = await this.maintenanceReportService.findByFactory(
      factoryId,
      { page, limit },
      {
        startDate,
        endDate,
        employeeId: employeeId || undefined,
        assignedEmployeeId: assignedEmployeeId || undefined,
        departmentId: departmentId || undefined,
        status,
        priority,
      }
    );

    return ResponseHelper.success(
      result,
      'Lấy danh sách báo cáo của factory thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  // Xem chi tiết báo cáo
  @Get('detail/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xem chi tiết báo cáo' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const result = await this.maintenanceReportService.findOne(id);

    return ResponseHelper.success(
      result,
      'Lấy chi tiết báo cáo thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  // Cập nhật báo cáo (chuyển trạng thái, gán người xử lý, thêm ghi chú)
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cập nhật báo cáo' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateMaintenanceReportDto
  ) {
    const result = await this.maintenanceReportService.update(id, updateDto);

    return ResponseHelper.success(
      result,
      'Cập nhật báo cáo thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  // Xóa báo cáo (soft delete)
  @Delete(':id')
  @ApiOperation({ summary: 'Xóa báo cáo' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    const result =  await this.maintenanceReportService.remove(id);

    return ResponseHelper.success(
      result,
      'Xóa báo cáo thành công',
      HTTP_STATUS_CODE.OK,
    );
  }
}

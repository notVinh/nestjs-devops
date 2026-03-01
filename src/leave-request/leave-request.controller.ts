import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
  Request,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { LeaveRequestService } from './leave-request.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveRequestDto } from './dto/update-leave-request.dto';
import { ExportLeaveRequestDto } from './dto/export-leave-request.dto';
import { BaseResponse, ResponseHelper } from 'src/utils/base-response';
import { LeaveRequest } from './entities/leave-request.entity';
import { HTTP_STATUS_CODE } from 'src/utils/constant';
import { IPaginationResult } from 'src/utils/types/pagination-options.type';
import { PaginationLimitPipe } from 'src/utils/pipes/pagination-limit.pipe';
import { PaginationPagePipe } from 'src/utils/pipes/pagination-page.pipe';
import { EmployeeService } from 'src/employee/employee.service';

@Controller({ path: 'leave-requests', version: '1' })
@ApiTags('Leave Requests')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class LeaveRequestController {
  constructor(
    private readonly leaveService: LeaveRequestService,
    private readonly employeeService: EmployeeService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo đơn nghỉ phép' })
  async create(
    @Body() dto: CreateLeaveRequestDto
  ): Promise<BaseResponse<LeaveRequest>> {
    const data = await this.leaveService.create(dto);
    return ResponseHelper.success(
      data,
      'Tạo đơn nghỉ phép thành công',
      HTTP_STATUS_CODE.CREATED
    );
  }

  @Get('factory/:factoryId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Danh sách đơn nghỉ phép theo nhà máy với phân trang' })
  async findAllByFactory(
    @Param('factoryId') factoryId: string,
    @Query('page', new PaginationPagePipe()) page: number,
    @Query('limit', new PaginationLimitPipe(20, 20)) limit: number,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ): Promise<BaseResponse<IPaginationResult<LeaveRequest>>> {
    const result = await this.leaveService.findAllByFactory(
      { page, limit },
      +factoryId,
      { status, startDate, endDate, search },
    );
    return ResponseHelper.success(
      result,
      'Lấy danh sách đơn nghỉ phép thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  @Get('assigned-to-me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Danh sách đơn nghỉ phép được giao cho mình duyệt' })
  async findAssignedToMe(
    @Request() req,
    @Query('page', new PaginationPagePipe()) page: number,
    @Query('limit', new PaginationLimitPipe(20, 20)) limit: number,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<BaseResponse<IPaginationResult<LeaveRequest>>> {
    // Lấy thông tin nhân viên từ JWT
    const employee = await this.employeeService.getEmployeeByUserId(req.user.id);

    const result = await this.leaveService.findAssignedToMe(
      { page, limit },
      employee?.id,
      { status, startDate, endDate },
    );
    return ResponseHelper.success(
      result,
      'Lấy danh sách đơn nghỉ phép được giao thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  @Get('employee/:employeeId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Danh sách đơn nghỉ phép theo nhân viên với phân trang' })
  async findAllByEmployee(
    @Param('employeeId') employeeId: string,
    @Query('page', new PaginationPagePipe()) page: number,
    @Query('limit', new PaginationLimitPipe(20, 20)) limit: number,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<BaseResponse<IPaginationResult<LeaveRequest>>> {
    const result = await this.leaveService.findAllByEmployee(
      { page, limit },
      +employeeId,
      { status, startDate, endDate },
    );
    return ResponseHelper.success(
      result,
      'Lấy danh sách đơn nghỉ phép thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  @Get('detail/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy chi tiết đơn nghỉ phép theo ID' })
  async findOne(
    @Param('id', ParseIntPipe) id: number
  ): Promise<BaseResponse<LeaveRequest>> {
    const data = await this.leaveService.findOne(id);
    return ResponseHelper.success(
      data,
      'Lấy chi tiết đơn nghỉ phép thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cập nhật/duyệt đơn nghỉ phép' })
  async update(
    @Param('id') id: number,
    @Body() dto: UpdateLeaveRequestDto,
    @Request() req,
  ): Promise<BaseResponse<LeaveRequest>> {
    // Nếu đang approve/reject, tự động gán người quyết định từ user đang đăng nhập
    if (dto.status && ['approved', 'rejected'].includes(dto.status)) {
      const employee = await this.employeeService.getEmployeeByUserId(Number(req.user.id));
      if (employee) {
        dto.decidedByEmployeeId = employee.id;
      }
    }
    const data = await this.leaveService.update(Number(id), dto);
    return ResponseHelper.success(
      data,
      'Cập nhật thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Post(':id/remind')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gửi nhắc duyệt đơn nghỉ phép đến các người duyệt' })
  async sendReminder(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<BaseResponse<{ message: string }>> {
    await this.leaveService.sendReminderToApprovers(id);
    return ResponseHelper.success(
      { message: 'Đã gửi nhắc duyệt thành công' },
      'Gửi nhắc duyệt thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Post('export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xuất bảng tổng hợp nghỉ phép theo tháng ra file Excel' })
  async exportXLSX(
    @Body() exportDto: ExportLeaveRequestDto,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.leaveService.generateLeaveRequestXLSX(
      exportDto.factoryId,
      exportDto.year,
      exportDto.month,
    );

    const fileName = `tong-hop-nghi-phep-${exportDto.month}-${exportDto.year}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.end(Buffer.from(new Uint8Array(buffer as any)));
  }
}

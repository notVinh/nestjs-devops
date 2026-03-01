import {
  Controller,
  UseGuards,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Request,
  Res,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SupportRequestService } from './support-request.service';
import { CreateSupportRequestDto } from './dto/create-support-request.dto';
import { UpdateSupportRequestDto } from './dto/update-support-request.dto';
import { ExportSupportRequestDto } from './dto/export-support-request.dto';
import { BaseResponse, ResponseHelper } from 'src/utils/base-response';
import { SupportRequest } from './entities/support-request.entity';
import { HTTP_STATUS_CODE } from 'src/utils/constant';
import { IPaginationResult } from 'src/utils/types/pagination-options.type';
import { EmployeeService } from 'src/employee/employee.service';
import { PaginationLimitPipe } from 'src/utils/pipes/pagination-limit.pipe';
import { PaginationPagePipe } from 'src/utils/pipes/pagination-page.pipe';

@Controller({
  path: 'support-requests',
  version: '1',
})
@ApiTags('Support Request')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
export class SupportRequestController {
  constructor(
    private readonly supportRequestService: SupportRequestService,
    private readonly employeeService: EmployeeService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Nhân viên tạo đơn yêu cầu hỗ trợ' })
  async create(
    @Body() dto: CreateSupportRequestDto,
    @Request() req: any,
  ): Promise<BaseResponse<SupportRequest>> {
    const employee = await this.employeeService.getEmployeeByUserId(req.user.id);
    const data = await this.supportRequestService.create(employee.id, dto);
    return ResponseHelper.success(
      data,
      'Tạo đơn yêu cầu hỗ trợ thành công',
      HTTP_STATUS_CODE.CREATED,
    );
  }

  @Get('my-requests')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xem lịch sử đơn yêu cầu hỗ trợ của mình' })
  async getMyRequests(
    @Query('page', new PaginationPagePipe()) page: number,
    @Query('limit', new PaginationLimitPipe(20, 20)) limit: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Request() req?: any,
  ): Promise<BaseResponse<IPaginationResult<SupportRequest>>> {
    const employee = await this.employeeService.getEmployeeByUserId(req.user.id);
    const result = await this.supportRequestService.findMyRequests(
      employee.id,
      { page, limit },
      startDate,
      endDate,
      status,
    );
    return ResponseHelper.success(
      result,
      'Lấy lịch sử đơn yêu cầu hỗ trợ thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  @Get('assigned-to-me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xem đơn yêu cầu hỗ trợ được giao cho tôi duyệt' })
  async getRequestsAssignedToMe(
    @Query('page', new PaginationPagePipe()) page: number,
    @Query('limit', new PaginationLimitPipe(20, 20)) limit: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Request() req?: any,
  ): Promise<BaseResponse<IPaginationResult<SupportRequest>>> {
    const employee = await this.employeeService.getEmployeeByUserId(req.user.id);
    const result = await this.supportRequestService.findRequestsAssignedToMe(
      employee.id,
      { page, limit },
      startDate,
      endDate,
      status,
    );
    return ResponseHelper.success(
      result,
      'Lấy danh sách đơn được giao duyệt thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  @Get('factory/:factoryId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Quản lý xem tất cả đơn yêu cầu hỗ trợ của nhà máy' })
  async getByFactory(
    @Param('factoryId', ParseIntPipe) factoryId: number,
    @Query('page', new PaginationPagePipe()) page: number,
    @Query('limit', new PaginationLimitPipe(20, 20)) limit: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('employeeId', new DefaultValuePipe(0), ParseIntPipe) employeeId?: number,
    @Query('departmentId', new DefaultValuePipe(0), ParseIntPipe) departmentId?: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ): Promise<BaseResponse<IPaginationResult<SupportRequest>>> {
    const result = await this.supportRequestService.findByFactory(
      factoryId,
      { page, limit },
      {
        startDate,
        endDate,
        employeeId: employeeId || undefined,
        departmentId: departmentId || undefined,
        status,
        search,
      },
    );
    return ResponseHelper.success(
      result,
      'Lấy danh sách đơn yêu cầu hỗ trợ thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  @Get('detail/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xem chi tiết đơn yêu cầu hỗ trợ' })
  async getDetail(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<BaseResponse<SupportRequest>> {
    const data = await this.supportRequestService.findOne(id);
    return ResponseHelper.success(
      data,
      'Lấy chi tiết đơn yêu cầu hỗ trợ thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Cập nhật đơn yêu cầu hỗ trợ',
    description: 'Có thể: cập nhật thông tin (không truyền status), hủy đơn (status="cancelled"), hoặc duyệt/từ chối (status="approved"/"rejected")'
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSupportRequestDto,
    @Request() req: any,
  ): Promise<BaseResponse<SupportRequest>> {
    const employee = await this.employeeService.getEmployeeByUserId(req.user.id);
    const data = await this.supportRequestService.update(id, employee.id, dto);
    
    let message = 'Cập nhật đơn yêu cầu hỗ trợ thành công';
    if (dto.status === 'cancelled') {
      message = 'Hủy đơn yêu cầu hỗ trợ thành công';
    } else if (dto.status === 'approved') {
      message = 'Duyệt đơn yêu cầu hỗ trợ thành công';
    } else if (dto.status === 'rejected') {
      message = 'Từ chối đơn yêu cầu hỗ trợ thành công';
    }
    
    return ResponseHelper.success(
      data,
      message,
      HTTP_STATUS_CODE.OK,
    );
  }

  @Post(':id/remind')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gửi nhắc duyệt đơn yêu cầu hỗ trợ đến các người duyệt' })
  async sendReminder(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<BaseResponse<{ message: string }>> {
    await this.supportRequestService.sendReminderToApprovers(id);
    return ResponseHelper.success(
      { message: 'Đã gửi nhắc duyệt thành công' },
      'Gửi nhắc duyệt thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  @Post('export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xuất bảng tổng hợp hỗ trợ theo tháng ra file Excel' })
  async exportXLSX(
    @Body() exportDto: ExportSupportRequestDto,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.supportRequestService.generateSupportRequestXLSX(
      exportDto.factoryId,
      exportDto.year,
      exportDto.month,
    );

    const fileName = `tong-hop-ho-tro-${exportDto.month}-${exportDto.year}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.end(Buffer.from(new Uint8Array(buffer as any)));
  }
}

import {
  Controller,
  UseGuards,
  Post,
  Get,
  Body,
  Param,
  Query,
  Request,
  Res,
  HttpCode,
  HttpStatus,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { OvernightReportService } from './overnight-report.service';
import { CreateOvernightReportDto } from './dto/create-overnight-report.dto';
import { BaseResponse, ResponseHelper } from 'src/utils/base-response';
import { OvernightReport } from './entities/overnight-report.entity';
import { HTTP_STATUS_CODE } from 'src/utils/constant';
import { IPaginationResult } from 'src/utils/types/pagination-options.type';
import { EmployeeService } from 'src/employee/employee.service';
import { PaginationLimitPipe } from 'src/utils/pipes/pagination-limit.pipe';
import { PaginationPagePipe } from 'src/utils/pipes/pagination-page.pipe';

@Controller({
  path: 'overnight-report',
  version: '1'
})
@ApiTags('Overnight Report')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
export class OvernightReportController {
  constructor(
    private readonly overnightReportService: OvernightReportService,
    private readonly employeeService: EmployeeService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Nhân viên báo cáo vị trí qua đêm' })
  async create(
    @Body() dto: CreateOvernightReportDto,
    @Request() req: any,
  ): Promise<BaseResponse<OvernightReport>> {
    // Lấy thông tin nhân viên từ JWT
    const employee = await this.employeeService.getEmployeeByUserId(req.user.id);

    const data = await this.overnightReportService.create(employee.id, dto);

    return ResponseHelper.success(
      data,
      'Báo cáo vị trí qua đêm thành công',
      HTTP_STATUS_CODE.CREATED,
    );
  }

  @Get('my-reports')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xem lịch sử báo cáo qua đêm của mình' })
  async getMyReports(
    @Query('page', new PaginationPagePipe()) page: number,
    @Query('limit', new PaginationLimitPipe(20, 20)) limit: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Request() req?: any,
  ): Promise<BaseResponse<IPaginationResult<OvernightReport>>> {
    // Lấy thông tin nhân viên từ JWT
    const employee = await this.employeeService.getEmployeeByUserId(req.user.id);

    const result = await this.overnightReportService.findMyReports(
      employee.id,
      { page, limit },
      startDate,
      endDate,
    );

    return ResponseHelper.success(
      result,
      'Lấy lịch sử báo cáo qua đêm thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  @Get('assigned-to-me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xem báo cáo qua đêm được gửi đến tôi' })
  async getReportsAssignedToMe(
    @Query('page', new PaginationPagePipe()) page: number,
    @Query('limit', new PaginationLimitPipe(20, 20)) limit: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Request() req?: any,
  ): Promise<BaseResponse<IPaginationResult<OvernightReport>>> {
    // Lấy thông tin nhân viên từ JWT
    const employee = await this.employeeService.getEmployeeByUserId(req.user.id);

    const result = await this.overnightReportService.findReportsAssignedToMe(
      employee.id,
      { page, limit },
      startDate,
      endDate,
    );

    return ResponseHelper.success(
      result,
      'Lấy danh sách báo cáo được gửi đến tôi thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  @Get('factory/:factoryId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Quản lý xem tất cả báo cáo qua đêm của nhà máy' })
  async getByFactory(
    @Param('factoryId', ParseIntPipe) factoryId: number,
    @Query('page', new PaginationPagePipe()) page: number,
    @Query('limit', new PaginationLimitPipe(20, 20)) limit: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('employeeId', new DefaultValuePipe(0), ParseIntPipe) employeeId?: number,
    @Query('departmentId', new DefaultValuePipe(0), ParseIntPipe) departmentId?: number,
    @Query('status') status?: string,
  ): Promise<BaseResponse<IPaginationResult<OvernightReport>>> {
    const result = await this.overnightReportService.findByFactory(
      factoryId,
      { page, limit },
      {
        startDate,
        endDate,
        employeeId: employeeId || undefined,
        departmentId: departmentId || undefined,
        status,
      },
    );

    return ResponseHelper.success(
      result,
      'Lấy danh sách báo cáo qua đêm thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  @Get('detail/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xem chi tiết báo cáo qua đêm' })
  async getDetail(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<BaseResponse<OvernightReport>> {
    const data = await this.overnightReportService.findOne(id);

    return ResponseHelper.success(
      data,
      'Lấy chi tiết báo cáo qua đêm thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  @Get('export/:factoryId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xuất báo cáo qua đêm theo tháng ra file Excel' })
  async exportXLSX(
    @Param('factoryId', ParseIntPipe) factoryId: number,
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.overnightReportService.generateOvernightReportXLSX(
      factoryId,
      year,
      month,
    );

    const fileName = `bao-cao-qua-dem-${month}-${year}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(Buffer.from(buffer));
  }
}

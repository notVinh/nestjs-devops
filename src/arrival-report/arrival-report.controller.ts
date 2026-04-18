import {
  Controller,
  UseGuards,
  Post,
  Get,
  Body,
  Param,
  Query,
  Request,
  HttpCode,
  HttpStatus,
  DefaultValuePipe,
  ParseIntPipe,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ArrivalReportService } from './arrival-report.service';
import { CreateArrivalReportDto } from './dto/create-arrival-report.dto';
import { ReportDepartureDto } from './dto/report-departure.dto';
import { BaseResponse, ResponseHelper } from 'src/utils/base-response';
import { ArrivalReport } from './entities/arrival-report.entity';
import { HTTP_STATUS_CODE } from 'src/utils/constant';
import { IPaginationResult } from 'src/utils/types/pagination-options.type';
import { EmployeeService } from 'src/employee/employee.service';
import { PaginationLimitPipe } from 'src/utils/pipes/pagination-limit.pipe';
import { PaginationPagePipe } from 'src/utils/pipes/pagination-page.pipe';

@Controller({
    path: 'arrival-report',
    version: '1'
})
@ApiTags('Arrival Report')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
export class ArrivalReportController {
  constructor(
    private readonly arrivalReportService: ArrivalReportService,
    private readonly employeeService: EmployeeService,
  ) {}

  @Post('check-in')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Nhân viên báo cáo đã đến nơi công tác' })
  async checkIn(
    @Body() dto: CreateArrivalReportDto,
    @Request() req: any,
  ): Promise<BaseResponse<ArrivalReport>> {
    // Lấy thông tin nhân viên từ JWT
    const employee = await this.employeeService.getEmployeeByUserId(req.user.id);

    const data = await this.arrivalReportService.create(employee.id, dto);

    return ResponseHelper.success(
      data,
      'Báo cáo đến nơi công tác thành công',
      HTTP_STATUS_CODE.CREATED,
    );
  }

  @Post('check-out')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Nhân viên báo cáo rời nhà máy (check-out)' })
  async checkOut(
    @Body() dto: ReportDepartureDto,
    @Request() req: any,
  ): Promise<BaseResponse<ArrivalReport>> {
    const employee = await this.employeeService.getEmployeeByUserId(req.user.id);

    const data = await this.arrivalReportService.reportDeparture(
      employee.id,
      dto,
    );

    return ResponseHelper.success(
      data,
      'Báo cáo rời nhà máy thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  @Get('my-reports')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xem lịch sử báo cáo của mình' })
  async getMyReports(
    @Query('page', new PaginationPagePipe()) page: number,
    @Query('limit', new PaginationLimitPipe(20, 20)) limit: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Request() req?: any,
  ): Promise<BaseResponse<IPaginationResult<ArrivalReport>>> {
    // Lấy thông tin nhân viên từ JWT
    const employee = await this.employeeService.getEmployeeByUserId(req.user.id);

    const result = await this.arrivalReportService.findMyReports(
      employee.id,
      { page, limit, sortBy: 'createdAt', sortOrder: 'DESC' },
      startDate,
      endDate,
    );

    return ResponseHelper.success(
      result,
      'Lấy lịch sử báo cáo thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  @Get('factory/:factoryId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Quản lý xem tất cả báo cáo của nhà máy' })
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
  ): Promise<BaseResponse<IPaginationResult<ArrivalReport>>> {
    const result = await this.arrivalReportService.findByFactory(
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
      'Lấy danh sách báo cáo thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  @Get('detail/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xem chi tiết báo cáo' })
  async getDetail(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<BaseResponse<ArrivalReport>> {
    const data = await this.arrivalReportService.findOne(id);

    return ResponseHelper.success(
      data,
      'Lấy chi tiết báo cáo thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  @Get('export/:factoryId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xuất báo cáo đi đến nơi công tác theo tháng ra file Excel' })
  async exportXLSX(
    @Param('factoryId', ParseIntPipe) factoryId: number,
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.arrivalReportService.generateArrivalReportXLSX(
      factoryId,
      year,
      month,
    );

    const fileName = `bao-cao-den-noi-cong-tac-${month}-${year}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(Buffer.from(buffer));
  }
}

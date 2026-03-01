import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Query,
  Param,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { throwInternalServerError } from '../utils/error.helper';
import { AttendanceService } from './attendance.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { Attendance } from './entities/attendance.entity';
import { BaseResponse, ResponseHelper } from 'src/utils/base-response';
import { HTTP_STATUS_CODE } from 'src/utils/constant';
import { IPaginationResult } from 'src/utils/types/pagination-options.type';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/roles/roles.decorator';
import { RoleEnum } from 'src/roles/roles.enum';
import { RolesGuard } from 'src/roles/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { EmployeeService } from 'src/employee/employee.service';
import { ExportAttendanceDto } from './dto/export-attendance.dto';
import { Res } from '@nestjs/common';
import { Response } from 'express';
import { PaginationLimitPipe } from 'src/utils/pipes/pagination-limit.pipe';
import { PaginationPagePipe } from 'src/utils/pipes/pagination-page.pipe';

@Controller({
  path: 'attendance',
  version: '1',
})
@ApiTags('Attendance')
@Roles(
  RoleEnum.superAdmin,
  RoleEnum.factoryAdmin,
  RoleEnum.employee,
  RoleEnum.employee_gtg
)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly employeeService: EmployeeService
  ) {}

  @Post('check-in')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Chấm công vào' })
  async checkIn(
    @Body() checkInDto: CheckInDto,
    @Request() req: any
  ): Promise<BaseResponse<Attendance>> {
    const employeeInfo = await this.employeeService.getEmployeeByUserId(
      req.user.id
    );
    const attendance = await this.attendanceService.checkIn({
      ...checkInDto,
      factoryId: employeeInfo.factoryId,
      employeeId: employeeInfo.id,
    });
    return ResponseHelper.success(
      attendance,
      'Chấm công vào thành công',
      HTTP_STATUS_CODE.CREATED
    );
  }

  @Post('check-out')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chấm công ra' })
  async checkOut(
    @Body() checkOutDto: CheckOutDto
  ): Promise<BaseResponse<Attendance>> {
    const attendance = await this.attendanceService.checkOut(checkOutDto);
    return ResponseHelper.success(
      attendance,
      'Chấm công ra thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Get('employee/:employeeId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy lịch sử chấm công của nhân viên' })
  async getAttendanceByEmployee(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Query('page', new PaginationPagePipe()) page: number,
    @Query('limit', new PaginationLimitPipe(100, 10000)) limit: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ): Promise<BaseResponse<IPaginationResult<Attendance>>> {
    const result = await this.attendanceService.getAttendanceByEmployee(
      employeeId,
      {
        page,
        limit,
      },
      startDate,
      endDate
    );
    return ResponseHelper.success(
      result,
      'Lấy lịch sử chấm công thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Get('factory/:factoryId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy toàn bộ lịch sử chấm công của các nhân viên trong nhà máy' })
  async getAttendanceByFactory(
    @Param('factoryId', ParseIntPipe) factoryId: number,
    @Query('page', new PaginationPagePipe()) page: number,
    @Query('limit', new PaginationLimitPipe(100, 10000)) limit: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ): Promise<BaseResponse<IPaginationResult<Attendance>>> {
    const result = await this.attendanceService.getAttendanceByFactory(
      factoryId,
      {
        page,
        limit,
      },
      startDate,
      endDate
    );
    return ResponseHelper.success(
      result,
      'Lấy lịch sử chấm công của nhà máy thành công',
      HTTP_STATUS_CODE.OK
    );
  }


  @Get('today/:employeeId/:factoryId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy thông tin chấm công hôm nay của nhân viên' })
  async getTodayAttendance(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Param('factoryId', ParseIntPipe) factoryId: number
  ): Promise<BaseResponse<Attendance | null>> {
    const attendance = await this.attendanceService.getTodayAttendance(
      employeeId,
      factoryId
    );
    return ResponseHelper.success(
      attendance,
      'Lấy thông tin chấm công hôm nay thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Patch(':attendanceId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cập nhật thông tin chấm công' })
  async updateAttendance(
    @Param('attendanceId', ParseIntPipe) attendanceId: number,
    @Body() updateDto: UpdateAttendanceDto
  ): Promise<BaseResponse<Attendance>> {
    const attendance = await this.attendanceService.updateAttendance(
      attendanceId,
      updateDto
    );
    return ResponseHelper.success(
      attendance,
      'Cập nhật chấm công thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Post('export/attendance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export CSV chấm công theo tháng' })
  async exportAttendanceCSV(
    @Body() exportDto: ExportAttendanceDto,
    @Res() res: Response
  ) {
    try {
      const xlsxBuffer = await this.attendanceService.generateAttendanceXLSX(
        exportDto.factoryId,
        exportDto.year,
        exportDto.month
      );

      const filename = `cham-cong-${exportDto.year}-${exportDto.month
        .toString()
        .padStart(2, '0')}.xlsx`;
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(filename)}"`
      );
      res.setHeader('Cache-Control', 'no-cache');
      res.end(Buffer.from(new Uint8Array(xlsxBuffer as any)));
    } catch (error) {
      // Throw exception để NestJS xử lý
      throwInternalServerError('Có lỗi xảy ra khi export CSV');
    }
  }

  @Post('export/overtime')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export CSV tăng ca theo tháng' })
  async exportOvertimeCSV(
    @Body() exportDto: ExportAttendanceDto,
    @Res() res: Response
  ) {
    try {
      const xlsxBuffer = await this.attendanceService.generateOvertimeXLSX(
        exportDto.factoryId,
        exportDto.year,
        exportDto.month
      );

      const filename = `tang-ca-${exportDto.year}-${exportDto.month
        .toString()
        .padStart(2, '0')}.xlsx`;
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(filename)}"`
      );
      res.setHeader('Cache-Control', 'no-cache');
      res.end(Buffer.from(new Uint8Array(xlsxBuffer as any)));
    } catch (error) {
      // Throw exception để NestJS xử lý
      throwInternalServerError('Có lỗi xảy ra khi export CSV');
    }
  }
}

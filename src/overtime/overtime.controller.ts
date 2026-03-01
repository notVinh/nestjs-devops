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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { OvertimeService } from './overtime.service';
import { CreateOvertimeDto } from './dto/create-overtime.dto';
import { UpdateOvertimeDto } from './dto/update-overtime.dto';
import { BaseResponse, ResponseHelper } from 'src/utils/base-response';
import { Overtime } from './entities/overtime.entity';
import { HTTP_STATUS_CODE } from 'src/utils/constant';
import { IPaginationResult } from 'src/utils/types/pagination-options.type';
import { PaginationLimitPipe } from 'src/utils/pipes/pagination-limit.pipe';
import { PaginationPagePipe } from 'src/utils/pipes/pagination-page.pipe';
import { EmployeeService } from 'src/employee/employee.service';

@Controller({ path: 'overtime', version: '1' })
@ApiTags('Overtime')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class OvertimeController {
  constructor(
    private readonly overtimeService: OvertimeService,
    private readonly employeeService: EmployeeService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo đơn tăng ca' })
  async create(
    @Body() dto: CreateOvertimeDto,
  ): Promise<BaseResponse<Overtime>> {
    const data = await this.overtimeService.create(dto);
    return ResponseHelper.success(
      data,
      'Tạo đơn tăng ca thành công',
      HTTP_STATUS_CODE.CREATED,
    );
  }

  @Get('factory/:factoryId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Danh sách đơn tăng ca theo nhà máy với phân trang' })
  async findAllByFactory(
    @Param('factoryId') factoryId: string,
    @Query('page', new PaginationPagePipe()) page: number,
    @Query('limit', new PaginationLimitPipe(20, 20)) limit: number,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ): Promise<BaseResponse<IPaginationResult<Overtime>>> {
    const result = await this.overtimeService.findAllByFactory(
      { page, limit },
      +factoryId,
      { status, startDate, endDate, search },
    );
    return ResponseHelper.success(
      result,
      'Lấy danh sách đơn tăng ca thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  @Get('assigned-to-me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Danh sách đơn tăng ca được giao cho mình duyệt' })
  async findAssignedToMe(
    @Request() req,
    @Query('page', new PaginationPagePipe()) page: number,
    @Query('limit', new PaginationLimitPipe(20, 20)) limit: number,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<BaseResponse<IPaginationResult<Overtime>>> {
    // Lấy thông tin nhân viên từ JWT
    const employee = await this.employeeService.getEmployeeByUserId(req.user.id);

    const result = await this.overtimeService.findAssignedToMe(
      { page, limit },
      employee?.id,
      { status, startDate, endDate },
    );
    return ResponseHelper.success(
      result,
      'Lấy danh sách đơn tăng ca được giao thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  @Get('employee/:employeeId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Danh sách đơn tăng ca theo nhân viên với phân trang' })
  async findAllByEmployee(
    @Param('employeeId') employeeId: number,
    @Query('page', new PaginationPagePipe()) page: number,
    @Query('limit', new PaginationLimitPipe(20, 20)) limit: number,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<BaseResponse<IPaginationResult<Overtime>>> {
    const result = await this.overtimeService.findAllByEmployee(
      { page, limit },
      Number(employeeId),
      { status, startDate, endDate },
    );
    return ResponseHelper.success(
      result,
      'Lấy danh sách đơn tăng ca thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  @Get('detail/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xem chi tiết đơn tăng ca' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<BaseResponse<Overtime>> {
    const data = await this.overtimeService.findOne(Number(id));
    return ResponseHelper.success(
      data,
      'Lấy thông tin đơn tăng ca thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cập nhật/duyệt đơn tăng ca' })
  async update(
    @Param('id') id: number,
    @Body() dto: UpdateOvertimeDto,
    @Request() req,
  ): Promise<BaseResponse<Overtime>> {
    // Nếu đang approve/reject, tự động gán người quyết định từ user đang đăng nhập
    if (dto.status && ['approved', 'rejected'].includes(dto.status)) {
      const employee = await this.employeeService.getEmployeeByUserId(Number(req.user.id));
      if (employee) {
        dto.decidedByEmployeeId = employee.id;
      }
    }
    const data = await this.overtimeService.update(Number(id), dto);
    return ResponseHelper.success(
      data,
      'Cập nhật thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  @Post(':id/remind')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gửi nhắc duyệt đơn tăng ca đến các người duyệt' })
  async sendReminder(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<BaseResponse<{ message: string }>> {
    await this.overtimeService.sendReminderToApprovers(id);
    return ResponseHelper.success(
      { message: 'Đã gửi nhắc duyệt thành công' },
      'Gửi nhắc duyệt thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  @Post(':id/supplement')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo đơn tăng ca bổ sung cho đơn đã được duyệt' })
  async createSupplement(
    @Param('id', ParseIntPipe) parentOvertimeId: number,
    @Body() dto: CreateOvertimeDto,
  ): Promise<BaseResponse<Overtime>> {
    const data = await this.overtimeService.createSupplement(parentOvertimeId, dto);
    return ResponseHelper.success(
      data,
      'Tạo đơn bổ sung thành công. Đơn này cần được duyệt riêng.',
      HTTP_STATUS_CODE.CREATED,
    );
  }
}

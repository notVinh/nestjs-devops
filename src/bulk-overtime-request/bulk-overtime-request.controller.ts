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
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { BulkOvertimeRequestService } from './bulk-overtime-request.service';
import { CreateBulkOvertimeRequestDto } from './dto/create-bulk-overtime-request.dto';
import { UpdateBulkOvertimeRequestDto } from './dto/update-bulk-overtime-request.dto';
import { ConfirmBulkOvertimeRequestDto } from './dto/confirm-bulk-overtime-request.dto';
import { BaseResponse, ResponseHelper } from 'src/utils/base-response';
import { BulkOvertimeRequest } from './entities/bulk-overtime-request.entity';
import { HTTP_STATUS_CODE } from 'src/utils/constant';
import { EmployeeService } from 'src/employee/employee.service';

@Controller({ path: 'bulk-overtime-request', version: '1' })
@ApiTags('Bulk Overtime Request')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class BulkOvertimeRequestController {
  constructor(
    private readonly bulkOvertimeRequestService: BulkOvertimeRequestService,
    private readonly employeeService: EmployeeService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo đơn tăng ca hàng loạt (draft)' })
  async create(
    @Body() dto: CreateBulkOvertimeRequestDto,
    @Request() req: any,
  ): Promise<BaseResponse<BulkOvertimeRequest>> {
    // Get employee info from user
    const employeeInfo = await this.employeeService.getEmployeeByUserId(
      Number(req.user.id),
    );
    const data = await this.bulkOvertimeRequestService.create(dto, employeeInfo.id);
    return ResponseHelper.success(
      data,
      'Tạo đơn tăng ca hàng loạt thành công',
      HTTP_STATUS_CODE.CREATED,
    );
  }

  @Get('factory/:factoryId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Danh sách đơn tăng ca hàng loạt theo nhà máy' })
  async findAllByFactory(
    @Param('factoryId') factoryId: number,
  ): Promise<BaseResponse<BulkOvertimeRequest[]>> {
    const list = await this.bulkOvertimeRequestService.findAllByFactory(
      Number(factoryId),
    );
    return ResponseHelper.success(list, 'Thành công', HTTP_STATUS_CODE.OK);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chi tiết đơn tăng ca hàng loạt' })
  async findOne(
    @Param('id') id: number,
  ): Promise<BaseResponse<BulkOvertimeRequest>> {
    const data = await this.bulkOvertimeRequestService.findOne(Number(id));
    return ResponseHelper.success(data, 'Thành công', HTTP_STATUS_CODE.OK);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cập nhật đơn tăng ca hàng loạt (chỉ draft)' })
  async update(
    @Param('id') id: number,
    @Body() dto: UpdateBulkOvertimeRequestDto,
  ): Promise<BaseResponse<BulkOvertimeRequest>> {
    const data = await this.bulkOvertimeRequestService.update(Number(id), dto);
    return ResponseHelper.success(
      data,
      'Cập nhật thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xác nhận và tạo overtime records cho tất cả nhân viên' })
  async confirm(
    @Param('id') id: number,
    @Body() body: { autoApprove?: boolean },
    @Request() req: any,
  ): Promise<BaseResponse<BulkOvertimeRequest>> {
    // Get employee info from user
    const employeeInfo = await this.employeeService.getEmployeeByUserId(
      Number(req.user.id),
    );
    const dto: ConfirmBulkOvertimeRequestDto = {
      confirmedByEmployeeId: employeeInfo.id,
      autoApprove: body.autoApprove ?? false,
    };
    const data = await this.bulkOvertimeRequestService.confirm(Number(id), dto);
    return ResponseHelper.success(
      data,
      'Xác nhận đơn tăng ca hàng loạt thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hủy đơn tăng ca hàng loạt (chỉ draft)' })
  async cancel(
    @Param('id') id: number,
  ): Promise<BaseResponse<BulkOvertimeRequest>> {
    const data = await this.bulkOvertimeRequestService.cancel(Number(id));
    return ResponseHelper.success(
      data,
      'Hủy đơn thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa đơn tăng ca hàng loạt (soft delete)' })
  async softDelete(
    @Param('id') id: number,
  ): Promise<BaseResponse<void>> {
    await this.bulkOvertimeRequestService.softDelete(Number(id));
    return ResponseHelper.success(
      null as any,
      'Xóa đơn thành công',
      HTTP_STATUS_CODE.OK,
    );
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Delete,
  UseGuards,
  Request,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiQuery, ApiTags, ApiOperation } from '@nestjs/swagger';
import { PurchaseOrderService } from './purchase-order.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { ConfirmExpectedDateDto } from './dto/confirm-expected-date.dto';
import { UpdatePurchaseOrderStatusDto } from './dto/update-purchase-order-status.dto';
import { ConfirmReceivedDto } from './dto/confirm-received.dto';
import { Roles } from 'src/roles/roles.decorator';
import { RolesGuard } from 'src/roles/roles.guard';
import { RoleEnum } from 'src/roles/roles.enum';
import { BaseResponse, ResponseHelper } from 'src/utils/base-response';
import { HTTP_STATUS_CODE } from 'src/utils/constant';
import { PurchaseOrder } from './entities/purchase-order.entity';

@ApiTags('Purchase Orders')
@Controller({
  path: 'purchase-orders',
  version: '1',
})
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
@Roles(RoleEnum.superAdmin, RoleEnum.factoryAdmin, RoleEnum.employee_gtg)
export class PurchaseOrderController {
  constructor(private readonly purchaseOrderService: PurchaseOrderService) {}

  /**
   * Tạo đơn mua hàng
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo đơn mua hàng' })
  async create(
    @Body() createDto: CreatePurchaseOrderDto,
    @Request() req,
  ): Promise<BaseResponse<PurchaseOrder>> {
    const employeeId = req.user?.employee?.id;
    const data = await this.purchaseOrderService.create(createDto, employeeId);
    return ResponseHelper.success(
      data,
      'Tạo đơn mua hàng thành công',
      HTTP_STATUS_CODE.CREATED,
    );
  }

  /**
   * Lấy danh sách đơn mua hàng
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy danh sách đơn mua hàng' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async findAll(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('status') status: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req,
  ): Promise<BaseResponse<any>> {
    const employeeId = req.user?.employee?.id || null;
    const data = await this.purchaseOrderService.findAll(
      employeeId,
      parseInt(page) || 1,
      parseInt(limit) || 10,
      status,
      startDate,
      endDate,
    );
    return ResponseHelper.success(
      data,
      'Lấy danh sách đơn mua hàng thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  /**
   * Lấy chi tiết đơn mua hàng
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy chi tiết đơn mua hàng' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<BaseResponse<PurchaseOrder>> {
    const data = await this.purchaseOrderService.findOne(id);
    return ResponseHelper.success(
      data,
      'Lấy chi tiết đơn mua hàng thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  /**
   * Nhập ngày dự kiến hàng về (thay cho approve)
   */
  @Patch(':id/confirm-expected-date')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Nhập ngày dự kiến hàng về' })
  async confirmExpectedDate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfirmExpectedDateDto,
    @Request() req,
  ): Promise<BaseResponse<PurchaseOrder>> {
    const employeeId = req.user?.employee?.id;
    const data = await this.purchaseOrderService.confirmExpectedDate(id, dto, employeeId);
    return ResponseHelper.success(
      data,
      'Nhập ngày dự kiến hàng về thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  /**
   * Xác nhận đã nhận hàng
   */
  @Patch(':id/confirm-received')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xác nhận đã nhận hàng' })
  async confirmReceived(
    @Param('id', ParseIntPipe) id: number,
    @Body() confirmDto: ConfirmReceivedDto,
    @Request() req,
  ): Promise<BaseResponse<PurchaseOrder>> {
    const employeeId = req.user?.employee?.id;
    const data = await this.purchaseOrderService.confirmReceived(id, confirmDto, employeeId);
    return ResponseHelper.success(
      data,
      'Xác nhận nhận hàng thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  /**
   * Cập nhật trạng thái đơn mua hàng (completed, cancelled)
   */
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cập nhật trạng thái đơn mua hàng' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() statusDto: UpdatePurchaseOrderStatusDto,
    @Request() req,
  ): Promise<BaseResponse<PurchaseOrder>> {
    const employeeId = req.user?.employee?.id;
    const data = await this.purchaseOrderService.updateStatus(id, statusDto, employeeId);
    return ResponseHelper.success(
      data,
      'Cập nhật trạng thái đơn mua hàng thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  /**
   * Xóa đơn mua hàng
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa đơn mua hàng' })
  async delete(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<BaseResponse<void>> {
    await this.purchaseOrderService.delete(id);
    return ResponseHelper.success(
      null as any,
      'Xóa đơn mua hàng thành công',
      HTTP_STATUS_CODE.OK,
    );
  }
}

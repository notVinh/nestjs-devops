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
import { PurchaseRequisitionService } from './purchase-requisition.service';
import { CreatePurchaseRequisitionDto } from './dto/create-purchase-requisition.dto';
import { ApprovePurchaseRequisitionDto } from './dto/approve-purchase-requisition.dto';
import { RejectPurchaseRequisitionDto } from './dto/reject-purchase-requisition.dto';
import { RequestRevisionPurchaseRequisitionDto } from './dto/request-revision-purchase-requisition.dto';
import { ResubmitPurchaseRequisitionDto } from './dto/resubmit-purchase-requisition.dto';
import { ConfirmPurchaseRequisitionDto } from './dto/confirm-purchase-requisition.dto';
import { Roles } from 'src/roles/roles.decorator';
import { RolesGuard } from 'src/roles/roles.guard';
import { RoleEnum } from 'src/roles/roles.enum';
import { BaseResponse, ResponseHelper } from 'src/utils/base-response';
import { HTTP_STATUS_CODE } from 'src/utils/constant';
import { PurchaseRequisition } from './entities/purchase-requisition.entity';
import { EmployeeService } from 'src/employee/employee.service';

@ApiTags('Purchase Requisitions')
@Controller({
  path: 'purchase-requisitions',
  version: '1',
})
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
@Roles(RoleEnum.superAdmin, RoleEnum.factoryAdmin, RoleEnum.employee_gtg)
export class PurchaseRequisitionController {
  constructor(
    private readonly purchaseRequisitionService: PurchaseRequisitionService,
    private readonly employeeService: EmployeeService,
  ) {}

  /**
   * Tạo đề xuất mua hàng
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo đề xuất mua hàng' })
  async create(
    @Body() createDto: CreatePurchaseRequisitionDto,
    @Request() req,
  ): Promise<BaseResponse<PurchaseRequisition>> {
    const employee = await this.employeeService.getEmployeeByUserId(req.user.id);
    const data = await this.purchaseRequisitionService.create(
      createDto,  
      employee.id,
      employee.factoryId,
    );
    return ResponseHelper.success(
      data,
      'Tạo đề xuất mua hàng thành công',
      HTTP_STATUS_CODE.CREATED,
    );
  }

  /**
   * Lấy danh sách đề xuất mua hàng
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy danh sách đề xuất mua hàng' })
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
    const employee = await this.employeeService.getEmployeeByUserId(req.user.id); 
    const data = await this.purchaseRequisitionService.findAll(
      employee.id,
      parseInt(page) || 1,
      parseInt(limit) || 10,
      status,
      startDate,
      endDate,
    );
    return ResponseHelper.success(
      data,
      'Lấy danh sách đề xuất mua hàng thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  /**
   * Lấy chi tiết đề xuất mua hàng
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy chi tiết đề xuất mua hàng' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<BaseResponse<PurchaseRequisition>> {
    const data = await this.purchaseRequisitionService.findOne(id);
    return ResponseHelper.success(
      data,
      'Lấy chi tiết đề xuất mua hàng thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  /**
   * Duyệt đề xuất mua hàng
   */
  @Patch(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Duyệt đề xuất mua hàng' })
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApprovePurchaseRequisitionDto,
    @Request() req,
  ): Promise<BaseResponse<PurchaseRequisition>> {
    const employee = await this.employeeService.getEmployeeByUserId(req.user.id);
    const data = await this.purchaseRequisitionService.approve(
      id,
      dto,
      employee.id,
    );
    return ResponseHelper.success(
      data,
      'Duyệt đề xuất mua hàng thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  /**
   * Từ chối đề xuất mua hàng
   */
  @Patch(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Từ chối đề xuất mua hàng' })
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectPurchaseRequisitionDto,
    @Request() req,
  ): Promise<BaseResponse<PurchaseRequisition>> {
    const employee = await this.employeeService.getEmployeeByUserId(req.user.id);
    const data = await this.purchaseRequisitionService.reject(
      id,
      dto,
      employee.id,
    );
    return ResponseHelper.success(
      data,
      'Từ chối đề xuất mua hàng thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  /**
   * Yêu cầu chỉnh sửa đề xuất mua hàng
   */
  @Patch(':id/request-revision')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Yêu cầu chỉnh sửa đề xuất mua hàng' })
  async requestRevision(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RequestRevisionPurchaseRequisitionDto,
    @Request() req,
  ): Promise<BaseResponse<PurchaseRequisition>> {
    const employee = await this.employeeService.getEmployeeByUserId(req.user.id);
    const data = await this.purchaseRequisitionService.requestRevision(
      id,
      dto,
      employee.id,
    );
    return ResponseHelper.success(
      data,
      'Yêu cầu chỉnh sửa đề xuất mua hàng thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  /**
   * Gửi lại đề xuất mua hàng sau khi chỉnh sửa
   */
  @Patch(':id/resubmit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gửi lại đề xuất mua hàng sau khi chỉnh sửa' })
  async resubmit(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResubmitPurchaseRequisitionDto,
    @Request() req,
  ): Promise<BaseResponse<PurchaseRequisition>> {
    const employee = await this.employeeService.getEmployeeByUserId(req.user.id);
    const data = await this.purchaseRequisitionService.resubmit(
      id,
      dto,
      employee.id,
    );
    return ResponseHelper.success(
      data,
      'Gửi lại đề xuất mua hàng thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  /**
   * Xác nhận đã mua hàng cho đề xuất mua hàng
   */
  @Patch(':id/confirm-purchase')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xác nhận đã mua hàng cho đề xuất mua hàng' })
  async confirmPurchase(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfirmPurchaseRequisitionDto,
    @Request() req,
  ): Promise<BaseResponse<PurchaseRequisition>> {
    const employee = await this.employeeService.getEmployeeByUserId(req.user.id);
    const data = await this.purchaseRequisitionService.confirmPurchase(
      id,
      dto,
      employee.id,
    );
    return ResponseHelper.success(
      data,
      'Xác nhận mua hàng thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  /**
   * Xóa đề xuất mua hàng
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa đề xuất mua hàng' })
  async delete(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<BaseResponse<void>> {
    await this.purchaseRequisitionService.delete(id);
    return ResponseHelper.success(
      null as any,
      'Xóa đề xuất mua hàng thành công',
      HTTP_STATUS_CODE.OK,
    );
  }
}

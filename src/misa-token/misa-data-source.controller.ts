import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { RolesGuard } from 'src/roles/roles.guard';
import { Roles } from 'src/roles/roles.decorator';
import { RoleEnum } from 'src/roles/roles.enum';
import { MisaDataSourceService } from './misa-data-source.service';
import { MisaApiConfig } from './entities/misa-api-config.entity';
import { MisaDataSource } from './entities/misa-data-source.entity';
import { MisaCustomer } from './entities/misa-customer.entity';
import { MisaProduct } from './entities/misa-product.entity';
import { MisaStock } from './entities/misa-stock.entity';
import { MisaSaOrder } from './entities/misa-sa-order.entity';
import { MisaSaOrderDetail } from './entities/misa-sa-order-detail.entity';
import { MisaPuOrder } from './entities/misa-pu-order.entity';
import { MisaPuOrderDetail } from './entities/misa-pu-order-detail.entity';
import { MisaInventoryBalance } from './entities/misa-inventory-balance.entity';
import { BaseResponse, ResponseHelper } from 'src/utils/base-response';
import { HTTP_STATUS_CODE } from 'src/utils/constant';
import { UsersService } from 'src/users/users.service';
import { EmployeeService } from 'src/employee/employee.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

@ApiTags('Misa Data Source')
@ApiBearerAuth()
@Roles(RoleEnum.superAdmin, RoleEnum.employee_gtg)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({
  path: 'misa-data-source',
  version: '1',
})
export class MisaDataSourceController {
  constructor(
    private readonly misaDataSourceService: MisaDataSourceService,
    private readonly usersService: UsersService,
    private readonly employeeService: EmployeeService
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all data sources' })
  async getAll(): Promise<BaseResponse<MisaDataSource[]>> {
    const data = await this.misaDataSourceService.getAllDataSources();
    return ResponseHelper.success(
      data,
      'Lấy danh sách data source thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Get('api-config')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get API config' })
  async getApiConfig(): Promise<BaseResponse<MisaApiConfig | null>> {
    const data = await this.misaDataSourceService.getApiConfig();
    return ResponseHelper.success(
      data,
      'Lấy cấu hình API thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Post('api-config')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save API config' })
  async saveApiConfig(
    @Body() data: Partial<MisaApiConfig>
  ): Promise<BaseResponse<MisaApiConfig>> {
    const saved = await this.misaDataSourceService.saveApiConfig(data);
    return ResponseHelper.success(
      saved,
      'Lưu cấu hình API thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Get('code/:code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get data source by code' })
  async getByCode(
    @Param('code') code: string
  ): Promise<BaseResponse<MisaDataSource | null>> {
    const data = await this.misaDataSourceService.getDataSourceByCode(code);
    return ResponseHelper.success(
      data,
      'Lấy data source thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get data source by ID' })
  async getById(
    @Param('id', ParseIntPipe) id: number
  ): Promise<BaseResponse<MisaDataSource | null>> {
    const data = await this.misaDataSourceService.getDataSourceById(id);
    return ResponseHelper.success(
      data,
      'Lấy data source thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create data source' })
  async create(
    @Body() data: Partial<MisaDataSource>
  ): Promise<BaseResponse<MisaDataSource>> {
    const created = await this.misaDataSourceService.createDataSource(data);
    return ResponseHelper.success(
      created,
      'Tạo data source thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update data source' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Partial<MisaDataSource>
  ): Promise<BaseResponse<MisaDataSource>> {
    const updated = await this.misaDataSourceService.updateDataSource(id, data);
    return ResponseHelper.success(
      updated,
      'Cập nhật data source thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete data source' })
  async delete(
    @Param('id', ParseIntPipe) id: number
  ): Promise<BaseResponse<null>> {
    await this.misaDataSourceService.deleteDataSource(id);
    return ResponseHelper.success(
      null,
      'Xóa data source thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Post('reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update display orders for drag and drop' })
  async reorder(
    @Body() data: { orders: { id: number; displayOrder: number }[] }
  ): Promise<BaseResponse<null>> {
    await this.misaDataSourceService.updateDisplayOrders(data.orders);
    return ResponseHelper.success(
      null,
      'Cập nhật thứ tự thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Get(':id/sync-history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get sync history for data source' })
  async getSyncHistory(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page = 1,
    @Query('limit') limit = 10
  ): Promise<BaseResponse<{ data: any[]; total: number }>> {
    const result = await this.misaDataSourceService.getSyncHistory(
      id,
      +page,
      +limit
    );
    return ResponseHelper.success(
      result,
      'Lấy lịch sử sync thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Get('sync-history/:syncId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get sync history by sync ID' })
  async getSyncHistoryById(
    @Param('syncId', ParseIntPipe) syncId: number
  ): Promise<BaseResponse<any>> {
    const result = await this.misaDataSourceService.getSyncHistoryById(syncId);
    if (!result) {
      return ResponseHelper.error(
        'Không tìm thấy lịch sử sync',
        HTTP_STATUS_CODE.NOT_FOUND
      );
    }
    return ResponseHelper.success(
      result,
      'Lấy lịch sử sync thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Post(':id/sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start sync for data source' })
  async startSync(@Param('id', ParseIntPipe) id: number): Promise<
    BaseResponse<{
      success: boolean;
      message: string;
      syncId?: number;
      total?: number;
      syncStats?: {
        created: number;
        updated: number;
        unchanged: number;
        errors: number;
      };
    }>
  > {
    const result = await this.misaDataSourceService.startSync(id);
    return ResponseHelper.success(result, result.message, HTTP_STATUS_CODE.OK);
  }

  @Post(':id/test-fetch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test fetch data from MISA (without saving)' })
  async testFetch(
    @Param('id', ParseIntPipe) id: number,
    @Query('pageIndex') pageIndex = 1,
    @Query('pageSize') pageSize = 20
  ): Promise<
    BaseResponse<{
      success: boolean;
      message: string;
      data?: any;
      total?: number;
    }>
  > {
    const result = await this.misaDataSourceService.testFetch(
      id,
      +pageIndex,
      +pageSize
    );
    return ResponseHelper.success(result, result.message, HTTP_STATUS_CODE.OK);
  }

  // ========== Customer APIs ==========

  @Post('customers/recalculate-ranks')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tính lại rank & doanh thu cho toàn bộ khách hàng và lưu vào DB' })
  async recalculateCustomerRanks(): Promise<BaseResponse<{ updated: number; errors: number }>> {
    const result = await this.misaDataSourceService.recalculateCustomerRanks();
    return ResponseHelper.success(
      result,
      `Cập nhật rank xong: ${result.updated} khách hàng`,
      HTTP_STATUS_CODE.OK
    );
  }

  @Get('customers/list')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all customers from database (rank đọc từ DB, filter được theo rank)' })
  async getCustomers(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('search') search?: string,
    @Query('rank') rank?: string,
  ): Promise<BaseResponse<{ data: (MisaCustomer & { orders: any[]; orderCount: number; totalRevenue: number })[]; total: number }>> {
    const result = await this.misaDataSourceService.getCustomers(
      +page,
      +limit,
      search,
      rank,
    );
    return ResponseHelper.success(
      result,
      'Lấy danh sách khách hàng thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Get('customers/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get customer by ID' })
  async getCustomerById(
    @Param('id', ParseIntPipe) id: number
  ): Promise<BaseResponse<MisaCustomer | null>> {
    const data = await this.misaDataSourceService.getCustomerById(id);
    return ResponseHelper.success(
      data,
      'Lấy thông tin khách hàng thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  // ========== Product APIs ==========

  @Get('products/list')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all products from database' })
  async getProducts(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('search') search?: string
  ): Promise<BaseResponse<{ data: MisaProduct[]; total: number }>> {
    const result = await this.misaDataSourceService.getProducts(
      +page,
      +limit,
      search
    );
    return ResponseHelper.success(
      result,
      'Lấy danh sách sản phẩm thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Get('products/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get product by ID' })
  async getProductById(
    @Param('id', ParseIntPipe) id: number
  ): Promise<BaseResponse<MisaProduct | null>> {
    const data = await this.misaDataSourceService.getProductById(id);
    return ResponseHelper.success(
      data,
      'Lấy thông tin sản phẩm thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  // ========== Stock APIs ==========

  @Get('stocks/list')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all stocks from database' })
  async getStocks(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('search') search?: string,
    @Query('includeInactive') includeInactive?: string
  ): Promise<BaseResponse<{ data: MisaStock[]; total: number }>> {
    const result = await this.misaDataSourceService.getStocks(
      +page,
      +limit,
      search,
      includeInactive === 'true'
    );
    return ResponseHelper.success(
      result,
      'Lấy danh sách kho thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Get('inventory-balance/:stockId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get inventory balance by stock ID' })
  async getInventoryByStock(
    @Param('stockId') stockId: string
  ): Promise<BaseResponse<MisaInventoryBalance[]>> {
    const data = await this.misaDataSourceService.getInventoryBalanceByStockId(
      stockId
    );
    return ResponseHelper.success(
      data,
      'Lấy danh sách tồn kho thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Get('stocks/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get stock by ID' })
  async getStockById(
    @Param('id', ParseIntPipe) id: number
  ): Promise<BaseResponse<MisaStock | null>> {
    const data = await this.misaDataSourceService.getStockById(id);
    return ResponseHelper.success(
      data,
      'Lấy thông tin kho thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  // ========== Supplier (Vendor) APIs ==========

  @Get('suppliers/list')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all suppliers (vendors) from database' })
  async getSuppliers(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('search') search?: string
  ): Promise<BaseResponse<{ data: MisaCustomer[]; total: number }>> {
    const result = await this.misaDataSourceService.getSuppliers(
      +page,
      +limit,
      search
    );
    return ResponseHelper.success(
      result,
      'Lấy danh sách nhà cung cấp thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Get('suppliers/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get supplier by ID' })
  async getSupplierById(
    @Param('id', ParseIntPipe) id: number
  ): Promise<BaseResponse<MisaCustomer | null>> {
    const data = await this.misaDataSourceService.getSupplierById(id);
    return ResponseHelper.success(
      data,
      'Lấy thông tin nhà cung cấp thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  // ========== Purchase Order APIs ==========

  @Get('pu-orders/list')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all purchase orders from database' })
  async getPuOrders(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('search') search?: string
  ): Promise<BaseResponse<{ data: MisaPuOrder[]; total: number }>> {
    const result = await this.misaDataSourceService.getPuOrders(
      +page,
      +limit,
      search
    );
    return ResponseHelper.success(
      result,
      'Lấy danh sách đơn mua hàng thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Get('pu-orders/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get purchase order by ID with details' })
  async getPuOrderById(
    @Param('id', ParseIntPipe) id: number
  ): Promise<BaseResponse<any>> {
    const { order, details } =
      await this.misaDataSourceService.getPuOrderWithDetails(id);
    const data = order ? { ...order, details } : null;
    return ResponseHelper.success(
      data,
      'Lấy thông tin đơn mua hàng thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Get('pu-orders/:id/details')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get purchase order with details by ID' })
  async getPuOrderWithDetails(
    @Param('id', ParseIntPipe) id: number
  ): Promise<
    BaseResponse<{ order: MisaPuOrder | null; details: MisaPuOrderDetail[] }>
  > {
    const data = await this.misaDataSourceService.getPuOrderWithDetails(id);
    return ResponseHelper.success(
      data,
      'Lấy thông tin đơn mua hàng và chi tiết thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Patch('pu-orders/:id/local-fields')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update local fields for purchase order' })
  async updatePuOrderLocalFields(
    @Param('id', ParseIntPipe) id: number,
    @Request() request: any,
    @Body()
    data: {
      expectedArrivalDate?: string | null;
      purchaseRequisitionId?: number | null;
      saOrderId?: number | null;
      localNotes?: string | null;
    }
  ): Promise<BaseResponse<MisaPuOrder | null>> {
    const userId = request.user?.id;
    let updatedById: number | undefined;
    let updatedByName: string | undefined;

    if (userId) {
      const employee = await this.employeeService.getEmployeeByUserId(userId);
      if (employee) {
        updatedById = employee.id;
        const user = await this.usersService.findOne({ id: userId });
        updatedByName = user?.fullName || undefined;
      }
    }

    const updated = await this.misaDataSourceService.updatePuOrderLocalFields(
      id,
      data,
      updatedById,
      updatedByName
    );

    if (!updated) {
      return ResponseHelper.error(
        'Không tìm thấy đơn mua hàng',
        HTTP_STATUS_CODE.NOT_FOUND
      );
    }

    return ResponseHelper.success(
      updated,
      'Cập nhật thông tin đơn mua hàng thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Post('pu-orders/manual')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Tạo đơn mua hàng thủ công khi không thể sync từ MISA',
  })
  async createManualPurchaseOrder(
    @Body()
    body: {
      refNo: string;
      refDate?: string;
      // Thông tin nhà cung cấp
      accountObjectId?: string;
      accountObjectName?: string;
      accountObjectCode?: string;
      accountObjectAddress?: string;
      accountObjectTaxCode?: string;
      journalMemo?: string;
      // Local fields
      expectedArrivalDate?: string;
      purchaseRequisitionId?: number;
      saOrderId?: number;
      localNotes?: string;
      // Chi tiết đơn mua hàng
      details?: Array<{
        inventoryItemCode: string;
        description?: string;
        stockCode?: string;
        unitName?: string;
        quantity: number;
        unitPrice: number;
        vatRate?: number;
      }>;
    }
  ): Promise<
    BaseResponse<{ success: boolean; message: string; order?: MisaPuOrder }>
  > {
    if (!body.refNo) {
      return ResponseHelper.error(
        'Số đơn mua hàng (refNo) là bắt buộc',
        HTTP_STATUS_CODE.BAD_REQUEST
      );
    }

    const result = await this.misaDataSourceService.createManualPurchaseOrder({
      refNo: body.refNo,
      refDate: body.refDate ? new Date(body.refDate) : undefined,
      accountObjectId: body.accountObjectId,
      accountObjectName: body.accountObjectName,
      accountObjectCode: body.accountObjectCode,
      accountObjectAddress: body.accountObjectAddress,
      accountObjectTaxCode: body.accountObjectTaxCode,
      journalMemo: body.journalMemo,
      expectedArrivalDate: body.expectedArrivalDate
        ? new Date(body.expectedArrivalDate)
        : undefined,
      purchaseRequisitionId: body.purchaseRequisitionId,
      saOrderId: body.saOrderId,
      localNotes: body.localNotes,
      details: body.details,
    });

    if (!result.success) {
      return ResponseHelper.error(result.message, HTTP_STATUS_CODE.BAD_REQUEST);
    }

    return ResponseHelper.success(result, result.message, HTTP_STATUS_CODE.OK);
  }

  @Post('pu-orders/:id/confirm-arrival')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm goods arrival for purchase order' })
  async confirmPuOrderArrival(
    @Param('id', ParseIntPipe) id: number,
    @Request() request: any,
    @Body() body: { notes?: string }
  ): Promise<
    BaseResponse<{ success: boolean; message: string; order?: MisaPuOrder }>
  > {
    const userId = request.user?.id;

    const employee = await this.employeeService.getEmployeeByUserId(userId);
    if (!employee) {
      return ResponseHelper.error(
        'Không tìm thấy thông tin nhân viên',
        HTTP_STATUS_CODE.NOT_FOUND
      );
    }

    const user = await this.usersService.findOne({ id: userId });
    const employeeName = user?.fullName || `NV #${employee.id}`;

    const result = await this.misaDataSourceService.confirmPuOrderArrival(
      id,
      employee.id,
      employeeName,
      body?.notes
    );

    if (!result.success) {
      return ResponseHelper.error(result.message, HTTP_STATUS_CODE.BAD_REQUEST);
    }

    return ResponseHelper.success(result, result.message, HTTP_STATUS_CODE.OK);
  }

  // ========== Sales Order APIs ==========

  @Get('sa-orders/list')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all sales orders from database' })
  async getSaOrders(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('workflowStatus') workflowStatus?: string,
    @Query('source') source?: string,
    @Query('priority') priority?: string,
    @Query('region') region?: string,
    @Query('localStatus') localStatus?: string,
    @Query('province') province?: string,
    @Query('reqDeliveryStartDate') reqDeliveryStartDate?: string,
    @Query('reqDeliveryEndDate') reqDeliveryEndDate?: string,
    @Query('actualExportStartDate') actualExportStartDate?: string,
    @Query('actualExportEndDate') actualExportEndDate?: string
  ): Promise<BaseResponse<{ data: MisaSaOrder[]; meta: any }>> {
    const result = await this.misaDataSourceService.getSaOrders(
      +page,
      +limit,
      search,
      startDate,
      endDate,
      workflowStatus,
      source,
      priority,
      region,
      localStatus,
      province,
      reqDeliveryStartDate,
      reqDeliveryEndDate,
      actualExportStartDate,
      actualExportEndDate
    );
    return ResponseHelper.success(
      result,
      'Lấy danh sách đơn hàng thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Get('sa-orders/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get sales order by ID' })
  async getSaOrderById(
    @Param('id', ParseIntPipe) id: number
  ): Promise<BaseResponse<MisaSaOrder | null>> {
    const data = await this.misaDataSourceService.getSaOrderById(id);
    return ResponseHelper.success(
      data,
      'Lấy thông tin đơn hàng thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Get('sa-orders/:id/details')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get sales order with details by ID' })
  async getSaOrderWithDetails(
    @Param('id', ParseIntPipe) id: number
  ): Promise<
    BaseResponse<{ order: MisaSaOrder | null; details: MisaSaOrderDetail[] }>
  > {
    const data = await this.misaDataSourceService.getSaOrderWithDetails(id);
    return ResponseHelper.success(
      data,
      'Lấy thông tin đơn hàng và chi tiết thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Patch('sa-orders/:id/local-fields')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update local fields for sales order (Sale Admin/Kế toán)',
  })
  async updateSaOrderLocalFields(
    @Param('id', ParseIntPipe) id: number,
    @Request() request: any,
    @Body()
    data: {
      requestedDeliveryDate?: string | null;
      actualExportDate?: string | null;
      goodsStatus?: string | null;
      machineType?: string | null;
      region?: string | null;
      priority?: string | null;
      localDeliveryStatus?: string | null;
      saleType?: string | null;
      backDate?: number | null;
      receiverName?: string | null;
      receiverPhone?: string | null;
      specificAddress?: string | null;
      province?: string | null;
      needsAdditionalOrder?: boolean;
      additionalOrderNote?: string | null;
    }
  ): Promise<BaseResponse<MisaSaOrder | null>> {
    // Lấy tên người dùng để gửi thông báo
    const userId = request.user?.id;
    let updatedByName: string | undefined;
    if (userId) {
      const user = await this.usersService.findOne({ id: userId });
      updatedByName = user?.fullName || undefined;
    }

    const updated = await this.misaDataSourceService.updateSaOrderLocalFields(
      id,
      data,
      updatedByName
    );
    if (!updated) {
      return ResponseHelper.error(
        'Không tìm thấy đơn hàng',
        HTTP_STATUS_CODE.NOT_FOUND
      );
    }
    return ResponseHelper.success(
      updated,
      'Cập nhật thông tin đơn hàng thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  // ========== Manual Order APIs ==========

  @Post('sa-orders/manual')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tạo đơn hàng thủ công khi không thể sync từ MISA' })
  async createManualOrder(
    @Body()
    body: {
      refNo: string;
      refDate?: string;
      // Thông tin khách hàng
      accountObjectId?: string;
      accountObjectName?: string;
      accountObjectCode?: string;
      accountObjectAddress?: string;
      accountObjectTaxCode?: string;
      journalMemo?: string;
      // Local fields
      requestedDeliveryDate?: string;
      goodsStatus?: string;
      machineType?: string;
      region?: string;
      priority?: string;
      saleType?: string;
      receiverName?: string;
      receiverPhone?: string;
      specificAddress?: string;
      // Chi tiết đơn hàng
      details?: Array<{
        inventoryItemCode: string;
        description?: string;
        stockCode?: string;
        unitName?: string;
        quantity: number;
        unitPrice: number;
        vatRate?: number;
      }>;
    }
  ): Promise<
    BaseResponse<{ success: boolean; message: string; order?: MisaSaOrder }>
  > {
    if (!body.refNo) {
      return ResponseHelper.error(
        'Số đơn hàng (refNo) là bắt buộc',
        HTTP_STATUS_CODE.BAD_REQUEST
      );
    }

    const result = await this.misaDataSourceService.createManualOrder({
      refNo: body.refNo,
      refDate: body.refDate ? new Date(body.refDate) : undefined,
      accountObjectId: body.accountObjectId,
      accountObjectName: body.accountObjectName,
      accountObjectCode: body.accountObjectCode,
      accountObjectAddress: body.accountObjectAddress,
      accountObjectTaxCode: body.accountObjectTaxCode,
      journalMemo: body.journalMemo,
      requestedDeliveryDate: body.requestedDeliveryDate
        ? new Date(body.requestedDeliveryDate)
        : undefined,
      goodsStatus: body.goodsStatus,
      machineType: body.machineType,
      region: body.region,
      priority: body.priority,
      saleType: body.saleType,
      receiverName: body.receiverName,
      receiverPhone: body.receiverPhone,
      specificAddress: body.specificAddress,
      details: body.details,
    });

    if (!result.success) {
      return ResponseHelper.error(result.message, HTTP_STATUS_CODE.BAD_REQUEST);
    }

    return ResponseHelper.success(result, result.message, HTTP_STATUS_CODE.OK);
  }

  // ========== Workflow APIs ==========

  @Post('sa-orders/:id/submit-for-approval')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sale Admin gửi đơn hàng để BGĐ duyệt' })
  async submitOrderForApproval(
    @Param('id', ParseIntPipe) id: number,
    @Request() request: any,
    @Body()
    body: { needsAdditionalOrder?: boolean; additionalOrderNote?: string }
  ): Promise<
    BaseResponse<{ success: boolean; message: string; order?: MisaSaOrder }>
  > {
    const userId = request.user.id;

    // Lấy employee từ userId
    const employee = await this.employeeService.getEmployeeByUserId(userId);
    if (!employee) {
      return ResponseHelper.error(
        'Không tìm thấy thông tin nhân viên',
        HTTP_STATUS_CODE.NOT_FOUND
      );
    }

    // Lấy tên nhân viên
    const user = await this.usersService.findOne({ id: userId });
    const employeeName = user?.fullName || `NV #${employee.id}`;

    const result = await this.misaDataSourceService.submitOrderForApproval(
      id,
      employee.id,
      employeeName,
      body?.needsAdditionalOrder,
      body?.additionalOrderNote
    );

    if (!result.success) {
      return ResponseHelper.error(result.message, HTTP_STATUS_CODE.BAD_REQUEST);
    }

    return ResponseHelper.success(result, result.message, HTTP_STATUS_CODE.OK);
  }

  @Post('sa-orders/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'BGĐ duyệt hoặc từ chối đơn hàng' })
  async approveOrRejectOrder(
    @Param('id', ParseIntPipe) id: number,
    @Request() request: any,
    @Body() body: { approved: boolean; note?: string }
  ): Promise<
    BaseResponse<{ success: boolean; message: string; order?: MisaSaOrder }>
  > {
    const userId = request.user.id;

    // Lấy employee từ userId
    const employee = await this.employeeService.getEmployeeByUserId(userId);
    if (!employee) {
      return ResponseHelper.error(
        'Không tìm thấy thông tin nhân viên',
        HTTP_STATUS_CODE.NOT_FOUND
      );
    }

    // Lấy tên nhân viên
    const user = await this.usersService.findOne({ id: userId });
    const employeeName = user?.fullName || `NV #${employee.id}`;

    const result = await this.misaDataSourceService.approveOrRejectOrder(
      id,
      employee.id,
      employeeName,
      body.approved,
      body.note
    );

    if (!result.success) {
      return ResponseHelper.error(result.message, HTTP_STATUS_CODE.BAD_REQUEST);
    }

    return ResponseHelper.success(result, result.message, HTTP_STATUS_CODE.OK);
  }

  @Get('sa-orders/workflow/:status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy danh sách đơn hàng theo trạng thái workflow' })
  async getSaOrdersByWorkflowStatus(
    @Param('status') status: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50
  ): Promise<BaseResponse<{ data: MisaSaOrder[]; total: number }>> {
    const result = await this.misaDataSourceService.getSaOrdersByWorkflowStatus(
      status,
      +page,
      +limit
    );
    return ResponseHelper.success(
      result,
      'Lấy danh sách đơn hàng thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Post('sa-orders/:id/confirm-completion')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Quản lý xác nhận hoàn tất đơn hàng (sau khi lắp đặt xong)',
  })
  async confirmOrderCompletion(
    @Param('id', ParseIntPipe) id: number,
    @Request() request: any,
    @Body() body: { note?: string }
  ): Promise<
    BaseResponse<{ success: boolean; message: string; order?: MisaSaOrder }>
  > {
    const userId = request.user.id;

    // Lấy employee từ userId
    const employee = await this.employeeService.getEmployeeByUserId(userId);
    if (!employee) {
      return ResponseHelper.error(
        'Không tìm thấy thông tin nhân viên',
        HTTP_STATUS_CODE.NOT_FOUND
      );
    }

    const result = await this.misaDataSourceService.confirmOrderCompletion(
      id,
      employee.id,
      body?.note
    );

    if (!result.success) {
      return ResponseHelper.error(result.message, HTTP_STATUS_CODE.BAD_REQUEST);
    }

    return ResponseHelper.success(result, result.message, HTTP_STATUS_CODE.OK);
  }

  // ========== Assignment APIs ==========

  @Post('sa-orders/:id/assignments')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Giao việc cho đơn hàng (hỗ trợ single hoặc multiple employees)',
  })
  async createAssignment(
    @Param('id', ParseIntPipe) orderId: number,
    @Request() request: any,
    @Body() body: CreateAssignmentDto
  ): Promise<BaseResponse<any>> {
    const userId = request.user.id;

    const employee = await this.employeeService.getEmployeeByUserId(userId);
    if (!employee) {
      return ResponseHelper.error(
        'Không tìm thấy thông tin nhân viên',
        HTTP_STATUS_CODE.NOT_FOUND
      );
    }

    // Get all employee IDs to assign
    const assignedToIds = body.getAssignedToIds();
    if (assignedToIds.length === 0) {
      return ResponseHelper.error(
        'Vui lòng chọn ít nhất 1 nhân viên để giao việc',
        HTTP_STATUS_CODE.BAD_REQUEST
      );
    }

    // Create assignments for all employees
    const results: any[] = [];
    const errors: string[] = [];

    for (const assignedToId of assignedToIds) {
      const result = await this.misaDataSourceService.createAssignment({
        orderId,
        taskType: body.taskType,
        assignedToId,
        assignedById: employee.id,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        notes: body.notes,
      });

      if (result.success) {
        results.push(result.assignment);
      } else {
        errors.push(`NV #${assignedToId}: ${result.message}`);
      }
    }

    // Return results
    if (results.length === 0) {
      return ResponseHelper.error(
        errors.join('; ') || 'Không thể giao việc',
        HTTP_STATUS_CODE.BAD_REQUEST
      );
    }

    // If some failed, include warning
    const message =
      errors.length > 0
        ? `Đã giao việc cho ${results.length}/${
            assignedToIds.length
          } nhân viên. Lỗi: ${errors.join('; ')}`
        : `Đã giao việc cho ${results.length} nhân viên`;

    // Return single assignment if only one, array if multiple
    const data =
      results.length === 1
        ? { success: true, assignment: results[0], message }
        : { success: true, assignments: results, message };

    return ResponseHelper.success(data, message, HTTP_STATUS_CODE.OK);
  }

  @Get('sa-orders/:id/assignments')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy danh sách công việc của đơn hàng' })
  async getAssignmentsByOrderId(
    @Param('id', ParseIntPipe) orderId: number
  ): Promise<BaseResponse<any>> {
    const assignments =
      await this.misaDataSourceService.getAssignmentsByOrderId(orderId);
    return ResponseHelper.success(
      assignments,
      'Lấy danh sách công việc thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Patch('assignments/:id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bắt đầu thực hiện công việc' })
  async startAssignment(
    @Param('id', ParseIntPipe) assignmentId: number,
    @Request() request: any
  ): Promise<BaseResponse<any>> {
    const userId = request.user.id;

    const employee = await this.employeeService.getEmployeeByUserId(userId);
    if (!employee) {
      return ResponseHelper.error(
        'Không tìm thấy thông tin nhân viên',
        HTTP_STATUS_CODE.NOT_FOUND
      );
    }

    const result = await this.misaDataSourceService.startAssignment(
      assignmentId,
      +employee.id
    );

    if (!result.success) {
      return ResponseHelper.error(result.message, HTTP_STATUS_CODE.BAD_REQUEST);
    }

    return ResponseHelper.success(result, result.message, HTTP_STATUS_CODE.OK);
  }

  @Patch('assignments/:id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hoàn thành công việc' })
  async completeAssignment(
    @Param('id', ParseIntPipe) assignmentId: number,
    @Request() request: any,
    @Body()
    body: {
      completionNotes?: string;
      attachments?: string[];
    }
  ): Promise<BaseResponse<any>> {
    const userId = request.user.id;

    const employee = await this.employeeService.getEmployeeByUserId(userId);
    if (!employee) {
      return ResponseHelper.error(
        'Không tìm thấy thông tin nhân viên',
        HTTP_STATUS_CODE.NOT_FOUND
      );
    }

    const result = await this.misaDataSourceService.completeAssignment(
      assignmentId,
      +employee.id,
      body
    );

    if (!result.success) {
      return ResponseHelper.error(result.message, HTTP_STATUS_CODE.BAD_REQUEST);
    }

    return ResponseHelper.success(result, result.message, HTTP_STATUS_CODE.OK);
  }

  @Patch('assignments/:id/incomplete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Báo chưa hoàn thành công việc' })
  async markAssignmentIncomplete(
    @Param('id', ParseIntPipe) assignmentId: number,
    @Request() request: any,
    @Body()
    body: {
      incompleteReason: string;
      attachments?: string[];
    }
  ): Promise<BaseResponse<any>> {
    const userId = request.user.id;

    const employee = await this.employeeService.getEmployeeByUserId(userId);
    if (!employee) {
      return ResponseHelper.error(
        'Không tìm thấy thông tin nhân viên',
        HTTP_STATUS_CODE.NOT_FOUND
      );
    }

    const result = await this.misaDataSourceService.markAssignmentIncomplete(
      assignmentId,
      employee.id,
      body
    );

    if (!result.success) {
      return ResponseHelper.error(result.message, HTTP_STATUS_CODE.BAD_REQUEST);
    }

    return ResponseHelper.success(result, result.message, HTTP_STATUS_CODE.OK);
  }

  @Post('assignments/:id/reassign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Giao lại công việc cho người khác' })
  async reassignTask(
    @Param('id', ParseIntPipe) assignmentId: number,
    @Request() request: any,
    @Body()
    body: {
      newAssignedToId: number;
      reassignReason: string;
      scheduledAt?: string;
      notes?: string;
    }
  ): Promise<BaseResponse<any>> {
    const userId = request.user.id;

    const employee = await this.employeeService.getEmployeeByUserId(userId);
    if (!employee) {
      return ResponseHelper.error(
        'Không tìm thấy thông tin nhân viên',
        HTTP_STATUS_CODE.NOT_FOUND
      );
    }

    const result = await this.misaDataSourceService.reassignTask(
      assignmentId,
      employee.id,
      {
        ...body,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      }
    );

    if (!result.success) {
      return ResponseHelper.error(result.message, HTTP_STATUS_CODE.BAD_REQUEST);
    }

    return ResponseHelper.success(result, result.message, HTTP_STATUS_CODE.OK);
  }

  @Post('assignments/:id/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Giao tiếp việc (sau khi chưa hoàn thành)' })
  async retryAssignment(
    @Param('id', ParseIntPipe) assignmentId: number,
    @Request() request: any,
    @Body()
    body: {
      notes?: string;
      scheduledAt?: string;
    }
  ): Promise<BaseResponse<any>> {
    const userId = request.user.id;

    const employee = await this.employeeService.getEmployeeByUserId(userId);
    if (!employee) {
      return ResponseHelper.error(
        'Không tìm thấy thông tin nhân viên',
        HTTP_STATUS_CODE.NOT_FOUND
      );
    }

    const result = await this.misaDataSourceService.retryAssignment(
      assignmentId,
      employee.id,
      {
        notes: body.notes,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      }
    );

    if (!result.success) {
      return ResponseHelper.error(result.message, HTTP_STATUS_CODE.BAD_REQUEST);
    }

    return ResponseHelper.success(result, result.message, HTTP_STATUS_CODE.OK);
  }

  @Patch('assignments/:id/blocked')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Báo sự cố tạm dừng công việc' })
  async markAssignmentBlocked(
    @Param('id', ParseIntPipe) assignmentId: number,
    @Request() request: any,
    @Body()
    body: {
      blockedReason: string;
      attachments?: string[];
    }
  ): Promise<BaseResponse<any>> {
    const userId = request.user.id;

    const employee = await this.employeeService.getEmployeeByUserId(userId);
    if (!employee) {
      return ResponseHelper.error(
        'Không tìm thấy thông tin nhân viên',
        HTTP_STATUS_CODE.NOT_FOUND
      );
    }

    const result = await this.misaDataSourceService.markAssignmentBlocked(
      assignmentId,
      employee.id,
      body
    );

    if (!result.success) {
      return ResponseHelper.error(result.message, HTTP_STATUS_CODE.BAD_REQUEST);
    }

    return ResponseHelper.success(result, result.message, HTTP_STATUS_CODE.OK);
  }

  @Patch('assignments/:id/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bắt đầu lại công việc sau khi tạm dừng' })
  async resumeAssignment(
    @Param('id', ParseIntPipe) assignmentId: number,
    @Request() request: any,
    @Body()
    body: {
      notes?: string;
    }
  ): Promise<BaseResponse<any>> {
    const userId = request.user.id;

    const employee = await this.employeeService.getEmployeeByUserId(userId);
    if (!employee) {
      return ResponseHelper.error(
        'Không tìm thấy thông tin nhân viên',
        HTTP_STATUS_CODE.NOT_FOUND
      );
    }

    const result = await this.misaDataSourceService.resumeAssignment(
      assignmentId,
      employee.id,
      body
    );

    if (!result.success) {
      return ResponseHelper.error(result.message, HTTP_STATUS_CODE.BAD_REQUEST);
    }

    return ResponseHelper.success(result, result.message, HTTP_STATUS_CODE.OK);
  }

  @Post('sa-orders/:orderId/retry-task-group')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Giao lại việc cho cả nhóm (tạo lần mới)' })
  async retryTaskGroup(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Request() request: any,
    @Body()
    body: {
      taskType: string;
      retryEmployeeIds: number[];
      newEmployeeIds: number[];
      notes?: string;
    }
  ): Promise<BaseResponse<any>> {
    const userId = request.user.id;

    const employee = await this.employeeService.getEmployeeByUserId(userId);
    if (!employee) {
      return ResponseHelper.error(
        'Không tìm thấy thông tin nhân viên',
        HTTP_STATUS_CODE.NOT_FOUND
      );
    }

    const result = await this.misaDataSourceService.retryTaskGroup(
      orderId,
      body.taskType,
      employee.id,
      {
        retryEmployeeIds: body.retryEmployeeIds || [],
        newEmployeeIds: body.newEmployeeIds || [],
        notes: body.notes,
      }
    );

    if (!result.success) {
      return ResponseHelper.error(result.message, HTTP_STATUS_CODE.BAD_REQUEST);
    }

    return ResponseHelper.success(result, result.message, HTTP_STATUS_CODE.OK);
  }

  @Delete('assignments/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa giao việc' })
  async deleteAssignment(
    @Param('id', ParseIntPipe) assignmentId: number,
    @Request() request: any
  ): Promise<BaseResponse<any>> {
    const userId = request.user.id;

    const employee = await this.employeeService.getEmployeeByUserId(userId);
    if (!employee) {
      return ResponseHelper.error(
        'Không tìm thấy thông tin nhân viên',
        HTTP_STATUS_CODE.NOT_FOUND
      );
    }

    const result = await this.misaDataSourceService.deleteAssignment(
      assignmentId,
      employee.id
    );

    if (!result.success) {
      return ResponseHelper.error(result.message, HTTP_STATUS_CODE.BAD_REQUEST);
    }

    return ResponseHelper.success(result, result.message, HTTP_STATUS_CODE.OK);
  }

  // ========== Task Report APIs ==========

  @Post('assignments/:id/reports')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tạo báo cáo tiến độ hàng ngày' })
  async createDailyReport(
    @Param('id', ParseIntPipe) assignmentId: number,
    @Request() request: any,
    @Body()
    body: {
      status: string;
      progressPercent?: number;
      description: string;
      blockedReason?: string;
      attachments?: string[];
    }
  ): Promise<BaseResponse<any>> {
    const userId = request.user.id;

    const employee = await this.employeeService.getEmployeeByUserId(userId);
    if (!employee) {
      return ResponseHelper.error(
        'Không tìm thấy thông tin nhân viên',
        HTTP_STATUS_CODE.NOT_FOUND
      );
    }

    const result = await this.misaDataSourceService.createDailyReport(
      assignmentId,
      employee.id,
      body
    );

    if (!result.success) {
      return ResponseHelper.error(result.message, HTTP_STATUS_CODE.BAD_REQUEST);
    }

    return ResponseHelper.success(result, result.message, HTTP_STATUS_CODE.OK);
  }

  @Get('assignments/:id/reports')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy danh sách báo cáo của công việc' })
  async getReportsByAssignmentId(
    @Param('id', ParseIntPipe) assignmentId: number
  ): Promise<BaseResponse<any>> {
    const reports = await this.misaDataSourceService.getReportsByAssignmentId(
      assignmentId
    );
    return ResponseHelper.success(
      reports,
      'Lấy danh sách báo cáo thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Get('sa-orders/:id/reports')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy tất cả báo cáo của đơn hàng' })
  async getReportsByOrderId(
    @Param('id', ParseIntPipe) orderId: number
  ): Promise<BaseResponse<any>> {
    const reports = await this.misaDataSourceService.getReportsByOrderId(
      orderId
    );
    return ResponseHelper.success(
      reports,
      'Lấy danh sách báo cáo thành công',
      HTTP_STATUS_CODE.OK
    );
  }
}

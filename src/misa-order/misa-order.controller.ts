import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
  Patch,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { MisaOrderService } from './misa-order.service';
import { CreateMisaOrderDto } from './dto/create-misa-order.dto';
import { ApproveMisaOrderDto } from './dto/approve-misa-order.dto';
import { AssignMisaOrderDto } from './dto/assign-misa-order.dto';
import { UpdateMisaOrderStatusDto } from './dto/update-misa-order-status.dto';
import { CompleteInventoryCheckDto } from './dto/complete-inventory-check.dto';
import { Roles } from 'src/roles/roles.decorator';
import { RoleEnum } from 'src/roles/roles.enum';
import { RolesGuard } from 'src/roles/roles.guard';
import { EmployeeService } from 'src/employee/employee.service';
import { BaseResponse, ResponseHelper } from 'src/utils/base-response';
import { HTTP_STATUS_CODE } from 'src/utils/constant';
import { MisaOrder } from './entities/misa-order.entity';

@Controller({
  path: 'misa-orders',
  version: '1',
})
@ApiTags('MisaOrder')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class MisaOrderController {
  constructor(
    private readonly misaOrderService: MisaOrderService,
    private readonly employeeService: EmployeeService,
  ) {}

  /**
   * Tạo đơn đặt hàng (chỉ employee_gtg)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo đơn đặt hàng MISA' })
  @Roles(RoleEnum.employee_gtg, RoleEnum.superAdmin)
  async create(
    @Body() createDto: CreateMisaOrderDto,
    @Req() req: any,
  ): Promise<BaseResponse<MisaOrder>> {
      const employee = await this.employeeService.getEmployeeByUserId(req.user.id);
    const data = await this.misaOrderService.create(createDto, employee.id);
    return ResponseHelper.success(
      data,
      'Tạo đơn đặt hàng thành công',
      HTTP_STATUS_CODE.CREATED,
    );
  }

  /**
   * Lấy danh sách đơn hàng của mình (dựa trên permissions) - For Mobile ONLY
   * Logic:
   * - Nếu có permission 'view_all_orders': Xem TẤT CẢ đơn trong factory
   * - Nếu không: Chỉ xem đơn mình tạo + đơn được assign
   *
   * CHỈ dành cho employee_gtg (Factory 1) và employee (các factory khác)
   *
   * Query params:
   * - page: số trang (default: 1)
   * - limit: số bản ghi trên trang (default: 20)
   * - status: lọc theo trạng thái (pending, approved, rejected, etc.)
   * - step: lọc theo bước công việc (warehouse, quality_check, delivery, etc.)
   * - startDate: ngày bắt đầu (YYYY-MM-DD)
   * - endDate: ngày kết thúc (YYYY-MM-DD)
   * - search: tìm kiếm theo orderNumber, customerName, productName
   */
  @Get('my-orders')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy danh sách đơn hàng của mình (mobile)' })
  @Roles(RoleEnum.employee_gtg, RoleEnum.superAdmin)
  async findMyOrders(
    @Req() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('step') step?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ): Promise<BaseResponse<MisaOrder[]>> {
    const employee = await this.employeeService.getEmployeeByUserId(req.user.id);
    const data = await this.misaOrderService.findOrdersByPermissions(
      employee.id,
      {
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
        status,
        step,
        startDate,
        endDate,
        search,
      },
    );
    return ResponseHelper.success(
      data,
      'Lấy danh sách đơn hàng thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  /**
   * Lấy danh sách đơn hàng theo factory
   */
  @Get('factory/:factoryId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy danh sách đơn hàng theo nhà máy' })
  @Roles(
    RoleEnum.superAdmin,
    RoleEnum.factoryAdmin,
    RoleEnum.employee_gtg,
    RoleEnum.employee,
  )
  async findAllByFactory(
    @Param('factoryId', ParseIntPipe) factoryId: number,
    @Query() query: any,
  ): Promise<BaseResponse<any>> {
    const result = await this.misaOrderService.findAllByFactory(factoryId, query);
    return ResponseHelper.success(
      result,
      'Lấy danh sách đơn hàng thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  /**
   * Lấy danh sách đơn chờ duyệt (cho Giám Đốc/Phó Giám Đốc)
   */
  @Get('pending-approval')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy danh sách đơn chờ duyệt' })
  @Roles(RoleEnum.superAdmin, RoleEnum.factoryAdmin, RoleEnum.employee)
  async findPendingApproval(
    @Query('factoryId', ParseIntPipe) factoryId: number,
  ): Promise<BaseResponse<MisaOrder[]>> {
    const data = await this.misaOrderService.findPendingApproval(factoryId);
    return ResponseHelper.success(
      data,
      'Lấy danh sách đơn chờ duyệt thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  /**
   * Lấy danh sách đơn được giao cho mình
   */
  @Get('assigned-to-me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy danh sách đơn được giao cho mình' })
  @Roles(RoleEnum.employee_gtg, RoleEnum.factoryAdmin, RoleEnum.superAdmin)
  async findAssignedToMe(@Req() req: any): Promise<BaseResponse<MisaOrder[]>> {
    const employee = await this.employeeService.getEmployeeByUserId(req.user.id);
    const data = await this.misaOrderService.findAssignedToMe(employee.id);
    return ResponseHelper.success(
      data,
      'Lấy danh sách đơn được giao thành công',
      HTTP_STATUS_CODE.OK,
    );
  }


  /**
   * Lấy chi tiết đơn hàng
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy chi tiết đơn hàng' })
  @Roles(
    RoleEnum.superAdmin,
    RoleEnum.factoryAdmin,
    RoleEnum.employee_gtg,
    RoleEnum.employee,
  )
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<BaseResponse<MisaOrder>> {
    const data = await this.misaOrderService.findOne(id);
    return ResponseHelper.success(
      data,
      'Lấy chi tiết đơn hàng thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  /**
   * Duyệt đơn hàng (chỉ Giám Đốc/Phó Giám Đốc có trong department tương ứng)
   */
  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Duyệt đơn hàng' })
  @Roles(RoleEnum.superAdmin, RoleEnum.factoryAdmin, RoleEnum.employee_gtg)
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() approveDto: ApproveMisaOrderDto,
    @Req() req: any,
  ): Promise<BaseResponse<MisaOrder>> {
    // SuperAdmin không cần employee record
    let employeeId: number | null = null;
    if (req.user.role?.id !== RoleEnum.superAdmin) {
      const employee = await this.employeeService.getEmployeeByUserId(req.user.id);
      employeeId = employee.id;
    }

    const data = await this.misaOrderService.approve(id, approveDto, employeeId);
    return ResponseHelper.success(
      data,
      'Duyệt đơn hàng thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  /**
   * Assign đơn hàng cho nhân viên
   */
  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Giao đơn hàng cho nhân viên' })
  @Roles(RoleEnum.superAdmin, RoleEnum.factoryAdmin, RoleEnum.employee_gtg)
  async assign(
    @Param('id', ParseIntPipe) id: number,
    @Body() assignDto: AssignMisaOrderDto,
    @Req() req: any,
  ): Promise<BaseResponse<MisaOrder>> {
    // SuperAdmin không cần employee record
    let employeeId: number | null = null;
    // if (req.user.role?.id !== RoleEnum.superAdmin) {
      const employee = await this.employeeService.getEmployeeByUserId(req.user.id);
      employeeId = employee.id;
    // }

    const data = await this.misaOrderService.assign(id, assignDto, employeeId);
    return ResponseHelper.success(
      data,
      'Giao đơn hàng thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  /**
   * Cập nhật ghi chú đơn hàng (dành cho phòng kinh doanh)
   */
  @Patch(':id/notes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cập nhật ghi chú đơn hàng' })
  @Roles(
    RoleEnum.superAdmin,
    RoleEnum.factoryAdmin,
    RoleEnum.employee_gtg,
    RoleEnum.employee,
  )
  async updateNotes(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { notes: string },
    @Req() req: any,
  ): Promise<BaseResponse<MisaOrder>> {
    // SuperAdmin không cần employee record
    let employeeId: number | null = null;
    if (req.user.role?.id !== RoleEnum.superAdmin) {
      const employee = await this.employeeService.getEmployeeByUserId(req.user.id);
      employeeId = employee.id;
    }

    const data = await this.misaOrderService.updateNotes(id, dto.notes, employeeId);

    return ResponseHelper.success(
      data,
      'Cập nhật ghi chú thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  /**
   * Cập nhật trạng thái đơn hàng (processing, completed, cancelled)
   */
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cập nhật trạng thái đơn hàng' })
  @Roles(
    RoleEnum.superAdmin,
    RoleEnum.factoryAdmin,
    RoleEnum.employee_gtg,
    RoleEnum.employee,
  )
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateMisaOrderStatusDto,
    @Req() req: any,
  ): Promise<BaseResponse<MisaOrder>> {
    // SuperAdmin không cần employee record
    let employeeId: number | null = null;
    if (req.user.role?.id !== RoleEnum.superAdmin) {
      const employee = await this.employeeService.getEmployeeByUserId(req.user.id);
      employeeId = employee.id;
    }

    const data = await this.misaOrderService.updateStatus(
      id,
      updateStatusDto,
      employeeId,
    );
    return ResponseHelper.success(
      data,
      'Cập nhật trạng thái đơn hàng thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  /**
   * Hoàn thành kiểm tra hàng tồn (Phòng kinh doanh)
   */
  @Post(':id/complete-inventory-check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hoàn thành kiểm tra hàng tồn' })
  @Roles(
    RoleEnum.superAdmin,
    RoleEnum.factoryAdmin,
    RoleEnum.employee_gtg,
    RoleEnum.employee,
  )
  async completeInventoryCheck(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CompleteInventoryCheckDto,
    @Req() req: any,
  ): Promise<BaseResponse<MisaOrder>> {
    // Cố gắng lấy employee record để lưu thông tin người kiểm tra
    let employeeId: number | null = null;
    try {
      const employee = await this.employeeService.getEmployeeByUserId(req.user.id);
      employeeId = employee.id;
    } catch (error) {
      console.warn(`[Complete Inventory Check] User ${req.user.id} không có employee record`);
    }

    const data = await this.misaOrderService.completeInventoryCheck(
      id,
      employeeId,
      body.notes,
      body.needsOrder,
      body.notifyEmployeeId,
    );
    return ResponseHelper.success(
      data,
      'Hoàn thành kiểm tra hàng tồn thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  /**
   * Xác nhận hàng về (chuyển từ pending_order về approved)
   */
  @Post(':id/confirm-order-received')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xác nhận hàng về' })
  @Roles(
    RoleEnum.superAdmin,
    RoleEnum.factoryAdmin,
    RoleEnum.employee_gtg,
    RoleEnum.employee,
  )
  async confirmOrderReceived(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ): Promise<BaseResponse<MisaOrder>> {
    // Cố gắng lấy employee record
    let employeeId: number | null = null;
    try {
      const employee = await this.employeeService.getEmployeeByUserId(req.user.id);
      employeeId = employee.id;
    } catch (error) {
      console.warn(`[Confirm Order Received] User ${req.user.id} không có employee record`);
    }

    const data = await this.misaOrderService.confirmOrderReceived(id, employeeId);
    return ResponseHelper.success(
      data,
      'Xác nhận hàng về thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  /**
   * Hoàn thành đơn hàng (khi ở bước installation)
   */
  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hoàn thành đơn hàng' })
  @Roles(
    RoleEnum.superAdmin,
    RoleEnum.factoryAdmin,
    RoleEnum.employee_gtg,
    RoleEnum.employee,
  )
  async complete(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { notes?: string },
    @Req() req: any,
  ): Promise<BaseResponse<MisaOrder>> {
    // Cố gắng lấy employee record để lưu thông tin người hoàn thành
    let employeeId: number | null = null;
    try {
      const employee = await this.employeeService.getEmployeeByUserId(req.user.id);
      employeeId = employee.id;
    } catch (error) {
      // Nếu không tìm thấy employee (VD: SuperAdmin không có employee record)
      // thì employeeId sẽ là null
      console.warn(`[Complete Order] User ${req.user.id} không có employee record`);
    }

    const data = await this.misaOrderService.complete(id, employeeId, body.notes);
    return ResponseHelper.success(
      data,
      'Hoàn thành đơn hàng thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  /**
   * Xóa mềm đơn hàng
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa đơn hàng' })
  @Roles(RoleEnum.superAdmin, RoleEnum.employee_gtg)
  async softDelete(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<BaseResponse<void>> {
    await this.misaOrderService.softDelete(id);
    return ResponseHelper.success(
      null as any,
      'Xóa đơn hàng thành công',
      HTTP_STATUS_CODE.OK,
    );
  }
}

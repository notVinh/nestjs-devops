import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';

@ApiTags('Customer')
@Controller({
  path: 'customers',
  version: '1',
})
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  // ---------------------------------------------------------------
  // POST /v1/customers
  // Tạo mới khách hàng
  // ---------------------------------------------------------------
  @Post()
  @ApiOperation({ summary: 'Tạo mới khách hàng' })
  @ApiResponse({ status: 201, description: 'Khách hàng được tạo thành công' })
  @ApiResponse({ status: 409, description: 'Mã khách hàng đã tồn tại' })
  create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customerService.create(createCustomerDto);
  }

  // ---------------------------------------------------------------
  // GET /v1/customers
  // Danh sách khách hàng (phân trang + tìm kiếm + lọc)
  // ---------------------------------------------------------------
  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách khách hàng (phân trang, tìm kiếm, lọc rank, inactive...)',
  })
  findAll(@Query() query: QueryCustomerDto) {
    return this.customerService.findAll(query);
  }

  // ---------------------------------------------------------------
  // GET /v1/customers/search?keyword=...
  // Tìm kiếm nhanh (autocomplete)
  // ---------------------------------------------------------------
  @Get('search')
  @ApiOperation({ summary: 'Tìm kiếm nhanh khách hàng (autocomplete, tối đa 20)' })
  searchCustomers(@Query('keyword') keyword: string) {
    return this.customerService.search(keyword);
  }

  // ---------------------------------------------------------------
  // GET /v1/customers/sales-staff-stats
  // ---------------------------------------------------------------
  @Get('sales-staff-stats/get')
  @ApiOperation({ summary: 'Thống kê danh sách NV kinh doanh (số KH, số lượt chăm sóc)' })
  @ApiResponse({ status: 200, description: 'Lấy thống kê thành công' })
  getSalesStaffStats() {
    return this.customerService.getSalesStaffStats();
  }


  // ---------------------------------------------------------------
  // GET /v1/customers/:id
  // Chi tiết khách hàng theo ID (bigint)
  // ---------------------------------------------------------------
  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết khách hàng theo ID' })
  @ApiParam({ name: 'id', description: 'ID khách hàng (số nguyên)' })
  @ApiResponse({ status: 200, description: 'Trả về thông tin khách hàng' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy khách hàng' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.customerService.findOne(id);
  }

  // ---------------------------------------------------------------
  // PATCH /v1/customers/:id
  // Cập nhật khách hàng
  // ---------------------------------------------------------------
  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin khách hàng' })
  @ApiParam({ name: 'id', description: 'ID khách hàng' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy khách hàng' })
  @ApiResponse({ status: 409, description: 'Mã khách hàng bị trùng' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customerService.update(id, updateCustomerDto);
  }

  // ---------------------------------------------------------------
  // PATCH /v1/customers/:id/toggle-inactive
  // Bật/tắt trạng thái ngừng hoạt động
  // ---------------------------------------------------------------
  @Patch(':id/toggle-inactive')
  @ApiOperation({
    summary: 'Bật/tắt trạng thái ngừng hoạt động của khách hàng',
  })
  @ApiParam({ name: 'id', description: 'ID khách hàng' })
  toggleInactive(@Param('id', ParseIntPipe) id: number) {
    return this.customerService.toggleInactive(id);
  }

  // ---------------------------------------------------------------
  // DELETE /v1/customers/:id
  // Xóa mềm khách hàng
  // ---------------------------------------------------------------
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa khách hàng (soft delete)' })
  @ApiParam({ name: 'id', description: 'ID khách hàng' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy khách hàng' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.customerService.remove(id);
  }
}

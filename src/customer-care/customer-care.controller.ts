import {
  Controller,
  Post,
  Body,
  Param,
  Patch,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CustomerCareService } from './customer-care.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { AuthGuard } from '@nestjs/passport';
import { EmployeeService } from 'src/employee/employee.service';

@ApiTags('Customer Care')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'customer-cares',
  version: '1',
})
export class CustomerCareController {
  constructor(
    private readonly customerCareService: CustomerCareService,
    private readonly employeeService: EmployeeService
  ) {}

  @Post('check-in')
  @ApiOperation({ summary: 'NVKD check-in tại khách hàng' })
  async checkIn(
    @Request() req: any,
    @Body() dto: CheckInDto,
  ) {
    const employee = await this.employeeService.getEmployeeByUserId(req.user.id);
    return this.customerCareService.checkIn(employee.id, dto);
  }

  @Patch(':id/check-out')
  @ApiOperation({ summary: 'NVKD check-out tại khách hàng' })
  @ApiParam({ name: 'id', description: 'ID của care session' })
  async checkOut(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CheckOutDto,
  ) {
    const employee = await this.employeeService.getEmployeeByUserId(req.user.id);
    return this.customerCareService.checkOut(employee.id, id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Xem lịch sử chăm sóc của tôi' })
  @ApiQuery({ name: 'customerId', required: false, type: Number })
  async getHistory(
    @Request() req: any,
    @Query('customerId') customerId?: string,
  ) {
    const employee = await this.employeeService.getEmployeeByUserId(req.user.id);
    const cid = customerId ? parseInt(customerId, 10) : undefined;
    return this.customerCareService.getHistory(employee.id, cid);
  }
}

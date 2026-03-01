import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  DefaultValuePipe,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { EmployeeFeedbackService } from './employee-feedback.service';
import { CreateEmployeeFeedbackDto } from './dto/create-employee-feedback.dto';
import { UpdateEmployeeFeedbackDto } from './dto/update-employee-feedback.dto';
import {
  EmployeeFeedback,
  FeedbackStatus,
  FeedbackPriority,
} from './entities/employee-feedback.entity';
import { BaseResponse, ResponseHelper } from 'src/utils/base-response';
import { HTTP_STATUS_CODE } from 'src/utils/constant';
import { IPaginationResult } from 'src/utils/types/pagination-options.type';
import { PaginationLimitPipe } from 'src/utils/pipes/pagination-limit.pipe';
import { PaginationPagePipe } from 'src/utils/pipes/pagination-page.pipe';
import { EmployeeService } from 'src/employee/employee.service';

@ApiTags('Employee Feedback')
@Controller({
  path: 'employee-feedback',
  version: '1',
})
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class EmployeeFeedbackController {
  constructor(
    private readonly employeeFeedbackService: EmployeeFeedbackService,
    private readonly employeeService: EmployeeService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo góp ý mới' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Góp ý đã được tạo thành công',
    type: EmployeeFeedback,
  })
  async create(
    @Body() createDto: CreateEmployeeFeedbackDto,
  ): Promise<BaseResponse<EmployeeFeedback>> {
    const feedback = await this.employeeFeedbackService.create(createDto);
    return ResponseHelper.success(
      feedback,
      'Gửi góp ý thành công',
      HTTP_STATUS_CODE.CREATED,
    );
  }

  @Get('factory/:factoryId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy danh sách góp ý theo factory với phân trang' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Danh sách góp ý của factory',
  })
  async findByFactory(
    @Param('factoryId') factoryId: string,
    @Query('page', new PaginationPagePipe()) page: number,
    @Query('limit', new PaginationLimitPipe(20, 20)) limit: number,
    @Query('status') status?: FeedbackStatus,
    @Query('priority') priority?: FeedbackPriority,
    @Query('unviewedOnly') unviewedOnly?: string,
  ): Promise<BaseResponse<IPaginationResult<EmployeeFeedback>>> {
    const result = await this.employeeFeedbackService.findAllByFactory(
      { page, limit },
      +factoryId,
      {
        status,
        priority,
        unviewedOnly: unviewedOnly === 'true',
      },
    );
    return ResponseHelper.success(
      result,
      'Lấy danh sách góp ý thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  @Get('assigned-to-me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy danh sách góp ý được giao cho mình phản hồi' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Danh sách góp ý được giao phản hồi',
  })
  async findAssignedToMe(
    @Request() req,
    @Query('page', new PaginationPagePipe()) page: number,
    @Query('limit', new PaginationLimitPipe(20, 20)) limit: number,
    @Query('status') status?: FeedbackStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<BaseResponse<IPaginationResult<EmployeeFeedback>>> {
    // Lấy thông tin nhân viên từ JWT
    const employee = await this.employeeService.getEmployeeByUserId(req.user.id);

    const result = await this.employeeFeedbackService.findAssignedToMe(
      { page, limit },
      employee?.id,
      { status, startDate, endDate },
    );
    return ResponseHelper.success(
      result,
      'Lấy danh sách góp ý được giao thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  @Get('employee/:employeeId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy danh sách góp ý của nhân viên với phân trang' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Danh sách góp ý của nhân viên',
  })
  async findByEmployee(
    @Param('employeeId') employeeId: string,
    @Query('page', new PaginationPagePipe()) page: number,
    @Query('limit', new PaginationLimitPipe(20, 20)) limit: number,
    @Query('status') status?: FeedbackStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<BaseResponse<IPaginationResult<EmployeeFeedback>>> {
    const result = await this.employeeFeedbackService.findByEmployee(
      { page, limit },
      +employeeId,
      { status, startDate, endDate },
    );
    return ResponseHelper.success(
      result,
      'Lấy danh sách góp ý thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  @Get('detail/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy chi tiết góp ý' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Chi tiết góp ý',
    type: EmployeeFeedback,
  })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<BaseResponse<EmployeeFeedback>> {
    const feedback = await this.employeeFeedbackService.findOne(+id);
    return ResponseHelper.success(
      feedback,
      'Lấy thông tin góp ý thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cập nhật góp ý / Phản hồi góp ý' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Góp ý đã được cập nhật',
    type: EmployeeFeedback,
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateEmployeeFeedbackDto,
  ): Promise<BaseResponse<EmployeeFeedback>> {
    const feedback = await this.employeeFeedbackService.update(+id, updateDto);
    return ResponseHelper.success(
      feedback,
      'Cập nhật góp ý thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  @Post(':id/mark-viewed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đánh dấu góp ý đã xem' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Đã đánh dấu đã xem',
  })
  async markAsViewed(
    @Param('id') id: string,
  ): Promise<BaseResponse<EmployeeFeedback>> {
    const feedback = await this.employeeFeedbackService.markAsViewed(+id);
    return ResponseHelper.success(
      feedback,
      'Đánh dấu đã xem thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa góp ý (soft delete)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Góp ý đã được xóa',
  })
  async remove(@Param('id') id: string): Promise<BaseResponse<null>> {
    await this.employeeFeedbackService.softDelete(+id);
    return ResponseHelper.success(
      null,
      'Xóa góp ý thành công',
      HTTP_STATUS_CODE.OK,
    );
  }
}

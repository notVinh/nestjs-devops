import {
  Controller,
  UseGuards,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { GeneralRequestService } from './general-request.service';
import { CreateGeneralRequestDto } from './dto/create-general-request.dto';
import { UpdateGeneralRequestDto } from './dto/update-general-request.dto';
import { BaseResponse, ResponseHelper } from 'src/utils/base-response';
import { GeneralRequest } from './entities/general-request.entity';
import { HTTP_STATUS_CODE } from 'src/utils/constant';
import { IPaginationResult } from 'src/utils/types/pagination-options.type';
import { EmployeeService } from 'src/employee/employee.service';
import { PaginationLimitPipe } from 'src/utils/pipes/pagination-limit.pipe';
import { PaginationPagePipe } from 'src/utils/pipes/pagination-page.pipe';

@ApiTags('General Request')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'general-requests',
  version: '1',
})
export class GeneralRequestController {
  constructor(
    private readonly generalRequestService: GeneralRequestService,
    private readonly employeeService: EmployeeService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo yêu cầu mới' })
  async create(
    @Body() dto: CreateGeneralRequestDto,
    @Request() req: any,
  ): Promise<BaseResponse<GeneralRequest>> {
    const employee = await this.employeeService.getEmployeeByUserId(req.user.id);
    const data = await this.generalRequestService.create(employee.id, dto);
    return ResponseHelper.success(
      data,
      'Tạo yêu cầu thành công',
      HTTP_STATUS_CODE.CREATED,
    );
  }

  @Get('my-requests')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Danh sách yêu cầu của tôi' })
  async getMyRequests(
    @Query('page', new PaginationPagePipe()) page: number,
    @Query('limit', new PaginationLimitPipe(20, 20)) limit: number,
    @Request() req: any,
  ): Promise<BaseResponse<IPaginationResult<GeneralRequest>>> {
    const employee = await this.employeeService.getEmployeeByUserId(req.user.id);
    const result = await this.generalRequestService.findAllByEmployee(
      employee.id,
      { page, limit },
    );
    return ResponseHelper.success(
      result,
      'Lấy danh sách yêu cầu thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  @Get('assigned-to-me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Danh sách yêu cầu được giao duyệt' })
  async getAssignedToMe(
    @Query('page', new PaginationPagePipe()) page: number,
    @Query('limit', new PaginationLimitPipe(20, 20)) limit: number,
    @Request() req: any,
  ): Promise<BaseResponse<IPaginationResult<GeneralRequest>>> {
    const employee = await this.employeeService.getEmployeeByUserId(req.user.id);
    const result = await this.generalRequestService.findAllAssignedToMe(
      employee.id,
      { page, limit },
    );
    return ResponseHelper.success(
      result,
      'Lấy danh sách yêu cầu cần duyệt thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xem chi tiết yêu cầu' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<BaseResponse<GeneralRequest>> {
    const data = await this.generalRequestService.findOne(id);
    return ResponseHelper.success(
      data,
      'Lấy chi tiết yêu cầu thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cập nhật hoặc Duyệt/Từ chối yêu cầu' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGeneralRequestDto,
    @Request() req: any,
  ): Promise<BaseResponse<GeneralRequest>> {
    const employee = await this.employeeService.getEmployeeByUserId(req.user.id);
    const data = await this.generalRequestService.update(id, employee.id, dto);
    
    let message = 'Cập nhật yêu cầu thành công';
    if (dto.status === 'approved') message = 'Duyệt yêu cầu thành công';
    if (dto.status === 'rejected') message = 'Từ chối yêu cầu thành công';
    if (dto.status === 'cancelled') message = 'Hủy yêu cầu thành công';

    return ResponseHelper.success(
      data,
      message,
      HTTP_STATUS_CODE.OK,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa yêu cầu (chỉ khi còn trạng thái pending)' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<BaseResponse<null>> {
    await this.generalRequestService.remove(id);
    return ResponseHelper.success(
      null,
      'Xóa yêu cầu thành công',
      HTTP_STATUS_CODE.OK,
    );
  }
}

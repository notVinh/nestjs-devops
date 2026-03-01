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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { LeaveTypeService } from './leave-type.service';
import { CreateLeaveTypeDto } from './dto/create-leave-type.dto';
import { UpdateLeaveTypeDto } from './dto/update-leave-type.dto';
import { QueryLeaveTypeDto } from './dto/query-leave-type.dto';
import { BaseResponse, ResponseHelper } from 'src/utils/base-response';
import { LeaveType } from './entities/leave-type.entity';
import { HTTP_STATUS_CODE } from 'src/utils/constant';

@Controller({ path: 'leave-type', version: '1' })
@ApiTags('Leave Type')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class LeaveTypeController {
  constructor(private readonly leaveTypeService: LeaveTypeService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo loại nghỉ phép' })
  async create(
    @Body() dto: CreateLeaveTypeDto,
  ): Promise<BaseResponse<LeaveType>> {
    const data = await this.leaveTypeService.create(dto);
    return ResponseHelper.success(
      data,
      'Tạo loại nghỉ phép thành công',
      HTTP_STATUS_CODE.CREATED,
    );
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Danh sách loại nghỉ phép' })
  async findAll(
    @Query() query: QueryLeaveTypeDto,
  ): Promise<BaseResponse<LeaveType[]>> {
    const list = await this.leaveTypeService.findAll(query);
    return ResponseHelper.success(list, 'Thành công', HTTP_STATUS_CODE.OK);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chi tiết loại nghỉ phép' })
  async findOne(@Param('id') id: number): Promise<BaseResponse<LeaveType>> {
    const data = await this.leaveTypeService.findOne(Number(id));
    return ResponseHelper.success(data, 'Thành công', HTTP_STATUS_CODE.OK);
  }

  @Get('factory/:factoryId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Danh sách loại nghỉ phép theo nhà máy' })
  async findByFactory(
    @Param('factoryId') factoryId: number,
  ): Promise<BaseResponse<LeaveType[]>> {
    const list = await this.leaveTypeService.findByFactory(Number(factoryId));
    return ResponseHelper.success(list, 'Thành công', HTTP_STATUS_CODE.OK);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cập nhật loại nghỉ phép' })
  async update(
    @Param('id') id: number,
    @Body() dto: UpdateLeaveTypeDto,
  ): Promise<BaseResponse<LeaveType>> {
    const data = await this.leaveTypeService.update(Number(id), dto);
    return ResponseHelper.success(
      data,
      'Cập nhật thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa loại nghỉ phép (soft delete)' })
  async softDelete(@Param('id') id: number): Promise<BaseResponse<void>> {
    await this.leaveTypeService.softDelete(Number(id));
    return ResponseHelper.success(
      undefined,
      'Xóa thành công',
      HTTP_STATUS_CODE.OK,
    );
  }
}

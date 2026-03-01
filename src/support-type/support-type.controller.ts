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
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
  ParseBoolPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SupportTypeService } from './support-type.service';
import { CreateSupportTypeDto } from './dto/create-support-type.dto';
import { UpdateSupportTypeDto } from './dto/update-support-type.dto';
import { BaseResponse, ResponseHelper } from 'src/utils/base-response';
import { SupportType } from './entities/support-type.entity';
import { HTTP_STATUS_CODE } from 'src/utils/constant';

@Controller({
  path: 'support-types',
  version: '1',
})
@ApiTags('Support Type')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
export class SupportTypeController {
  constructor(private readonly supportTypeService: SupportTypeService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo loại hỗ trợ mới' })
  async create(
    @Body() dto: CreateSupportTypeDto,
  ): Promise<BaseResponse<SupportType>> {
    const data = await this.supportTypeService.create(dto);
    return ResponseHelper.success(
      data,
      'Tạo loại hỗ trợ thành công',
      HTTP_STATUS_CODE.CREATED,
    );
  }

  @Get('factory/:factoryId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy danh sách loại hỗ trợ theo nhà máy' })
  async findByFactory(
    @Param('factoryId', ParseIntPipe) factoryId: number,
    @Query('includeInactive', new DefaultValuePipe(false), ParseBoolPipe)
    includeInactive: boolean,
  ): Promise<BaseResponse<SupportType[]>> {
    const data = await this.supportTypeService.findByFactory(
      factoryId,
      includeInactive,
    );
    return ResponseHelper.success(
      data,
      'Lấy danh sách loại hỗ trợ thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy chi tiết loại hỗ trợ' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<BaseResponse<SupportType>> {
    const data = await this.supportTypeService.findOne(id);
    return ResponseHelper.success(
      data,
      'Lấy chi tiết loại hỗ trợ thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cập nhật loại hỗ trợ' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSupportTypeDto,
  ): Promise<BaseResponse<SupportType>> {
    const data = await this.supportTypeService.update(id, dto);
    return ResponseHelper.success(
      data,
      'Cập nhật loại hỗ trợ thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa loại hỗ trợ' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<BaseResponse<null>> {
    await this.supportTypeService.remove(id);
    return ResponseHelper.success(
      null,
      'Xóa loại hỗ trợ thành công',
      HTTP_STATUS_CODE.OK,
    );
  }

  @Post('seed/:factoryId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo dữ liệu mặc định cho nhà máy' })
  async seedDefaultTypes(
    @Param('factoryId', ParseIntPipe) factoryId: number,
  ): Promise<BaseResponse<SupportType[]>> {
    const data = await this.supportTypeService.seedDefaultTypes(factoryId);
    return ResponseHelper.success(
      data,
      'Tạo dữ liệu mặc định thành công',
      HTTP_STATUS_CODE.CREATED,
    );
  }
}

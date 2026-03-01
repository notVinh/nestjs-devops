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
import { OvertimeCoefficientService } from './overtime-coefficient.service';
import { CreateOvertimeCoefficientDto } from './dto/create-overtime-coefficient.dto';
import { UpdateOvertimeCoefficientDto } from './dto/update-overtime-coefficient.dto';
import { QueryOvertimeCoefficientDto } from './dto/query-overtime-coefficient.dto';
import { BaseResponse, ResponseHelper } from 'src/utils/base-response';
import { OvertimeCoefficient } from './entities/overtime-coefficient.entity';
import { HTTP_STATUS_CODE } from 'src/utils/constant';

@Controller({ path: 'overtime-coefficient', version: '1' })
@ApiTags('Overtime Coefficient')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class OvertimeCoefficientController {
  constructor(
    private readonly coefficientService: OvertimeCoefficientService
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo hệ số làm thêm' })
  async create(
    @Body() dto: CreateOvertimeCoefficientDto
  ): Promise<BaseResponse<OvertimeCoefficient>> {
    const data = await this.coefficientService.create(dto);
    return ResponseHelper.success(
      data,
      'Tạo hệ số làm thêm thành công',
      HTTP_STATUS_CODE.CREATED
    );
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Danh sách hệ số làm thêm' })
  async findAll(
    @Query() query: QueryOvertimeCoefficientDto
  ): Promise<BaseResponse<OvertimeCoefficient[]>> {
    const list = await this.coefficientService.findAll(query);
    return ResponseHelper.success(list, 'Thành công', HTTP_STATUS_CODE.OK);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chi tiết hệ số làm thêm' })
  async findOne(
    @Param('id') id: number
  ): Promise<BaseResponse<OvertimeCoefficient>> {
    const data = await this.coefficientService.findOne(Number(id));
    return ResponseHelper.success(data, 'Thành công', HTTP_STATUS_CODE.OK);
  }

  @Get('factory/:factoryId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Danh sách hệ số làm thêm theo nhà máy' })
  async findByFactory(
    @Param('factoryId') factoryId: number
  ): Promise<BaseResponse<OvertimeCoefficient[]>> {
    const list = await this.coefficientService.findByFactory(Number(factoryId));
    return ResponseHelper.success(list, 'Thành công', HTTP_STATUS_CODE.OK);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cập nhật hệ số làm thêm' })
  async update(
    @Param('id') id: number,
    @Body() dto: UpdateOvertimeCoefficientDto
  ): Promise<BaseResponse<OvertimeCoefficient>> {
    const data = await this.coefficientService.update(Number(id), dto);
    return ResponseHelper.success(
      data,
      'Cập nhật thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa hệ số làm thêm (soft delete)' })
  async softDelete(@Param('id') id: number): Promise<BaseResponse<void>> {
    await this.coefficientService.softDelete(Number(id));
    return ResponseHelper.success(undefined, 'Xóa thành công', HTTP_STATUS_CODE.OK);
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { HolidayService } from './holiday.service';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { Holiday } from './entities/holiday.entity';
import { BaseResponse, ResponseHelper } from 'src/utils/base-response';
import { HTTP_STATUS_CODE } from 'src/utils/constant';

@ApiTags('Holiday')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({
  path: 'holiday',
  version: '1',
})
export class HolidayController {
  constructor(private readonly holidayService: HolidayService) {}

  @Post()
  @Roles(RoleEnum.factoryAdmin, RoleEnum.superAdmin)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo ngày nghỉ lễ mới' })
  async create(
    @Body() createHolidayDto: CreateHolidayDto
  ): Promise<BaseResponse<Holiday>> {
    const holiday = await this.holidayService.create(createHolidayDto);
    return ResponseHelper.success(
      holiday,
      'Tạo ngày nghỉ lễ thành công',
      HTTP_STATUS_CODE.CREATED
    );
  }

  @Get()
  @Roles(RoleEnum.factoryAdmin, RoleEnum.employee, RoleEnum.superAdmin, RoleEnum.employee_gtg)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy danh sách ngày nghỉ lễ' })
  @ApiQuery({ name: 'factoryId', required: false, type: Number })
  @ApiQuery({ name: 'year', required: false, type: Number })
  async findAll(
    @Query('factoryId') factoryId?: number,
    @Query('year') year?: number
  ): Promise<BaseResponse<Holiday[]>> {
    const holidays = await this.holidayService.findAll(factoryId, year);
    return ResponseHelper.success(
      holidays,
      'Lấy danh sách ngày nghỉ lễ thành công',
      HttpStatus.OK
    );
  }

  @Get(':id')
  @Roles(RoleEnum.factoryAdmin, RoleEnum.employee, RoleEnum.superAdmin , RoleEnum.employee_gtg)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy thông tin ngày nghỉ lễ' })
  async findOne(@Param('id') id: string): Promise<BaseResponse<Holiday>> {
    const holiday = await this.holidayService.findOne(+id);
    return ResponseHelper.success(
      holiday,
      'Lấy thông tin ngày nghỉ lễ thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Patch(':id')
  @Roles(RoleEnum.factoryAdmin, RoleEnum.superAdmin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cập nhật ngày nghỉ lễ' })
  async update(
    @Param('id') id: string,
    @Body() updateHolidayDto: UpdateHolidayDto
  ): Promise<BaseResponse<Holiday>> {
    const holiday = await this.holidayService.update(+id, updateHolidayDto);
    return ResponseHelper.success(
      holiday,
      'Cập nhật ngày nghỉ lễ thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Delete(':id')
  @Roles(RoleEnum.factoryAdmin, RoleEnum.superAdmin)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa ngày nghỉ lễ' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.holidayService.remove(+id);
  }
}

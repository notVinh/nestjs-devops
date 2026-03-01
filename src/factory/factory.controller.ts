import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FactoryService } from './factory.service';
import { CreateFactoryDto } from './dto/create-factory.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Factory } from './entities/factory.entity';
import { BaseResponse, ResponseHelper } from 'src/utils/base-response';
import { HTTP_STATUS_CODE } from 'src/utils/constant';
import { UpdateFactoryDto } from './dto/update-factory.dto';
import { IPaginationResult } from 'src/utils/types/pagination-options.type';
import { Roles } from 'src/roles/roles.decorator';
import { RoleEnum } from 'src/roles/roles.enum';
import { RolesGuard } from 'src/roles/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { PaginationLimitPipe } from 'src/utils/pipes/pagination-limit.pipe';
import { PaginationPagePipe } from 'src/utils/pipes/pagination-page.pipe';

@Controller({
  path: 'factory',
  version: '1',
})
@ApiTags('Factory')
@Roles(
  RoleEnum.superAdmin,
  RoleEnum.factoryAdmin,
  RoleEnum.employee,
  RoleEnum.employee_gtg
)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class FactoryController {
  constructor(private readonly factoryService: FactoryService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo nhà máy mới' })
  async create(
    @Body() createFactoryDto: CreateFactoryDto
  ): Promise<BaseResponse<Factory>> {
    // Tạo nhà máy
    const factory = await this.factoryService.create(createFactoryDto);

    // Trả về thông báo
    return ResponseHelper.success(
      factory,
      'Tạo nhà máy thành công',
      HTTP_STATUS_CODE.CREATED
    );
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy danh sách tất cả nhà máy' })
  async findAllWithPagination(
    @Query('page', new PaginationPagePipe()) page: number, // Trang
    @Query('limit', new PaginationLimitPipe(20, 20)) limit: number, // Số lượng
    @Query('search') search?: string // Tìm kiếm
  ): Promise<BaseResponse<IPaginationResult<Factory>>> {
    // Lấy danh sách nhà máy
    const result = await this.factoryService.findAllWithPagination(
      {
        page,
        limit,
      },
      search
    );

    // Trả về danh sách nhà máy
    return ResponseHelper.success(
      result,
      'Lấy danh sách nhà máy thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy thông tin nhà máy theo id' })
  async findOne(
    @Param('id') id: number
  ): Promise<BaseResponse<Factory | null>> {
    // Lấy thông tin nhà máy theo id
    const factory = await this.factoryService.findOne(id);

    // Trả về thông báo
    return ResponseHelper.success(
      factory,
      'Lấy thông tin nhà máy thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cập nhật thông tin nhà máy theo id' })
  async update(
    @Param('id') id: number,
    @Body() updateFactoryDto: UpdateFactoryDto
  ): Promise<BaseResponse<Factory>> {
    // Cập nhật thông tin nhà máy
    const factory = await this.factoryService.update(id, updateFactoryDto);

    // Trả về thông báo
    return ResponseHelper.success(
      factory,
      'Cập nhật thông tin nhà máy thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Patch(':id/work-schedule')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cập nhật lịch làm việc của nhà máy (ngày và giờ)' })
  async updateWorkSchedule(
    @Param('id') id: number,
    @Body()
    body: {
      workDays?: number[];
      hourStartWork?: string;
      hourEndWork?: string;
    }
  ): Promise<BaseResponse<Factory>> {
    // Cập nhật lịch làm việc
    const factory = await this.factoryService.updateWorkSchedule(
      id,
      body.workDays,
      body.hourStartWork,
      body.hourEndWork
    );

    // Trả về thông báo
    return ResponseHelper.success(
      factory,
      'Cập nhật lịch làm việc thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Patch(':id/work-days')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cập nhật ngày làm việc của nhà máy' })
  async updateWorkDays(
    @Param('id') id: number,
    @Body() body: { workDays: number[] }
  ): Promise<BaseResponse<Factory>> {
    // Cập nhật ngày làm việc
    const factory = await this.factoryService.updateWorkDays(id, body.workDays);

    // Trả về thông báo
    return ResponseHelper.success(
      factory,
      'Cập nhật ngày làm việc thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa nhà máy theo id' })
  async softDelete(@Param('id') id: number): Promise<BaseResponse<null>> {
    // Xóa nhà máy
    await this.factoryService.softDelete(id);

    // Trả về thông báo
    return ResponseHelper.success(
      null,
      'Xóa nhà máy thành công',
      HTTP_STATUS_CODE.OK
    );
  }
}

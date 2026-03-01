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
import { PositionEmployeeService } from './position-employee.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BaseResponse, ResponseHelper } from 'src/utils/base-response';
import { PositionEmployee } from './entities/position-employee.entity';
import { HTTP_STATUS_CODE } from 'src/utils/constant';
import { CreatePositionEmployeeDto } from './dto/create-postion-employee.dto';
import { UpdatePositionEmployeeDto } from './dto/update-postion-employee.dto';
import { Roles } from 'src/roles/roles.decorator';
import { RoleEnum } from 'src/roles/roles.enum';
import { RolesGuard } from 'src/roles/roles.guard';
import { AuthGuard } from '@nestjs/passport';

@Controller({
  path: 'position',
  version: '1',
})
@ApiTags('Position Employee')
@Roles(
  RoleEnum.superAdmin,
  RoleEnum.factoryAdmin,
  RoleEnum.employee,
  RoleEnum.employee_gtg
)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class PositionEmployeeController {
  constructor(
    private readonly positionEmployeeService: PositionEmployeeService
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy danh sách vị trí nhân viên theo nhà máy' })
  async findAll(
    @Query('factoryId') factoryId: number,
    @Query('departmentId') departmentId?: number
  ): Promise<BaseResponse<PositionEmployee[]>> {
    const positions = await this.positionEmployeeService.findAll(
      factoryId,
      departmentId
    );
    return ResponseHelper.success(
      positions,
      'Lấy danh sách vị trí nhân viên thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo vị trí nhân viên mới' })
  async create(
    @Body() createPositionEmployeeDto: CreatePositionEmployeeDto
  ): Promise<BaseResponse<PositionEmployee>> {
    const position = await this.positionEmployeeService.create(
      createPositionEmployeeDto
    );
    return ResponseHelper.success(
      position,
      'Tạo vị trí nhân viên thành công',
      HTTP_STATUS_CODE.CREATED
    );
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy vị trí nhân viên theo id' })
  async findOne(
    @Param('id') id: number
  ): Promise<BaseResponse<PositionEmployee>> {
    const position = await this.positionEmployeeService.findOne(id);
    return ResponseHelper.success(
      position,
      'Lấy vị trí nhân viên thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cập nhật vị trí nhân viên theo id' })
  async update(
    @Param('id') id: number,
    @Body() updatePositionEmployeeDto: UpdatePositionEmployeeDto
  ): Promise<BaseResponse<PositionEmployee>> {
    const position = await this.positionEmployeeService.update(
      id,
      updatePositionEmployeeDto
    );
    return ResponseHelper.success(
      position,
      'Cập nhật vị trí nhân viên thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa vị trí nhân viên theo id' })
  async remove(@Param('id') id: number): Promise<BaseResponse<null>> {
    await this.positionEmployeeService.softDelete(id);
    return ResponseHelper.success(
      null,
      'Xóa vị trí nhân viên thành công',
      HTTP_STATUS_CODE.OK
    );
  }
}

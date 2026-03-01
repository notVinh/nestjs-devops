import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
  SerializeOptions,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/roles/roles.decorator';
import { RoleEnum } from 'src/roles/roles.enum';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/roles/roles.guard';
import { infinityPagination } from 'src/utils/infinity-pagination';
import { User } from './entities/user.entity';
import { InfinityPaginationResultType } from '../utils/types/infinity-pagination-result.type';
import { NullableType } from '../utils/types/nullable.type';
import { Request } from '@nestjs/common';
import { BaseResponse, ResponseHelper } from 'src/utils/base-response';
import { Factory } from 'src/factory/entities/factory.entity';
import { HTTP_STATUS_CODE } from 'src/utils/constant';
import { PaginationLimitPipe } from 'src/utils/pipes/pagination-limit.pipe';
import { PaginationPagePipe } from 'src/utils/pipes/pagination-page.pipe';

@ApiBearerAuth()
@Roles(
  RoleEnum.superAdmin,
  RoleEnum.factoryAdmin,
  RoleEnum.employee,
  RoleEnum.employee_gtg
)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiTags('Users')
@Controller({
  path: 'users',
  version: '1',
})
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @SerializeOptions({
    groups: ['admin'],
  })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createProfileDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createProfileDto);
  }

  @SerializeOptions({
    groups: ['admin'],
  })
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page', new PaginationPagePipe()) page: number,
    @Query('limit', new PaginationLimitPipe(20, 20)) limit: number
  ): Promise<InfinityPaginationResultType<User>> {
    return infinityPagination(
      await this.usersService.findManyWithPagination({
        page,
        limit,
      }),
      { page, limit }
    );
  }

  @SerializeOptions({
    groups: ['admin'],
  })
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@Param('id') id: string): Promise<NullableType<User>> {
    return this.usersService.findOne({ id: +id });
  }

  @SerializeOptions({
    groups: ['admin'],
  })
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('id') id: number,
    @Body() updateProfileDto: UpdateUserDto
  ): Promise<User> {
    return this.usersService.update(id, updateProfileDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: number): Promise<void> {
    return this.usersService.softDelete(id);
  }

  @Get('me/factory')
  @HttpCode(HttpStatus.OK)
  async getMyFactory(@Request() req: any): Promise<BaseResponse<Factory>> {
    return ResponseHelper.success(
      await this.usersService.getUserFactory(req.user.id),
      'Lấy thông tin nhà máy thành công',
      HTTP_STATUS_CODE.OK
    );
  }
}

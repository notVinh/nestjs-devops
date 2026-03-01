import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { DailyProducionService } from './daily-producion.service';
import { CreateDailyProductionDto } from './dto/create-daily-production.dto';
import { UpdateDailyProductionDto } from './dto/update-daily-production.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/roles/roles.decorator';
import { RoleEnum } from 'src/roles/roles.enum';
import { RolesGuard } from 'src/roles/roles.guard';
import { AuthGuard } from '@nestjs/passport';

@Controller({
    path: 'daily-production',
    version: '1',
})
@ApiTags('Daily Production')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class DailyProducionController {
  constructor(private readonly dailyProducionService: DailyProducionService) {}

  @Post()
  @Roles(RoleEnum.superAdmin, RoleEnum.factoryAdmin)
  create(@Body() createDailyProductionDto: CreateDailyProductionDto) {
    return this.dailyProducionService.createDailyProduction(createDailyProductionDto);
  }

  @Get()
  findAll(
    @Query('factoryId') factoryId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('date') date?: string,
  ) {
    return this.dailyProducionService.getAllDailyProduction(
      factoryId ? parseInt(factoryId) : undefined,
      employeeId ? parseInt(employeeId) : undefined,
      date ? new Date(date) : undefined,
    );
  }

  @Get('factory/:factoryId')
  findByFactory(@Param('factoryId') factoryId: string) {
    return this.dailyProducionService.getDailyProductionByFactory(parseInt(factoryId));
  }

  @Get('employee/:employeeId')
  findByEmployee(@Param('employeeId') employeeId: string) {
    return this.dailyProducionService.getDailyProductionByEmployee(parseInt(employeeId));
  }

  @Get('factory/:factoryId/employees')
  getEmployeesWithProduction(@Param('factoryId') factoryId: string) {
    return this.dailyProducionService.getEmployeesWithProduction(parseInt(factoryId));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dailyProducionService.getDailyProduction(parseInt(id));
  }

  @Patch(':id')
  @Roles(RoleEnum.superAdmin, RoleEnum.factoryAdmin)
  update(@Param('id') id: string, @Body() updateDailyProductionDto: UpdateDailyProductionDto) {
    return this.dailyProducionService.updateDailyProduction(parseInt(id), updateDailyProductionDto);
  }

  @Delete(':id')
  @Roles(RoleEnum.superAdmin, RoleEnum.factoryAdmin)
  remove(@Param('id') id: string) {
    return this.dailyProducionService.remove(parseInt(id));
  }
}

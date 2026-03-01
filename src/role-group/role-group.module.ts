import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleGroupService } from './role-group.service';
import { RoleGroupController } from './role-group.controller';
import { RoleGroup } from './entities/role-group.entity';
import { Employee } from '../employee/entities/employee.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RoleGroup, Employee])],
  providers: [RoleGroupService],
  controllers: [RoleGroupController],
  exports: [RoleGroupService],
})
export class RoleGroupModule {}


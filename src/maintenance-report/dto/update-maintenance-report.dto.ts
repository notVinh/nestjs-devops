import { PartialType } from '@nestjs/swagger';
import { CreateMaintenanceReportDto } from './create-maintenance-report.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MaintenanceReportStatus } from '../entities/maintenance-report.entity';

export class UpdateMaintenanceReportDto extends PartialType(CreateMaintenanceReportDto) {
  @ApiProperty({
    description: 'Trạng thái',
    enum: MaintenanceReportStatus,
    required: false
  })
  @IsOptional()
  @IsEnum(MaintenanceReportStatus)
  status?: MaintenanceReportStatus;

  @ApiProperty({ description: 'Ghi chú xử lý', required: false })
  @IsOptional()
  @IsString()
  resolvedNote?: string;
}

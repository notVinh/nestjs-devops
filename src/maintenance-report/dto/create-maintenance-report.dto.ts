import { IsInt, IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MaintenanceReportPriority } from '../entities/maintenance-report.entity';

export class CreateMaintenanceReportDto {
  @ApiProperty({ description: 'ID nhà máy' })
  @IsInt()
  factoryId: number;

  @ApiProperty({ description: 'ID nhân viên được giao xử lý', required: false })
  @IsOptional()
  @IsInt()
  assignedEmployeeId?: number;

  @ApiProperty({ description: 'Mã máy', required: false, example: 'M001' })
  @IsOptional()
  @IsString()
  machineCode?: string;

  @ApiProperty({ description: 'Tên máy', example: 'Máy cắt laser A1' })
  @IsString()
  machineName: string;

  @ApiProperty({ description: 'Mô tả lỗi', example: 'Máy không khởi động được' })
  @IsString()
  issueDescription: string;

  @ApiProperty({
    description: 'Mức độ ưu tiên',
    enum: MaintenanceReportPriority,
    default: MaintenanceReportPriority.MEDIUM,
    required: false
  })
  @IsOptional()
  @IsEnum(MaintenanceReportPriority)
  priority?: MaintenanceReportPriority;

  @ApiProperty({ description: 'Ghi chú', required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ description: 'Danh sách URL ảnh liên quan', type: [String], required: false })
  @IsOptional()
  @IsString({ each: true })
  photoUrls?: string[];
}

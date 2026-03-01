import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  IsIn,
  IsDateString,
  ValidateIf,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Task types
export const TASK_TYPES = [
  'warehouse_export',
  'technical_check',
  'delivery',
  'installation',
  'customer_training',
] as const;

export type TaskType = (typeof TASK_TYPES)[number];

export class CreateAssignmentDto {
  @IsNotEmpty({ message: 'Loại công việc không được để trống' })
  @IsString()
  @IsIn(TASK_TYPES, { message: 'Loại công việc không hợp lệ' })
  @ApiProperty({
    description: 'Loại công việc',
    enum: TASK_TYPES,
    example: 'warehouse_export',
  })
  taskType: TaskType;

  // Support single employee (backward compatible)
  @ValidateIf((o) => !o.assignedToIds || o.assignedToIds.length === 0)
  @IsOptional()
  @IsNumber({}, { message: 'ID nhân viên phải là số' })
  @Type(() => Number)
  @ApiPropertyOptional({
    description: 'ID của nhân viên được giao việc (single)',
    example: 1,
  })
  assignedToId?: number;

  // Support multiple employees
  @ValidateIf((o) => !o.assignedToId)
  @IsOptional()
  @IsArray({ message: 'assignedToIds phải là mảng' })
  @IsNumber({}, { each: true, message: 'Mỗi ID nhân viên phải là số' })
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.map((v) => (typeof v === 'string' ? Number(v) : v));
    }
    return value;
  })
  @ApiPropertyOptional({
    description: 'Danh sách ID của các nhân viên được giao việc',
    example: [1, 2, 3],
    type: [Number],
  })
  assignedToIds?: number[];

  @IsOptional()
  @IsDateString({}, { message: 'Ngày hẹn không hợp lệ' })
  @ApiPropertyOptional({
    description: 'Ngày hẹn thực hiện',
    example: '2024-01-15T09:00:00.000Z',
  })
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Ghi chú',
    example: 'Ưu tiên giao trong ngày',
  })
  notes?: string;

  /**
   * Get all employee IDs to assign (from either assignedToId or assignedToIds)
   */
  getAssignedToIds(): number[] {
    if (this.assignedToIds && this.assignedToIds.length > 0) {
      return this.assignedToIds;
    }
    if (this.assignedToId) {
      return [this.assignedToId];
    }
    return [];
  }
}

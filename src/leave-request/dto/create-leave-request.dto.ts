import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateLeaveRequestDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  factoryId: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  employeeId: number;

  @ApiProperty({ description: 'Employee id của người duyệt (legacy - dùng approverEmployeeIds thay thế)', deprecated: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  approverEmployeeId?: number;

  @ApiProperty({ description: 'Danh sách Employee id của những người được giao duyệt', type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  approverEmployeeIds?: number[];

  @ApiProperty({ enum: ['paid', 'unpaid'] as const, description: 'Loại nghỉ (legacy)' })
  @IsOptional()
  @IsEnum(['paid', 'unpaid'])
  leaveType?: 'paid' | 'unpaid';

  @ApiProperty({ description: 'ID loại nghỉ phép từ bảng LeaveType', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  leaveTypeId?: number;

  @ApiProperty({
    enum: ['full_day', 'morning', 'afternoon'] as const,
    required: false,
    default: 'full_day'
  })
  @IsOptional()
  @IsEnum(['full_day', 'morning', 'afternoon'])
  leaveSession?: 'full_day' | 'morning' | 'afternoon';

  @ApiProperty({ format: 'date' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}



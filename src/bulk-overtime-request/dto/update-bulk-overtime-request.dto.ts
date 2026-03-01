import { IsInt, IsString, IsOptional, IsArray, IsDateString, Matches, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBulkOvertimeRequestDto {
  @ApiProperty({ description: 'Tiêu đề đơn tăng ca hàng loạt', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'ID người duyệt', required: false })
  @IsOptional()
  @IsInt()
  approverEmployeeId?: number;

  @ApiProperty({ description: 'ID hệ số làm thêm', required: false })
  @IsOptional()
  @IsInt()
  overtimeCoefficientId?: number;

  @ApiProperty({ description: 'Danh sách ID nhân viên tăng ca', type: [Number], required: false })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  employeeIds?: number[];

  @ApiProperty({ description: 'Ngày tăng ca (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsDateString()
  overtimeDate?: string;

  @ApiProperty({ description: 'Giờ bắt đầu (HH:mm)', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime phải có định dạng HH:mm',
  })
  startTime?: string;

  @ApiProperty({ description: 'Giờ kết thúc (HH:mm)', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime phải có định dạng HH:mm',
  })
  endTime?: string;

  @ApiProperty({ description: 'Lý do tăng ca', required: false })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ description: 'Trạng thái', enum: ['draft', 'cancelled'], required: false })
  @IsOptional()
  @IsString()
  @IsIn(['draft', 'cancelled'])
  status?: 'draft' | 'cancelled';
}

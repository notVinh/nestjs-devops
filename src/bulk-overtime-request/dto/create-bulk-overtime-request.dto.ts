import { IsInt, IsString, IsOptional, IsArray, IsDateString, Matches, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBulkOvertimeRequestDto {
  @ApiProperty({ description: 'ID nhà máy' })
  @IsInt()
  factoryId: number;

  @ApiProperty({ description: 'Tiêu đề đơn tăng ca hàng loạt', example: 'Tăng ca tháng 10/2025 - Phòng Sản Xuất' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'ID người duyệt' })
  @IsInt()
  approverEmployeeId: number;

  @ApiProperty({ description: 'ID hệ số làm thêm' })
  @IsInt()
  overtimeCoefficientId: number;

  @ApiProperty({ description: 'Danh sách ID nhân viên tăng ca', type: [Number] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Phải chọn ít nhất 1 nhân viên' })
  @IsInt({ each: true })
  employeeIds: number[];

  @ApiProperty({ description: 'Ngày tăng ca (YYYY-MM-DD)', example: '2025-10-28' })
  @IsDateString()
  overtimeDate: string;

  @ApiProperty({ description: 'Giờ bắt đầu (HH:mm)', example: '18:00' })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime phải có định dạng HH:mm',
  })
  startTime: string;

  @ApiProperty({ description: 'Giờ kết thúc (HH:mm)', example: '22:00' })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime phải có định dạng HH:mm',
  })
  endTime: string;

  @ApiProperty({ description: 'Lý do tăng ca', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

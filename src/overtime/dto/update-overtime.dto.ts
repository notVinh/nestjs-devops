import { IsString, IsOptional, IsIn, IsNumber, IsDateString, Matches, ValidateNested, IsObject, IsInt, Min, IsArray, ArrayMinSize, ArrayMaxSize, ValidateIf } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CreateOvertimeDto } from './create-overtime.dto';

class LocationDto {
  @ApiProperty({ description: 'Vĩ độ', example: 10.762622 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Kinh độ', example: 106.660172 })
  @IsNumber()
  longitude: number;
}

class TimeSlotDto {
  @ApiProperty({ description: 'Giờ bắt đầu (HH:mm)', example: '05:00' })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime phải có định dạng HH:mm',
  })
  startTime: string;

  @ApiProperty({ description: 'Giờ kết thúc (HH:mm)', example: '07:00' })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime phải có định dạng HH:mm',
  })
  endTime: string;
}

export class UpdateOvertimeDto extends PartialType(CreateOvertimeDto) {
  @ApiProperty({ description: 'Trạng thái đơn', required: false })
  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected', 'cancelled'])
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled';

  @ApiProperty({ description: 'Ghi chú phê duyệt', required: false })
  @IsOptional()
  @IsString()
  decisionNote?: string;

  @ApiProperty({ description: 'Employee ID của người duyệt/từ chối đơn' })
  @IsOptional()
  @IsInt()
  @Min(1)
  decidedByEmployeeId?: number;

  @ApiProperty({ description: 'Ngày tăng ca', required: false })
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

  @ApiProperty({ description: 'Hệ số tăng ca', required: false })
  @IsOptional()
  @IsNumber()
  overtimeRate?: number;

  @ApiProperty({ description: 'Lý do tăng ca', required: false })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({
    description: 'Danh sách khung giờ tăng ca (hỗ trợ nhiều ca trong 1 ngày, tối đa 15 khung giờ)',
    type: [TimeSlotDto],
    example: [
      { startTime: '05:00', endTime: '07:00' },
      { startTime: '18:00', endTime: '20:00' }
    ],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Phải có ít nhất một khung giờ tăng ca' })
  @ArrayMaxSize(15, { message: 'Tối đa 15 khung giờ tăng ca trong một ngày' })
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  @ValidateIf((o) => !o.startTime || !o.endTime)
  timeSlots?: TimeSlotDto[];

  @ApiProperty({
    description: 'Vị trí yêu cầu tăng ca',
    required: false,
    type: LocationDto,
    example: { latitude: 10.762622, longitude: 106.660172 }
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => LocationDto)
  requestLocation?: LocationDto;
}

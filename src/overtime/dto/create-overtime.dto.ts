import { IsInt, IsString, IsOptional, IsNumber, IsDateString, Matches, ValidateNested, IsObject, IsArray, ArrayMinSize, ArrayMaxSize, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotPastDate } from 'src/utils/validators/is-not-past-date.validator';

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

export class CreateOvertimeDto {
  @ApiProperty({ description: 'ID nhà máy' })
  @IsInt()
  factoryId: number;

  @ApiProperty({ description: 'ID nhân viên đăng ký tăng ca' })
  @IsInt()
  employeeId: number;

  @ApiProperty({ 
    description: 'ID đơn tăng ca gốc (nếu đây là đơn bổ sung)', 
    required: false 
  })
  @IsOptional()
  @IsInt()
  parentOvertimeId?: number;

  @ApiProperty({ description: 'ID người duyệt (legacy - dùng approverEmployeeIds thay thế)', deprecated: true })
  @IsOptional()
  @IsInt()
  approverEmployeeId?: number;

  @ApiProperty({ description: 'Danh sách ID người được giao duyệt', type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  approverEmployeeIds?: number[];

  @ApiProperty({ description: 'ID hệ số làm thêm' })
  @IsInt()
  overtimeCoefficientId: number;

  @ApiProperty({ description: 'Ngày tăng ca (YYYY-MM-DD)', example: '2024-01-15' })
  @IsDateString()
  // @IsNotPastDate() // TODO: Uncomment this when we have a way to validate the date
  overtimeDate: string;

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
    description: 'Giờ bắt đầu (HH:mm) - Legacy, dùng timeSlots thay thế',
    example: '18:00',
    deprecated: true,
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime phải có định dạng HH:mm',
  })
  @ValidateIf((o) => !o.timeSlots || o.timeSlots.length === 0)
  startTime?: string;

  @ApiProperty({
    description: 'Giờ kết thúc (HH:mm) - Legacy, dùng timeSlots thay thế',
    example: '22:00',
    deprecated: true,
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime phải có định dạng HH:mm',
  })
  @ValidateIf((o) => !o.timeSlots || o.timeSlots.length === 0)
  endTime?: string;

  @ApiProperty({ description: 'Lý do tăng ca', required: false })
  @IsOptional()
  @IsString()
  reason?: string;

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

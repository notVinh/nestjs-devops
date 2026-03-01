import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsDate,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

class LocationDto {
  @ApiProperty({ 
    example: 10.823022,
    description: 'Vĩ độ (latitude) của vị trí chấm công'
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(-90, { message: 'Vĩ độ phải từ -90 đến 90' })
  @Max(90, { message: 'Vĩ độ phải từ -90 đến 90' })
  latitude: number;

  @ApiProperty({ 
    example: 106.629699,
    description: 'Kinh độ (longitude) của vị trí chấm công'
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(-180, { message: 'Kinh độ phải từ -180 đến 180' })
  @Max(180, { message: 'Kinh độ phải từ -180 đến 180' })
  longitude: number;
}

export class CheckInDto {
  factoryId: number;

  employeeId: number;

  @ApiProperty({ example: '2024-01-01' })
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  attendanceDate: Date;

  @ApiProperty({ example: '2024-01-01 08:00:00' })
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  checkInTime: Date;

  @ApiProperty({ example: { latitude: 10.823022, longitude: 106.629699 } })
  @IsNotEmpty()
  checkInLocation: LocationDto;

  @ApiProperty({ example: '123 Đường ABC, Quận 1, TP.HCM' })
  @IsNotEmpty()
  @IsString()
  checkInAddress: string;

  @ApiProperty({ example: 'https://example.com/photo.jpg' })
  @IsOptional()
  @IsString()
  checkInPhotoUrl?: string;

  @ApiProperty({ example: '{"device": "iPhone", "os": "iOS 15"}' })
  @IsOptional()
  @IsString()
  checkInDeviceInfo?: string;

  @ApiProperty({ example: 'QR_CODE' })
  @IsOptional()
  @IsString()
  checkInMethod?: string;
}

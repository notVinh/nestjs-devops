import { IsInt, IsString, IsOptional, IsObject, ValidateNested, IsNumber, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class LocationDto {
  @ApiProperty({ description: 'Vĩ độ', example: 10.762622 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Kinh độ', example: 106.660172 })
  @IsNumber()
  longitude: number;
}

export class CreateArrivalReportDto {
  @ApiProperty({ description: 'ID nhà máy công tác' })
  @IsInt()
  factoryId: number;

  @ApiProperty({ description: 'ID nhân viên nhận thông báo (legacy - dùng checkEmployeeIds thay thế)', deprecated: true, required: false })
  @IsOptional()
  @IsInt()
  checkEmployeeId?: number;

  @ApiProperty({ description: 'Danh sách ID người nhận thông báo khi báo cáo đến', type: [Number], required: false })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  checkEmployeeIds?: number[];

  @ApiProperty({ description: 'Tên công ty/địa điểm công tác', example: 'Công ty TNHH ABC' })
  @IsString()
  companyName: string;

  @ApiProperty({ description: 'Vị trí đến', type: LocationDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  @IsObject()
  arrivalLocation?: LocationDto;

  @ApiProperty({ description: 'Ghi chú', required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({
    description: 'Danh sách URL ảnh xác thực khi đến nơi công tác',
    required: false,
    type: [String],
    example: ['https://s3.amazonaws.com/photo1.jpg', 'https://s3.amazonaws.com/photo2.jpg']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[];
}

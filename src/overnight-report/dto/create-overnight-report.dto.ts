import { IsInt, IsString, IsOptional, IsObject, ValidateNested, IsNumber, IsArray, ArrayMinSize } from 'class-validator';
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

export class CreateOvernightReportDto {
  @ApiProperty({ description: 'ID nhà máy' })
  @IsInt()
  factoryId: number;

  @ApiProperty({
    description: 'Danh sách ID nhân viên nhận báo cáo (có thể chọn nhiều người)',
    type: [Number],
    example: [1, 2, 3]
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Phải chọn ít nhất 1 người nhận báo cáo' })
  @IsInt({ each: true })
  receiverEmployeeIds: number[];

  @ApiProperty({ description: 'Vị trí qua đêm', type: LocationDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  @IsObject()
  location?: LocationDto;

  @ApiProperty({ description: 'Địa chỉ qua đêm', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ description: 'Ghi chú', required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({
    description: 'Danh sách URL ảnh xác thực vị trí qua đêm',
    required: false,
    type: [String],
    example: ['https://s3.amazonaws.com/photo1.jpg', 'https://s3.amazonaws.com/photo2.jpg']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[];
}

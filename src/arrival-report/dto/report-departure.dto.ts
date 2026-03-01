import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsNumber, IsOptional, IsString, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

class DepartureLocationDto {
  @ApiProperty({ description: 'Vĩ độ', example: 10.762622 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Kinh độ', example: 106.660172 })
  @IsNumber()
  longitude: number;
}

export class ReportDepartureDto {
  @ApiProperty({ description: 'ID nhà máy công tác' })
  @IsInt()
  factoryId: number;

  @ApiProperty({
    description: 'ID báo cáo đến (nếu muốn chỉ định cụ thể). Nếu không gửi, hệ thống tìm báo cáo đến của hôm nay.',
    required: false,
  })
  @IsOptional()
  @IsInt()
  arrivalReportId?: number;

  @ApiProperty({ description: 'Vị trí rời đi', type: DepartureLocationDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => DepartureLocationDto)
  @IsObject()
  departureLocation?: DepartureLocationDto;

  @ApiProperty({
    description: 'Danh sách URL ảnh khi rời đi',
    required: false,
    type: [String],
    example: ['https://s3.amazonaws.com/photo1.jpg'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  departurePhotoUrls?: string[];

  @ApiProperty({
    description: 'Ghi chú khi rời đi',
    required: false,
    example: 'Đã hoàn thành công việc',
  })
  @IsOptional()
  @IsString()
  departureNote?: string;
}


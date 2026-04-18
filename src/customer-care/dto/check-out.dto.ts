import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class LocationDto {
  @ApiProperty({ example: 10.762622 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ example: 106.660172 })
  @IsNumber()
  longitude: number;
}

export class CheckOutDto {
  @ApiPropertyOptional({ description: 'Vị trí check-out' })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @ApiPropertyOptional({ description: 'Ghi chú lúc check-out' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    description: 'Danh sách link ảnh chụp lúc check-out',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[];
}

import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class LocationDto {
  @ApiProperty({ example: 10.823022 })
  @IsNotEmpty()
  @IsNumber()
  latitude: number;

  @ApiProperty({ example: 106.629699 })
  @IsNotEmpty()
  @IsNumber()
  longitude: number;
}

class BranchLocationDto {
  @ApiProperty({ example: 'Chi nhánh 1', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 10.823022 })
  @IsNotEmpty()
  @IsNumber()
  latitude: number;

  @ApiProperty({ example: 106.629699 })
  @IsNotEmpty()
  @IsNumber()
  longitude: number;
}

export class CreateFactoryDto {
  @ApiProperty({ example: 'Nhà máy 1' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: '0909090909' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({ example: 'Văn Lâm, Hưng Yên' })
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiProperty({ example: 'nguyenvana@gmail.com' })
  @IsOptional()
  @IsString()
  email: string;

  @ApiProperty({ example: { latitude: 10.823022, longitude: 106.629699 } })
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @ApiProperty({ example: 100 })
  @IsNotEmpty()
  @IsNumber()
  maxEmployees: number;

  @ApiProperty({ example: '08:00:00' })
  @IsNotEmpty()
  @IsString()
  hourStartWork: string;

  @ApiProperty({ example: '17:00:00' })
  @IsNotEmpty()
  @IsString()
  hourEndWork: string;

  @ApiProperty({ 
    example: [1, 2, 3, 4, 5], 
    description: 'Ngày làm việc trong tuần: 0=CN, 1=T2, 2=T3, 3=T4, 4=T5, 5=T6, 6=T7',
    required: false 
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  workDays?: number[];

  @ApiProperty({
    example: [
      { name: 'Chi nhánh 1', latitude: 10.823022, longitude: 106.629699 },
      { name: 'Chi nhánh 2', latitude: 10.850000, longitude: 106.650000 }
    ],
    description: 'Danh sách vị trí các chi nhánh (tùy chọn)',
    required: false
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BranchLocationDto)
  branchLocations?: BranchLocationDto[];
}

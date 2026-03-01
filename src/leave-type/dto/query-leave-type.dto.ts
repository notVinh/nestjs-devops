import { IsOptional, IsInt, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class QueryLeaveTypeDto {
  @ApiProperty({ description: 'ID nhà máy', required: false })
  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value, 10))
  factoryId?: number;

  @ApiProperty({ description: 'Có đang hoạt động không', required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @ApiProperty({ description: 'Có hưởng lương hay không', required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isPaid?: boolean;
}

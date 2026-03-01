import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber } from 'class-validator';

export class ApproveMisaOrderDto {
  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Ghi chú' })
  notes?: string;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ description: 'ID của phòng được thông báo' })
  notifyDepartmentId?: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ description: 'ID của nhóm được thông báo' })
  notifyTeamId?: number;
}

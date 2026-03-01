import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber } from 'class-validator';

export class AddEmployeesDto {
  @ApiProperty({ description: 'Danh sách ID nhân viên', type: [Number] })
  @IsArray()
  @IsNumber({}, { each: true })
  employeeIds: number[];
}


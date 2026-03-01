import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateLeaveRequestDto } from './create-leave-request.dto';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateLeaveRequestDto extends PartialType(CreateLeaveRequestDto) {
  @IsOptional()
  @IsEnum(['pending', 'approved', 'rejected', 'cancelled', 'hr_confirmed'])
  @ApiProperty({ description: 'Trạng thái đơn nghỉ phép' })
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'hr_confirmed';

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Ghi chú phê duyệt' })
  @MaxLength(500)
  decisionNote?: string;

  @ApiProperty({ description: 'Employee id của người duyệt/từ chối đơn' })
  @IsOptional()
  @IsInt()
  @Min(1)
  decidedByEmployeeId?: number;
}



import { IsInt, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmBulkOvertimeRequestDto {
  @ApiProperty({ description: 'ID người xác nhận' })
  @IsInt()
  confirmedByEmployeeId: number;

  @ApiProperty({
    description: 'Tự động duyệt tất cả overtime và tạo attendance ngay lập tức',
    required: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  autoApprove?: boolean;
}

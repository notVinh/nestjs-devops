import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RejectPurchaseRequisitionDto {
  @ApiProperty({
    description: 'Lý do từ chối (bắt buộc)',
    example: 'Không đủ ngân sách',
  })
  @IsNotEmpty({ message: 'Lý do từ chối là bắt buộc' })
  @IsString()
  reason: string;
}

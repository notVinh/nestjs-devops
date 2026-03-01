import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ResubmitPurchaseRequisitionDto {
  @ApiProperty({
    description: 'Ghi chú khi gửi lại đề xuất (mô tả những thay đổi đã thực hiện)',
    example: 'Đã bổ sung thông tin chi tiết về số lượng và đơn giá',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

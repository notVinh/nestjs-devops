import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RequestRevisionPurchaseRequisitionDto {
  @ApiProperty({
    description: 'Lý do yêu cầu chỉnh sửa (bắt buộc)',
    example: 'Cần bổ sung thông tin chi tiết về số lượng và đơn giá',
  })
  @IsNotEmpty({ message: 'Lý do yêu cầu chỉnh sửa là bắt buộc' })
  @IsString()
  reason: string;
}

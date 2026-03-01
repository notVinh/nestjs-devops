import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePurchaseRequisitionDto {
  @ApiProperty({
    description: 'ID đơn hàng Misa cũ (MisaOrder) - có thể null',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  misaOrderId?: number | null;

  @ApiProperty({
    description: 'ID đơn bán hàng MisaSaOrder - có thể null',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  misaSaOrderId?: number | null;

  @ApiProperty({
    description: 'Ghi chú đề xuất mua hàng',
    example: 'Cần đặt thêm 10 sản phẩm A, 5 sản phẩm B',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Số đề xuất mua hàng',
    example: 'DXMH-1765300000000',
  })
  @IsNotEmpty({ message: 'Số đề xuất mua hàng là bắt buộc' })
  @IsString()
  requisitionNumber: string;

  @ApiProperty({
    description: 'Đánh dấu DXMH được tạo tự động từ đơn bán hàng (auto approve)',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isAutoFromSalesOrder?: boolean;
}

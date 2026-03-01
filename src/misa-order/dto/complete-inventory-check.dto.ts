import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class CompleteInventoryCheckDto {
  @ApiProperty({
    description: 'Ghi chú về hàng tồn (bắt buộc nếu needsOrder = true)',
    example: 'Cần đặt thêm 10 sản phẩm',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Có cần đặt hàng hay không',
    example: true,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  needsOrder?: boolean;

  @ApiProperty({
    description: 'ID nhân viên cần gửi thông báo (bắt buộc nếu needsOrder = true)',
    example: 13,
    required: false,
  })
  @IsOptional()
  @IsInt()
  notifyEmployeeId?: number;
}

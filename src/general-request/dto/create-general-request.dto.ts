import { IsInt, IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateGeneralRequestDto {
  @ApiProperty({ description: 'Tiêu đề yêu cầu', example: 'Yêu cầu văn phòng phẩm' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ description: 'Nội dung chi tiết yêu cầu', example: 'Cần mua thêm 10 ram giấy A4' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: 'ID người duyệt', example: 1 })
  @Type(() => Number)
  @IsInt()
  approverEmployeeId: number;
}

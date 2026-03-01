import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsOptional, IsNumber, IsString, IsBoolean, IsArray, ArrayNotEmpty, IsIn, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateEmployeeDto {
  @ApiProperty({ example: 1 })
  @IsOptional()
  @IsNumber()
  factoryId: number;

  @ApiProperty({ example: 1 })
  @IsOptional()
  @IsNumber()
  userId: number;

  @ApiProperty({ required: false, example: 'NV001', description: 'Mã nhân viên' })
  @IsOptional()
  @IsString()
  employeeCode?: string;

  @ApiProperty({ example: 'Nhân viên 1' })
  @IsOptional()
  @IsString()
  name: string;

  @ApiProperty({ required: false, example: 'Nam', description: 'Giới tính: Nam, Nữ, Khác' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({ example: 1 })
  @IsOptional()
  @IsNumber()
  salary: number;

  @ApiProperty({ example: 1 })
  @IsOptional()
  @IsNumber()
  positionId: number;

  @ApiProperty({ example: 1})
  @IsOptional()
  @IsNumber()
  departmentId: number;

  @ApiProperty({ required: false, example: 1, description: 'ID tổ' })
  @IsOptional()
  @IsNumber()
  teamId?: number;

  @ApiProperty({ example: 'Chính thức' })
  @IsOptional()
  @IsString()
  status: string;

  @ApiProperty({ example: 'daily', description: 'Loại lương: daily (theo ngày công) hoặc production (theo sản lượng)' })
  @IsOptional()
  @IsString()
  @IsIn(['daily', 'production'])
  salaryType?: 'daily' | 'production';

  @ApiProperty({ example: '2021-01-01' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDateJob: Date;

  @ApiProperty({ required: false, example: '2021-12-31' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDateJob?: Date | null;

  @ApiProperty({ required: false, example: false, description: 'Có phải quản lý không' })
  @IsOptional()
  @IsBoolean()
  isManager?: boolean;

  @ApiProperty({ example: '0901234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false, example: 'example@email.com', description: 'Email nhân viên' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ required: false, example: 'Nguyễn Văn A', description: 'Họ tên đầy đủ' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({ required: false, example: true, description: 'Có quyền vào trang admin ở phạm vi nhà máy' })
  @IsOptional()
  @IsBoolean()
  canAccessAdmin?: boolean;

  @ApiProperty({ required: false, type: [String], example: ['my-factory', 'my-factory-employees'] })
  @IsOptional()
  @IsArray()
  adminMenuKeys?: string[];

  @ApiProperty({ required: false, example: 12, description: 'Tổng số ngày phép trong năm' })
  @IsOptional()
  @IsNumber()
  totalLeaveDays?: number;

  @ApiProperty({ required: false, example: 5, description: 'Số ngày phép đã sử dụng' })
  @IsOptional()
  @IsNumber()
  usedLeaveDays?: number;

  @ApiProperty({ required: false, example: 7, description: 'Số ngày phép còn lại' })
  @IsOptional()
  @IsNumber()
  availableLeaveDays?: number;

  @ApiProperty({ required: false, example: 2, description: 'Số ngày phép sắp hết hạn' })
  @IsOptional()
  @IsNumber()
  expiringLeaveDays?: number;

  @ApiProperty({
    required: false,
    example: '08:00:00',
    description: 'Giờ bắt đầu làm việc riêng của nhân viên (HH:mm:ss). Nếu có thì ưu tiên hơn giờ của nhà máy'
  })
  @IsOptional()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, {
    message: 'hourStartWork phải có định dạng HH:mm:ss (ví dụ: 08:00:00)'
  })
  hourStartWork?: string | null;

  @ApiProperty({
    required: false,
    example: '17:00:00',
    description: 'Giờ kết thúc làm việc riêng của nhân viên (HH:mm:ss). Nếu có thì ưu tiên hơn giờ của nhà máy'
  })
  @IsOptional()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, {
    message: 'hourEndWork phải có định dạng HH:mm:ss (ví dụ: 17:00:00)'
  })
  hourEndWork?: string | null;
}

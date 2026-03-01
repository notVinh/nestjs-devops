import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsBoolean, IsDate, IsArray, IsIn, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEmployeeWithUserDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  factoryId: number;

  @ApiProperty({ required: false, example: 'NV001', description: 'Mã nhân viên' })
  @IsOptional()
  @IsString()
  employeeCode?: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ required: false, example: 'Nam', description: 'Giới tính: Nam, Nữ, Khác' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({ example: '0901234567' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'nguyenvana@gmail.com' })
  @IsString()
  @IsOptional()
  email: string;

  @ApiProperty({ example: 3 })
  @IsNumber()
  positionId: number;

  @ApiProperty({ example: 1, description: 'ID phòng ban' })
  @IsNumber()
  departmentId: number;

  @ApiProperty({ required: false, example: 1, description: 'ID tổ' })
  @IsOptional()
  @IsNumber()
  teamId?: number;

  @ApiProperty({ required: false, example: 8000000 })
  @IsOptional()
  @IsNumber()
  salary?: number;

  @ApiProperty({ required: false, example: 'Chính thức' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false, example: 'daily', description: 'Loại lương: daily (theo ngày công) hoặc production (theo sản lượng)' })
  @IsOptional()
  @IsString()
  salaryType?: 'daily' | 'production';

  @ApiProperty({ required: false, example: '2025-10-01' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDateJob?: string;

  @ApiProperty({ required: false, example: null })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDateJob?: string | null;

  @ApiProperty({ required: false, example: false, description: 'Có phải quản lý không' })
  @IsOptional()
  @IsBoolean()
  isManager?: boolean;

  @ApiProperty({
    description: 'Array of allowed attendance methods',
    example: ['location', 'remote', 'photo', 'fingerprint'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsIn(['location', 'remote', 'photo', 'fingerprint'], { each: true })
  allowedAttendanceMethods?: string[];

  @ApiProperty({
    description: 'Require location verification for attendance',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  requireLocationCheck?: boolean;

  @ApiProperty({
    description: 'Require photo verification for attendance',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  requirePhotoVerification?: boolean;

  @ApiProperty({
    description: 'Require fingerprint verification for attendance',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  requireFingerprintVerification?: boolean;

  @ApiProperty({
    description: 'Allow attendance without location check (remote attendance)',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  allowRemoteAttendance?: boolean;

  @ApiProperty({
    description: 'Giờ bắt đầu làm việc riêng của nhân viên (HH:mm:ss). Nếu có thì ưu tiên hơn giờ của nhà máy',
    example: '08:00:00',
    required: false,
  })
  @IsOptional()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, {
    message: 'hourStartWork phải có định dạng HH:mm:ss (ví dụ: 08:00:00)'
  })
  hourStartWork?: string | null;

  @ApiProperty({
    description: 'Giờ kết thúc làm việc riêng của nhân viên (HH:mm:ss). Nếu có thì ưu tiên hơn giờ của nhà máy',
    example: '17:00:00',
    required: false,
  })
  @IsOptional()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, {
    message: 'hourEndWork phải có định dạng HH:mm:ss (ví dụ: 17:00:00)'
  })
  hourEndWork?: string | null;
}



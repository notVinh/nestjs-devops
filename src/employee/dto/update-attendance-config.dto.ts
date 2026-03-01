import { IsBoolean, IsArray, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAttendanceConfigDto {
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
}

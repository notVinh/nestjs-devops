import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsString } from 'class-validator';
import { STATUS_NOTIFICATION } from '../constants/status.constant';

export class UpdateNotificationTokenDto {
  @ApiProperty()
  @IsString()
  fcmToken: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsIn([STATUS_NOTIFICATION.Active, STATUS_NOTIFICATION.InActive])
  status: number;
}

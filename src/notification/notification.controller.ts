import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { NotificationTokenDto } from './dtos/create-notification-token.dto';
import { RoleEnum } from 'src/roles/roles.enum';
import { Roles } from 'src/roles/roles.decorator';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/roles/roles.guard';
import { UpdateNotificationTokenDto } from './dtos/update-status-notification.dto';
import { NotificationToken } from './entities/notification-token.entity';
import {
  IPaginationOptions,
  IPaginationResult,
} from 'src/utils/types/pagination-options.type';
import { Notification } from './entities/notification.entity';
import { SendTestNotificationDto } from './dtos/send-test-notification.dto';
import { BaseResponse, ResponseHelper } from 'src/utils/base-response';

@ApiTags('Notification')
@Controller({
  path: 'notification',
  version: '1',
})
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
@Roles(
  RoleEnum.superAdmin,
  RoleEnum.factoryAdmin,
  RoleEnum.employee,
  RoleEnum.employee_gtg
)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('accept-push')
  async acceptPushNotification(
    @Body() body: NotificationTokenDto,
    @Request() request
  ): Promise<NotificationToken> {
    return await this.notificationService.acceptPushNotification(
      body,
      request.user.id
    );
  }

  @Patch('status')
  async updateStatus(
    @Body() body: UpdateNotificationTokenDto,
    @Request() request
  ) {
    return await this.notificationService.changeStatus(request.user.id, body);
  }

  @Get()
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  async getAll(
    @Query() filter: IPaginationOptions,
    @Request() request
  ): Promise<BaseResponse<IPaginationResult<Notification>>> {
    const result = await this.notificationService.getList(
      filter,
      request.user.id
    );
    return ResponseHelper.success(
      result,
      'Get notifications successfully',
      HttpStatus.OK
    );
  }

  @Patch('read-one/:id')
  async readSingeNotification(
    @Param('id', ParseIntPipe) id: number,
    @Request() request
  ): Promise<BaseResponse<null>> {
    await this.notificationService.readNotification(id, request.user.id);
    return ResponseHelper.successNoData(
      'Notification marked as read',
      HttpStatus.OK
    );
  }

  @Patch('read-all')
  async readAll(@Request() request): Promise<BaseResponse<null>> {
    await this.notificationService.readAllNotification(request.user.id);
    return ResponseHelper.successNoData(
      'All notifications marked as read',
      HttpStatus.OK
    );
  }

  @Get('count-unseen')
  async countUnseen(
    @Request() request
  ): Promise<BaseResponse<{ count: number }>> {
    const count = await this.notificationService.countUnseen(request.user.id);
    return ResponseHelper.success(
      { count },
      'Get unread count successfully',
      HttpStatus.OK
    );
  }

  @Delete(':id')
  async deleteNotification(
    @Param('id', ParseIntPipe) id: number,
    @Request() request
  ): Promise<BaseResponse<null>> {
    await this.notificationService.deleteNotification(id, request.user.id);
    return ResponseHelper.successNoData(
      'Notification deleted successfully',
      HttpStatus.OK
    );
  }

  @Delete('fcm-token/:id')
  async removeFcmToken(
    @Param('id', ParseIntPipe) id: number,
    @Request() request
  ): Promise<void> {
    const notification_token = await this.notificationService.findOne({
      id: id,
    });
    if (notification_token.userId !== request.user.id) {
      throw new ForbiddenException({
        message: 'Error user cannot delete',
        statusCode: HttpStatus.FORBIDDEN,
      });
    }
    await this.notificationService.softDeleteFcmToken(id);
  }

  @Post('send-test')
  async sendTestNotification(
    @Body() body: SendTestNotificationDto,
    @Request() request
  ) {
    const targetUserId = body.userId || request.user.id;

    // // If trying to send to different user, check permission
    // if (
    //   targetUserId !== request.user.id &&
    //   ![RoleEnum.superAdmin, RoleEnum.factoryAdmin].includes(
    //     request.user.role?.id
    //   )
    // ) {
    //   throw new ForbiddenException({
    //     message: 'Only admins can send test notifications to other users',
    //     statusCode: HttpStatus.FORBIDDEN,
    //   });
    // }

    return await this.notificationService.sendTestNotification(
      body.title,
      body.body,
      targetUserId
    );
  }
}

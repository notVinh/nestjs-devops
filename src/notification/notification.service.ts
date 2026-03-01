import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PushNotificationDto } from './dtos/push-notification.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { NotificationToken } from './entities/notification-token.entity';
import { Notification } from './entities/notification.entity';
import { NotificationTokenDto } from './dtos/create-notification-token.dto';
import { STATUS_NOTIFICATION } from './constants/status.constant';
import { UpdateNotificationTokenDto } from './dtos/update-status-notification.dto';
import { EntityCondition } from 'src/utils/types/entity-condition.type';
import {
  IPaginationOptions,
  IPaginationResult,
} from 'src/utils/types/pagination-options.type';
import { MulticastMessage } from 'firebase-admin/lib/messaging/messaging-api';
import { PaginationHelper } from 'src/utils/pagination.helper';
import { throwNotFoundError } from 'src/utils/error.helper';

@Injectable()
export class NotificationService {
  private readonly context = 'NotificationService';

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationToken)
    private readonly notificationTokenRepository: Repository<NotificationToken>,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    // Firebase is initialized in main.ts before app bootstrap
  }

  // Helper methods để log với context
  private log(message: string) {
    this.logger.info(message, { context: this.context });
  }

  private debug(message: string) {
    this.logger.debug(message, { context: this.context });
  }

  private warn(message: string) {
    this.logger.warn(message, { context: this.context });
  }

  private error(message: string, trace?: any) {
    if (trace) {
      this.logger.error(message, { context: this.context, trace: trace?.stack || trace });
    } else {
      this.logger.error(message, { context: this.context });
    }
  }
  async findOne(
    fields: EntityCondition<NotificationToken>
  ): Promise<NotificationToken> {
    const notification_token = await this.notificationTokenRepository.findOne({
      where: fields,
    });
    if (!notification_token) {
      throwNotFoundError('Token notification không tồn tại');
    }

    return notification_token;
  }

  async createNotification(body: PushNotificationDto): Promise<Notification> {
    return await this.notificationRepository.save(
      this.notificationRepository.create(body)
    );
  }

  async acceptPushNotification(
    body: NotificationTokenDto,
    user_id: number
  ): Promise<NotificationToken> {
    // await this.validateFcmToken(body.fcm_token);

    const listFcm = await this.notificationTokenRepository.findBy({
      fcmToken: body.fcmToken,
    });
    if (listFcm.length > 0) {
      listFcm.forEach(e => this.notificationTokenRepository.remove(e));
    }

    return await this.notificationTokenRepository.save(
      this.notificationTokenRepository.create({
        userId: user_id,
        fcmToken: body.fcmToken,
        status: STATUS_NOTIFICATION.Active,
      })
    );
  }

  // async validateFcmToken(fcm_token: string) {
  //   try {
  //     const messageValidate: admin.messaging.Message = {
  //       notification: {},
  //       token: fcm_token,
  //     };
  //     await admin.messaging().send(messageValidate, true);
  //   } catch (err) {
  //     throw new BadRequestException({
  //       message: 'Error Invalid FCM Token',
  //     });
  //   }
  // }

  async findOneNotification(
    fields: EntityCondition<NotificationToken>
  ): Promise<NotificationToken> {
    const notification_token = await this.notificationTokenRepository.findOne({
      where: fields,
    });
    if (!notification_token) {
      throwNotFoundError('Token notification không tồn tại');
    }

    return notification_token;
  }

  async changeStatus(userId: number, body: UpdateNotificationTokenDto) {
    await this.findOneNotification({ fcmToken: body.fcmToken });

    await this.notificationTokenRepository
      .createQueryBuilder()
      .update(NotificationToken)
      .set({ status: body.status })
      .where('userId = :userId', { userId })
      .andWhere('fcmToken = :fcmToken', { fcmToken: body.fcmToken })
      .execute();
  }

  async readNotification(id: number, userId: number) {
    await this.notificationRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ statusCd: STATUS_NOTIFICATION.Seen })
      .where('userId = :userId', { userId })
      .andWhere('id = :id', { id })
      .execute();
  }

  async readAllNotification(userId: number) {
    await this.notificationRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ statusCd: STATUS_NOTIFICATION.Seen })
      .where('userId = :userId', { userId })
      .execute();
  }

  async countUnseen(userId: number): Promise<number> {
    return await this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .andWhere('notification.statusCd = :statusCd', { statusCd: STATUS_NOTIFICATION.UnSeen })
      .getCount();
  }

  async deleteNotification(id: number, userId: number): Promise<void> {
    await this.notificationRepository
      .createQueryBuilder()
      .delete()
      .from(Notification)
      .where('id = :id', { id })
      .andWhere('userId = :userId', { userId })
      .execute();
  }

  async findFcmTokenByUser(user_id: number): Promise<NotificationToken[]> {
    const fcm_tokens = await this.notificationTokenRepository.find({
      where: { userId: user_id, status: STATUS_NOTIFICATION.Active },
    });
    return fcm_tokens;
  }

  async sendEachForMulticast(
    title: string,
    body: string,
    fcm_tokens: NotificationToken[],
    data?: Record<string, string>
  ): Promise<void> {
    // Check if Firebase is initialized
    if (admin.apps.length === 0) {
      this.warn(
        'Firebase not initialized. Cannot send notification. Please configure Firebase credentials.'
      );
      return;
    }

    const tokens = fcm_tokens.map(item => item.fcmToken);

    const message: admin.messaging.MulticastMessage = {
      notification: {
        title,
        body,
      },
      data,
      tokens,
      android: {
        priority: 'high',
      },
      // Test chuông thông báo IOS
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);

      // Handle responses for failed tokens
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        const invalidTokensToDeactivate: string[] = [];

        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const token = tokens[idx];
            failedTokens.push(token);

            // Kiểm tra error code để quyết định có deactivate token không
            const errorCode = resp.error?.code;

            // Các error codes cho biết token không còn hợp lệ
            const shouldDeactivate = [
              'messaging/registration-token-not-registered', // Token đã bị xóa
              'messaging/invalid-registration-token',        // Token không hợp lệ
              'messaging/invalid-argument',                  // Token format sai
            ].includes(errorCode || '');

            if (shouldDeactivate) {
              invalidTokensToDeactivate.push(token);
              this.warn(`Token invalid (${errorCode}), will deactivate: ${token.substring(0, 20)}...`);
            } else {
              // Lỗi tạm thời (network, quota, etc.) - không deactivate
              this.warn(`Token failed temporarily (${errorCode}): ${token.substring(0, 20)}...`);
            }
          }
        });

        // Deactivate invalid tokens trong database
        if (invalidTokensToDeactivate.length > 0) {
          try {
            await this.notificationTokenRepository
              .createQueryBuilder()
              .update(NotificationToken)
              .set({ status: STATUS_NOTIFICATION.InActive }) // status = 0
              .where('fcmToken IN (:...tokens)', { tokens: invalidTokensToDeactivate })
              .execute();

            this.log(`✅ Deactivated ${invalidTokensToDeactivate.length} invalid FCM tokens`);
          } catch (error) {
            this.error('Failed to deactivate invalid tokens', error);
          }
        }

        this.warn(`Failed to send to ${failedTokens.length} token(s), deactivated ${invalidTokensToDeactivate.length} invalid token(s)`);
      }
    } catch (error) {
      throw new BadRequestException({
        message: `Error: ${error.message}`,
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
  }

  sendNotifications(
    title: string,
    body: string,
    tokens: string[],
    data?: {
      [key: string]: string;
    }
  ) {
    const message: MulticastMessage = {
      notification: {
        title: title,
        body: body,
      },
      data: data,
      tokens: tokens,
    };

    admin
      .messaging()
      .sendEachForMulticast(message)
      .then(response => {})
      .catch(error => {});
  }

  async getList(
    filter: IPaginationOptions,
    userId: number
  ): Promise<IPaginationResult<Notification>> {
    let itemsPerPage: number = Number(filter.limit) || 10;
    if (itemsPerPage > 50) {
      itemsPerPage = 50;
    }
    const page: number = filter.page || 1;
    const skip = page > 1 ? (page - 1) * itemsPerPage : 0;
    const query = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .addOrderBy('notification.createdAt', 'DESC');

    query.skip(skip);
    query.take(itemsPerPage);
    const [data, total] = await query.getManyAndCount();

    const meta = PaginationHelper.createMeta(page, itemsPerPage, total);

    return PaginationHelper.createResult(data, meta);
  }

  /**
   * Gửi FCM notification mà không lưu vào DB
   * Dùng cho các reminder không cần lưu lại
   */
  async sendFCMOnly(
    userId: number,
    title: string,
    body: string,
    type?: string,
    referenceId?: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    // Lấy FCM tokens của user
    const fcmTokens = await this.findFcmTokenByUser(userId);

    if (fcmTokens.length === 0) {
      this.warn(`User ${userId} has no active FCM tokens`);
      return;
    }

    // Prepare data payload cho deep linking (tất cả values phải là string cho FCM)
    const data: Record<string, string> = {};

    if (type) {
      data.type = type;
    }
    if (referenceId !== undefined && referenceId !== null) {
      data.referenceId = referenceId.toString();
    }
    if (metadata) {
      data.metadata = JSON.stringify(metadata);
    }

    // Gửi FCM notification mà không lưu vào DB
    await this.sendEachForMulticast(
      title,
      body,
      fcmTokens,
      Object.keys(data).length > 0 ? data : undefined
    );
  }

   /**
   * Gửi notification tới user với deep linking
   * - Gửi push notification qua FCM
   * - Lưu thông tin notification vào DB
   */
  async sendNotificationToUser(
    userId: number,
    title: string,
    body: string,
    type?: string,
    referenceId?: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    // Lấy FCM tokens của user
    const fcmTokens = await this.findFcmTokenByUser(userId);

    if (fcmTokens.length === 0) {
      this.warn(`User ${userId} has no active FCM tokens`);
      // Vẫn lưu notification vào DB dù không gửi được FCM
    }

    // Lưu notification vào DB TRƯỚC để có ID
    const notificationTokenIds = fcmTokens.map(token => token.id);
    const notificationData = {
      title,
      body,
      type,
      referenceId,
      metadata,
      notificationTokenIds,
      userId,
      statusCd: 0,
    };

    const savedNotification = await this.notificationRepository.save(
      this.notificationRepository.create(notificationData)
    );

    // Prepare data payload cho deep linking (tất cả values phải là string cho FCM)
    const data: Record<string, string> = {};

    // Thêm notificationId để mobile có thể mark as read khi click
    data.notificationId = savedNotification.id.toString();

    if (type) {
      data.type = type;
    }
    if (referenceId !== undefined && referenceId !== null) {
      data.referenceId = referenceId.toString();
    }
    if (metadata) {
      data.metadata = JSON.stringify(metadata);
    }

    // Gửi FCM notification với notificationId
    if (fcmTokens.length > 0) {
      await this.sendEachForMulticast(
        title,
        body,
        fcmTokens,
        Object.keys(data).length > 0 ? data : undefined
      );
    }
  }

  /**
   * Gửi notification tới nhiều users cùng lúc - tối ưu hơn so với gọi sendNotificationToUser trong vòng lặp
   * - Batch save notifications vào DB
   * - Gọi sendEachForMulticast 1 lần duy nhất cho tất cả tokens
   */
  async sendNotificationToMultipleUsers(
    userIds: number[],
    title: string,
    body: string,
    type?: string,
    referenceId?: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    if (userIds.length === 0) {
      return;
    }

    // 1. Lấy tất cả FCM tokens của các users
    const allFcmTokens = await this.notificationTokenRepository.find({
      where: userIds.map(userId => ({ userId, status: STATUS_NOTIFICATION.Active })),
    });

    // 2. Batch save notifications vào DB
    const notificationsToSave = userIds.map(userId => {
      const userTokens = allFcmTokens.filter(t => t.userId === userId);
      return this.notificationRepository.create({
        title,
        body,
        type,
        referenceId,
        metadata,
        notificationTokenIds: userTokens.map(t => t.id),
        userId,
        statusCd: 0,
      });
    });

    await this.notificationRepository.save(notificationsToSave);

    // 3. Gửi FCM 1 lần cho tất cả tokens
    if (allFcmTokens.length > 0) {
      const data: Record<string, string> = {};
      if (type) {
        data.type = type;
      }
      if (referenceId !== undefined && referenceId !== null) {
        data.referenceId = referenceId.toString();
      }
      if (metadata) {
        data.metadata = JSON.stringify(metadata);
      }

      await this.sendEachForMulticast(
        title,
        body,
        allFcmTokens,
        Object.keys(data).length > 0 ? data : undefined
      );
    }

    this.log(`Sent notification to ${userIds.length} users (${allFcmTokens.length} tokens)`);
  }

  async softDeleteFcmToken(id: number): Promise<void> {
    await this.notificationTokenRepository.softDelete(id);
  }

  async softDeleteNotification(id: number): Promise<void> {
    await this.notificationRepository.softDelete(id);
  }

  async sendTestNotification(
    title: string,
    body: string,
    user_id: number
  ): Promise<{
    success: boolean;
    message: string;
    tokensCount: number;
    sentCount: number;
    failedCount: number;
  }> {
    // Check if Firebase is initialized
    if (admin.apps.length === 0) {
      throw new BadRequestException({
        message:
          'Firebase is not initialized. Please configure Firebase credentials in .env file.',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    // Get all active FCM tokens for the user
    const fcmTokens = await this.findFcmTokenByUser(user_id);

    if (fcmTokens.length === 0) {
      return {
        success: false,
        message: 'User has no active FCM tokens',
        tokensCount: 0,
        sentCount: 0,
        failedCount: 0,
      };
    }

    const tokens = fcmTokens.map(item => item.fcmToken);

    const message: admin.messaging.MulticastMessage = {
      notification: {
        title,
        body,
      },
      tokens,
      android: {
        priority: 'high',
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);

      // Log failed tokens
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(tokens[idx]);
            this.error(
              `Failed to send to token ${tokens[idx]}`,
              resp.error
            );
          }
        });
      }

      return {
        success: true,
        message: 'Test notification sent successfully',
        tokensCount: tokens.length,
        sentCount: response.successCount,
        failedCount: response.failureCount,
      };
    } catch (error) {
      this.error('Error sending test notification', error);
      throw new BadRequestException({
        message: `Error sending notification: ${error.message}`,
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
  }
}

import { HttpException, HttpStatus, Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { S3Client } from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileEntity } from './entities/file.entity';
import { FilesService } from './files.service';
import { AllConfigType } from 'src/config/config.type';
import { Employee } from '../employee/entities/employee.entity';
import { User } from '../users/entities/user.entity';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([FileEntity, Employee, User]),
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AllConfigType>) => {
        const storages = {
          local: () =>
            diskStorage({
              destination: './files',
              filename: (request, file, callback) => {
                const filename = `${randomStringGenerator()}.${file.originalname
                  .split('.')
                  .pop()
                  ?.toLowerCase()}`;
                callback(null, filename);
              },
            }),
          s3: () => {
            try {
              const s3Config = {
                region: configService.get('file.awsS3Region', { infer: true }),
                endpoint: configService.get('file.awsDefaultS3Url', {
                  infer: true,
                }),
                bucket: configService.getOrThrow('file.awsDefaultS3Bucket', {
                  infer: true,
                }),
              };

              const s3 = new S3Client({
                region: s3Config.region,
                endpoint: s3Config.endpoint,
                credentials: {
                  accessKeyId: configService.getOrThrow('file.accessKeyId', {
                    infer: true,
                  }),
                  secretAccessKey: configService.getOrThrow(
                    'file.secretAccessKey',
                    { infer: true }
                  ),
                },
                forcePathStyle: true, // Cần thiết cho Viettel Cloud Storage
              });

              return multerS3({
                s3: s3,
                bucket: s3Config.bucket,
                contentType: multerS3.AUTO_CONTENT_TYPE,
                // key: (request, file, callback) => {
                //   const key = `${randomStringGenerator()}.${file.originalname
                //     .split('.')
                //     .pop()
                //     ?.toLowerCase()}`;
                //   console.log('☁️ S3 storage - Saving file as:', key);
                //   callback(null, key);
                // },
                key: (request: any, file, callback) => {
                  // 1. Ưu tiên lấy folder từ Header 'x-folder-name'
                  // 2. Nếu không có, kiểm tra URL (dành cho avatar nhân viên)
                  // 3. Nếu không có nữa thì để trống (ra root)
                  let folder = request.headers['x-folder-name'] as string;

                  if (!folder && request.url.includes('product')) {
                    folder = 'product'; // Tự động cho avatar vào folder product
                  }

                  const prefix = folder ? `${folder.trim()}/` : '';
                  const fileExtension = file.originalname
                    .split('.')
                    .pop()
                    ?.toLowerCase();
                  const filename = `${randomStringGenerator()}.${fileExtension}`;

                  callback(null, `${prefix}${filename}`);
                },
              });
            } catch (error) {
              console.error('Error initializing S3 storage:', error);
              throw error;
            }
          },
        };

        return {
          fileFilter: (request, file, callback) => {
            console.log('🔍 File filter - Checking file:', {
              originalname: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
            });

            if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
              console.log('File type rejected:', file.originalname);
              return callback(
                new HttpException(
                  {
                    status: HttpStatus.UNPROCESSABLE_ENTITY,
                    errors: {
                      file: `cantUploadFileType`,
                    },
                  },
                  HttpStatus.UNPROCESSABLE_ENTITY
                ),
                false
              );
            }

            console.log('File type accepted:', file.originalname);
            callback(null, true);
          },
          storage:
            storages[
              configService.getOrThrow('file.driver', { infer: true })
            ](),
          limits: {
            fileSize: configService.get('file.maxFileSize', { infer: true }),
          },
        };
      },
    }),
  ],
  controllers: [FilesController],
  providers: [ConfigModule, ConfigService, FilesService],
  exports: [FilesService],
})
export class FilesModule {}

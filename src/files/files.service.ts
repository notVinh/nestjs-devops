import { Injectable } from '@nestjs/common';
import { throwUnprocessableEntityError } from '../utils/error.helper';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { FileEntity } from './entities/file.entity';
import { Repository } from 'typeorm';
import { AllConfigType } from 'src/config/config.type';
import { Employee } from '../employee/entities/employee.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class FilesService {
  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async uploadFile(
    file: Express.Multer.File | Express.MulterS3.File
  ): Promise<FileEntity> {
    if (!file) {
      throwUnprocessableEntityError('selectFile');
    }

    try {
      const driver = this.configService.getOrThrow('file.driver', {
        infer: true,
      });

      console.log('🔍 Upload file debug - raw file object:', {
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
        key: (file as any).key,
        location: (file as any).location,
        bucket: (file as any).bucket,
        etag: (file as any).etag,
      });

      let s3Path = '';
      if (driver === 's3') {
        const s3File = file as Express.MulterS3.File;
        // MulterS3 có thể set location (full URL) hoặc key
        if (s3File.location) {
          s3Path = s3File.location;
        } else if (s3File.key) {
          s3Path = `${this.configService.get('file.awsDefaultS3Url', {
            infer: true,
          })}/${this.configService.get('file.awsDefaultS3Bucket', {
            infer: true,
          })}/${s3File.key}`;
        } else {
          console.error('S3 file missing both location and key!');
          throw new Error('S3 upload failed: missing file location/key');
        }
      }

      const path = {
        local: `/${this.configService.get('app.apiPrefix', {
          infer: true,
        })}/v1/files/${file.path}`,
        s3: s3Path,
      };

      console.log('🔍 Upload file debug:', {
        driver,
        filePath: path[driver],
        fileName: file.originalname,
        fileSize: file.size,
      });

      const fileEntity = this.fileRepository.create({
        path: path[driver],
        name: file.originalname,
      });

      console.log('📝 Created file entity:', fileEntity);

      const savedFile = await this.fileRepository.save(fileEntity);

      console.log('Saved file entity:', savedFile);

      return savedFile;
    } catch (error) {
      console.error('Error uploading file:', error);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  async uploadMultipleFiles(
    files: Array<Express.Multer.File | Express.MulterS3.File>
  ): Promise<FileEntity[]> {
    if (!files || files.length === 0) {
      throwUnprocessableEntityError('selectFile');
    }

    try {
      // Upload tất cả files song song (parallel) để tăng tốc độ
      const uploadPromises = files.map(file => this.uploadFile(file));
      const uploadedFiles = await Promise.all(uploadPromises);

      console.log(`Uploaded ${uploadedFiles.length} files successfully`);
      return uploadedFiles;
    } catch (error) {
      console.error('Error uploading multiple files:', error);
      throw error;
    }
  }

  async uploadEmployeeAvatar(
    employeeId: number,
    file: Express.Multer.File | Express.MulterS3.File
  ): Promise<any> {
    // Find employee with user relation
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
      relations: [
        'user',
        'user.photo',
        'user.role',
        'position',
        'department',
        'team',
      ],
    });

    if (!employee) {
      throw new Error('Nhân viên không tồn tại');
    }

    if (!employee.user) {
      throw new Error('User của nhân viên không tồn tại');
    }

    // Upload file
    const uploadedFile = await this.uploadFile(file);

    // Update user photoId
    await this.userRepository.update(employee.user.id, {
      photo: uploadedFile as any,
    });

    // Reload employee with new photo
    const updatedEmployee = await this.employeeRepository.findOne({
      where: { id: employeeId },
      relations: [
        'user',
        'user.photo',
        'user.role',
        'position',
        'department',
        'team',
      ],
    });

    return updatedEmployee;
  }

  async uploadFileProduct(
    file: Express.Multer.File | Express.MulterS3.File,
    folder: string = '' // Thêm tham số folder (mặc định để trống)
  ): Promise<FileEntity> {
    if (!file) {
      throwUnprocessableEntityError('selectFile');
    }

    try {
      const driver = this.configService.getOrThrow('file.driver', {
        infer: true,
      });

      let s3Path = '';
      if (driver === 's3') {
        const s3File = file as Express.MulterS3.File;
        // Nếu có truyền folder, ta sẽ đảm bảo đường dẫn trên S3/Viettel IDC có prefix đó
        if (s3File.location) {
          s3Path = s3File.location;
        } else if (s3File.key) {
          const keyWithFolder = folder ? `${folder}/${s3File.key}` : s3File.key;
          s3Path = `${this.configService.get('file.awsDefaultS3Url', {
            infer: true,
          })}/${this.configService.get('file.awsDefaultS3Bucket', {
            infer: true,
          })}/${keyWithFolder}`;
        }
      }

      // Xử lý path cho local hoặc s3 để lưu vào DB
      // Nếu có folder, nối folder vào path
      const subPath = folder ? `${folder}/` : '';
      const path = {
        local: `/${this.configService.get('app.apiPrefix', {
          infer: true,
        })}/v1/files/${subPath}${file.filename || file.originalname}`,
        s3: s3Path,
      };

      const fileEntity = this.fileRepository.create({
        path: path[driver],
        name: file.originalname,
      });

      const savedFile = await this.fileRepository.save(fileEntity);
      return savedFile;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }
}

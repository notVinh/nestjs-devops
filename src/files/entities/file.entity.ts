import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  AfterLoad,
  AfterInsert,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Allow } from 'class-validator';
import appConfig from '../../config/app.config';
import { AppConfig } from 'src/config/config.type';

@Entity({ name: 'file' })
export class FileEntity {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @Allow()
  @Column()
  path: string;

  @Allow()
  @Column()
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @AfterLoad()
  @AfterInsert()
  updatePath() {
    // Chỉ thêm domain cho local files, không thêm cho S3 URLs
    if (this.path.startsWith('/') && !this.path.startsWith('http')) {
      this.path = (appConfig() as AppConfig).backendDomain + this.path;
    }
  }
}

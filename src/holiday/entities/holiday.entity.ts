import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Factory } from '../../factory/entities/factory.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('holiday')
export class Holiday {
  @ApiProperty()
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @ApiProperty()
  @Column({ type: 'bigint' })
  factoryId: number;

  @ApiProperty()
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty()
  @Column({ type: 'date' })
  date: Date;

  @ApiProperty()
  @Column({ type: 'int' })
  year: number;

  @ApiProperty()
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @ManyToOne(() => Factory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'factoryId' })
  factory: Factory;
}

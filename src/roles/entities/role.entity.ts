import { Column, Entity, PrimaryColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Allow } from 'class-validator';
import { EntityHelper } from 'src/utils/entity-helper';

@Entity()
export class Role extends EntityHelper {
  @Allow()
  @ApiProperty({ example: 'Admin' })
  @Column()
  name?: string;
}

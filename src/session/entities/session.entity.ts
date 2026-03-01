import {
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  DeleteDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { EntityHelper } from 'src/utils/entity-helper';

@Entity()
export class Session extends EntityHelper {
  @ManyToOne(() => User, {
    eager: true,
  })
  @Index()
  user: User;
}

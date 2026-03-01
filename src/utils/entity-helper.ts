import { instanceToPlain } from 'class-transformer';
import {
  AfterLoad,
  BaseEntity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

export class EntityHelper extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  __entity?: string;

  @AfterLoad()
  setEntityName() {
    this.__entity = this.constructor.name;
  }

  toJSON() {
    const plain = instanceToPlain(this);
    return this.convertBigIntToNumber(plain);
  }

  private convertBigIntToNumber(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.convertBigIntToNumber(item));
    }

    if (typeof obj === 'object') {
      const converted: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key];
          // Convert string numbers to actual numbers
          if (typeof value === 'string' && /^\d+$/.test(value)) {
            converted[key] = parseInt(value, 10);
          } else if (typeof value === 'object') {
            converted[key] = this.convertBigIntToNumber(value);
          } else {
            converted[key] = value;
          }
        }
      }
      return converted;
    }

    return obj;
  }
}

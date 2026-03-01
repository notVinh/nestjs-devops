import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { EntityHelper } from 'src/utils/entity-helper';
import { Factory } from 'src/factory/entities/factory.entity';

@Entity('supportType')
export class SupportType extends EntityHelper {
  @Column({ type: 'bigint' })
  factoryId: number;

  // Mã loại hỗ trợ: 'overnight_x50', 'overnight_x100', 'after_2030', 'km_motorbike', 'km_car'
  @Column({ type: 'varchar', length: 50 })
  code: string;

  // Tên hiển thị: 'Qua đêm x50', 'Qua đêm x100', 'Làm quá 20h30', 'Km xe máy', 'Km ô tô'
  @Column({ type: 'varchar', length: 100 })
  name: string;

  // Đơn vị: 'ngày', 'km', null
  @Column({ type: 'varchar', length: 20, nullable: true })
  unit?: string | null;

  // Yêu cầu ảnh chứng minh (cho km xe)
  @Column({ type: 'boolean', default: false })
  requirePhoto: boolean;

  // Yêu cầu nhập số lượng (cho km)
  @Column({ type: 'boolean', default: false })
  requireQuantity: boolean;

  // Trạng thái hoạt động
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // Relations
  @ManyToOne(() => Factory)
  @JoinColumn({ name: 'factoryId' })
  factory: Factory;
}

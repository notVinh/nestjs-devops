import { Column, Entity, Index } from 'typeorm';
import { EntityHelper } from 'src/utils/entity-helper';

/**
 * Bảng lưu thông tin Kho từ MISA
 */
@Entity('misaStock')
export class MisaStock extends EntityHelper {
  @Column({ type: 'uuid' })
  @Index({ unique: true })
  stockId: string;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  stockCode: string;

  @Column({ type: 'varchar', length: 255 })
  stockName: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'uuid', nullable: true })
  branchId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  branchName: string | null;

  @Column({ type: 'boolean', default: false })
  inactive: boolean;

  @Column({ type: 'boolean', default: false })
  isGroup: boolean;

  @Column({ type: 'boolean', default: false })
  isValid: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  inventoryAccount: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  createdBy: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  modifiedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  misaCreatedDate: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  misaModifiedDate: Date | null;

  /**
   * Map từ response MISA sang entity
   */
  static fromMisaResponse(data: Record<string, any>): Partial<MisaStock> {
    return {
      stockId: data.stock_id,
      stockCode: data.stock_code,
      stockName: data.stock_name,
      description: data.description || null,
      branchId: data.branch_id || null,
      branchName: data.branch_name || null,
      inactive: data.inactive || false,
      isGroup: data.is_group || false,
      isValid: data.is_valid || false,
      inventoryAccount: data.inventory_account || null,
      createdBy: data.created_by || null,
      modifiedBy: data.modified_by || null,
      misaCreatedDate: data.created_date ? new Date(data.created_date) : null,
      misaModifiedDate: data.modified_date ? new Date(data.modified_date) : null,
    };
  }
}

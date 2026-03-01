import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { EntityHelper } from 'src/utils/entity-helper';
import { MisaPuOrder } from './misa-pu-order.entity';

/**
 * Entity lưu trữ chi tiết đơn mua hàng (Purchase Order Detail) từ MISA
 * Liên kết với MisaPuOrder qua refId
 * API: https://actapp.misa.vn/g1/api/pu/v1/pu_order/get_paging_detail
 */
@Entity('misaPuOrderDetail')
export class MisaPuOrderDetail extends EntityHelper {
  // ===== Liên kết với đơn mua hàng =====

  @Column({ type: 'uuid' })
  @Index()
  refId: string; // ID đơn mua hàng từ MISA (để link với MisaPuOrder)

  @ManyToOne(() => MisaPuOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'refId', referencedColumnName: 'refId' })
  puOrder: MisaPuOrder;

  // ===== Thông tin sản phẩm =====

  @Column({ type: 'varchar', length: 50, nullable: true })
  @Index()
  inventoryItemCode: string | null; // Mã sản phẩm (inventory_item_code)

  @Column({ type: 'text', nullable: true })
  description: string | null; // Mô tả sản phẩm (description)

  @Column({ type: 'varchar', length: 50, nullable: true })
  stockCode: string | null; // Mã kho (stock_code)

  @Column({ type: 'varchar', length: 50, nullable: true })
  unitName: string | null; // Đơn vị tính (unit_name)

  // ===== Số lượng =====

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  quantity: number; // Số lượng đặt mua (quantity)

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  quantityReceipt: number; // Số lượng đã nhận (quantity_receipt)

  // ===== Giá & Tiền =====

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  unitPrice: number; // Đơn giá (unit_price)

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  amountOc: number; // Thành tiền (amount_oc)

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  vatRate: number; // Thuế suất VAT % (vat_rate)

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  vatAmountOc: number; // Tiền VAT (vat_amount_oc)

  // ===== Thông tin bổ sung =====

  @Column({ type: 'boolean', default: false })
  isDescription: boolean; // Là dòng mô tả (is_description)

  // ===== Thứ tự dòng =====

  @Column({ type: 'int', default: 0 })
  sortOrder: number; // Thứ tự hiển thị

  // ===== Static method để map từ MISA response =====

  static fromMisaResponse(
    refId: string,
    data: Record<string, any>,
    sortOrder: number = 0
  ): Partial<MisaPuOrderDetail> {
    return {
      refId,
      inventoryItemCode: data.inventory_item_code || null,
      description: data.description || null,
      stockCode: data.stock_code || null,
      unitName: data.unit_name || null,
      quantity: Number(data.quantity) || 0,
      quantityReceipt: Number(data.quantity_receipt) || 0,
      unitPrice: Number(data.unit_price) || 0,
      amountOc: Number(data.amount_oc) || 0,
      vatRate: Number(data.vat_rate) || 0,
      vatAmountOc: Number(data.vat_amount_oc) || 0,
      isDescription: data.is_description || false,
      sortOrder,
    };
  }
}

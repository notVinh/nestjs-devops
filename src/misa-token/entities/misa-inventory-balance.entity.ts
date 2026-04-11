import { Column, Entity, Index } from 'typeorm';
import { EntityHelper } from 'src/utils/entity-helper';

/**
 * Bảng lưu tồn kho (Tổng hợp tồn kho) từ MISA
 * Mỗi row = 1 sản phẩm trong 1 kho
 * Unique: (stockId + inventoryItemId)
 */
@Entity('misaInventoryBalance')
export class MisaInventoryBalance extends EntityHelper {
  @Column({ type: 'varchar', length: 150, unique: true })
  recordId: string; // Kết hợp stockId + inventoryItemId (không dùng detail_id vì không ổn định giữa các lần sync)
  // ====== Thông tin kho ======
  @Column({ type: 'uuid' })
  @Index()
  stockId: string;

  @Column({ type: 'varchar', length: 100 })
  stockCode: string;

  @Column({ type: 'varchar', length: 255 })
  stockName: string;

  // ====== Thông tin sản phẩm ======
  @Column({ type: 'uuid' })
  @Index()
  inventoryItemId: string;

  @Column({ type: 'varchar', length: 100 })
  inventoryItemCode: string;

  @Column({ type: 'varchar', length: 500 })
  inventoryItemName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  unitName: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  inventoryCategoryName: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  inventoryItemSource: string | null;

  // ====== Số lượng tồn ======
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  openingQuantity: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  closingQuantity: number;  // Tồn cuối kỳ (còn lại)

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalInQuantity: number;  // Tổng nhập kỳ

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalOutQuantity: number; // Tổng xuất kỳ

  // ====== Số tiền ======
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  openingAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  closingAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalInAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalOutAmount: number;

  // ====== Số lượng phụ (mua/bán) ======
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  purchaseQuantity: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  saleQuantity: number;

  // ====== Metadata sync ======
  @Column({ type: 'timestamptz', nullable: true })
  fromDate: Date | null;  // Kỳ tính: từ ngày

  @Column({ type: 'timestamptz', nullable: true })
  toDate: Date | null;    // Kỳ tính: đến ngày

  @Column({ type: 'timestamptz', nullable: true })
  syncedAt: Date | null;  // Lần sync cuối

  /**
   * Map từ MISA response sang entity
   */
  static fromMisaResponse(data: Record<string, any>): Partial<MisaInventoryBalance> {
    return {
      // Chỉ dùng stock_id + inventory_item_id để đảm bảo recordId ổn định giữa các lần sync.
      // Không dùng detail_id vì MISA có thể trả về giá trị khác nhau giữa các lần gọi API,
      // dẫn đến cùng 1 sản phẩm trong cùng 1 kho bị insert thành nhiều dòng trùng lặp.
      recordId: `${data.stock_id}_${data.inventory_item_id}`,
      stockId: data.stock_id,
      stockCode: data.stock_code,
      stockName: data.stock_name,
      inventoryItemId: data.inventory_item_id,
      inventoryItemCode: data.inventory_item_code,
      inventoryItemName: data.inventory_item_name,
      unitName: data.unit_name || null,
      inventoryCategoryName: data.inventory_category_name || null,
      inventoryItemSource: data.inventory_item_source || null,
      openingQuantity: parseFloat(data.main_opening_quantity) || 0,
      closingQuantity: parseFloat(data.closing_main_quantity) || 0,
      totalInQuantity: parseFloat(data.main_total_in_quantity) || 0,
      totalOutQuantity: parseFloat(data.main_total_out_quantity) || 0,
      openingAmount: parseFloat(data.opening_amount) || 0,
      closingAmount: parseFloat(data.closing_amount) || 0,
      totalInAmount: parseFloat(data.total_in_amount) || 0,
      totalOutAmount: parseFloat(data.total_out_amount) || 0,
      purchaseQuantity: parseFloat(data.purchase_quantity) || 0,
      saleQuantity: parseFloat(data.sale_quantity) || 0,
      syncedAt: new Date(),
    };
  }
}

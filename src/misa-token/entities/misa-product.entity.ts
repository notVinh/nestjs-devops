import { Column, Entity, Index } from 'typeorm';
import { EntityHelper } from 'src/utils/entity-helper';

/**
 * Bảng lưu thông tin sản phẩm/hàng hóa từ MISA
 */
@Entity('misaProduct')
export class MisaProduct extends EntityHelper {
  // ====== ID từ MISA ======
  @Column({ type: 'uuid', unique: true })
  @Index()
  inventoryItemId: string;

  // ====== Mã sản phẩm ======
  @Column({ type: 'varchar', length: 100 })
  @Index()
  inventoryItemCode: string;

  // ====== Tên sản phẩm ======
  @Column({ type: 'varchar', length: 500 })
  inventoryItemName: string;

  // ====== Loại sản phẩm (0: Hàng hóa, 1: Dịch vụ, 2: Nguyên vật liệu...) ======
  @Column({ type: 'int', default: 0 })
  inventoryItemType: number;

  // ====== Đơn vị tính ======
  @Column({ type: 'uuid', nullable: true })
  unitId: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  unitName: string | null;

  // ====== Giá mua ======
  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  unitPrice: number;

  // ====== Giá bán 1, 2, 3 ======
  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  salePrice1: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  salePrice2: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  salePrice3: number;

  // ====== Giá bán cố định ======
  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  fixedSalePrice: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  fixedUnitPrice: number;

  // ====== Mô tả ======
  @Column({ type: 'text', nullable: true })
  saleDescription: string | null;

  @Column({ type: 'text', nullable: true })
  purchaseDescription: string | null;

  // ====== Hình ảnh ======
  @Column({ type: 'varchar', length: 500, nullable: true })
  image: string | null;

  // ====== Chi nhánh ======
  @Column({ type: 'uuid', nullable: true })
  branchId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  branchName: string | null;

  // ====== Trạng thái ======
  @Column({ type: 'boolean', default: false })
  inactive: boolean;

  // ====== Tồn kho ======
  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  minimumStock: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  closingQuantity: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  closingAmount: number;

  // ====== Tài khoản kế toán ======
  @Column({ type: 'varchar', length: 50, nullable: true })
  inventoryAccount: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  cogsAccount: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  saleAccount: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  returnAccount: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  discountAccount: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  saleOffAccount: string | null;

  // ====== Nguồn gốc ======
  @Column({ type: 'varchar', length: 100, nullable: true })
  inventoryItemSource: string | null;

  // ====== Nhóm sản phẩm ======
  @Column({ type: 'text', nullable: true })
  inventoryItemCategoryIdList: string | null;

  @Column({ type: 'text', nullable: true })
  inventoryItemCategoryCodeList: string | null;

  @Column({ type: 'text', nullable: true })
  inventoryItemCategoryNameList: string | null;

  @Column({ type: 'text', nullable: true })
  inventoryItemCategoryMisaCodeList: string | null;

  // ====== Cờ đặc biệt ======
  @Column({ type: 'boolean', default: false })
  isFollowSerialNumber: boolean;

  @Column({ type: 'boolean', default: false })
  isDrug: boolean;

  @Column({ type: 'boolean', default: false })
  isSystem: boolean;

  @Column({ type: 'int', default: -1 })
  inventoryItemCostMethod: number;

  @Column({ type: 'int', default: 0 })
  specificProductType: number;

  // ====== Thuế ======
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  exportTaxRate: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  importTaxRate: number;

  @Column({ type: 'int', default: -1 })
  taxReductionType: number;

  // ====== Chiết khấu ======
  @Column({ type: 'int', default: 0 })
  discountType: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  purchaseDiscountRate: number;

  // ====== Người tạo/sửa ======
  @Column({ type: 'varchar', length: 255, nullable: true })
  createdBy: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  modifiedBy: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  misaCreatedDate: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  misaModifiedDate: Date | null;

  // ====== Mapping từ MISA response ======
  /**
   * Tạo MisaProduct từ dữ liệu MISA API response
   */
  static fromMisaResponse(data: Record<string, any>): Partial<MisaProduct> {
    return {
      inventoryItemId: data.inventory_item_id,
      inventoryItemCode: data.inventory_item_code,
      inventoryItemName: data.inventory_item_name,
      inventoryItemType: data.inventory_item_type ?? 0,
      unitId: data.unit_id || null,
      unitName: data.unit_name || null,
      unitPrice: parseFloat(data.unit_price) || 0,
      salePrice1: parseFloat(data.sale_price1) || 0,
      salePrice2: parseFloat(data.sale_price2) || 0,
      salePrice3: parseFloat(data.sale_price3) || 0,
      fixedSalePrice: parseFloat(data.fixed_sale_price) || 0,
      fixedUnitPrice: parseFloat(data.fixed_unit_price) || 0,
      saleDescription: data.sale_description || null,
      purchaseDescription: data.purchase_description || null,
      image: data.image || null,
      branchId: data.branch_id || null,
      branchName: data.branch_name || null,
      inactive: data.inactive ?? false,
      minimumStock: parseFloat(data.minimum_stock) || 0,
      closingQuantity: parseFloat(data.closing_quantity) || 0,
      closingAmount: parseFloat(data.closing_amount) || 0,
      inventoryAccount: data.inventory_account || null,
      cogsAccount: data.cogs_account || null,
      saleAccount: data.sale_account || null,
      returnAccount: data.return_account || null,
      discountAccount: data.discount_account || null,
      saleOffAccount: data.sale_off_account || null,
      inventoryItemSource: data.inventory_item_source || null,
      inventoryItemCategoryIdList: data.inventory_item_category_id_list || null,
      inventoryItemCategoryCodeList: data.inventory_item_category_code_list || null,
      inventoryItemCategoryNameList: data.inventory_item_category_name_list || null,
      inventoryItemCategoryMisaCodeList: data.inventory_item_category_misa_code_list || null,
      isFollowSerialNumber: data.is_follow_serial_number ?? false,
      isDrug: data.is_drug ?? false,
      isSystem: data.is_system ?? false,
      inventoryItemCostMethod: data.inventory_item_cost_method ?? -1,
      specificProductType: data.specific_product_type ?? 0,
      exportTaxRate: parseFloat(data.export_tax_rate) || 0,
      importTaxRate: parseFloat(data.import_tax_rate) || 0,
      taxReductionType: data.tax_reduction_type ?? -1,
      discountType: data.discount_type ?? 0,
      purchaseDiscountRate: parseFloat(data.purchase_discount_rate) || 0,
      createdBy: data.created_by || null,
      modifiedBy: data.modified_by || null,
      misaCreatedDate: data.created_date ? new Date(data.created_date) : null,
      misaModifiedDate: data.modified_date ? new Date(data.modified_date) : null,
    };
  }
}

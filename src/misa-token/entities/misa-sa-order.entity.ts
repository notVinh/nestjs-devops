import { Column, Entity, Index } from 'typeorm';
import { EntityHelper } from 'src/utils/entity-helper';

/**
 * Entity lưu trữ đơn đặt hàng (Sales Order) từ MISA
 * Dữ liệu được sync từ MISA API, không chỉnh sửa trực tiếp
 */
@Entity('misaSaOrder')
export class MisaSaOrder extends EntityHelper {
  // ===== Định danh MISA =====

  @Column({ type: 'uuid' })
  @Index({ unique: true })
  refId: string; // ID gốc từ MISA (refid)

  @Column({ type: 'varchar', length: 50 })
  @Index()
  refNo: string; // Số đơn hàng: DH1171 (refno)

  @Column({ type: 'int' })
  refType: number; // Loại chứng từ: 3520 = Sales Order (reftype)

  @Column({ type: 'varchar', length: 20, nullable: true })
  crmId: string | null; // ID từ CRM (crm_id)

  // ===== Thông tin đơn hàng =====

  @Column({ type: 'date' })
  @Index()
  refDate: Date; // Ngày đơn hàng (refdate)

  @Column({ type: 'int', default: 0 })
  @Index()
  status: number; // Trạng thái MISA: 0 = Chưa xử lý (status)

  @Column({ type: 'text', nullable: true })
  journalMemo: string | null; // Diễn giải/ghi chú (journal_memo)

  // ===== Khách hàng (Account Object) =====

  @Column({ type: 'uuid', nullable: true })
  @Index()
  accountObjectId: string | null; // ID khách hàng (account_object_id)

  @Column({ type: 'varchar', length: 50, nullable: true })
  @Index()
  accountObjectCode: string | null; // Mã khách hàng (account_object_code)

  @Column({ type: 'varchar', length: 255, nullable: true })
  accountObjectName: string | null; // Tên khách hàng (account_object_name)

  @Column({ type: 'text', nullable: true })
  accountObjectAddress: string | null; // Địa chỉ (account_object_address)

  @Column({ type: 'varchar', length: 50, nullable: true })
  accountObjectTaxCode: string | null; // Mã số thuế (account_object_tax_code)

  // ===== Chi nhánh =====

  @Column({ type: 'uuid', nullable: true })
  branchId: string | null; // ID chi nhánh (branch_id)

  @Column({ type: 'varchar', length: 255, nullable: true })
  branchName: string | null; // Tên chi nhánh (branch_name)

  // ===== Tiền tệ & Tài chính =====

  @Column({ type: 'varchar', length: 10, default: 'VND' })
  currencyId: string; // Loại tiền (currency_id)

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalAmountOc: number; // Tổng tiền gốc (total_amount_oc)

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalSaleAmount: number; // Tổng tiền bán (total_sale_amount)

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalSaleAmountOc: number; // Tổng tiền bán gốc (total_sale_amount_oc)

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalVatAmount: number; // Tổng VAT (total_vat_amount)

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalDiscountAmount: number; // Tổng chiết khấu (total_discount_amount)

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalDiscountAmountOc: number; // Tổng chiết khấu gốc (total_discount_amount_oc)

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  receivableAmount: number; // Số tiền phải thu (receivable_amount)

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  receivableAmountOc: number; // Số tiền phải thu gốc (receivable_amount_oc)

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  receiptedAmount: number; // Số tiền đã thu (receipted_amount)

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  receiptedAmountOc: number; // Số tiền đã thu gốc (receipted_amount_oc)

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalReceiptedAmount: number; // Tổng số tiền đã thu (total_receipted_amount)

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalReceiptedAmountOc: number; // Tổng số tiền đã thu gốc (total_receipted_amount_oc)

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  payRefundAmount: number; // Số tiền hoàn trả (pay_refund_amount)

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  payRefundAmountOc: number; // Số tiền hoàn trả gốc (pay_refund_amount_oc)

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalInvoiceAmount: number; // Tổng tiền hóa đơn (total_invoice_amount)

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalInvoiceAmountOc: number; // Tổng tiền hóa đơn gốc (total_invoice_amount_oc)

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  receiptAmountFinance: number; // Số tiền thu tài chính (receipt_amount_finance)

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  receiptAmountOcFinance: number; // Số tiền thu tài chính gốc (receipt_amount_oc_finance)

  // ===== Trạng thái =====

  @Column({ type: 'int', default: 0 })
  deliveredStatus: number; // Trạng thái giao hàng: 0 = Chưa giao (delivered_status)

  @Column({ type: 'int', default: 0 })
  revenueStatus: number; // Trạng thái doanh thu (revenue_status)

  @Column({ type: 'boolean', default: false })
  isInvoiced: boolean; // Đã xuất hóa đơn (is_invoiced)

  @Column({ type: 'int', default: 0 })
  isInvoiceEnum: number; // Enum hóa đơn (is_invoice_enum)

  @Column({ type: 'boolean', default: true })
  isCreateVoucher: boolean; // Tạo chứng từ (is_create_voucher)

  @Column({ type: 'boolean', default: true })
  isCalculatedCost: boolean; // Đã tính giá thành (is_calculated_cost)

  @Column({ type: 'boolean', default: false })
  hasCreateContract: boolean; // Có hợp đồng (has_create_contract)

  @Column({ type: 'boolean', default: false })
  isArisedBeforeUseSoftware: boolean; // Phát sinh trước khi dùng PM (is_arised_before_use_software)

  // ===== Thông tin bổ sung =====

  @Column({ type: 'text', nullable: true })
  wesignDocumentText: string | null; // Văn bản ký số (wesign_document_text)

  // ===== Người tạo/sửa =====

  @Column({ type: 'varchar', length: 255, nullable: true })
  createdBy: string | null; // Người tạo (created_by) - VD: "Ngô Thúy Anh (HN025) - CRM"

  @Column({ type: 'varchar', length: 255, nullable: true })
  modifiedBy: string | null; // Người sửa (modified_by)

  @Column({ type: 'varchar', length: 255, nullable: true })
  employeeName: string | null; // Tên nhân viên phụ trách (employee_name)

  // ===== Timestamps từ MISA =====

  @Column({ type: 'timestamp with time zone', nullable: true })
  misaCreatedDate: Date | null; // Ngày tạo trên MISA (created_date)

  @Column({ type: 'timestamp with time zone', nullable: true })
  misaModifiedDate: Date | null; // Ngày sửa trên MISA (modified_date)

  @Column({ type: 'bigint', nullable: true })
  editVersion: number | null; // Phiên bản chỉnh sửa (edit_version)

  // ===== Các trường LOCAL - Sale Admin/Kế toán nhập, KHÔNG sync từ MISA =====

  @Column({ type: 'date', nullable: true })
  requestedDeliveryDate: Date | null; // Ngày yêu cầu giao - Sale Admin nhập

  @Column({ type: 'date', nullable: true })
  actualExportDate: Date | null; // Ngày thực tế xuất kho - Kế toán kho nhập

  @Column({ type: 'text', nullable: true })
  goodsStatus: string | null; // Tình trạng hàng hóa/Ghi chú - Sale Admin nhập

  @Column({ type: 'varchar', length: 50, nullable: true })
  machineType: string | null; // Phân loại máy: Máy cũ, Máy mới - Sale Admin nhập

  @Column({ type: 'varchar', length: 50, nullable: true })
  region: string | null; // Khu vực: Miền Bắc, Miền Trung, Miền Nam - Sale Admin nhập

  @Column({ type: 'varchar', length: 50, nullable: true })
  priority: string | null; // Độ ưu tiên: Thường, Gấp, Rất Gấp - Sale Admin nhập

  @Column({ type: 'varchar', length: 50, nullable: true })
  localDeliveryStatus: string | null; // Tình trạng giao hàng local: Đã giao, Chưa giao - Sale Admin nhập

  @Column({ type: 'varchar', length: 50, nullable: true })
  saleType: string | null; // Loại: Bán, Cho thuê, Cho mượn, Đổi - Sale Admin nhập

  @Column({ type: 'varchar', length: 255, nullable: true })
  receiverName: string | null; // Tên người nhận - Sale Admin nhập

  @Column({ type: 'varchar', length: 50, nullable: true })
  receiverPhone: string | null; // SĐT người nhận - Sale Admin nhập

  @Column({ type: 'text', nullable: true })
  specificAddress: string | null; // Địa chỉ cụ thể - Sale Admin nhập khi cần ghi rõ hơn địa chỉ nhận

  @Column({ type: 'varchar', length: 100, nullable: true })
  province: string | null; // Tỉnh/Thành phố - Sale Admin nhập

  // ===== Nguồn tạo đơn hàng =====

  @Column({
    type: 'varchar',
    length: 20,
    default: 'misa',
  })
  @Index()
  source: string; // Nguồn tạo: 'misa' = sync từ MISA, 'manual' = tạo thủ công

  // ===== Workflow Tracking - Theo dõi luồng xử lý đơn hàng =====

  @Column({
    type: 'varchar',
    length: 30,
    default: 'draft',
  })
  @Index()
  orderWorkflowStatus: string; // Trạng thái workflow: draft, waiting_export, in_preparation, in_delivery, in_installation, completed, cancelled

  @Column({ type: 'int', nullable: true })
  saleAdminId: number | null; // ID của Sale Admin xử lý đơn hàng

  @Column({ type: 'varchar', length: 255, nullable: true })
  saleAdminName: string | null; // Tên Sale Admin xử lý đơn hàng

  @Column({ type: 'timestamp with time zone', nullable: true })
  saleAdminSubmittedAt: Date | null; // Thời điểm Sale Admin gửi duyệt cho BGĐ

  // ===== Đặt thêm hàng =====

  @Column({ type: 'boolean', default: false })
  needsAdditionalOrder: boolean; // Có cần đặt thêm hàng không: false = Không, true = Có

  @Column({ type: 'text', nullable: true })
  additionalOrderNote: string | null; // Nội dung ghi chú đặt thêm hàng

  // ===== Static method để map từ MISA response =====

  static fromMisaResponse(data: Record<string, any>): Partial<MisaSaOrder> {
    return {
      // Định danh
      refId: data.refid,
      refNo: data.refno,
      refType: data.reftype || 3520,
      crmId: data.crm_id || null,

      // Thông tin đơn hàng
      refDate: data.refdate ? new Date(data.refdate) : new Date(),
      status: data.status || 0,
      journalMemo: data.journal_memo || null,

      // Khách hàng
      accountObjectId: data.account_object_id || null,
      accountObjectCode: data.account_object_code || null,
      accountObjectName: data.account_object_name || null,
      accountObjectAddress: data.account_object_address || null,
      accountObjectTaxCode: data.account_object_tax_code || null,

      // Chi nhánh
      branchId: data.branch_id || null,
      branchName: data.branch_name || null,

      // Tiền tệ & Tài chính
      currencyId: data.currency_id || 'VND',
      totalAmountOc: Number(data.total_amount_oc) || 0,
      totalSaleAmount: Number(data.total_sale_amount) || 0,
      totalSaleAmountOc: Number(data.total_sale_amount_oc) || 0,
      totalVatAmount: Number(data.total_vat_amount) || 0,
      totalDiscountAmount: Number(data.total_discount_amount) || 0,
      totalDiscountAmountOc: Number(data.total_discount_amount_oc) || 0,
      receivableAmount: Number(data.receivable_amount) || 0,
      receivableAmountOc: Number(data.receivable_amount_oc) || 0,
      receiptedAmount: Number(data.receipted_amount) || 0,
      receiptedAmountOc: Number(data.receipted_amount_oc) || 0,
      totalReceiptedAmount: Number(data.total_receipted_amount) || 0,
      totalReceiptedAmountOc: Number(data.total_receipted_amount_oc) || 0,
      payRefundAmount: Number(data.pay_refund_amount) || 0,
      payRefundAmountOc: Number(data.pay_refund_amount_oc) || 0,
      totalInvoiceAmount: Number(data.total_invoice_amount) || 0,
      totalInvoiceAmountOc: Number(data.total_invoice_amount_oc) || 0,
      receiptAmountFinance: Number(data.receipt_amount_finance) || 0,
      receiptAmountOcFinance: Number(data.receipt_amount_oc_finance) || 0,

      // Trạng thái
      deliveredStatus: data.delivered_status || 0,
      revenueStatus: data.revenue_status || 0,
      isInvoiced: data.is_invoiced || false,
      isInvoiceEnum: data.is_invoice_enum || 0,
      isCreateVoucher: data.is_create_voucher !== false,
      isCalculatedCost: data.is_calculated_cost !== false,
      hasCreateContract: data.has_create_contract || false,
      isArisedBeforeUseSoftware: data.is_arised_before_use_software || false,

      // Thông tin bổ sung
      wesignDocumentText: data.wesign_document_text || null,

      // Người tạo/sửa
      createdBy: data.created_by || null,
      modifiedBy: data.modified_by || null,
      employeeName: data.employee_name || null,

      // Timestamps
      misaCreatedDate: data.created_date ? new Date(data.created_date) : null,
      misaModifiedDate: data.modified_date ? new Date(data.modified_date) : null,
      editVersion: data.edit_version || null,
    };
  }
}

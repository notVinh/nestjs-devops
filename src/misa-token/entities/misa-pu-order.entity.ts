import { Column, Entity, Index } from 'typeorm';
import { EntityHelper } from 'src/utils/entity-helper';

/**
 * Entity lưu trữ đơn mua hàng (Purchase Order) từ MISA
 * Dữ liệu được sync từ MISA API, không chỉnh sửa trực tiếp
 * API: https://actapp.misa.vn/g1/api/pu/v1/pu_order/paging_filter_v2
 */
@Entity('misaPuOrder')
export class MisaPuOrder extends EntityHelper {
  // ===== Định danh MISA =====

  @Column({ type: 'uuid' })
  @Index({ unique: true })
  refId: string; // ID gốc từ MISA (refid)

  @Column({ type: 'varchar', length: 50 })
  @Index()
  refNo: string; // Số đơn mua hàng: ĐMH1862 (refno)

  @Column({ type: 'int' })
  refType: number; // Loại chứng từ: 301 = Purchase Order (reftype)

  @Column({ type: 'bigint', nullable: true })
  refOrder: number | null; // Thứ tự sắp xếp (reforder)

  // ===== Thông tin đơn mua hàng =====

  @Column({ type: 'date' })
  @Index()
  refDate: Date; // Ngày đơn mua hàng (refdate)

  @Column({ type: 'int', default: 0 })
  @Index()
  status: number; // Trạng thái MISA: 1 = Chưa thực hiện, 3 = Hoàn thành (status)

  @Column({ type: 'text', nullable: true })
  journalMemo: string | null; // Diễn giải/ghi chú (journal_memo)

  // ===== Nhà cung cấp (Account Object) =====

  @Column({ type: 'uuid', nullable: true })
  @Index()
  accountObjectId: string | null; // ID nhà cung cấp (account_object_id)

  @Column({ type: 'varchar', length: 50, nullable: true })
  @Index()
  accountObjectCode: string | null; // Mã NCC: NCC0008 (account_object_code)

  @Column({ type: 'varchar', length: 255, nullable: true })
  accountObjectName: string | null; // Tên NCC (account_object_name)

  @Column({ type: 'text', nullable: true })
  accountObjectAddress: string | null; // Địa chỉ NCC (account_object_address)

  @Column({ type: 'varchar', length: 50, nullable: true })
  accountObjectTaxCode: string | null; // Mã số thuế NCC (account_object_tax_code)

  // ===== Nhân viên phụ trách =====

  @Column({ type: 'uuid', nullable: true })
  employeeId: string | null; // ID nhân viên (employee_id)

  @Column({ type: 'varchar', length: 255, nullable: true })
  employeeName: string | null; // Tên nhân viên phụ trách (employee_name)

  // ===== Chi nhánh =====

  @Column({ type: 'uuid', nullable: true })
  branchId: string | null; // ID chi nhánh (branch_id)

  @Column({ type: 'varchar', length: 255, nullable: true })
  branchName: string | null; // Tên chi nhánh (branch_name)

  // ===== Tiền tệ & Tỷ giá =====

  @Column({ type: 'varchar', length: 10, default: 'VND' })
  currencyId: string; // Loại tiền (currency_id)

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 1 })
  exchangeRate: number; // Tỷ giá (exchange_rate)

  // ===== Số tiền =====

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalAmount: number; // Tổng tiền hàng (total_amount)

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalAmountOc: number; // Tổng tiền hàng nguyên tệ (total_amount_oc)

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalOrderAmount: number; // Tổng tiền đơn hàng (total_order_amount) = tiền hàng + VAT

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  alreadyDoneAmount: number; // Số tiền đã thực hiện (already_done_amount)

  // ===== Thuế VAT =====

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalVatAmount: number; // Tổng tiền thuế (total_vat_amount)

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalVatAmountOc: number; // Tổng tiền thuế nguyên tệ (total_vat_amount_oc)

  // ===== Chiết khấu =====

  @Column({ type: 'int', default: 0 })
  discountType: number; // Loại chiết khấu: 0 = Không CK (discount_type)

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  discountRateVoucher: number; // Tỷ lệ chiết khấu % (discount_rate_voucher)

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalDiscountAmount: number; // Tổng tiền chiết khấu (total_discount_amount)

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalDiscountAmountOc: number; // Tổng tiền chiết khấu nguyên tệ (total_discount_amount_oc)

  // ===== Trạng thái tạo chứng từ liên quan =====

  @Column({ type: 'boolean', default: false })
  isCreatedPuContract: boolean; // Đã tạo hợp đồng mua (is_created_pu_contract)

  @Column({ type: 'boolean', default: false })
  isCreatedPuService: boolean; // Đã tạo dịch vụ mua (is_created_pu_service)

  @Column({ type: 'boolean', default: false })
  isCreatedPuMultiple: boolean; // Đã tạo nhiều chứng từ (is_created_pu_multiple)

  // ===== Thông tin bổ sung =====

  @Column({ type: 'text', nullable: true })
  wesignDocumentText: string | null; // Văn bản ký số (wesign_document_text)

  // ===== Người tạo/sửa =====

  @Column({ type: 'varchar', length: 255, nullable: true })
  createdBy: string | null; // Người tạo (created_by)

  @Column({ type: 'varchar', length: 255, nullable: true })
  modifiedBy: string | null; // Người sửa (modified_by)

  // ===== Timestamps từ MISA =====

  @Column({ type: 'timestamp with time zone', nullable: true })
  misaCreatedDate: Date | null; // Ngày tạo trên MISA (created_date)

  @Column({ type: 'timestamp with time zone', nullable: true })
  misaModifiedDate: Date | null; // Ngày sửa trên MISA (modified_date)

  @Column({ type: 'bigint', nullable: true })
  editVersion: number | null; // Phiên bản chỉnh sửa (edit_version)

  // ===== Local fields (quản lý nội bộ - không sync từ MISA) =====

  @Column({ type: 'varchar', length: 50, default: 'new' })
  @Index()
  localStatus: string; // Trạng thái nội bộ: new, waiting_goods, goods_arrived

  @Column({ type: 'date', nullable: true })
  expectedArrivalDate: Date | null; // Ngày về dự kiến

  @Column({ type: 'bigint', nullable: true })
  @Index()
  purchaseRequisitionId: number | null; // ID Đề xuất mua hàng liên kết

  @Column({ type: 'bigint', nullable: true })
  @Index()
  saOrderId: number | null; // ID Đơn bán hàng (lấy từ DXMH)

  @Column({ type: 'timestamp with time zone', nullable: true })
  confirmedArrivalDate: Date | null; // Ngày xác nhận hàng về

  @Column({ type: 'bigint', nullable: true })
  confirmedById: number | null; // ID nhân viên xác nhận

  @Column({ type: 'varchar', length: 255, nullable: true })
  confirmedByName: string | null; // Tên nhân viên xác nhận

  @Column({ type: 'text', nullable: true })
  localNotes: string | null; // Ghi chú nội bộ

  @Column({ type: 'bigint', nullable: true })
  updatedById: number | null; // ID nhân viên cập nhật

  @Column({ type: 'varchar', length: 255, nullable: true })
  updatedByName: string | null; // Tên nhân viên cập nhật

  // ===== Static method để map từ MISA response =====

  static fromMisaResponse(data: Record<string, any>): Partial<MisaPuOrder> {
    return {
      // Định danh
      refId: data.refid,
      refNo: data.refno,
      refType: data.reftype || 301,
      refOrder: data.reforder || null,

      // Thông tin đơn mua hàng
      refDate: data.refdate ? new Date(data.refdate) : new Date(),
      status: data.status || 0,
      journalMemo: data.journal_memo || null,

      // Nhà cung cấp
      accountObjectId: data.account_object_id || null,
      accountObjectCode: data.account_object_code || null,
      accountObjectName: data.account_object_name || null,
      accountObjectAddress: data.account_object_address || null,
      accountObjectTaxCode: data.account_object_tax_code || null,

      // Nhân viên
      employeeId: data.employee_id || null,
      employeeName: data.employee_name || null,

      // Chi nhánh
      branchId: data.branch_id || null,
      branchName: data.branch_name || null,

      // Tiền tệ & Tỷ giá
      currencyId: data.currency_id || 'VND',
      exchangeRate: Number(data.exchange_rate) || 1,

      // Số tiền
      totalAmount: Number(data.total_amount) || 0,
      totalAmountOc: Number(data.total_amount_oc) || 0,
      totalOrderAmount: Number(data.total_order_amount) || 0,
      alreadyDoneAmount: Number(data.already_done_amount) || 0,

      // Thuế VAT
      totalVatAmount: Number(data.total_vat_amount) || 0,
      totalVatAmountOc: Number(data.total_vat_amount_oc) || 0,

      // Chiết khấu
      discountType: data.discount_type || 0,
      discountRateVoucher: Number(data.discount_rate_voucher) || 0,
      totalDiscountAmount: Number(data.total_discount_amount) || 0,
      totalDiscountAmountOc: Number(data.total_discount_amount_oc) || 0,

      // Trạng thái tạo chứng từ liên quan
      isCreatedPuContract: data.is_created_pu_contract || false,
      isCreatedPuService: data.is_created_pu_service || false,
      isCreatedPuMultiple: data.is_created_pu_multiple || false,

      // Thông tin bổ sung
      wesignDocumentText: data.wesign_document_text || null,

      // Người tạo/sửa
      createdBy: data.created_by || null,
      modifiedBy: data.modified_by || null,

      // Timestamps
      misaCreatedDate: data.created_date ? new Date(data.created_date) : null,
      misaModifiedDate: data.modified_date ? new Date(data.modified_date) : null,
      editVersion: data.edit_version || null,
    };
  }
}

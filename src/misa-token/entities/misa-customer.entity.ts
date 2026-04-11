import { Column, Entity, Index } from 'typeorm';
import { EntityHelper } from 'src/utils/entity-helper';

/**
 * Bảng lưu thông tin khách hàng từ MISA
 */
@Entity('misaCustomer')
export class MisaCustomer extends EntityHelper {
  // ====== ID từ MISA ======
  @Column({ type: 'uuid', unique: true })
  @Index()
  accountObjectId: string;

  // ====== Mã khách hàng ======
  @Column({ type: 'varchar', length: 100 })
  @Index()
  accountObjectCode: string;

  // ====== Tên khách hàng ======
  @Column({ type: 'varchar', length: 500 })
  accountObjectName: string;

  // ====== Địa chỉ ======
  @Column({ type: 'text', nullable: true })
  address: string | null;

  // ====== Mã số thuế/CCCD chủ hộ ======
  @Column({ type: 'varchar', length: 50, nullable: true })
  taxCode: string | null;

  // ====== Điện thoại ======
  @Column({ type: 'varchar', length: 50, nullable: true })
  tel: string | null;

  // ====== Quốc gia ======
  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string | null;

  // ====== Tỉnh/TP ======
  @Column({ type: 'varchar', length: 100, nullable: true })
  provinceOrCity: string | null;

  // ====== Quận/Huyện ======
  @Column({ type: 'varchar', length: 100, nullable: true })
  district: string | null;

  // ====== Xã/Phường ======
  @Column({ type: 'varchar', length: 100, nullable: true })
  wardOrCommune: string | null;

  // ====== Người liên hệ ======
  @Column({ type: 'varchar', length: 255, nullable: true })
  contactName: string | null;

  // ====== ĐT di động người liên hệ ======
  @Column({ type: 'varchar', length: 50, nullable: true })
  contactMobile: string | null;

  // ====== Email người liên hệ ======
  @Column({ type: 'varchar', length: 255, nullable: true })
  contactEmail: string | null;

  // ====== Người đại diện pháp luật ======
  @Column({ type: 'varchar', length: 255, nullable: true })
  legalRepresentative: string | null;

  // ====== Người nhận hóa đơn ======
  @Column({ type: 'varchar', length: 255, nullable: true })
  invoiceReceiver: string | null;

  // ====== Điện thoại người nhận hóa đơn ======
  @Column({ type: 'varchar', length: 50, nullable: true })
  invoiceReceiverPhone: string | null;

  // ====== Email người nhận hóa đơn ======
  @Column({ type: 'varchar', length: 255, nullable: true })
  invoiceReceiverEmail: string | null;

  // ====== Địa điểm giao hàng (JSON) ======
  @Column({ type: 'jsonb', nullable: true })
  shippingAddresses: any[] | null;

  // ====== Tổ chức/Cá nhân (0 = Cá nhân, 1 = Tổ chức) ======
  @Column({ type: 'int', default: 0 })
  accountObjectType: number;

  // ====== Các trường bổ sung từ MISA ======
  @Column({ type: 'boolean', default: true })
  isCustomer: boolean;

  @Column({ type: 'boolean', default: false })
  isVendor: boolean;

  @Column({ type: 'boolean', default: false })
  inactive: boolean;

  // ====== Rank & Doanh thu (được tính toán và lưu lại) ======

  /** Rank khách hàng: A / B / C / D (dựa trên doanh thu trung bình/tháng) */
  @Column({ type: 'varchar', length: 1, default: 'D', nullable: true })
  rank: 'A' | 'B' | 'C' | 'D' | null;

  /** Doanh thu tháng hiện tại (tổng totalAmountOc trong tháng này, đơn vị: VND) */
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  currentMonthRevenue: number;

  /** Doanh thu trung bình/tháng dùng để xếp rank (đơn vị: triệu VND) */
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  avgMonthlyRevenue: number;

  /** Thời điểm cập nhật rank lần cuối */
  @Column({ type: 'timestamp with time zone', nullable: true })
  rankUpdatedAt: Date | null;

  // ====== Mapping từ MISA response ======
  /**
   * Tạo MisaCustomer từ dữ liệu MISA API response
   */
  static fromMisaResponse(data: Record<string, any>): Partial<MisaCustomer> {
    // Parse shipping addresses from JSON string
    let shippingAddresses: any[] | null = null;
    if (data.account_object_shipping_address) {
      try {
        shippingAddresses = JSON.parse(data.account_object_shipping_address);
      } catch {
        shippingAddresses = null;
      }
    }

    return {
      accountObjectId: data.account_object_id,
      accountObjectCode: data.account_object_code,
      accountObjectName: data.account_object_name,
      address: data.address || null,
      taxCode: data.company_tax_code || data.legal_represent_identity || null,
      tel: data.tel || data.mobile || null,
      country: data.country || null,
      provinceOrCity: data.province_or_city || null,
      district: data.district || null,
      wardOrCommune: data.ward_or_commune || null,
      contactName: data.contact_name || null,
      contactMobile: data.contact_mobile || data.contact_tel || null,
      contactEmail: data.contact_email || null,
      legalRepresentative: data.legal_representative || data.legal_represent || null,
      invoiceReceiver: data.invoice_receiver || data.receiver_name || null,
      invoiceReceiverPhone: data.invoice_receiver_phone || data.receiver_mobile || null,
      invoiceReceiverEmail: data.invoice_receiver_email || data.receiver_email || null,
      shippingAddresses,
      accountObjectType: data.account_object_type ?? 0,
      isCustomer: data.is_customer ?? true,
      isVendor: data.is_vendor ?? false,
      inactive: data.inactive ?? false,
    };
  }
}

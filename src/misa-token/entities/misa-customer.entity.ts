import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Employee } from 'src/employee/entities/employee.entity';
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

  @Column({ type: 'text', nullable: true })
  shippingAddress: string | null;

  @Column({
    type: 'point',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
    transformer: {
      to: (value?: { latitude: number; longitude: number } | string | null) => {
        if (!value) return null;
        if (typeof value === 'string') return value;
        const { longitude, latitude } = value as {
          latitude: number;
          longitude: number;
        };
        return `(${latitude},${longitude})`;
      },
      from: (value: any) => {
        if (!value) return null;
        if (
          typeof value === 'object' &&
          value.x !== undefined &&
          value.y !== undefined
        ) {
          return { latitude: value.x, longitude: value.y };
        }
        if (typeof value === 'string') {
          const match = value.match(/\(([^,]+),([^)]+)\)/);
          if (match) {
            const latitude = parseFloat(match[1]);
            const longitude = parseFloat(match[2]);
            return { latitude, longitude };
          }
        }
        return value;
      },
    },
  })
  location?: { latitude: number; longitude: number } | null;

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

  // ====== Hợp đồng & Pháp lý ======
  @Column({ type: 'jsonb', nullable: true })
  contractFiles: string[] | null;

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

  // ====== Thông tin chăm sóc khách hàng ======

  /**
   * Chu kỳ chăm sóc (số ngày giữa các lần chăm sóc)
   * Ví dụ: 30 = mỗi 30 ngày phải chăm sóc 1 lần
   */
  @Column({ type: 'int', nullable: true })
  careIntervalDays: number | null;

  /**
   * ID của nhân viên phụ trách chăm sóc khách hàng này (FK → employee.id)
   */
  @Column({ type: 'bigint', nullable: true })
  @Index()
  careById: number | null;

  /**
   * Ngày chăm sóc gần nhất (lần chăm sóc cuối cùng)
   */
  @Column({ type: 'timestamp with time zone', nullable: true })
  lastCaredAt: Date | null;

  /**
   * Ngày chăm sóc tiếp theo (tự động = lastCaredAt + careIntervalDays)
   * Có thể set thủ công nếu cần
   */
  @Column({ type: 'timestamp with time zone', nullable: true })
  nextCareAt: Date | null;

  /**
   * Ghi chú chăm sóc (nội dung trao đổi, yêu cầu của khách...)
   */
  @Column({ type: 'text', nullable: true })
  careNote: string | null;

  // Relation: Nhân viên chăm sóc
  @ManyToOne(() => Employee, { nullable: true, eager: false })
  @JoinColumn({ name: 'careById' })
  employee: Employee;

  // ====== Thông tin sản xuất & Đầu tư ======
  @Column({ type: 'varchar', length: 255, nullable: true })
  garmentType: string | null;

  @Column({ type: 'text', nullable: true })
  currentEquipment: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  investmentPotential: string | null;

  @Column({ type: 'int', nullable: true })
  workerScale: number | null;

  @Column({ type: 'int', nullable: true })
  averageMonthlyCapacity: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  qualityStandard: string | null;

  // ====== Chính sách bán hàng ======
  @Column({ type: 'varchar', length: 255, nullable: true })
  acquisitionSource: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  customerGroup: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  priceGroup: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  discountRate: number | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  minOrderValue: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  salesRegion: string | null;

  // ====== Công nợ ======
  @Column({ type: 'boolean', default: false })
  isBlockedDebt: boolean;

  @Column({ type: 'int', nullable: true })
  debtGraceDays: number | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  creditLimit: number | null;

  @Column({ type: 'int', nullable: true })
  paymentTermDays: number | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  currentDebt: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  overdueDebt: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastPaymentDate: Date | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  lastPaymentAmount: number | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  debtUpdatedAt: Date | null;

  // ====== Thanh toán / Ngân hàng ======
  @Column({ type: 'boolean', default: false })
  isInvoiced: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  paymentMethod: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  bankName: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  bankAccountNumber: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  bankBranch: string | null;

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

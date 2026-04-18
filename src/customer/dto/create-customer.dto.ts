import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class CreateCustomerDto {
  @ApiProperty({ description: 'Mã khách hàng', example: 'KH001' })
  @IsString()
  @MaxLength(100)
  accountObjectCode: string;

  @ApiProperty({ description: 'Tên khách hàng', example: 'Công ty ABC' })
  @IsString()
  @MaxLength(500)
  accountObjectName: string;

  @ApiPropertyOptional({ description: 'Địa chỉ', example: '123 Nguyễn Trãi' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Địa chỉ nhận hàng', example: 'Kho số 3, KCN Tân Bình' })
  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @ApiPropertyOptional({
    description: 'Tọa độ vị trí khách hàng',
    example: { latitude: 10.762622, longitude: 106.660172 },
  })
  @IsOptional()
  location?: { latitude: number; longitude: number } | null;

  @ApiPropertyOptional({ description: 'Mã số thuế', example: '0123456789' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxCode?: string;

  @ApiPropertyOptional({ description: 'Điện thoại', example: '0901234567' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tel?: string;

  @ApiPropertyOptional({ description: 'Quốc gia', example: 'Việt Nam' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({
    description: 'Tỉnh/Thành phố',
    example: 'TP. Hồ Chí Minh',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  provinceOrCity?: string;

  @ApiPropertyOptional({ description: 'Quận/Huyện', example: 'Quận 1' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @ApiPropertyOptional({ description: 'Xã/Phường', example: 'Phường Bến Nghé' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  wardOrCommune?: string;

  @ApiPropertyOptional({ description: 'Người liên hệ', example: 'Nguyễn Văn A' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactName?: string;

  @ApiPropertyOptional({
    description: 'Di động người liên hệ',
    example: '0901234567',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactMobile?: string;

  @ApiPropertyOptional({
    description: 'Email người liên hệ',
    example: 'contact@abc.com',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactEmail?: string;

  @ApiPropertyOptional({
    description: 'Người đại diện pháp luật',
    example: 'Trần Thị B',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  legalRepresentative?: string;

  @ApiPropertyOptional({
    description: 'Người nhận hóa đơn',
    example: 'Lê Văn C',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  invoiceReceiver?: string;

  @ApiPropertyOptional({
    description: 'SĐT người nhận hóa đơn',
    example: '0909090909',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  invoiceReceiverPhone?: string;

  @ApiPropertyOptional({
    description: 'Email người nhận hóa đơn',
    example: 'invoice@abc.com',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  invoiceReceiverEmail?: string;

  @ApiPropertyOptional({
    description: 'Loại: 0 = Cá nhân, 1 = Tổ chức',
    example: 1,
    enum: [0, 1],
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  accountObjectType?: number;

  @ApiPropertyOptional({ description: 'Là khách hàng?', example: true })
  @IsOptional()
  @IsBoolean()
  isCustomer?: boolean;

  @ApiPropertyOptional({ description: 'Là nhà cung cấp?', example: false })
  @IsOptional()
  @IsBoolean()
  isVendor?: boolean;

  @ApiPropertyOptional({
    description: 'Rank khách hàng: A/B/C/D',
    example: 'A',
    enum: ['A', 'B', 'C', 'D'],
  })
  @IsOptional()
  @IsEnum(['A', 'B', 'C', 'D'])
  rank?: 'A' | 'B' | 'C' | 'D';

  @ApiPropertyOptional(
    {
    description: 'Danh sách địa điểm giao hàng (JSON array)',
    type: 'array',
    items: { type: 'object' },
  })
  @IsOptional()
  shippingAddresses?: any[];

  @ApiPropertyOptional({
    description: 'Danh sách link file hợp đồng, giấy phép kinh doanh',
    type: 'array',
    items: { type: 'string' },
  })
  @IsOptional()
  contractFiles?: string[];

  // ====== Thông tin chăm sóc khách hàng ======

  @ApiPropertyOptional({
    description: 'Chu kỳ chăm sóc (số ngày). VD: 30 = 1 tháng chăm sóc 1 lần',
    example: 30,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  careIntervalDays?: number;

  @ApiPropertyOptional({
    description: 'ID nhân viên phụ trách chăm sóc khách hàng (Employee.id)',
    example: 5,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  careById?: number;

  @ApiPropertyOptional({
    description: 'Ngày chăm sóc gần nhất (ISO 8601)',
    example: '2026-04-01T09:00:00.000Z',
  })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  @IsDate()
  lastCaredAt?: Date;

  @ApiPropertyOptional({
    description: 'Ngày chăm sóc tiếp theo (ISO 8601, để trống = tự tính từ lastCaredAt + careIntervalDays)',
    example: '2026-05-01T09:00:00.000Z',
  })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  @IsDate()
  nextCareAt?: Date;

  @ApiPropertyOptional({
    description: 'Ghi chú chăm sóc (nội dung trao đổi, yêu cầu đặc biệt...)',
    example: 'Khách hàng yêu cầu gọi điện thứ 2 hàng tuần.',
  })
  @IsOptional()
  @IsString()
  careNote?: string;

  // ====== Thông tin sản xuất & Đầu tư ======

  @ApiPropertyOptional({ description: 'Loại sản phẩm đang may', example: 'Áo thun, Đồ bảo hộ' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  garmentType?: string;

  @ApiPropertyOptional({ description: 'Thiết bị đang sử dụng', example: '10 máy Kansai, 5 máy Juki' })
  @IsOptional()
  @IsString()
  currentEquipment?: string;

  @ApiPropertyOptional({ description: 'Tiềm năng đầu tư', example: 'Dự kiến mở rộng xưởng vào năm sau' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  investmentPotential?: string;

  @ApiPropertyOptional({ description: 'Quy mô công nhân (số lượng)', example: 50 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  workerScale?: number;

  @ApiPropertyOptional({ description: 'Năng lực may bình quân tháng (số lượng)', example: 20000 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  averageMonthlyCapacity?: number;

  @ApiPropertyOptional({ description: 'Tiêu chuẩn chất lượng', example: 'Standard/High/Export' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  qualityStandard?: string;

  // ====== Chính sách bán hàng ======

  @ApiPropertyOptional({ description: 'Nguồn tìm kiếm khách hàng', example: 'Referral' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  acquisitionSource?: string;

  @ApiPropertyOptional({ description: 'Nhóm khách hàng (retail, agency_l1, ...)', example: 'retail' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  customerGroup?: string;

  @ApiPropertyOptional({ description: 'Bảng giá áp dụng (standard, wholesale, vip)', example: 'standard' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  priceGroup?: string;

  @ApiPropertyOptional({ description: 'Tỷ lệ chiết khấu (%)', example: 5.5 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  discountRate?: number;

  @ApiPropertyOptional({ description: 'Giá trị đơn hàng tối thiểu', example: 1000000 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minOrderValue?: number;

  @ApiPropertyOptional({ description: 'Khu vực bán hàng', example: 'Miền Bắc' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  salesRegion?: string;

  // ====== Công nợ ======

  @ApiPropertyOptional({ description: 'Khóa công nợ?', example: false })
  @IsOptional()
  @IsBoolean()
  isBlockedDebt?: boolean;

  @ApiPropertyOptional({ description: 'Số ngày ân hạn', example: 5 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  debtGraceDays?: number;

  @ApiPropertyOptional({ description: 'Hạn mức công nợ tối đa', example: 50000000 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  creditLimit?: number;

  @ApiPropertyOptional({ description: 'Số ngày được phép nợ (thời hạn thanh toán)', example: 30 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  paymentTermDays?: number;

  @ApiPropertyOptional({ description: 'Số nợ hiện tại', example: 5000000 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  currentDebt?: number;

  @ApiPropertyOptional({ description: 'Số nợ quá hạn', example: 1000000 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  overdueDebt?: number;

  @ApiPropertyOptional({ description: 'Ngày thanh toán gần nhất' })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  @IsDate()
  lastPaymentDate?: Date;

  @ApiPropertyOptional({ description: 'Số tiền thanh toán lần cuối', example: 2000000 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lastPaymentAmount?: number;

  @ApiPropertyOptional({ description: 'Ngày cập nhật công nợ gần nhất' })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  @IsDate()
  debtUpdatedAt?: Date;

  // ====== Thanh toán / Ngân hàng ======

  @ApiPropertyOptional({ description: 'Có luôn xuất hóa đơn VAT không?', example: true })
  @IsOptional()
  @IsBoolean()
  isInvoiced?: boolean;

  @ApiPropertyOptional({ description: 'Phương thức thanh toán mặc định', example: 'bank_transfer' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Tên ngân hàng', example: 'Vietcombank' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  bankName?: string;

  @ApiPropertyOptional({ description: 'Số tài khoản ngân hàng', example: '1234567890' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankAccountNumber?: string;

  @ApiPropertyOptional({ description: 'Chi nhánh ngân hàng', example: 'Chi nhánh Hoàng Mai' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  bankBranch?: string;
}

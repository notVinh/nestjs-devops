import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { EntityHelper } from 'src/utils/entity-helper';
import { MisaApiConfig } from './misa-api-config.entity';

/**
 * Bảng lưu cấu hình cho từng loại dữ liệu MISA
 * Mỗi loại (Customer, Product, Sales Order, Purchase Order) có cấu hình riêng
 */
@Entity('misaDataSource')
export class MisaDataSource extends EntityHelper {
  // Liên kết với config chung
  @Column({ type: 'bigint', nullable: true })
  apiConfigId: number | null;

  @ManyToOne(() => MisaApiConfig, { eager: false })
  @JoinColumn({ name: 'apiConfigId' })
  apiConfig?: MisaApiConfig;

  // ====== Thông tin định danh ======
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  icon: string | null;

  // ====== Cấu hình API riêng ======
  // Endpoint riêng nếu khác base_url (null = dùng base_url từ apiConfig)
  @Column({ type: 'varchar', length: 500, nullable: true })
  apiEndpoint: string | null;

  // View name trong MISA
  @Column({ type: 'varchar', length: 100 })
  view: string;

  // Data type trong MISA
  @Column({ type: 'varchar', length: 100 })
  dataType: string;

  // ====== Filter & Sort (JSON string như MISA yêu cầu) ======
  // Ví dụ: '[["is_customer","=",true],"and",["is_employee","=",false]]'
  @Column({ type: 'text', nullable: true })
  defaultFilter: string | null;

  // Ví dụ: '[{"property":"account_object_code","desc":false}]'
  @Column({ type: 'text', nullable: true })
  defaultSort: string | null;

  // ====== Các params request body khác ======
  @Column({ type: 'boolean', default: false })
  useSp: boolean;

  @Column({ type: 'boolean', default: true })
  isGetTotal: boolean;

  @Column({ type: 'boolean', default: false })
  isFilterBranch: boolean;

  @Column({ type: 'boolean', default: true })
  isMultiBranch: boolean;

  @Column({ type: 'boolean', default: false })
  isDependent: boolean;

  @Column({ type: 'int', default: 2 })
  loadMode: number;

  // ====== Params đặc biệt cho từng loại ======
  // Dùng cho Inventory Items (Sản phẩm): -1 = tất cả
  @Column({ type: 'int', nullable: true })
  stockItemState: number | null;

  // Dùng cho Inventory Items: ",closing_amount"
  @Column({ type: 'varchar', length: 500, nullable: true })
  summaryColumns: string | null;

  // Các extra params khác (JSON object)
  @Column({ type: 'jsonb', nullable: true })
  extraParams: Record<string, any> | null;

  // ====== Request Body Template (ưu tiên nếu có) ======
  // Lưu toàn bộ request body dạng JSON, sẽ được merge với params động (pageIndex, current_branch)
  @Column({ type: 'jsonb', nullable: true })
  requestBodyTemplate: Record<string, any> | null;

  // ====== Cấu hình sync ======
  @Column({ type: 'int', default: 100 })
  pageSize: number;

  @Column({ type: 'boolean', default: true })
  syncEnabled: boolean;

  // ====== Thứ tự hiển thị ======
  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  // ====== Trạng thái ======
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  /**
   * Thay thế các placeholder động trong giá trị
   * Hỗ trợ: {{NOW}}, {{TODAY}}, {{START_OF_YEAR}}, {{END_OF_YEAR}}, {{DAYS_AGO_X}}, {{MONTHS_AGO_X}}
   */
  private replaceDatePlaceholders(value: any): any {
    if (typeof value !== 'string') return value;

    const now = new Date();

    // {{NOW}} - thời điểm hiện tại
    if (value === '{{NOW}}') {
      return now.toISOString();
    }

    // {{TODAY}} - đầu ngày hôm nay (00:00:00 UTC)
    if (value === '{{TODAY}}') {
      const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
      return today.toISOString();
    }

    // {{START_OF_YEAR}} - đầu năm hiện tại (01/01/YYYY 00:00:00 UTC)
    if (value === '{{START_OF_YEAR}}') {
      const startOfYear = new Date(Date.UTC(now.getFullYear(), 0, 1));
      return startOfYear.toISOString();
    }

    // {{END_OF_YEAR}} - cuối năm hiện tại (31/12/YYYY 23:59:59 UTC)
    if (value === '{{END_OF_YEAR}}') {
      const endOfYear = new Date(Date.UTC(now.getFullYear(), 11, 31, 23, 59, 59, 999));
      return endOfYear.toISOString();
    }

    // {{DAYS_AGO_X}} - X ngày trước (ví dụ: {{DAYS_AGO_30}})
    const daysAgoMatch = value.match(/^\{\{DAYS_AGO_(\d+)\}\}$/);
    if (daysAgoMatch) {
      const days = parseInt(daysAgoMatch[1], 10);
      const pastDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      pastDate.setUTCHours(0, 0, 0, 0);
      return pastDate.toISOString();
    }

    // {{MONTHS_AGO_X}} - X tháng trước (ví dụ: {{MONTHS_AGO_6}})
    const monthsAgoMatch = value.match(/^\{\{MONTHS_AGO_(\d+)\}\}$/);
    if (monthsAgoMatch) {
      const months = parseInt(monthsAgoMatch[1], 10);
      const pastDate = new Date(Date.UTC(now.getFullYear(), now.getMonth() - months, 1));
      return pastDate.toISOString();
    }

    return value;
  }

  /**
   * Xử lý filter array để thay thế các placeholder động
   */
  private processFilterPlaceholders(filter: any[]): any[] {
    return filter.map(item => {
      if (item && typeof item === 'object' && 'value' in item) {
        return {
          ...item,
          value: this.replaceDatePlaceholders(item.value),
        };
      }
      return item;
    });
  }

  /**
   * Build request body cho MISA API
   * Nếu có requestBodyTemplate thì dùng nó và merge params động
   * Ngược lại build từ các trường riêng lẻ (backward compatible)
   */
  buildRequestBody(
    pageIndex: number = 1,
    customFilter?: string,
    customSort?: string,
    currentBranch?: string,
  ): Record<string, any> {
    // Nếu có requestBodyTemplate thì ưu tiên dùng nó
    if (this.requestBodyTemplate) {
      const body = JSON.parse(JSON.stringify(this.requestBodyTemplate)); // Deep clone

      // Override các params động
      body.pageIndex = pageIndex;
      if (currentBranch) {
        body.current_branch = currentBranch;
      }
      // Override pageSize nếu cần
      if (this.pageSize) {
        body.pageSize = this.pageSize;
      }
      // Override filter/sort nếu có custom
      if (customFilter) {
        body.filter = customFilter;
      }
      if (customSort) {
        body.sort = customSort;
      }

      // Xử lý placeholder động trong filter
      if (Array.isArray(body.filter)) {
        body.filter = this.processFilterPlaceholders(body.filter);
      }

      return body;
    }

    // Fallback: build từ các trường riêng lẻ (backward compatible)
    const body: Record<string, any> = {
      pageIndex,
      pageSize: this.pageSize,
      useSp: this.useSp,
      view: this.view,
      dataType: this.dataType,
      isGetTotal: this.isGetTotal,
      is_filter_branch: this.isFilterBranch,
      current_branch: currentBranch || '',
      is_multi_branch: this.isMultiBranch,
      is_dependent: this.isDependent,
      loadMode: this.loadMode,
    };

    // Only add sort if not empty
    const sortValue = customSort || this.defaultSort;
    if (sortValue && sortValue !== '[]') {
      body.sort = sortValue;
    }

    // Only add filter if not empty
    const filterValue = customFilter || this.defaultFilter;
    if (filterValue && filterValue !== '[]') {
      body.filter = filterValue;
    }

    // Add optional params if set
    if (this.stockItemState !== null && this.stockItemState !== undefined) {
      body.stockItemState = this.stockItemState;
    }
    if (this.summaryColumns) {
      body.summaryColumns = this.summaryColumns;
    }
    // Merge extra params
    if (this.extraParams) {
      Object.assign(body, this.extraParams);
    }

    return body;
  }
}

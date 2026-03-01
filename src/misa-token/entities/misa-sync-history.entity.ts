import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { EntityHelper } from 'src/utils/entity-helper';
import { MisaDataSource } from './misa-data-source.entity';

export type MisaSyncStatus = 'pending' | 'running' | 'success' | 'failed';
export type MisaSyncSource = 'manual' | 'scheduled';

export interface MisaSyncLogEntry {
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: string;
}

/**
 * Bảng lưu lịch sử đồng bộ dữ liệu từ MISA
 */
@Entity('misaSyncHistory')
export class MisaSyncHistory extends EntityHelper {
  @Column({ type: 'bigint' })
  dataSourceId: number;

  @ManyToOne(() => MisaDataSource, { eager: false })
  @JoinColumn({ name: 'dataSourceId' })
  dataSource?: MisaDataSource;

  // ====== Trạng thái ======
  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: MisaSyncStatus;

  @Column({ type: 'varchar', length: 20, default: 'manual' })
  source: MisaSyncSource;

  // ====== Thời gian ======
  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  // ====== Thống kê ======
  @Column({ type: 'int', default: 0 })
  totalRecords: number;

  @Column({ type: 'int', default: 0 })
  syncedRecords: number;

  @Column({ type: 'int', default: 0 })
  createdRecords: number;

  @Column({ type: 'int', default: 0 })
  updatedRecords: number;

  @Column({ type: 'int', default: 0 })
  unchangedRecords: number;

  // ====== Chi tiết thay đổi (lưu danh sách các bản ghi đã thay đổi) ======
  @Column({ type: 'jsonb', nullable: true })
  changedDetails: {
    created: Array<{ code: string; name: string }>;
    updated: Array<{ code: string; name: string; changes: Record<string, { old: any; new: any }> }>;
    detailUpdated?: Array<{ code: string; name: string }>; // Đơn có chi tiết thay đổi
  } | null;

  // ====== Lỗi & Logs ======
  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'jsonb', default: [] })
  logs: MisaSyncLogEntry[];

  // ====== Request/Response để debug ======
  @Column({ type: 'jsonb', nullable: true })
  lastRequest: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  lastResponseSample: Record<string, any> | null;
}

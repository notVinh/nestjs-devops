import { Column, Entity } from 'typeorm';
import { EntityHelper } from 'src/utils/entity-helper';

/**
 * Bảng lưu cấu hình chung cho MISA API
 * Chứa thông tin tenant, database, device - dùng chung cho tất cả API calls
 */
@Entity('misaApiConfig')
export class MisaApiConfig extends EntityHelper {
  @Column({ type: 'varchar', length: 100, default: 'Default' })
  name: string;

  // Base URL cho API
  @Column({ type: 'varchar', length: 500 })
  baseUrl: string;

  // ====== X-MISA-Context fields ======
  @Column({ type: 'varchar', length: 100 })
  tenantId: string;

  @Column({ type: 'varchar', length: 50 })
  tenantCode: string;

  @Column({ type: 'varchar', length: 100 })
  databaseId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  branchId: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  userId: string | null;

  @Column({ type: 'int', default: 0 })
  workingBook: number;

  @Column({ type: 'varchar', length: 10, default: 'vi' })
  language: string;

  @Column({ type: 'varchar', length: 10, default: 'false' })
  includeDependentBranch: string;

  @Column({ type: 'int', default: 1 })
  dbType: number;

  @Column({ type: 'int', default: 0 })
  authType: number;

  @Column({ type: 'boolean', default: false })
  hasAgent: boolean;

  @Column({ type: 'int', default: 1 })
  userType: number;

  @Column({ type: 'int', default: 1 })
  art: number;

  @Column({ type: 'boolean', default: false })
  isc: boolean;

  // ====== X-Device header ======
  @Column({ type: 'varchar', length: 100, nullable: true })
  deviceId: string | null;

  // ====== Cookies (nếu cần) ======
  @Column({ type: 'text', nullable: true })
  cookies: string | null;

  // ====== Trạng thái ======
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  /**
   * Build X-MISA-Context header object
   * SessionId và AmisSessionId sẽ được generate động từ token
   */
  buildMisaContext(sessionId: string, amisSessionId: string): Record<string, any> {
    return {
      TenantId: this.tenantId,
      TenantCode: this.tenantCode,
      DatabaseId: this.databaseId,
      BranchId: this.branchId,
      WorkingBook: this.workingBook,
      Language: this.language,
      IncludeDependentBranch: this.includeDependentBranch,
      SessionId: sessionId,
      DBType: this.dbType,
      AuthType: this.authType,
      AmisSessionId: amisSessionId,
      HasAgent: this.hasAgent,
      UserType: this.userType,
      art: this.art,
      UserId: this.userId,
      isc: this.isc,
    };
  }
}

import {
  Entity,
  Column,
  BeforeInsert,
  BeforeUpdate,
  AfterLoad,
} from 'typeorm';
import { EntityHelper } from 'src/utils/entity-helper';
import { SecretEncryptionUtil } from 'src/utils/secret-encryption.util';
import { Exclude } from 'class-transformer';

export type MisaTokenStatus = 'pending' | 'running' | 'success' | 'failed';
export type MisaTokenSource = 'manual' | 'scheduled';

export interface MisaLogEntry {
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: string;
}

@Entity('misaToken')
export class MisaToken extends EntityHelper {
  @Column({ type: 'text', nullable: true })
  @Exclude({ toPlainOnly: true })
  accessToken: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: MisaTokenStatus;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'varchar', length: 20, default: 'manual' })
  source: MisaTokenSource;

  @Column({ type: 'jsonb', default: [] })
  logs: MisaLogEntry[];

  // For tracking changes to encrypted fields
  @Exclude()
  private previousAccessToken?: string;

  @AfterLoad()
  public loadPreviousAccessToken(): void {
    this.previousAccessToken = this.accessToken;
  }

  @BeforeInsert()
  @BeforeUpdate()
  async setAppSecret() {
    if (this.previousAccessToken !== this.accessToken && this.accessToken) {
      // Only encrypt if not already encrypted (prevent double encryption)
      if (!this.accessToken.startsWith('U2FsdGVk')) {
        this.accessToken = SecretEncryptionUtil.encrypt(this.accessToken);
      }
    }
  }

  /**
   * Get decrypted access token for API calls
   */
  getAccessTokenDecrypted(): string {
    try {
      return SecretEncryptionUtil.decrypt(this.accessToken);
    } catch (error) {
      throw new Error('Failed to decrypt access token');
    }
  }
}

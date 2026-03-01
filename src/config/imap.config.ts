import { registerAs } from '@nestjs/config';
import { IsString, IsInt, IsBoolean, IsOptional } from 'class-validator';
import validateConfig from 'src/utils/validate-config';

export type ImapConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  tls: boolean;
  checkInterval: number;
  defaultFactoryId: number;
  allowedSenders: string[];
};

class EnvironmentVariablesValidator {
  @IsString()
  IMAP_HOST: string;

  @IsInt()
  @IsOptional()
  IMAP_PORT: number;

  @IsString()
  IMAP_USER: string;

  @IsString()
  IMAP_PASSWORD: string;

  @IsBoolean()
  @IsOptional()
  IMAP_TLS: boolean;

  @IsInt()
  @IsOptional()
  IMAP_CHECK_INTERVAL: number;

  @IsInt()
  @IsOptional()
  DEFAULT_FACTORY_ID: number;

  @IsString()
  @IsOptional()
  IMAP_ALLOWED_SENDERS: string;
}

export default registerAs<ImapConfig>('imap', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    host: process.env.IMAP_HOST || 'imap.gmail.com',
    port: process.env.IMAP_PORT ? parseInt(process.env.IMAP_PORT, 10) : 993,
    user: process.env.IMAP_USER || '',
    password: process.env.IMAP_PASSWORD || '',
    tls: process.env.IMAP_TLS !== 'false',
    checkInterval: process.env.IMAP_CHECK_INTERVAL
      ? parseInt(process.env.IMAP_CHECK_INTERVAL, 10)
      : 300000,
    defaultFactoryId: process.env.DEFAULT_FACTORY_ID
      ? parseInt(process.env.DEFAULT_FACTORY_ID, 10)
      : 1,
    allowedSenders: process.env.IMAP_ALLOWED_SENDERS
      ? process.env.IMAP_ALLOWED_SENDERS.split(',').map((s) => s.trim())
      : [],
  };
});

import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { MisaApiConfig } from '../entities/misa-api-config.entity';
import { MisaTokenService } from '../misa-token.service';

/**
 * Kết quả gọi API MISA
 */
export interface MisaApiResult {
  success: boolean;
  data?: any[];
  total?: number;
  error?: {
    code?: string;
    message: string;
    exceptionId?: string;
    rawResponse?: any;
  };
}

/**
 * Service xử lý gọi API MISA
 * Chịu trách nhiệm: build headers, parse response, retry logic
 */
@Injectable()
export class MisaApiService {
  private readonly logger = new Logger(MisaApiService.name);

  constructor(private readonly misaTokenService: MisaTokenService) {}

  /**
   * Build headers cho MISA API request
   */
  buildMisaHeaders(token: string, apiConfig: MisaApiConfig): Record<string, string> {
    const misaContext = {
      TenantId: apiConfig.tenantId,
      TenantCode: apiConfig.tenantCode,
      DatabaseId: apiConfig.databaseId,
      BranchId: apiConfig.branchId,
      WorkingBook: apiConfig.workingBook,
      Language: apiConfig.language,
      IncludeDependentBranch: apiConfig.includeDependentBranch,
      DBType: apiConfig.dbType,
      AuthType: apiConfig.authType,
      HasAgent: apiConfig.hasAgent,
      UserType: apiConfig.userType,
      art: apiConfig.art,
      UserId: apiConfig.userId,
      isc: apiConfig.isc,
    };

    return {
      Accept: 'application/json, text/plain, */*',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Device': apiConfig.deviceId || '',
      'X-MISA-Context': JSON.stringify(misaContext),
    };
  }

  /**
   * Parse MISA API error response
   */
  parseMisaError(responseData: any): { code?: string; message: string; exceptionId?: string } {
    const message =
      responseData.SystemMessage ||
      (Array.isArray(responseData.ErrorsMessage) && responseData.ErrorsMessage.length > 0
        ? responseData.ErrorsMessage.join(', ')
        : null) ||
      `MISA Error Code: ${responseData.Code}`;

    return {
      code: responseData.Code,
      message,
      exceptionId: responseData.ExceptionID,
    };
  }

  /**
   * Parse MISA API success response để lấy records
   */
  parseMisaSuccessResponse(responseData: any): { records: any[]; total: number } {
    const dataContainer = responseData?.Data || responseData?.data || {};
    const records = dataContainer?.PageData || dataContainer?.Data || dataContainer || [];
    const total = dataContainer?.Total || dataContainer?.total || (Array.isArray(records) ? records.length : 0);

    return {
      records: Array.isArray(records) ? records : [],
      total,
    };
  }

  /**
   * Gọi MISA API với token và xử lý response
   */
  async callMisaApi(
    url: string,
    requestBody: any,
    token: string,
    apiConfig: MisaApiConfig
  ): Promise<MisaApiResult> {
    try {
      const response = await axios.post(url, requestBody, {
        headers: this.buildMisaHeaders(token, apiConfig),
        timeout: 60000,
      });

      const responseData = response.data;

      // Debug: log raw response structure
      this.logger.log(`Response Success: ${responseData?.Success}`);
      if (responseData?.Data?.PageData) {
        this.logger.log(`PageData count: ${responseData.Data.PageData.length}`);
      }

      // Check for MISA API error
      if (responseData?.Success === false) {
        const error = this.parseMisaError(responseData);
        this.logger.error('MISA API Error Response:', JSON.stringify(responseData, null, 2));
        return {
          success: false,
          error: { ...error, rawResponse: responseData },
        };
      }

      const { records, total } = this.parseMisaSuccessResponse(responseData);
      return { success: true, data: records, total };
    } catch (error: any) {
      const errorData = error.response?.data;

      if (errorData?.Success === false) {
        const parsedError = this.parseMisaError(errorData);
        return {
          success: false,
          error: { ...parsedError, rawResponse: errorData },
        };
      }

      const message = errorData?.message || errorData?.Message || error.message || 'Unknown error';
      return {
        success: false,
        error: { message, rawResponse: errorData },
      };
    }
  }

  /**
   * Lấy token MISA - kiểm tra token hiện tại hoặc refresh
   */
  async getToken(): Promise<string | null> {
    try {
      return await this.misaTokenService.getToken();
    } catch {
      return null;
    }
  }

  /**
   * Refresh token MISA
   */
  async refreshToken(): Promise<string> {
    this.misaTokenService.clearTokenCache();
    return this.misaTokenService.refreshToken();
  }

  /**
   * Clear token cache
   */
  clearTokenCache(): void {
    this.misaTokenService.clearTokenCache();
  }
}

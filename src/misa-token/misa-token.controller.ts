import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Sse,
  MessageEvent,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "src/roles/roles.guard";
import { Roles } from "src/roles/roles.decorator";
import { RoleEnum } from "src/roles/roles.enum";
import { MisaTokenService } from "./misa-token.service";
import { BaseResponse, ResponseHelper } from "src/utils/base-response";
import { HTTP_STATUS_CODE } from "src/utils/constant";
import { Observable, Subject } from "rxjs";

// Controller riêng cho SSE endpoint (không cần auth vì EventSource không hỗ trợ header)
@ApiTags("Misa Token")
@Controller({
  path: "misa-token",
  version: "1",
})
export class MisaTokenController {
  constructor(private readonly misaTokenService: MisaTokenService) {}

  @Sse("logs/stream")
  @ApiOperation({ summary: "Stream logs via SSE (no auth required)" })
  streamLogs(): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();

    // Subscribe to log events
    const unsubscribe = this.misaTokenService.onLog((log) => {
      subject.next({
        data: JSON.stringify(log),
      } as MessageEvent);
    });

    // Cleanup when client disconnects
    subject.subscribe({
      complete: () => unsubscribe(),
    });

    return subject.asObservable();
  }

  @ApiBearerAuth()
  @Roles(RoleEnum.superAdmin)
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Get("status")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get MISA token status" })
  async getStatus(): Promise<BaseResponse<{
    hasToken: boolean;
    isValid: boolean;
    isRefreshing: boolean;
    currentRecordId: number | null;
    expiresAt: Date | null;
    expiresIn: number | null;
    lastRefreshed: Date | null;
  }>> {
    const tokenInfo = await this.misaTokenService.getTokenInfo();
    const refreshStatus = this.misaTokenService.getRefreshingStatus();
    return ResponseHelper.success(
      {
        hasToken: tokenInfo.hasToken,
        isValid: tokenInfo.isValid,
        isRefreshing: refreshStatus.isRefreshing,
        currentRecordId: refreshStatus.currentRecordId,
        expiresAt: tokenInfo.expiresAt,
        expiresIn: tokenInfo.expiresIn,
        lastRefreshed: tokenInfo.lastRefreshed,
      },
      "Lấy trạng thái token thành công",
      HTTP_STATUS_CODE.OK
    );
  }

  @ApiBearerAuth()
  @Roles(RoleEnum.superAdmin)
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Get("history")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get token refresh history" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getHistory(
    @Query("page") page = 1,
    @Query("limit") limit = 20
  ): Promise<BaseResponse<any>> {
    const result = await this.misaTokenService.getHistory(Number(page), Number(limit));
    return ResponseHelper.success(
      result,
      "Lấy lịch sử thành công",
      HTTP_STATUS_CODE.OK
    );
  }

  @ApiBearerAuth()
  @Roles(RoleEnum.superAdmin)
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Get("history/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get specific token record" })
  async getRecord(@Param("id") id: number): Promise<BaseResponse<any>> {
    const record = await this.misaTokenService.getRecordById(Number(id));
    if (!record) {
      return ResponseHelper.success(
        null,
        "Không tìm thấy record",
        HTTP_STATUS_CODE.NOT_FOUND
      );
    }
    return ResponseHelper.success(
      record,
      "Lấy record thành công",
      HTTP_STATUS_CODE.OK
    );
  }

  @ApiBearerAuth()
  @Roles(RoleEnum.superAdmin)
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Manually refresh MISA token" })
  async refreshToken(): Promise<BaseResponse<{ success: boolean; message: string; recordId?: number }>> {
    try {
      // Check if already refreshing
      const status = this.misaTokenService.getRefreshingStatus();
      if (status.isRefreshing) {
        return ResponseHelper.success(
          { success: false, message: "Đang trong quá trình làm mới token", recordId: status.currentRecordId || undefined },
          "Đang làm mới token",
          HTTP_STATUS_CODE.OK
        );
      }

      // Start refresh in background (don't await)
      this.misaTokenService.refreshToken('manual').catch(() => {
        // Error already logged in service
      });

      // Return immediately with refreshing status
      const newStatus = this.misaTokenService.getRefreshingStatus();
      return ResponseHelper.success(
        { success: true, message: "Đã bắt đầu làm mới token", recordId: newStatus.currentRecordId || undefined },
        "Bắt đầu làm mới token",
        HTTP_STATUS_CODE.OK
      );
    } catch (error: any) {
      return ResponseHelper.success(
        { success: false, message: error.message || "Không thể làm mới token" },
        "Làm mới token thất bại",
        HTTP_STATUS_CODE.OK
      );
    }
  }
}

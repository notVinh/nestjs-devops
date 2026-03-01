import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BaseResponse, ResponseHelper } from 'src/utils/base-response';
import { HTTP_STATUS_CODE } from 'src/utils/constant';

@Controller({
  path: 'time',
  version: '1',
})
@ApiTags('Time')
export class TimeController {
  @Get('now')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy thời gian hiện tại từ server' })
  getCurrentTime(): BaseResponse<{ currentTime: string }> {
    const currentTime = new Date().toISOString();
    return ResponseHelper.success(
      { currentTime },
      'Lấy thời gian thành công',
      HTTP_STATUS_CODE.OK
    );
  }
}

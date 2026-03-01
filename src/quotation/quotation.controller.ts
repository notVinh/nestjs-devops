import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Patch,
  ParseIntPipe,
} from '@nestjs/common';
import { QuotationService } from './quotation.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateDetailedPriceDto } from './dto/update-quotation.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Quotations')
@Controller({
  path: 'quotations', // Vẫn để là quotations
  version: '1', // NestJS sẽ tự thêm /v1 nếu bạn đã bật Versioning
})
export class QuotationController {
  constructor(private readonly quotationService: QuotationService) {}

  @Post('public/submit') // Endpoint cho Landing Page
  async submitRequest(@Body() dto: CreateQuotationDto) {
    return this.quotationService.customerRequest(dto);
  }

  @Get('admin/all') // Endpoint cho trang Admin
  // @UseGuards(JwtAuthGuard) // Bảo vệ bằng JWT
  async getAll() {
    return this.quotationService.findAll();
  }

  // 1. Chỉ xác nhận trạng thái (Confirm) - Không cần gửi body phức tạp
  @Patch('admin/:id/confirm-status')
  async confirmStatus(@Param('id', ParseIntPipe) id: number) {
    return this.quotationService.confirmStatus(id);
  }

  // 2. Cập nhật giá chi tiết sản phẩm (Báo giá cụ thể)
  // Nhận JSON bao gồm quotationId và danh sách items có giá
  // @Patch('admin/update-details')
  // async updateDetailedPrice(
  //   @Body()
  //   updateData: {
  //     quotationId: number;
  //     totalPrice: number;
  //     items: { id: number; unitPrice: number }[];
  //   }
  // ) {
  //   return this.quotationService.updateDetailedPrice(updateData);
  // }
  @Patch('admin/update-details')
  // NestJS sẽ lấy toàn bộ nội dung JSON bạn gửi lên và bỏ vào biến updateDto
  async updateDetailedPrice(@Body() updateDto: UpdateDetailedPriceDto) {
    return this.quotationService.updateDetailedPrice(updateDto);
  }

  @Post('send-email/:id')
  async sendMail(@Param('id') id: number) {
    return this.quotationService.handleSendQuotation(id);
  }

  // @Post('send-email/:id')
  // async sendMail(
  //   @Param('id') id: number,
  //   @Body() updateDto: { items: any[]; totalPrice: number }
  // ) {
  //   return this.quotationService.handleSendQuotation(id, updateDto);
  // }

  @Get('confirm/:token')
  async getQuotationByToken(@Param('token') token: string) {
    return await this.quotationService.findByToken(token);
  }

  @Post('customer-confirm/:token')
  async customerConfirm(
    @Param('token') token: string,
    @Body()
    body: {
      customerName: string;
      customerPhone: string;
      customerAddress: string;
    }
  ) {
    return await this.quotationService.customerConfirm(token, body);
  }
}

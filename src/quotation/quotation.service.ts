import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quotation } from './entities/quotation.entity';
import { QuotationItem } from './entities/quotation-item.entity';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { MailService } from 'src/mail/mail.service';
import * as crypto from 'crypto'; // Import thêm thư viện này ở đầu file

@Injectable()
export class QuotationService {
  constructor(
    private readonly mailService: MailService,
    @InjectRepository(Quotation) private quotationRepo: Repository<Quotation>,
    @InjectRepository(QuotationItem) private itemRepo: Repository<QuotationItem>
  ) {}

  // 1. Khách hàng gửi yêu cầu từ Landing Page
  async customerRequest(dto: CreateQuotationDto) {
    // 1. Tạo bản ghi Quotation (Thông tin khách)
    const newQuotation = this.quotationRepo.create({
      customerName: dto.customerName,
      customerEmail: dto.customerEmail,
      customerPhone: dto.customerPhone,
      notes: dto.notes,
      status: 'pending', // Mặc định là chờ xử lý
      totalPrice: 0, // Lúc này chưa có giá, Admin sẽ nhập sau
    });

    const savedQuotation = await this.quotationRepo.save(newQuotation);

    // 2. Lưu danh sách sản phẩm khách chọn vào bảng QuotationItems
    const items = dto.items.map(item => {
      return this.itemRepo.create({
        quotationId: savedQuotation.id, // Link với ID vừa tạo ở trên
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: 0, // Khách gửi thì chưa có giá, Admin sẽ update sau
      });
    });

    await this.itemRepo.save(items);

    return {
      message: 'Yêu cầu báo giá của bạn đã được gửi thành công!',
      quotationId: savedQuotation.id,
    };
  }
  // 2. Admin lấy danh sách chờ xử lý
  async findAll() {
    return await this.quotationRepo.find({
      relations: ['items', 'items.product', 'items.product.translations'],
      order: { createdAt: 'DESC' },
    });
  }

  // 3. Admin xác nhận và báo giá
  async adminUpdatePrice(
    id: number,
    updateDto: {
      totalPrice: number;
      items: { id: number; unitPrice: number }[];
    }
  ) {
    const quotation = await this.quotationRepo.findOne({
      where: { id },
      relations: ['items'],
    });
    if (!quotation) throw new NotFoundException('Không tìm thấy yêu cầu');

    // Cập nhật giá cho từng item
    quotation.items.forEach(item => {
      const updateItem = updateDto.items.find(i => i.id === item.id);
      if (updateItem) item.unitPrice = updateItem.unitPrice;
    });

    quotation.totalPrice = updateDto.totalPrice;
    quotation.status = 'sent';

    return await this.quotationRepo.save(quotation);
  }

  async confirmStatus(id: number) {
    const quotation = await this.quotationRepo.findOne({ where: { id } });

    if (!quotation) throw new NotFoundException('Không tìm thấy yêu cầu');

    // Chỉ cập nhật trạng thái, không đụng vào giá hay items
    quotation.status = 'confirmed';

    return await this.quotationRepo.save(quotation);
  }

  async updateDetailedPrice(dto: {
    quotationId: number;
    items: any[];
    totalPrice: number;
  }) {
    // 1. Tìm đơn báo giá gốc
    const quotation = await this.quotationRepo.findOne({
      where: { id: dto.quotationId },
      relations: ['items'], // Phải load items để cập nhật
    });

    if (!quotation) throw new NotFoundException('Không tìm thấy đơn báo giá');

    // 2. Cập nhật giá cho từng sản phẩm trong bảng quotation_items
    // Chúng ta lặp qua danh sách items gửi lên từ Admin
    for (const itemUpdate of dto.items) {
      const itemInDb = quotation.items.find(i => i.id === itemUpdate.id);
      if (itemInDb) {
        itemInDb.unitPrice = Number(itemUpdate.unitPrice); // Ép kiểu về số
      }
    }

    // 3. Cập nhật tổng tiền và đổi trạng thái sang 'sent' (đã gửi báo giá)
    quotation.totalPrice = Number(dto.totalPrice);
    // quotation.status = 'sent';

    // 4. Lưu lại
    return await this.quotationRepo.save(quotation);
  }

  async handleSendQuotation(id: number) {
    const data = await this.quotationRepo.findOne({
      where: { id },
      relations: ['items', 'items.product', 'items.product.translations'],
    });

    // 1. Kiểm tra nếu không tìm thấy dữ liệu trong DB
    if (!data) {
      throw new NotFoundException(`Không tìm thấy đơn báo giá với ID: ${id}`);
    }

    // 2. Kiểm tra nếu khách hàng không có email (tránh lỗi khi gửi mail)
    if (!data.customerEmail) {
      throw new Error('Đơn báo giá này không có địa chỉ Email khách hàng.');
    }

    // 3. Lúc này TS đã biết chắc chắn 'data' không null, bạn gọi hàm an toàn
    try {
      // 3. Tạo token ngẫu nhiên (32 bytes dạng hex)
      const token = crypto.randomBytes(32).toString('hex');

      // 4. Cập nhật status và token vào database trước khi gửi mail
      // Chúng ta cập nhật trực tiếp vào object 'data' để MailService có thể dùng token này nếu cần
      data.status = 'sent';
      data.confirmationToken = token;
      await this.quotationRepo.save(data);

      await this.mailService.sendQuotation(data.customerEmail, data);
      return { message: 'Email đã được gửi thành công!' };
    } catch (error) {
      // Log lỗi nếu quá trình tạo PDF hoặc gửi Gmail thất bại
      console.error('Lỗi gửi mail:', error);
      throw new Error(
        'Gửi mail thất bại, vui lòng kiểm tra cấu hình SMTP hoặc Puppeteer.'
      );
    }
  }

  // async handleSendQuotation(id: number, dto?: { items: any[], totalPrice: number }) {
  //   // 1. Tìm đơn báo giá kèm theo các items
  //   const quotation = await this.quotationRepo.findOne({
  //     where: { id },
  //     relations: ['items', 'items.product', 'items.product.translations'],
  //   });

  //   if (!quotation) {
  //     throw new NotFoundException(`Không tìm thấy đơn báo giá với ID: ${id}`);
  //   }

  //   // 2. CẬP NHẬT GIÁ (Nếu có dữ liệu giá gửi kèm)
  //   if (dto && dto.items) {
  //     for (const itemUpdate of dto.items) {
  //       const itemInDb = quotation.items.find(i => i.id === itemUpdate.id);
  //       if (itemInDb) {
  //         itemInDb.unitPrice = Number(itemUpdate.unitPrice);
  //       }
  //     }
  //     quotation.totalPrice = Number(dto.totalPrice);
  //   }

  //   // Đổi trạng thái sang 'sent' vì đang thực hiện gửi mail
  //   quotation.status = 'sent';

  //   // Lưu lại thông tin giá mới vào DB trước khi gửi mail
  //   const updatedQuotation = await this.quotationRepo.save(quotation);

  //   // 3. KIỂM TRA EMAIL
  //   if (!updatedQuotation.customerEmail) {
  //     throw new Error('Đơn báo giá này không có địa chỉ Email khách hàng.');
  //   }

  //   // 4. GỬI MAIL VỚI DỮ LIỆU ĐÃ CẬP NHẬT
  //   try {
  //     // Gửi dữ liệu đã có đầy đủ unitPrice và totalPrice vào mailService
  //     await this.mailService.sendQuotation(updatedQuotation.customerEmail, updatedQuotation);

  //     return {
  //       message: 'Cập nhật giá và gửi Email thành công!',
  //       data: updatedQuotation
  //     };
  //   } catch (error) {
  //     console.error('Lỗi gửi mail:', error);
  //     throw new Error('Cập nhật giá thành công nhưng gửi mail thất bại.');
  //   }
  // }

  // Thêm hàm này vào QuotationService
  async findByToken(token: string) {
    const quotation = await this.quotationRepo.findOne({
      where: { confirmationToken: token },
      relations: [
        'items',
        'items.product',
        'items.product.translations', // Để hiển thị tên sản phẩm theo ngôn ngữ
      ],
    });

    if (!quotation) {
      throw new NotFoundException(
        'Liên kết xác nhận không hợp lệ hoặc đã hết hạn.'
      );
    }

    // Bạn có thể thêm logic kiểm tra nếu đơn hàng đã 'confirmed' rồi
    // thì không cho sửa/nhập lại thông tin nữa nếu muốn.

    return quotation;
  }

  // Khách hàng xác nhận từ giao diện Next.js
  async customerConfirm(
    token: string,
    dto: {
      customerName: string;
      customerPhone: string;
      customerAddress: string;
    }
  ) {
    // 1. Tìm đơn hàng dựa trên token
    const quotation = await this.quotationRepo.findOne({
      where: { confirmationToken: token },
    });

    // 2. Nếu không tìm thấy hoặc token đã bị xóa (đã confirm trước đó)
    if (!quotation) {
      throw new NotFoundException(
        'Liên kết xác nhận không hợp lệ hoặc đơn hàng đã được xác nhận trước đó.'
      );
    }

    // 3. Cập nhật thông tin khách hàng cung cấp từ Form Next.js
    quotation.customerName = dto.customerName;
    quotation.customerPhone = dto.customerPhone;
    quotation.customerAddress = dto.customerAddress;

    // 4. Đổi trạng thái và XÓA TOKEN để bảo mật (Link chỉ dùng 1 lần)
    quotation.status = 'confirmed';
    quotation.confirmationToken = null;

    // 5. Lưu vào Database
    await this.quotationRepo.save(quotation);

    return {
      success: true,
      message: 'Xác nhận đơn hàng thành công!',
    };
  }
}

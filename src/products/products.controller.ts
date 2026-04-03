import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Products') // Thay 'Auth' thành 'Products' để phân biệt trên Swagger
@Controller({
  path: 'products', // Vẫn để là products
  version: '1', // NestJS sẽ tự thêm /v1 nếu bạn đã bật Versioning
})
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // 1. Tạo mới sản phẩm (Bao gồm cả các bản dịch)
  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  // 2. Lấy danh sách sản phẩm phân trang + Theo ngôn ngữ
  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('lang') lang: string = 'vi' // Thêm param lang để trả về tên đúng ngôn ngữ
  ) {
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;

    return this.productsService.findAllPaginated(pageNumber, limitNumber, lang);
  }

  // 3. Tìm kiếm sản phẩm theo tên (ILIKE trong database translation)
  @Get('search')
  findAllWithSearch(
    @Query('search') search?: string,
    @Query('lang') lang: string = 'vi'
  ) {
    return this.productsService.findAllWithSearch(search, lang);
  }

  /**
   * 3b. Đối chiếu tồn kho MISA
   * GET /products/inventory-balance?stockId=UUID&page=1&limit=50
   *
   * - Trả về toàn bộ sản phẩm (có misaModel) kèm thông tin tồn kho tương ứng
   * - Nếu không truyền stockId → lấy dữ liệu tất cả kho
   * - hasInventory = false → sản phẩm chưa có dữ liệu tồn trong MISA
   */
  @Get('inventory-balance')
  getInventoryBalance(
    @Query('stockId') stockId?: string,
    @Query('misaModel') misaModel?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    return this.productsService.getInventoryBalance(
      stockId,
      misaModel,
      parseInt(page, 10) || 1,
      parseInt(limit, 10) || 50,
    );
  }

  // 4. Gán danh mục hàng loạt cho sản phẩm
  @Patch('assign-category')
  async assignToCategory(
    @Body() data: { productIds: string[]; categoryId: number }
  ) {
    return this.productsService.updateCategory(
      data.productIds,
      data.categoryId
    );
  }

  @Get('batch') // Endpoint: GET /products/batch?ids=...
  async findBatch(@Query('ids') idsString: string) {
    if (!idsString) return [];

    // Chuyển chuỗi "id1,id2,id3" thành mảng ["id1", "id2", "id3"]
    const ids = idsString.split(',');

    return this.productsService.findByIds(ids);
  }

  // 5. Lấy chi tiết 1 sản phẩm (Trả về full mảng translations để edit)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  // 6. Cập nhật sản phẩm & các bản dịch
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  // 7. Xóa sản phẩm (Sẽ tự động xóa các bản dịch nhờ CASCADE)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  // products/products.controller.ts
}

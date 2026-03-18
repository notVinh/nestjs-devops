// products/products.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>
  ) {}

  // async create(createProductDto: CreateProductDto) {
  //   const product = this.productRepository.create(createProductDto);
  //   return await this.productRepository.save(product);
  // }

  async create(createProductDto: CreateProductDto) {
    const { categoryId, translations, ...productData } = createProductDto;

    let nextOrder = 0;

    if (categoryId) {
      // Đếm số lượng sản phẩm hiện có trong category này
      // Bạn cũng có thể dùng .maximum('order', { category: { id: categoryId } })
      // nếu muốn lấy số lớn nhất + 1
      nextOrder = await this.productRepository.count({
        where: { category: { id: categoryId } },
      });
    }

    const product = this.productRepository.create({
      ...productData,
      order: nextOrder + 1, // Gán số thứ tự mới bằng tổng số lượng (ví dụ có 5 cái 0-4 thì cái mới là 5)
      // category: categoryId ? { id: categoryId } : null,
      category: categoryId ? ({ id: categoryId } as any) : null,
      translations: translations, // TypeORM tự động lưu vào bảng translation nhờ cascade: true
    });

    return await this.productRepository.save(product);
  }

  async findAll() {
    return await this.productRepository.find({
      relations: ['category'], // Yêu cầu lấy cả dữ liệu bảng category
    });
  }

  // async findOne(id: string) {
  //   return await this.productRepository.findOne({
  //     where: { id },
  //     relations: ['category'], // Trả về đầy đủ object category thay vì chỉ ID
  //   });
  // }

  async findOne(id: string) {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['category', 'translations'],
    });
    if (!product) throw new NotFoundException(`Máy ${id} không tồn tại`);
    return product;
  }

  // async findByCategory(categorySlug: string) {
  //   return await this.productRepository.find({
  //     where: { category_slug: categorySlug },
  //   });
  // }

  // async findOne(id: string) {
  //   return await this.productRepository.findOneBy({ id });
  // }

  // products/products.service.ts

  // ... (giữ nguyên constructor và các hàm cũ)

  // async update(id: string, updateProductDto: UpdateProductDto) {
  //   // Sử dụng preload để kiểm tra xem sản phẩm có tồn tại không và gộp dữ liệu mới
  //   const product = await this.productRepository.preload({
  //     id: id,
  //     ...updateProductDto,
  //   });

  //   if (!product) {
  //     throw new NotFoundException(`Product with ID ${id} not found`);
  //   }

  //   return this.productRepository.save(product);
  // }

  async update(id: string, updateProductDto: UpdateProductDto) {
    // Với cấu trúc phức tạp, cách tốt nhất là xóa các bản dịch cũ và chèn lại
    // hoặc cập nhật từng bản dịch nếu dùng Transaction
    const { translations, categoryId, ...productData } = updateProductDto;

    const product = await this.findOne(id);

    if (categoryId) product.category = { id: categoryId } as any;
    Object.assign(product, productData);

    if (translations) {
      product.translations = translations as any;
    }

    return this.productRepository.save(product);
  }

  async remove(id: string) {
    const product = await this.findOne(id);

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    await this.productRepository.remove(product);
    return { deleted: true, id };
  }

  // src/products/products.service.ts

  // async findAllPaginated(page: number = 1, limit: number = 10) {
  //   const skip = (page - 1) * limit; // Tính số bản ghi cần bỏ qua

  //   const [data, total] = await this.productRepository.findAndCount({
  //     take: limit, // Số bản ghi mỗi trang
  //     skip: skip, // Vị trí bắt đầu lấy
  //     order: { id: 'DESC' }, // Sắp xếp mới nhất lên đầu
  //     relations: ['category'], // Load kèm category nếu cần
  //   });

  //   const lastPage = Math.ceil(total / limit);

  //   return {
  //     data,
  //     meta: {
  //       total,
  //       page,
  //       lastPage,
  //       limit,
  //     },
  //   };
  // }

  async findAllPaginated(
    page: number = 1,
    limit: number = 10,
    lang: string = 'vi'
  ) {
    const skip = (page - 1) * limit;

    const [data, total] = await this.productRepository.findAndCount({
      take: limit,
      skip: skip,
      relations: ['category', 'translations', 'category.translations'], // Load kèm category và cả translations của category
      order: { createdAt: 'DESC' },
    });

    // Format lại dữ liệu để trả về tên theo đúng ngôn ngữ yêu cầu (lang)
    const formattedData = data.map(prod => ({
      ...prod,
      displayName:
        prod.translations.find(t => t.languageCode === lang)?.name || prod.id,
    }));

    return { data: formattedData, meta: { total, page, limit } };
  }

  async updateCategory(productIds: string[], categoryId: number) {
    // 1. Thực hiện update hàng loạt
    // SQL tương đương: UPDATE products SET category_id = :categoryId WHERE id IN (:...productIds)

    console.log(productIds, categoryId);
    const result = await this.productRepository.update(
      { id: In(productIds) }, // Điều kiện lọc: Những ID nằm trong mảng
      {
        category: { id: categoryId }, // Gán quan hệ mới (TypeORM sẽ tự hiểu là category_id)
      }
    );

    // 2. Kiểm tra xem có bản ghi nào được cập nhật không
    if (result.affected === 0) {
      throw new NotFoundException('Không tìm thấy sản phẩm nào để cập nhật');
    }

    return {
      message: `Đã cập nhật danh mục cho ${result.affected} sản phẩm thành công`,
      affected: result.affected,
    };
  }

  // async findAllWithSearch(search?: string, categoryId?: number) {
  //   const queryBuilder = this.productRepository
  //     .createQueryBuilder('product')
  //     .leftJoinAndSelect('product.category', 'category'); // Load kèm thông tin danh mục

  //   // Nếu có từ khóa tìm kiếm
  //   if (search) {
  //     queryBuilder.andWhere('product.name ILIKE :search', {
  //       search: `%${search}%`,
  //     });
  //     // ILIKE để tìm kiếm không phân biệt hoa thường (PostgreSQL)
  //   }

  //   // Nếu muốn lọc theo danh mục cụ thể
  //   if (categoryId) {
  //     queryBuilder.andWhere('category.id = :categoryId', { categoryId });
  //   }

  //   return await queryBuilder.orderBy('product.created_at', 'DESC').getMany();
  // }

  // products/products.service.ts

  // async findAllWithSearch(search?: string, lang: string = 'vi') {
  //   const queryBuilder = this.productRepository
  //     .createQueryBuilder('product')
  //     // 1. Join lấy Category
  //     .leftJoinAndSelect('product.category', 'category')

  //     // 2. QUAN TRỌNG: Join lấy translations của Category
  //     // Bạn phải join từ alias 'category' đã tạo ở bước 1
  //     .leftJoinAndSelect(
  //       'category.translations',
  //       'catTrans', // Đặt alias khác đi để tránh trùng với 'translation' của product
  //       'catTrans.languageCode = :lang',
  //       { lang }
  //     )

  //     // 3. Join lấy translations của Product
  //     .leftJoinAndSelect(
  //       'product.translations',
  //       'translation',
  //       'translation.languageCode = :lang',
  //       { lang }
  //     );

  //   if (search) {
  //     queryBuilder.andWhere('translation.name ILIKE :search', {
  //       search: `%${search}%`,
  //     });
  //   }

  //   // Nếu bạn đang dùng phân trang thủ công hoặc paginate helper,
  //   // hãy đảm bảo dùng getRawAndEntities hoặc lưu ý cách TypeORM map relation.
  //   return await queryBuilder.orderBy('product.createdAt', 'DESC').getMany();
  // }

  async findAllWithSearch(search?: string, lang: string = 'vi') {
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('category.translations', 'catTrans')
      .leftJoinAndSelect('product.translations', 'translation');

    if (search) {
      // Tìm những ID sản phẩm có tên khớp với từ khóa search ở ngôn ngữ hiện tại
      queryBuilder.andWhere(qb => {
        const subQuery = qb
          .subQuery()
          .select('pt.productId') // Thay productId bằng tên cột FK trong bảng translation của bạn
          .from('productTranslations', 'pt') // Thay bằng tên bảng translation trong DB
          .where('pt.name ILIKE :search')
          .andWhere('pt.languageCode = :lang')
          .getQuery();
        return 'product.id IN ' + subQuery;
      });

      queryBuilder.setParameters({ search: `%${search}%`, lang });
    }

    return await queryBuilder.orderBy('product.createdAt', 'DESC').getMany();
  }

  async findByIds(ids: string[]) {
    if (!ids || ids.length === 0) return [];

    const products = await this.productRepository.find({
      where: {
        id: In(ids),
      },
      relations: ['translations', 'category'],
    });

    // TypeORM đã tự lọc, nhưng return về để chắc chắn không có phần tử null/undefined
    return products.filter(product => !!product);
  }
}

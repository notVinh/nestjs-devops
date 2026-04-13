// products/products.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Category } from 'src/categories/entities/category.entity';
import { MisaInventoryBalance } from 'src/misa-token/entities/misa-inventory-balance.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(MisaInventoryBalance)
    private readonly inventoryBalanceRepository: Repository<MisaInventoryBalance>,
    private dataSource: DataSource
  ) {}

  // async create(createProductDto: CreateProductDto) {
  //   const product = this.productRepository.create(createProductDto);
  //   return await this.productRepository.save(product);
  // }

  // async create(createProductDto: CreateProductDto) {
  //   const { categoryId, translations, ...productData } = createProductDto;

  //   let nextOrder = 0;

  //   if (categoryId) {
  //     // Đếm số lượng sản phẩm hiện có trong category này
  //     // Bạn cũng có thể dùng .maximum('order', { category: { id: categoryId } })
  //     // nếu muốn lấy số lớn nhất + 1
  //     nextOrder = await this.productRepository.count({
  //       where: { category: { id: categoryId } },
  //     });
  //   }

  //   const product = this.productRepository.create({
  //     ...productData,
  //     order: nextOrder + 1, // Gán số thứ tự mới bằng tổng số lượng (ví dụ có 5 cái 0-4 thì cái mới là 5)
  //     // category: categoryId ? { id: categoryId } : null,
  //     category: categoryId ? ({ id: categoryId } as any) : null,
  //     translations: translations, // TypeORM tự động lưu vào bảng translation nhờ cascade: true
  //   });

  //   return await this.productRepository.save(product);
  // }

  async create(createProductDto: CreateProductDto) {
    const { categoryId, translations, ...productData } = createProductDto;

    let nextOrder = 1; // Mặc định nếu chưa có sản phẩm nào thì order là 1

    if (categoryId) {
      // 1. Tìm giá trị order lớn nhất hiện tại của sản phẩm trong danh mục này
      const result = await this.productRepository
        .createQueryBuilder('product')
        .select('MAX(product.order)', 'maxOrder')
        .where('product.categoryId = :categoryId', { categoryId })
        .getRawOne();

      // 2. Nếu đã có sản phẩm (maxOrder không null), lấy maxOrder + 1
      if (result && result.maxOrder !== null) {
        nextOrder = parseInt(result.maxOrder) + 1;
      }
    }

    // 3. Khởi tạo đối tượng product mới
    const product = this.productRepository.create({
      ...productData,
      order: nextOrder,
      category: categoryId ? ({ id: categoryId } as any) : null,
      // TypeORM sẽ tự động lưu vào bảng translation nhờ cascade: true trong Entity
      translations: translations,
    });

    // 4. Lưu vào database
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

  // async findOne(id: string) {
  //   const product = await this.productRepository.findOne({
  //     where: { id },
  //     relations: ['category', 'translations'],
  //   });
  //   if (!product) throw new NotFoundException(`Máy ${id} không tồn tại`);
  //   return product;
  // }

  async findOne(id: string) {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['category', 'translations'],
    });

    if (!product) throw new NotFoundException(`Máy ${id} không tồn tại`);

    const proxyBaseUrl = 'https://gtgsew.com/api/v1/files/proxy-image';

    // 1. Hàm Regex để quét và thay thế link ảnh trong nội dung HTML (Text Editor)
    const proxyifyHtml = (html: string) => {
      if (!html) return html;
      // Tìm các link Viettel IDC nằm trong thuộc tính src="..."
      const regex = /src="(https:\/\/s3-north1\.viettelidc\.com\.vn\/[^"]+)"/g;
      return html.replace(regex, (match, p1) => {
        return `src="${proxyBaseUrl}?url=${encodeURIComponent(p1)}"`;
      });
    };

    // 2. Xử lý mảng images (Ảnh slide sản phẩm)
    const mappedImages = (product.images || []).map((imgUrl: string) => {
      if (imgUrl && imgUrl.includes('viettelidc.com.vn')) {
        return `${proxyBaseUrl}?url=${encodeURIComponent(imgUrl)}`;
      }
      return imgUrl;
    });

    // 3. Xử lý nội dung mô tả trong mảng translations
    const mappedTranslations = (product.translations || []).map(trans => ({
      ...trans,
      description: proxyifyHtml(trans.description),
    }));

    // 4. Lấy tồn kho từ misaInventoryBalance (nếu sản phẩm có misaModel)
    let inventoryBalance: any[] = [];
    if (product.misaModel) {
      const invRows = await this.inventoryBalanceRepository
        .createQueryBuilder('inv')
        .select([
          'inv.stockId        AS "stockId"',
          'inv.stockCode      AS "stockCode"',
          'inv.stockName      AS "stockName"',
          'inv.inventoryItemCode AS "inventoryItemCode"',
          'inv.inventoryItemName AS "inventoryItemName"',
          'inv.unitName       AS "unitName"',
          'inv.closingQuantity  AS "closingQuantity"',
          'inv.openingQuantity  AS "openingQuantity"',
          'inv.totalInQuantity  AS "totalInQuantity"',
          'inv.totalOutQuantity AS "totalOutQuantity"',
          'inv.closingAmount    AS "closingAmount"',
          'inv.fromDate        AS "fromDate"',
          'inv.toDate          AS "toDate"',
          'inv.syncedAt        AS "syncedAt"',
        ])
        // .where(
        //   // Exact match HOẶC prefix match (misaModel = "MF" → lấy MF-370, MF-350...)
        //   `inv.inventoryItemCode = :exact OR inv.inventoryItemCode LIKE :prefix`,
        //   {
        //     exact: product.misaModel,
        //     prefix: `${product.misaModel}-%`,
        //   }
        // )
        .where(
          // Sử dụng LIKE với % ở cuối để lấy tất cả hậu tố
          `inv.inventoryItemCode LIKE :search`,
          {
            search: `${product.misaModel}%`, // Không thêm dấu "-" ở đây
          }
        )
        .orderBy('inv.stockCode', 'ASC')
        .getRawMany();

      inventoryBalance = invRows.map(r => ({
        stockId: r.stockId,
        stockCode: r.stockCode,
        stockName: r.stockName,
        inventoryItemCode: r.inventoryItemCode,
        inventoryItemName: r.inventoryItemName,
        unitName: r.unitName,
        closingQuantity:
          r.closingQuantity != null ? parseFloat(r.closingQuantity) : null,
        openingQuantity:
          r.openingQuantity != null ? parseFloat(r.openingQuantity) : null,
        totalInQuantity:
          r.totalInQuantity != null ? parseFloat(r.totalInQuantity) : null,
        totalOutQuantity:
          r.totalOutQuantity != null ? parseFloat(r.totalOutQuantity) : null,
        closingAmount:
          r.closingAmount != null ? parseFloat(r.closingAmount) : null,
        fromDate: r.fromDate,
        toDate: r.toDate,
        syncedAt: r.syncedAt,
      }));
    }

    const totalQuantity = inventoryBalance.reduce((sum, item) => sum + (item.closingQuantity || 0), 0);

    // 5. Trả về object product đã được "Proxy hóa" + kèm tồn kho
    return {
      ...product,
      images: mappedImages,
      translations: mappedTranslations,
      inventoryBalance, // [] nếu chưa set misaModel hoặc không tìm thấy trong MISA
      totalQuantity,
    };
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

  // async update(id: string, updateProductDto: UpdateProductDto) {
  //   // Với cấu trúc phức tạp, cách tốt nhất là xóa các bản dịch cũ và chèn lại
  //   // hoặc cập nhật từng bản dịch nếu dùng Transaction
  //   const { translations, categoryId, ...productData } = updateProductDto;

  //   const product = await this.findOne(id);

  //   if (categoryId) product.category = { id: categoryId } as any;
  //   Object.assign(product, productData);

  //   if (translations) {
  //     product.translations = translations as any;
  //   }

  //   return this.productRepository.save(product);
  // }

  // async update(id: string, updateProductDto: UpdateProductDto) {
  //   const { translations, categoryId, ...productData } = updateProductDto;

  //   // 1. Tìm sản phẩm hiện tại (bao gồm cả categoryId cũ để so sánh)
  //   const product = await this.productRepository.findOne({
  //     where: { id },
  //     relations: ['category'],
  //   });

  //   if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');

  //   // 2. Kiểm tra nếu có sự thay đổi về Danh mục (categoryId)
  //   if (
  //     categoryId &&
  //     (!product.category || product.category.id !== categoryId)
  //   ) {
  //     // Tìm MAX order của danh mục MỚI
  //     const queryBuilder = this.productRepository
  //       .createQueryBuilder('product')
  //       .select('MAX(product.order)', 'maxOrder')
  //       .where('product.categoryId = :categoryId', { categoryId });

  //     const result = await queryBuilder.getRawOne();
  //     const maxOrder = result.maxOrder ? parseInt(result.maxOrder) : 0;

  //     // Gán danh mục mới và order mới cho sản phẩm
  //     product.category = { id: categoryId } as any;
  //     product.order = maxOrder + 1;
  //   }

  //   // 3. Cập nhật các thông tin cơ bản khác
  //   Object.assign(product, productData);

  //   // 4. Xử lý Translations (Nếu có)
  //   if (translations) {
  //     product.translations = translations as any;
  //   }

  //   // 5. Lưu lại (TypeORM save sẽ tự động xử lý insert/update cho các quan hệ đã cascade)
  //   return this.productRepository.save(product);
  // }

  // async update(id: string, updateProductDto: UpdateProductDto) {
  //   const { translations, categoryId, ...productData } = updateProductDto;

  //   // 1. Tìm sản phẩm (Chỉ lấy các field cơ bản và relation cần thiết để update)
  //   const product = await this.productRepository.findOne({
  //     where: { id },
  //     relations: ['category', 'translations'], // Load translations để TypeORM biết cái nào cần update/delete
  //   });

  //   if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');

  //   // 2. Xử lý logic Order nếu đổi Category
  //   if (
  //     categoryId &&
  //     (!product.category || product.category.id !== categoryId)
  //   ) {
  //     const result = await this.productRepository
  //       .createQueryBuilder('product')
  //       .select('MAX(product.order)', 'maxOrder')
  //       .where('product.categoryId = :categoryId', { categoryId })
  //       .getRawOne();

  //     const maxOrder = result.maxOrder ? parseInt(result.maxOrder) : 0;
  //     product.category = { id: categoryId } as any;
  //     product.order = maxOrder + 1;
  //   }

  //   // 3. Cập nhật các thông tin cơ bản (bao gồm cả misaModel)
  //   Object.assign(product, productData);

  //   // 4. Xử lý Translations
  //   // Lưu ý: Đảm bảo Entity Product có { cascade: true } ở translations
  //   if (translations) {
  //     product.translations = translations as any;
  //   }

  //   try {
  //     // 5. Lưu lại
  //     return await this.productRepository.save(product);
  //   } catch (error) {
  //     // Log lỗi chi tiết để debug
  //     console.error('Update Product Error:', error);
  //     // throw new Error(`Cập nhật thất bại: ${error.message}`);
  //   }
  // }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const { translations, categoryId, ...productData } = updateProductDto;

    // 1. Tìm sản phẩm (Chỉ lấy các field cơ bản và relation cần thiết để update)
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['category', 'translations'], // Load translations để TypeORM biết cái nào cần update/delete
    });

    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');

    // 2. Xử lý logic Order nếu đổi Category
    if (
      categoryId &&
      (!product.category || product.category.id !== categoryId)
    ) {
      const result = await this.productRepository
        .createQueryBuilder('product')
        .select('MAX(product.order)', 'maxOrder')
        .where('product.categoryId = :categoryId', { categoryId })
        .getRawOne();

      const maxOrder = result.maxOrder ? parseInt(result.maxOrder) : 0;
      product.category = { id: categoryId } as any;
      product.order = maxOrder + 1;
    }

    // 3. Cập nhật các thông tin cơ bản (bao gồm cả misaModel)
    Object.assign(product, productData);

    // 4. Xử lý Translations
    // Lưu ý: Đảm bảo Entity Product có { cascade: true } ở translations
    if (translations) {
      product.translations = translations as any;
    }

    try {
      // 5. Lưu lại
      return await this.productRepository.save(product);
    } catch (error) {
      // Log lỗi chi tiết để debug
      console.error('Update Product Error:', error);
    }
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

  // async findAllPaginated(
  //   page: number = 1,
  //   limit: number = 10,
  //   lang: string = 'vi'
  // ) {
  //   const skip = (page - 1) * limit;

  //   const [data, total] = await this.productRepository.findAndCount({
  //     take: limit,
  //     skip: skip,
  //     relations: ['category', 'translations', 'category.translations'], // Load kèm category và cả translations của category
  //     order: { createdAt: 'DESC' },
  //   });

  //   // Format lại dữ liệu để trả về tên theo đúng ngôn ngữ yêu cầu (lang)
  //   const formattedData = data.map(prod => ({
  //     ...prod,
  //     displayName:
  //       prod.translations.find(t => t.languageCode === lang)?.name || prod.id,
  //   }));

  //   return { data: formattedData, meta: { total, page, limit } };
  // }

  async findAllPaginated(
    page: number = 1,
    limit: number = 10,
    lang: string = 'vi'
  ) {
    const skip = (page - 1) * limit;

    // 1. Lấy dữ liệu từ Database
    const [data, total] = await this.productRepository.findAndCount({
      take: limit,
      skip: skip,
      relations: ['category', 'translations', 'category.translations'],
      order: { createdAt: 'DESC' },
    });

    // 2. Cấu hình Domain Proxy (Nên lấy từ ConfigService hoặc .env)
    const proxyBaseUrl = 'https://gtgsew.com/api/v1/files/proxy-image';

    // 3. Format lại dữ liệu trả về
    const formattedData = await Promise.all(
      data.map(async prod => {
        // Xử lý mảng ảnh (Nếu prod.images là mảng các string URL)
        const mappedImages = (prod.images || []).map((imgUrl: string) => {
          if (imgUrl && imgUrl.includes('viettelidc.com.vn')) {
            return `${proxyBaseUrl}?url=${encodeURIComponent(imgUrl)}`;
          }
          return imgUrl;
        });

        // Xử lý ảnh đại diện đơn lẻ (nếu có field thumbnail hoặc image riêng)
        // let finalThumbnail = prod.image;
        // if (prod.image && prod.image.includes('viettelidc.com.vn')) {
        //   finalThumbnail = `${proxyBaseUrl}?url=${encodeURIComponent(prod.image)}`;
        // }

        // Lấy tồn kho từ misaInventoryBalance (nếu sản phẩm có misaModel)
        let inventoryBalance: any[] = [];
        if (prod.misaModel) {
          const invRows = await this.inventoryBalanceRepository
            .createQueryBuilder('inv')
            .select([
              'inv.stockId        AS "stockId"',
              'inv.stockCode      AS "stockCode"',
              'inv.stockName      AS "stockName"',
              'inv.inventoryItemCode AS "inventoryItemCode"',
              'inv.inventoryItemName AS "inventoryItemName"',
              'inv.unitName       AS "unitName"',
              'inv.closingQuantity  AS "closingQuantity"',
              'inv.openingQuantity  AS "openingQuantity"',
              'inv.totalInQuantity  AS "totalInQuantity"',
              'inv.totalOutQuantity AS "totalOutQuantity"',
              'inv.closingAmount    AS "closingAmount"',
              'inv.fromDate        AS "fromDate"',
              'inv.toDate          AS "toDate"',
              'inv.syncedAt        AS "syncedAt"',
            ])
            .where(`inv.inventoryItemCode LIKE :search`, {
              search: `${prod.misaModel}%`,
            })
            .orderBy('inv.stockCode', 'ASC')
            .getRawMany();

          inventoryBalance = invRows.map(r => ({
            stockId: r.stockId,
            stockCode: r.stockCode,
            stockName: r.stockName,
            inventoryItemCode: r.inventoryItemCode,
            inventoryItemName: r.inventoryItemName,
            unitName: r.unitName,
            closingQuantity: r.closingQuantity != null ? parseFloat(r.closingQuantity) : null,
            openingQuantity: r.openingQuantity != null ? parseFloat(r.openingQuantity) : null,
            totalInQuantity: r.totalInQuantity != null ? parseFloat(r.totalInQuantity) : null,
            totalOutQuantity: r.totalOutQuantity != null ? parseFloat(r.totalOutQuantity) : null,
            closingAmount: r.closingAmount != null ? parseFloat(r.closingAmount) : null,
            fromDate: r.fromDate,
            toDate: r.toDate,
            syncedAt: r.syncedAt,
          }));
        }

        const totalQuantity = inventoryBalance.reduce((sum, item) => sum + (item.closingQuantity || 0), 0);

        return {
          ...prod,
          // image: finalThumbnail,   // Ảnh chính đã qua proxy
          images: mappedImages, // Mảng ảnh đã qua proxy
          displayName:
            prod.translations.find(t => t.languageCode === lang)?.name || prod.id,
          inventoryBalance,
          totalQuantity,
        };
      })
    );

    return {
      data: formattedData,
      meta: { total, page, limit },
    };
  }

  // async updateCategory(productIds: string[], categoryId: number) {
  //   // 1. Thực hiện update hàng loạt
  //   // SQL tương đương: UPDATE products SET category_id = :categoryId WHERE id IN (:...productIds)

  //   console.log(productIds, categoryId);
  //   const result = await this.productRepository.update(
  //     { id: In(productIds) }, // Điều kiện lọc: Những ID nằm trong mảng
  //     {
  //       category: { id: categoryId }, // Gán quan hệ mới (TypeORM sẽ tự hiểu là category_id)
  //     }
  //   );

  //   // 2. Kiểm tra xem có bản ghi nào được cập nhật không
  //   if (result.affected === 0) {
  //     throw new NotFoundException('Không tìm thấy sản phẩm nào để cập nhật');
  //   }

  //   return {
  //     message: `Đã cập nhật danh mục cho ${result.affected} sản phẩm thành công`,
  //     affected: result.affected,
  //   };
  // }

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

  async updateCategory(productIds: string[], categoryId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Kiểm tra danh mục đích có tồn tại không
      const category = await queryRunner.manager.findOneBy(Category, {
        id: categoryId,
      });
      if (!category) throw new NotFoundException('Danh mục không tồn tại');

      // 2. Lấy MAX order hiện tại của các sản phẩm TRONG danh mục này
      const result = await queryRunner.manager
        .createQueryBuilder(Product, 'product')
        .select('MAX(product.order)', 'maxOrder')
        .where('product.categoryId = :categoryId', { categoryId })
        .getRawOne();

      let currentMaxOrder = result.maxOrder ? parseInt(result.maxOrder) : 0;

      // 3. Cập nhật từng sản phẩm với order tăng dần từ Max
      const updatePromises = productIds.map(id => {
        currentMaxOrder++; // Mỗi sản phẩm mới sẽ có order cao hơn sản phẩm trước đó 1 đơn vị
        return queryRunner.manager.update(
          Product,
          { id },
          {
            category: { id: categoryId },
            order: currentMaxOrder,
          }
        );
      });

      const updateResults = await Promise.all(updatePromises);
      const totalAffected = updateResults.reduce(
        (sum, res) => sum + (res.affected || 0),
        0
      );

      if (totalAffected === 0) {
        throw new NotFoundException('Không tìm thấy sản phẩm nào để cập nhật');
      }

      await queryRunner.commitTransaction();
      return {
        message: `Đã chuyển ${totalAffected} sản phẩm vào danh mục mới với thứ tự tiếp nối`,
        affected: totalAffected,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // async findAllWithSearch(search?: string, lang: string = 'vi') {
  //   const queryBuilder = this.productRepository
  //     .createQueryBuilder('product')
  //     .leftJoinAndSelect('product.category', 'category')
  //     .leftJoinAndSelect('category.translations', 'catTrans')
  //     .leftJoinAndSelect('product.translations', 'translation');

  //   if (search) {
  //     // Tìm những ID sản phẩm có tên khớp với từ khóa search ở ngôn ngữ hiện tại
  //     queryBuilder.andWhere(qb => {
  //       const subQuery = qb
  //         .subQuery()
  //         .select('pt.productId') // Thay productId bằng tên cột FK trong bảng translation của bạn
  //         .from('productTranslations', 'pt') // Thay bằng tên bảng translation trong DB
  //         .where('pt.name ILIKE :search')
  //         .andWhere('pt.languageCode = :lang')
  //         .getQuery();
  //       return 'product.id IN ' + subQuery;
  //     });

  //     queryBuilder.setParameters({ search: `%${search}%`, lang });
  //   }

  //   return await queryBuilder.orderBy('product.createdAt', 'DESC').getMany();
  // }

  // async findByIds(ids: string[]) {
  //   if (!ids || ids.length === 0) return [];

  //   const products = await this.productRepository.find({
  //     where: {
  //       id: In(ids),
  //     },
  //     relations: ['translations', 'category'],
  //   });

  //   // TypeORM đã tự lọc, nhưng return về để chắc chắn không có phần tử null/undefined
  //   return products.filter(product => !!product);
  // }

  async findAllWithSearch(search?: string, lang: string = 'vi') {
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('category.translations', 'catTrans')
      .leftJoinAndSelect('product.translations', 'translation');

    if (search) {
      queryBuilder.andWhere(qb => {
        const subQuery = qb
          .subQuery()
          .select('pt.productId')
          .from('productTranslations', 'pt') // Lưu ý: Check lại tên bảng trong DB của bạn (thường là snake_case)
          .where('pt.name ILIKE :search')
          .andWhere('pt.languageCode = :lang')
          .getQuery();
        return 'product.id IN ' + subQuery;
      });

      queryBuilder.setParameters({ search: `%${search}%`, lang });
    }

    // 1. Lấy dữ liệu thô từ Database
    const products = await queryBuilder
      .orderBy('product.createdAt', 'DESC')
      .getMany();

    // 2. Cấu hình Proxy
    const proxyBaseUrl = 'https://gtgsew.com/api/v1/files/proxy-image';

    // Helper xử lý ảnh trong nội dung Text Editor
    const proxyifyHtml = (html: string) => {
      if (!html) return html;
      const regex = /src="(https:\/\/s3-north1\.viettelidc\.com\.vn\/[^"]+)"/g;
      return html.replace(regex, (match, p1) => {
        return `src="${proxyBaseUrl}?url=${encodeURIComponent(p1)}"`;
      });
    };

    // 3. Map lại toàn bộ kết quả để bọc Proxy
    return await Promise.all(
      products.map(async prod => {
        // Xử lý mảng images sản phẩm
        const mappedImages = (prod.images || []).map((imgUrl: string) => {
          if (imgUrl && imgUrl.includes('viettelidc.com.vn')) {
            return `${proxyBaseUrl}?url=${encodeURIComponent(imgUrl)}`;
          }
          return imgUrl;
        });

        // Xử lý ảnh đại diện đơn lẻ (nếu có)
        // let finalThumbnail = prod.image;
        // if (prod.image && prod.image.includes('viettelidc.com.vn')) {
        //   finalThumbnail = `${proxyBaseUrl}?url=${encodeURIComponent(
        //     prod.image
        //   )}`;
        // }

        // Xử lý ảnh trong category đi kèm (nếu có)
        if (prod.category) {
          if (
            prod.category.image &&
            prod.category.image.includes('viettelidc.com.vn')
          ) {
            prod.category.image = `${proxyBaseUrl}?url=${encodeURIComponent(
              prod.category.image
            )}`;
          }
        }

        // Xử lý ảnh trong Description của translations
        const mappedTranslations = (prod.translations || []).map(trans => ({
          ...trans,
          description: proxyifyHtml(trans.description),
        }));

        // Lấy tồn kho từ misaInventoryBalance (nếu sản phẩm có misaModel)
        let inventoryBalance: any[] = [];
        if (prod.misaModel) {
          const invRows = await this.inventoryBalanceRepository
            .createQueryBuilder('inv')
            .select([
              'inv.stockId        AS "stockId"',
              'inv.stockCode      AS "stockCode"',
              'inv.stockName      AS "stockName"',
              'inv.inventoryItemCode AS "inventoryItemCode"',
              'inv.inventoryItemName AS "inventoryItemName"',
              'inv.unitName       AS "unitName"',
              'inv.closingQuantity  AS "closingQuantity"',
              'inv.openingQuantity  AS "openingQuantity"',
              'inv.totalInQuantity  AS "totalInQuantity"',
              'inv.totalOutQuantity AS "totalOutQuantity"',
              'inv.closingAmount    AS "closingAmount"',
              'inv.fromDate        AS "fromDate"',
              'inv.toDate          AS "toDate"',
              'inv.syncedAt        AS "syncedAt"',
            ])
            .where(`inv.inventoryItemCode LIKE :search`, {
              search: `${prod.misaModel}%`,
            })
            .orderBy('inv.stockCode', 'ASC')
            .getRawMany();

          inventoryBalance = invRows.map(r => ({
            stockId: r.stockId,
            stockCode: r.stockCode,
            stockName: r.stockName,
            inventoryItemCode: r.inventoryItemCode,
            inventoryItemName: r.inventoryItemName,
            unitName: r.unitName,
            closingQuantity: r.closingQuantity != null ? parseFloat(r.closingQuantity) : null,
            openingQuantity: r.openingQuantity != null ? parseFloat(r.openingQuantity) : null,
            totalInQuantity: r.totalInQuantity != null ? parseFloat(r.totalInQuantity) : null,
            totalOutQuantity: r.totalOutQuantity != null ? parseFloat(r.totalOutQuantity) : null,
            closingAmount: r.closingAmount != null ? parseFloat(r.closingAmount) : null,
            fromDate: r.fromDate,
            toDate: r.toDate,
            syncedAt: r.syncedAt,
          }));
        }

        const totalQuantity = inventoryBalance.reduce((sum, item) => sum + (item.closingQuantity || 0), 0);

        return {
          ...prod,
          // image: finalThumbnail,
          images: mappedImages,
          translations: mappedTranslations,
          inventoryBalance,
          totalQuantity,
        };
      })
    );
  }

  async findByIds(ids: string[]) {
    if (!ids || ids.length === 0) return [];

    const products = await this.productRepository.find({
      where: {
        id: In(ids),
      },
      relations: ['translations', 'category'],
    });

    const proxyBaseUrl = 'https://gtgsew.com/api/v1/files/proxy-image';

    // Hàm helper để xử lý Regex cho Description
    const proxyifyHtml = (html: string) => {
      if (!html) return html;
      // Regex tìm các link Viettel IDC nằm trong thuộc tính src="..."
      const regex = /src="(https:\/\/s3-north1\.viettelidc\.com\.vn\/[^"]+)"/g;
      return html.replace(regex, (match, p1) => {
        return `src="${proxyBaseUrl}?url=${encodeURIComponent(p1)}"`;
      });
    };

    const formattedProducts = await Promise.all(
      products
        .filter(product => !!product)
        .map(async prod => {
          // 1. Xử lý mảng images
          const mappedImages = (prod.images || []).map((imgUrl: string) => {
            if (imgUrl && imgUrl.includes('viettelidc.com.vn')) {
              return `${proxyBaseUrl}?url=${encodeURIComponent(imgUrl)}`;
            }
            return imgUrl;
          });

          // 2. Xử lý Descriptions trong mảng translations (Text Editor)
          const mappedTranslations = (prod.translations || []).map(trans => ({
            ...trans,
            description: proxyifyHtml(trans.description),
          }));

          // Lấy tồn kho từ misaInventoryBalance (nếu sản phẩm có misaModel)
          let inventoryBalance: any[] = [];
          if (prod.misaModel) {
            const invRows = await this.inventoryBalanceRepository
              .createQueryBuilder('inv')
              .select([
                'inv.stockId        AS "stockId"',
                'inv.stockCode      AS "stockCode"',
                'inv.stockName      AS "stockName"',
                'inv.inventoryItemCode AS "inventoryItemCode"',
                'inv.inventoryItemName AS "inventoryItemName"',
                'inv.unitName       AS "unitName"',
                'inv.closingQuantity  AS "closingQuantity"',
                'inv.openingQuantity  AS "openingQuantity"',
                'inv.totalInQuantity  AS "totalInQuantity"',
                'inv.totalOutQuantity AS "totalOutQuantity"',
                'inv.closingAmount    AS "closingAmount"',
                'inv.fromDate        AS "fromDate"',
                'inv.toDate          AS "toDate"',
                'inv.syncedAt        AS "syncedAt"',
              ])
              .where(`inv.inventoryItemCode LIKE :search`, {
                search: `${prod.misaModel}%`,
              })
              .orderBy('inv.stockCode', 'ASC')
              .getRawMany();

            inventoryBalance = invRows.map(r => ({
              stockId: r.stockId,
              stockCode: r.stockCode,
              stockName: r.stockName,
              inventoryItemCode: r.inventoryItemCode,
              inventoryItemName: r.inventoryItemName,
              unitName: r.unitName,
              closingQuantity: r.closingQuantity != null ? parseFloat(r.closingQuantity) : null,
              openingQuantity: r.openingQuantity != null ? parseFloat(r.openingQuantity) : null,
              totalInQuantity: r.totalInQuantity != null ? parseFloat(r.totalInQuantity) : null,
              totalOutQuantity: r.totalOutQuantity != null ? parseFloat(r.totalOutQuantity) : null,
              closingAmount: r.closingAmount != null ? parseFloat(r.closingAmount) : null,
              fromDate: r.fromDate,
              toDate: r.toDate,
              syncedAt: r.syncedAt,
            }));
          }

          const totalQuantity = inventoryBalance.reduce((sum, item) => sum + (item.closingQuantity || 0), 0);

          return {
            ...prod,
            images: mappedImages,
            translations: mappedTranslations,
            inventoryBalance,
            totalQuantity,
          };
        })
    );

    return formattedProducts;
  }

  /**
   * Đối chiếu tồn kho: Lấy danh sách sản phẩm kèm số lượng tồn từ misaInventoryBalance.
   *
   * Logic matching:
   * - products.misaModel = "MF"    → khớp với tất cả inventoryItemCode bắt đầu bằng "MF-"
   *   VD: "MF-370", "MF-350", "MF-400", ...
   * - products.misaModel = "MF-370" → chỉ khớp chính xác với inventoryItemCode = "MF-370"
   *
   * @param stockId  UUID của kho cụ thể (nếu undefined → lấy tất cả kho)
   * @param page     Trang hiện tại
   * @param limit    Số bản ghi mỗi trang
   */
  async getInventoryBalance(
    stockId?: string,
    misaModelFilter?: string, // VD: "MF", "GT" → lọc sản phẩm có misaModel khớp prefix đó
    page: number = 1,
    limit: number = 50
  ) {
    const skip = (page - 1) * limit;

    // ----------------------------------------------------------------
    // JOIN condition:
    //   1. Exact:  inventoryItemCode = misaModel
    //   2. Prefix: inventoryItemCode LIKE misaModel || '-%'
    //      → misaModel = "MF" sẽ match "MF-370", "MF-350", v.v.
    // ----------------------------------------------------------------
    const qb = this.productRepository
      .createQueryBuilder('p')
      .select([
        'p.id               AS "productId"',
        'p.misaModel        AS "misaModel"',
        'p.brand            AS "brand"',
        'p.model            AS "model"',
        // Tồn kho: SUM theo từng kho nếu không lọc stockId
        'inv."stockId"      AS "stockId"',
        'inv."stockCode"    AS "stockCode"',
        'inv."stockName"    AS "stockName"',
        'inv."inventoryItemCode" AS "inventoryItemCode"',
        'inv."inventoryItemName" AS "inventoryItemName"',
        'inv."unitName"    AS "unitName"',
        'inv."closingQuantity"  AS "closingQuantity"',
        'inv."openingQuantity" AS "openingQuantity"',
        'inv."totalInQuantity" AS "totalInQuantity"',
        'inv."totalOutQuantity" AS "totalOutQuantity"',
        'inv."closingAmount"   AS "closingAmount"',
        'inv."fromDate"    AS "fromDate"',
        'inv."toDate"      AS "toDate"',
        'inv."syncedAt"    AS "syncedAt"',
      ])
      // JOIN theo logic:
      // 1. Exact match: inventoryItemCode = misaModel
      //    VD: misaModel = "MF-370" khớp với inventoryItemCode = "MF-370"
      // 2. Prefix match: inventoryItemCode LIKE misaModel || '-%'
      //    VD: misaModel = "MF" khớp với inventoryItemCode = "MF-370", "MF-350", ...
      .leftJoin(
        MisaInventoryBalance,
        'inv',
        `p."misaModel" IS NOT NULL
         AND (
           inv."inventoryItemCode" = p."misaModel"
           OR inv."inventoryItemCode" LIKE p."misaModel" || '-%'
         )`
      )
      .where('p."misaModel" IS NOT NULL');

    // Lọc theo misaModel prefix (nếu có)
    // VD: misaModelFilter = "MF" → chỉ lấy products có misaModel = "MF" hoặc bắt đầu bằng "MF-"
    if (misaModelFilter) {
      qb.andWhere(`(p."misaModel" = :mf OR p."misaModel" LIKE :mfPrefix)`, {
        mf: misaModelFilter,
        mfPrefix: `${misaModelFilter}-%`,
      });
    }

    // Lọc theo kho cụ thể (nếu có)
    if (stockId) {
      qb.andWhere('(inv."stockId" = :stockId OR inv."stockId" IS NULL)', {
        stockId,
      });
    }

    // Query count (để phân trang)
    const totalQb = this.productRepository
      .createQueryBuilder('p')
      .where('p."misaModel" IS NOT NULL');
    if (misaModelFilter) {
      totalQb.andWhere(
        `(p."misaModel" = :mf OR p."misaModel" LIKE :mfPrefix)`,
        { mf: misaModelFilter, mfPrefix: `${misaModelFilter}-%` }
      );
    }
    const total = await totalQb.getCount();

    // Query data
    const rows = await qb
      .orderBy('p.id', 'ASC')
      .addOrderBy('inv."stockCode"', 'ASC', 'NULLS LAST')
      .offset(skip)
      .limit(limit)
      .getRawMany();

    // Gắn thông tin tên sản phẩm từ translations (vi)
    const productIds = [...new Set(rows.map(r => r.productId))];
    const productsWithNames = await this.productRepository.find({
      where: { id: In(productIds) },
      relations: ['translations'],
      select: ['id'],
    });

    const nameMap = new Map(
      productsWithNames.map(p2 => [
        p2.id,
        p2.translations?.find(t => t.languageCode === 'vi')?.name ||
          p2.translations?.[0]?.name ||
          p2.id,
      ])
    );

    const data = rows.map(r => ({
      productId: r.productId,
      productName: nameMap.get(r.productId) ?? r.productId,
      misaModel: r.misaModel,
      brand: r.brand,
      model: r.model,
      // Tồn kho
      hasInventory: r.inventoryItemCode != null,
      stockId: r.stockId,
      stockCode: r.stockCode,
      stockName: r.stockName,
      inventoryItemCode: r.inventoryItemCode,
      inventoryItemName: r.inventoryItemName,
      unitName: r.unitName,
      closingQuantity:
        r.closingQuantity != null ? parseFloat(r.closingQuantity) : null,
      openingQuantity:
        r.openingQuantity != null ? parseFloat(r.openingQuantity) : null,
      totalInQuantity:
        r.totalInQuantity != null ? parseFloat(r.totalInQuantity) : null,
      totalOutQuantity:
        r.totalOutQuantity != null ? parseFloat(r.totalOutQuantity) : null,
      closingAmount:
        r.closingAmount != null ? parseFloat(r.closingAmount) : null,
      fromDate: r.fromDate,
      toDate: r.toDate,
      syncedAt: r.syncedAt,
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
        stockId: stockId ?? null,
        misaModel: misaModelFilter ?? null,
      },
    };
  }
}

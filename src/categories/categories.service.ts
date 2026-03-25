import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { Category } from './entities/category.entity';
import { CategoryTranslation } from './entities/category-translation.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,

    @InjectRepository(CategoryTranslation)
    private translationRepository: Repository<CategoryTranslation>,

    private dataSource: DataSource
  ) {}

  /**
   * CREATE: Giữ nguyên logic tính level + xử lý parentId
   */
  // async create(createCategoryDto: CreateCategoryDto) {
  //   const { parentId, translations, image } = createCategoryDto;

  //   const queryRunner = this.dataSource.createQueryRunner();
  //   await queryRunner.connect();
  //   await queryRunner.startTransaction();

  //   try {
  //     const newCategory = this.categoryRepository.create({ image });

  //     const currentCount = await queryRunner.manager.count('categories', {
  //       where: { parentId: parentId ? parentId : IsNull() },
  //     });
  //     newCategory.order = currentCount + 1;

  //     // Logic cũ: Tính level dựa trên cha
  //     if (parentId) {
  //       const parent = await this.categoryRepository.findOneBy({
  //         id: parentId,
  //       });
  //       if (!parent) throw new NotFoundException('Danh mục cha không tồn tại');
  //       newCategory.parentId = parentId;
  //       newCategory.level = parent.level + 1;
  //     } else {
  //       newCategory.level = 1;
  //     }

  //     const savedCategory = await queryRunner.manager.save(newCategory);

  //     // Lưu mảng translations đa ngôn ngữ
  //     const translationEntities = translations.map(t =>
  //       this.translationRepository.create({
  //         ...t,
  //         categoryId: savedCategory.id,
  //       })
  //     );
  //     await queryRunner.manager.save(translationEntities);

  //     await queryRunner.commitTransaction();
  //     return savedCategory;
  //   } catch (err) {
  //     await queryRunner.rollbackTransaction();
  //     throw err;
  //   } finally {
  //     await queryRunner.release();
  //   }
  // }

  async create(createCategoryDto: CreateCategoryDto) {
    const { parentId, translations, image } = createCategoryDto;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const newCategory = this.categoryRepository.create({ image });

      // 1. Tìm giá trị order lớn nhất hiện tại của các danh mục cùng cấp
      const queryBuilder = queryRunner.manager
        .createQueryBuilder(Category, 'category')
        .select('MAX(category.order)', 'maxOrder')
        .where('category.parentId = :parentId', {
          parentId: parentId ? parentId : null,
        });

      if (!parentId) {
        queryBuilder.where('category.parentId IS NULL');
      }

      const result = await queryBuilder.getRawOne();
      const maxOrder = result.maxOrder ? parseInt(result.maxOrder) : 0;

      // Gán order mới = Max hiện tại + 1
      newCategory.order = maxOrder + 1;

      // 2. Logic tính Level
      if (parentId) {
        const parent = await this.categoryRepository.findOneBy({
          id: parentId,
        });
        if (!parent) throw new NotFoundException('Danh mục cha không tồn tại');
        newCategory.parentId = parentId;
        newCategory.level = parent.level + 1;
      } else {
        newCategory.level = 1;
      }

      const savedCategory = await queryRunner.manager.save(newCategory);

      // 3. Lưu translations
      const translationEntities = translations.map(t =>
        this.translationRepository.create({
          ...t,
          categoryId: savedCategory.id,
        })
      );
      await queryRunner.manager.save(translationEntities);

      await queryRunner.commitTransaction();
      return savedCategory;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * FIND ALL: Giữ nguyên logic loadRelationCountAndMap và orderBy level
   */
  // async findAll(lang: string = 'vi') {
  //   return await this.categoryRepository
  //     .createQueryBuilder('category')
  //     // Join với bảng dịch để lấy tên/mô tả theo ngôn ngữ yêu cầu
  //     .leftJoinAndSelect(
  //       'category.translations',
  //       'translation',
  //       'translation.languageCode = :lang',
  //       { lang }
  //     )
  //     // Logic cũ: Đếm số lượng sản phẩm trong mỗi danh mục
  //     .loadRelationCountAndMap('category.productCount', 'category.products')
  //     .orderBy('category.level', 'ASC')
  //     .getMany();
  // }
  // async findAll(page: number = 1, limit: number = 10) {
  //   const skip = (page - 1) * limit;

  //   const [data, total] = await this.categoryRepository.findAndCount({
  //     relations: ['translations', 'products'], // Lấy toàn bộ mảng ngôn ngữ
  //     order: { id: 'DESC' }, // Sắp xếp mới nhất lên đầu
  //     take: limit,
  //     skip: skip,
  //   });

  //   return {
  //     data,
  //     meta: {
  //       total,
  //       page,
  //       lastPage: Math.ceil(total / limit),
  //     },
  //   };
  // }

  // async findAll() {
  //   const [data, total] = await this.categoryRepository.findAndCount({
  //     relations: ['translations', 'products'], // Lấy toàn bộ mảng ngôn ngữ
  //     order: {
  //       order: 'ASC', // Sắp xếp theo thứ tự Vinh đã sắp xếp (0, 1, 2...)
  //       id: 'DESC', // Nếu order bằng nhau, cái nào tạo sau (ID lớn) vẫn hiện lên trước
  //     }, // Sắp xếp mới nhất lên đầu
  //   });

  //   return {
  //     data,
  //     meta: {
  //       total,
  //     },
  //   };
  // }

  async findAll() {
    const [data, total] = await this.categoryRepository.findAndCount({
      relations: ['translations', 'products', 'products.translations'], // Thêm cả translations của product nếu cần
      order: {
        order: 'ASC',
        id: 'DESC',
      },
    });

    const proxyBaseUrl = 'https://gtgsew.com/api/v1/files/proxy-image';

    const formattedData = data.map(category => {
      // 1. Xử lý ảnh đại diện của Category (như trong hình image_6cc429.png)
      let categoryImage = category.image;
      if (categoryImage && categoryImage.includes('viettelidc.com.vn')) {
        categoryImage = `${proxyBaseUrl}?url=${encodeURIComponent(
          categoryImage
        )}`;
      }

      // 2. Xử lý danh sách sản phẩm bên trong
      const mappedProducts = (category.products || []).map((prod: any) => {
        // Xử lý mảng images của từng sản phẩm
        const mappedProductImages = (prod.images || []).map(
          (imgUrl: string) => {
            if (imgUrl && imgUrl.includes('viettelidc.com.vn')) {
              return `${proxyBaseUrl}?url=${encodeURIComponent(imgUrl)}`;
            }
            return imgUrl;
          }
        );

        // Nếu sản phẩm cũng có field 'image' đơn lẻ thì xử lý luôn
        let productThumbnail = prod.image;
        if (
          productThumbnail &&
          productThumbnail.includes('viettelidc.com.vn')
        ) {
          productThumbnail = `${proxyBaseUrl}?url=${encodeURIComponent(
            productThumbnail
          )}`;
        }

        return {
          ...prod,
          image: productThumbnail,
          images: mappedProductImages,
        };
      });

      return {
        ...category,
        image: categoryImage,
        products: mappedProducts, // Giờ nó đã là mảng Object có kiểu rõ ràng
      };
    });

    return {
      data: formattedData,
      meta: {
        total,
      },
    };
  }

  /**
   * FIND ONE: Giữ nguyên relations 'children'
   */
  async findOne(id: number, lang: string = 'vi') {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['translations', 'children', 'children.translations'],
    });

    if (!category) throw new NotFoundException('Không tìm thấy danh mục');

    // Lọc lại để children cũng chỉ hiện đúng ngôn ngữ yêu cầu (nếu cần)
    if (category.children) {
      category.children.forEach(child => {
        child.translations = child.translations?.filter(
          t => t.languageCode === lang
        );
      });
    }

    return category;
  }

  /**
   * UPDATE: Giữ nguyên logic đổi parentId, đổi level và Object.assign
   */
  // async update(id: number, updateCategoryDto: UpdateCategoryDto) {
  //   const { parentId, translations, image, order } = updateCategoryDto;

  //   const category = await this.categoryRepository.findOne({
  //     where: { id },
  //     relations: ['translations'],
  //   });
  //   if (!category) throw new NotFoundException('Danh mục không tồn tại');

  //   const queryRunner = this.dataSource.createQueryRunner();
  //   await queryRunner.connect();
  //   await queryRunner.startTransaction();

  //   try {
  //     // Logic cũ: Xử lý thay đổi cấp độ khi đổi cha
  //     if (parentId !== undefined) {
  //       if (parentId === null) {
  //         category.parentId = null;
  //         category.level = 1;
  //       } else {
  //         const parent = await this.categoryRepository.findOneBy({
  //           id: parentId,
  //         });
  //         if (!parent)
  //           throw new NotFoundException('Danh mục cha không tồn tại');
  //         category.parentId = parentId;
  //         category.level = parent.level + 1;
  //       }
  //     }

  //     if (image !== undefined) {
  //       category.image = image;
  //     }

  //     if (order !== undefined) {
  //       category.order = order;
  //     }
  //     await queryRunner.manager.save(category);

  //     // Cập nhật đa ngôn ngữ: Nếu có ngôn ngữ mới thì tạo, có rồi thì update
  //     if (translations) {
  //       for (const t of translations) {
  //         let translation = await this.translationRepository.findOne({
  //           where: { categoryId: id, languageCode: t.languageCode },
  //         });

  //         if (translation) {
  //           Object.assign(translation, t);
  //           await queryRunner.manager.save(translation);
  //         } else {
  //           const newTrans = this.translationRepository.create({
  //             ...t,
  //             categoryId: id,
  //           });
  //           await queryRunner.manager.save(newTrans);
  //         }
  //       }
  //     }

  //     await queryRunner.commitTransaction();
  //     return this.findOne(id);
  //   } catch (err) {
  //     await queryRunner.rollbackTransaction();
  //     throw err;
  //   } finally {
  //     await queryRunner.release();
  //   }
  // }

  async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    const { parentId, translations, image, order } = updateCategoryDto;

    // 1. Lấy dữ liệu cũ để so sánh
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['translations'],
    });
    if (!category) throw new NotFoundException('Danh mục không tồn tại');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // BIẾN KIỂM TRA: Liệu có sự thay đổi về vị trí (cha) không?
      // Dùng !== undefined để chấp nhận cả trường hợp parentId = null (đưa ra gốc)
      const isChangingParent =
        parentId !== undefined && parentId !== category.parentId;

      if (isChangingParent) {
        if (parentId === null) {
          category.parentId = null;
          category.level = 1;
        } else {
          const parent = await this.categoryRepository.findOneBy({
            id: parentId,
          });
          if (!parent)
            throw new NotFoundException('Danh mục cha không tồn tại');

          category.parentId = parentId;
          category.level = parent.level + 1;
        }

        // LOGIC QUAN TRỌNG: Tìm Max Order trong số các con của cha mới
        const result = await queryRunner.manager
          .createQueryBuilder(Category, 'cat')
          .select('MAX(cat.order)', 'maxOrder')
          // Nếu parentId null thì tìm các ông level 1, nếu có parentId thì tìm con của nó
          .where(
            parentId ? 'cat.parentId = :parentId' : 'cat.parentId IS NULL',
            { parentId }
          )
          .getRawOne();

        const maxOrder = result.maxOrder ? parseInt(result.maxOrder) : 0;
        category.order = maxOrder + 1;
      }
      // Nếu không đổi cha nhưng người dùng chủ động truyền order mới (ví dụ sắp xếp thủ công)
      else if (order !== undefined) {
        category.order = order;
      }

      if (image !== undefined) category.image = image;

      // Lưu category
      await queryRunner.manager.save(category);

      // 2. Cập nhật translations (Sử dụng queryRunner.manager để đồng bộ transaction)
      if (translations) {
        for (const t of translations) {
          let translation = await queryRunner.manager.findOne(
            CategoryTranslation,
            {
              where: { categoryId: id, languageCode: t.languageCode },
            }
          );

          if (translation) {
            Object.assign(translation, t);
            await queryRunner.manager.save(translation);
          } else {
            const newTrans = this.translationRepository.create({
              ...t,
              categoryId: id,
            });
            await queryRunner.manager.save(newTrans);
          }
        }
      }

      await queryRunner.commitTransaction();
      return this.findOne(id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * REMOVE: Giữ nguyên logic delete id
   */
  async remove(id: number) {
    const result = await this.categoryRepository.delete(id);
    if (result.affected === 0)
      throw new NotFoundException('Không tìm thấy để xóa');
    return { message: 'Xóa thành công danh mục và các bản dịch liên quan' };
  }

  /**
   * FIND ONE WITH PRODUCTS: Giữ nguyên logic cũ
   */
  // async findOneWithProducts(id: number) {
  //   const category = await this.categoryRepository.findOne({
  //     where: { id },
  //     relations: ['products', 'products.translations'],
  //     order: {
  //       products: {
  //         order: 'ASC', // Sắp xếp sản phẩm theo thứ tự tăng dần
  //         id: 'DESC', // Nếu order bằng nhau (ví dụ đều là 0), ông nào mới hơn (ID lớn hơn) sẽ lên trước
  //       },
  //     },
  //   });
  //   if (!category) throw new NotFoundException(`Không tìm thấy ID ${id}`);
  //   return category;
  // }

  async findOneWithProducts(id: number, lang: string = 'vi') {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['products', 'products.translations'],
      order: {
        products: {
          order: 'ASC', // Sắp xếp sản phẩm theo thứ tự tăng dần
          id: 'DESC', // Mới hơn lên trước nếu order bằng nhau
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Không tìm thấy ID ${id}`);
    }

    // 1. Cấu hình Domain Proxy
    const proxyBaseUrl = 'https://gtgsew.com/api/v1/files/proxy-image';

    // 2. Biến đổi dữ liệu sản phẩm bên trong Category
    if (category.products && category.products.length > 0) {
      category.products = category.products.map(prod => {
        // Xử lý mảng ảnh chi tiết (images)
        const mappedImages = (prod.images || []).map((imgUrl: string) => {
          if (imgUrl && imgUrl.includes('viettelidc.com.vn')) {
            return `${proxyBaseUrl}?url=${encodeURIComponent(imgUrl)}`;
          }
          return imgUrl;
        });

        // Xử lý ảnh đại diện (image)
        // let finalImage = prod.image;
        // if (prod.image && prod.image.includes('viettelidc.com.vn')) {
        //   finalImage = `${proxyBaseUrl}?url=${encodeURIComponent(prod.image)}`;
        // }

        // Trả về sản phẩm đã được format
        return {
          ...prod,
          // image: finalImage,
          images: mappedImages,
          // Tiện tay format luôn cái tên hiển thị theo ngôn ngữ nếu bạn muốn
          displayName:
            prod.translations?.find(t => t.languageCode === lang)?.name ||
            prod.id,
        };
      }) as any; // Cast 'any' nếu Entity khắt khe về kiểu dữ liệu trả về
    }

    return category;
  }
}

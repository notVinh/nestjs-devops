import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
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
  async create(createCategoryDto: CreateCategoryDto) {
    const { parentId, translations, image } = createCategoryDto;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const newCategory = this.categoryRepository.create({ image });

      // Logic cũ: Tính level dựa trên cha
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

      // Lưu mảng translations đa ngôn ngữ
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

  async findAll() {
    const [data, total] = await this.categoryRepository.findAndCount({
      relations: ['translations', 'products'], // Lấy toàn bộ mảng ngôn ngữ
      order: { id: 'DESC' }, // Sắp xếp mới nhất lên đầu
    });

    return {
      data,
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
  async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    const { parentId, translations, image } = updateCategoryDto;

    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['translations'],
    });
    if (!category) throw new NotFoundException('Danh mục không tồn tại');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Logic cũ: Xử lý thay đổi cấp độ khi đổi cha
      if (parentId !== undefined) {
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
      }

      if (image) category.image = image;
      await queryRunner.manager.save(category);

      // Cập nhật đa ngôn ngữ: Nếu có ngôn ngữ mới thì tạo, có rồi thì update
      if (translations) {
        for (const t of translations) {
          let translation = await this.translationRepository.findOne({
            where: { categoryId: id, languageCode: t.languageCode },
          });

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
  async findOneWithProducts(id: number) {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['products', 'products.translations'],
    });
    if (!category) throw new NotFoundException(`Không tìm thấy ID ${id}`);
    return category;
  }
}

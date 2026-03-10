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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ApiTags, ApiQuery } from '@nestjs/swagger';

@ApiTags('Categories')
@Controller({
  path: 'categories',
  version: '1',
})
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  // @Get()
  // @ApiQuery({ name: 'lang', required: false, example: 'vi' }) // Hỗ trợ hiển thị trên Swagger
  // findAll(@Query('lang') lang?: string) {
  //   // Truyền lang vào service, nếu lang undefined service sẽ dùng mặc định 'vi'
  //   return this.categoriesService.findAll(lang);
  // }

  @Get()
  async findAll() {
    // Chuyển đổi string từ query sang number

    return this.categoriesService.findAll();
  }

  @Get(':id')
  @ApiQuery({ name: 'lang', required: false, example: 'vi' })
  findOne(@Param('id') id: string, @Query('lang') lang?: string) {
    return this.categoriesService.findOne(+id, lang);
  }

  @Get(':id/products')
  findOneWithProducts(@Param('id') id: string) {
    // Giữ nguyên logic cũ của bạn
    return this.categoriesService.findOneWithProducts(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto
  ) {
    return this.categoriesService.update(+id, updateCategoryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(+id);
  }
}

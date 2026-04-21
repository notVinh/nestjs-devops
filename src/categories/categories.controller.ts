import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ApiTags, ApiQuery, ApiOperation } from '@nestjs/swagger';

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

  @Get('export-excel')
  @ApiOperation({ summary: 'Xuất danh mục và sản phẩm ra file Excel' })
  async exportExcel(@Res() res: Response) {
    const buffer = await this.categoriesService.exportExcel();
    const fileName = `danh-muc-san-pham.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(Buffer.from(buffer as ArrayBuffer));
  }

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

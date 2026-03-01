import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CategoryTranslationDto {
  @IsString()
  @IsNotEmpty()
  languageCode: string; // 'vi', 'en', 'zh'

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  slug: string; // Slug riêng cho từng ngôn ngữ
}

export class CreateCategoryDto {
  @IsNumber()
  @IsOptional()
  parentId?: number;

  @IsNumber()
  @IsOptional()
  level?: number;

  @IsString()
  @IsOptional()
  image?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryTranslationDto)
  translations: CategoryTranslationDto[];
}

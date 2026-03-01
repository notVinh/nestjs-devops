// products/dto/create-product.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsObject,
} from 'class-validator';

export class ProductTranslationDto {
  @IsString()
  languageCode: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  price?: string; // Thêm trường này vì mẫu có "Liên hệ"

  @IsOptional()
  @IsArray()
  features?: string[]; // Mảng các dòng tính năng

  @IsOptional()
  @IsArray()
  specs?: any[]; // Mảng các object { label: string, value: string }

  @IsString()
  slug: string;
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  id: string; // Mã máy

  @IsOptional()
  brand?: string;

  @IsOptional()
  price?: number;

  @IsOptional()
  originalPrice?: number;

  @IsOptional()
  @IsObject()
  specs?: any;

  @IsOptional()
  @IsArray()
  images?: string[];

  @IsOptional()
  categoryId?: number;

  @IsArray()
  translations: ProductTranslationDto[]; // Mảng các bản dịch
}

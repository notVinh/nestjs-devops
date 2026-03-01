import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

/**
 * Custom pipe để validate page parameter cho pagination
 *
 * Features:
 * - Set default value nếu không có
 * - Validate phải là số dương
 * - Transform string to number
 */
@Injectable()
export class PaginationPagePipe implements PipeTransform {
  constructor(private readonly defaultValue: number = 1) {}

  transform(value?: any): number {
    // Nếu không có value hoặc là falsy, return default
    if (!value || value === '' || value === null || value === undefined) {
      return this.defaultValue;
    }

    // Convert to number
    const page = Number(value);

    // Validate là số hợp lệ
    if (isNaN(page) || !isFinite(page)) {
      throw new BadRequestException(`page must be a valid number`);
    }

    // Validate >= 1
    if (page < 1) {
      throw new BadRequestException(`page must be at least 1`);
    }

    return Math.floor(page);
  }
}

import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

/**
 * Custom pipe để validate và cap max limit cho pagination
 *
 * Features:
 * - Set default value nếu không có
 * - Validate phải là số dương
 * - Cap max value để tránh abuse
 * - Transform string to number
 */
@Injectable()
export class PaginationLimitPipe implements PipeTransform {
  constructor(
    private readonly defaultValue: number = 20,
    private readonly maxValue: number = 100,
  ) {}

  transform(value?: any): number {
    // Nếu không có value hoặc là falsy, return default
    if (!value || value === '' || value === null || value === undefined) {
      return this.defaultValue;
    }

    // Convert to number
    const limit = Number(value);

    // Validate là số hợp lệ
    if (isNaN(limit) || !isFinite(limit)) {
      throw new BadRequestException(`limit must be a valid number`);
    }

    // Validate >= 1
    if (limit < 1) {
      throw new BadRequestException(`limit must be at least 1`);
    }

    // Cap max value để tránh abuse
    // Nếu client gửi limit > maxValue, force về maxValue
    if (limit > this.maxValue) {
      return this.maxValue;
    }

    return Math.floor(limit);
  }
}

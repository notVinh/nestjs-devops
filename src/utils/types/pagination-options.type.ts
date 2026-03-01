export interface IPaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface IPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  workingCount?: number;
  otherCount?: number;
}

export interface IPaginationResult<T> {
  data: T[];
  meta: IPaginationMeta;
}

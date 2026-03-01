export const HTTP_STATUS_CODE = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};

export const EMPLOYEE_STATUS = {
  INTERVIEWED: 'Đã phỏng vấn',
  APPLYING: 'Thử việc',
  APPLIED: 'Chính thức',
  INACTIVE: 'Đã nghỉ',
};

export const PASSWORD_FACTORY_ADMIN_DEFAULT = 'admin123';
export const PASSWORD_EMPLOYEE_DEFAULT = 'nhanvien123';

export const POSITION_DEFAULT = {
  name: 'Admin',
  description: 'Admin',
};

export const DEPARTMENT_DEFAULT = {
  name: 'Admin',
  description: 'Admin',
};

export const ARRIVAL_REPORT_STATUS = {
  ARRIVED: 'arrived',
  NOT_ARRIVED: 'not_arrived',
  DEPARTED: 'departed',
};

export const OVERNIGHT_REPORT_STATUS = {
  REPORTED: 'reported',
  CONFIRMED: 'confirmed',
};

export const MAINTENANCE_REPORT_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

export const MAINTENANCE_REPORT_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CANCELLED: 'cancelled',
};
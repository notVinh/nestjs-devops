import { Employee } from '../employee/entities/employee.entity';

/**
 * Helper function để merge permissions từ roleGroups
 * Không dùng permissions cũ nữa, chỉ lấy từ roleGroups
 */
export function mergeEmployeePermissions(employee: Employee & { roleGroups?: any[] }): {
  permissions: string[];
  adminMenuKeys: string[];
  canAccessAdmin: boolean;
} {
  const roleGroups = employee.roleGroups || [];
  
  // Chỉ lấy permissions từ roleGroups, không dùng permissions cũ
  const permissions = new Set<string>();
  const adminMenuKeys = new Set<string>();
  let canAccessAdmin = false;

  // Merge permissions từ tất cả roleGroups (chỉ lấy từ groups có status = 'active')
  roleGroups.forEach((group: any) => {
    // Chỉ lấy permissions từ roleGroups có status = 'active'
    if (group.status !== 'active') {
      return;
    }
    
    // Merge permissions từ group
    if (group.permissions && Array.isArray(group.permissions)) {
      group.permissions.forEach((p: string) => permissions.add(p));
    }
    
    // Merge admin menu keys từ group
    if (group.adminMenuKeys && Array.isArray(group.adminMenuKeys)) {
      group.adminMenuKeys.forEach((k: string) => adminMenuKeys.add(k));
    }
    
    // canAccessAdmin = true nếu bất kỳ group nào có
    if (group.canAccessAdmin) canAccessAdmin = true;
  });

  return {
    permissions: Array.from(permissions),
    adminMenuKeys: Array.from(adminMenuKeys),
    canAccessAdmin
  };
}

/**
 * Check if employee has a specific permission
 * (merge từ roleGroups + permissions cũ)
 */
export function hasEmployeePermission(
  employee: Employee & { roleGroups?: any[] },
  permission: string
): boolean {
  const merged = mergeEmployeePermissions(employee);
  return merged.permissions.includes(permission);
}


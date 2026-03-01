import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { RoleGroup } from './entities/role-group.entity';
import { CreateRoleGroupDto } from './dto/create-role-group.dto';
import { UpdateRoleGroupDto } from './dto/update-role-group.dto';
import { AddEmployeesDto } from './dto/add-employees.dto';
import { RemoveEmployeesDto } from './dto/remove-employees.dto';
import { Employee } from '../employee/entities/employee.entity';

@Injectable()
export class RoleGroupService {
  constructor(
    @InjectRepository(RoleGroup)
    private roleGroupRepository: Repository<RoleGroup>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>
  ) {}

  // Tạo nhóm phân quyền mới
  async create(createRoleGroupDto: CreateRoleGroupDto): Promise<RoleGroup> {
    const roleGroup = this.roleGroupRepository.create({
      ...createRoleGroupDto,
      adminMenuKeys: createRoleGroupDto.adminMenuKeys || [],
      permissions: createRoleGroupDto.permissions || [],
      status: createRoleGroupDto.status || 'active',
    });
    return this.roleGroupRepository.save(roleGroup);
  }

  // Lấy tất cả nhóm theo factoryId
  async findAll(factoryId: number): Promise<RoleGroup[]> {
    return this.roleGroupRepository.find({
      where: { factoryId },
      relations: ['employees', 'employees.user', 'employees.position', 'employees.department'],
      order: { createdAt: 'DESC' },
    });
  }

  // Lấy nhóm theo id
  async findOne(id: number): Promise<RoleGroup> {
    const roleGroup = await this.roleGroupRepository.findOne({
      where: { id },
      relations: ['employees', 'employees.user', 'employees.position', 'employees.department', 'factory'],
    });

    if (!roleGroup) {
      throw new NotFoundException(`Không tìm thấy nhóm phân quyền với ID ${id}`);
    }

    return roleGroup;
  }

  // Cập nhật nhóm
  async update(id: number, updateRoleGroupDto: UpdateRoleGroupDto): Promise<RoleGroup> {
    const roleGroup = await this.findOne(id);
    
    // Update fields
    Object.assign(roleGroup, updateRoleGroupDto);
    
    return this.roleGroupRepository.save(roleGroup);
  }

  // Xóa mềm nhóm
  async delete(id: number): Promise<void> {
    const roleGroup = await this.findOne(id);
    await this.roleGroupRepository.softDelete(id);
  }

  // Cập nhật cả permissions và admin menu keys cùng lúc (tránh race condition)
  async updatePermissionsAndMenuKeys(
    id: number,
    permissions: string[],
    adminMenuKeys: string[]
  ): Promise<RoleGroup> {
    const roleGroup = await this.findOne(id);
    roleGroup.permissions = permissions || [];
    roleGroup.adminMenuKeys = adminMenuKeys || [];
    // Tự động set canAccessAdmin nếu có menu keys
    roleGroup.canAccessAdmin = (adminMenuKeys || []).length > 0;
    return this.roleGroupRepository.save(roleGroup);
  }

  // Thêm employees vào nhóm
  async addEmployees(roleGroupId: number, addEmployeesDto: AddEmployeesDto): Promise<RoleGroup> {
    const roleGroup = await this.findOne(roleGroupId);
    
    // Lấy employees hiện tại
    const currentEmployeeIds = roleGroup.employees?.map(e => e.id) || [];
    
    // Lấy employees mới cần thêm (loại bỏ những employee đã có)
    const newEmployeeIds = addEmployeesDto.employeeIds.filter(
      id => !currentEmployeeIds.includes(id)
    );

    if (newEmployeeIds.length === 0) {
      throw new BadRequestException('Tất cả nhân viên đã có trong nhóm này');
    }

    // Lấy employees từ database
    const employees = await this.employeeRepository.find({
      where: { id: In(newEmployeeIds) },
    });

    if (employees.length !== newEmployeeIds.length) {
      throw new NotFoundException('Một số nhân viên không tồn tại');
    }

    // Thêm employees vào nhóm
    roleGroup.employees = [...(roleGroup.employees || []), ...employees];
    return this.roleGroupRepository.save(roleGroup);
  }

  // Xóa employees khỏi nhóm
  async removeEmployees(roleGroupId: number, removeEmployeesDto: RemoveEmployeesDto): Promise<RoleGroup> {
    const roleGroup = await this.findOne(roleGroupId);
    
    // Lọc bỏ employees cần xóa
    roleGroup.employees = (roleGroup.employees || []).filter(
      employee => !removeEmployeesDto.employeeIds.includes(employee.id)
    );

    return this.roleGroupRepository.save(roleGroup);
  }

  // Lấy danh sách employees trong nhóm
  async getEmployees(roleGroupId: number): Promise<Employee[]> {
    const roleGroup = await this.findOne(roleGroupId);
    return roleGroup.employees || [];
  }

  // Helper: Lấy permissions thực tế của employee (merge từ roleGroups + permissions cũ)
  async getEmployeePermissions(employeeId: number): Promise<{
    permissions: string[];
    adminMenuKeys: string[];
    canAccessAdmin: boolean;
  }> {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
      relations: ['roleGroups'],
    });

    if (!employee) {
      throw new NotFoundException(`Không tìm thấy nhân viên với ID ${employeeId}`);
    }

    const roleGroups = employee.roleGroups || [];
    
    // Chỉ lấy permissions từ roleGroups, không dùng permissions cũ
    const permissions = new Set<string>();
    const adminMenuKeys = new Set<string>();
    let canAccessAdmin = false;

    // Merge permissions từ tất cả roleGroups (chỉ lấy từ groups có status = 'active')
    roleGroups.forEach(group => {
      // Chỉ lấy permissions từ roleGroups có status = 'active'
      if (group.status !== 'active') {
        return;
      }
      
      // Merge permissions từ group
      if (group.permissions) {
        group.permissions.forEach(p => permissions.add(p));
      }
      
      // Merge admin menu keys từ group
      if (group.adminMenuKeys) {
        group.adminMenuKeys.forEach(k => adminMenuKeys.add(k));
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

  // Static helper: Merge permissions từ employee object (dùng khi đã có employee với roleGroups)
  static mergeEmployeePermissions(employee: any): {
    permissions: string[];
    adminMenuKeys: string[];
    canAccessAdmin: boolean;
  } {
    const roleGroups = employee.roleGroups || [];
    
    // Bắt đầu với permissions cũ (backward compatibility)
    const permissions = new Set<string>(employee.permissions || []);
    const adminMenuKeys = new Set<string>(employee.adminMenuKeys || []);
    let canAccessAdmin = employee.canAccessAdmin || false;

    // Merge permissions từ tất cả roleGroups
    roleGroups.forEach((group: any) => {
      // Merge permissions từ group
      if (group.permissions) {
        group.permissions.forEach((p: string) => permissions.add(p));
      }
      
      // Merge admin menu keys từ group
      if (group.adminMenuKeys) {
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
}


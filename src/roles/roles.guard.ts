import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<number[]>('roles', [
      context.getClass(),
      context.getHandler(),
    ]);
    if (!roles.length) {
      return true;
    }
    const request = context.switchToHttp().getRequest();

    // Convert role.id to number for comparison
    const userRoleId = parseInt(request.user?.role?.id);
    
    // Check if conversion was successful and user has a valid role
    if (isNaN(userRoleId) || !request.user?.role?.id) {
      return false;
    }
    
    return roles.includes(userRoleId);
  }
}

import type { Role } from '@/lib/rbac';

export interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStaffDto {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role: Role;
  password: string;
}

export interface UpdateStaffDto extends Partial<CreateStaffDto> {
  isActive?: boolean;
}

export interface StaffFilters {
  search?: string;
  role?: Role;
  roles?: Role[];
  isActive?: boolean;
}

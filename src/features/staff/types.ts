export interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStaffDto {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role: string;
  password: string;
}

export interface UpdateStaffDto extends Partial<CreateStaffDto> {
  isActive?: boolean;
}

export interface StaffFilters {
  search?: string;
  role?: string;
  isActive?: boolean;
}

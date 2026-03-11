'use server';

import { revalidatePath } from 'next/cache';
// No unused imports
import { StaffMember, CreateStaffDto, UpdateStaffDto, StaffFilters } from '../types';
import dbConnect from '@/lib/db';
import Staff from '../../../models/Staff';

export type LeanStaffMember = Omit<StaffMember, '_id' | '__v'> & {
  _id: string;
  __v: number;
};

export type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

export async function getStaffMembers(filters?: StaffFilters): Promise<StaffMember[]> {
  try {
    await dbConnect();

    const query: {
      role?: string;
      $or?: Array<{
        [key: string]: { $regex: string; $options: string };
      }>;
      isActive?: boolean;
    } = {};

    if (filters?.search) {
      query.$or = [
        { firstName: { $regex: filters.search, $options: 'i' } },
        { lastName: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } }
      ];
    }

    // Only search and status filters are supported

    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters?.role) {
      query.role = filters.role;
    }

    const staffMembers = await Staff.find(query).sort({ role: 1, createdAt: -1 }).lean();

    return staffMembers.map(member => {
      const memberObj = member as LeanStaffMember;
      return {
        ...memberObj,
        id: memberObj._id.toString(),
        _id: undefined,
        __v: undefined
      } as StaffMember;
    });
  } catch (error) {
    console.error('Error fetching staff members:', error);
    throw new Error('Failed to fetch staff members');
  }
}

export async function getStaffMember(id: string): Promise<StaffMember> {
  try {
    await dbConnect();

    const staffMember = await Staff.findById(id).lean();

    if (!staffMember) {
      throw new Error('Staff member not found');
    }

    const staffMemberObj = staffMember as LeanStaffMember;
    return {
      ...staffMemberObj,
      id: staffMemberObj._id.toString(),
      _id: undefined,
      __v: undefined
    } as StaffMember;
  } catch (error) {
    console.error(`Error fetching staff member ${id}:`, error);
    throw new Error('Failed to fetch staff member');
  }
}

export async function createStaffMember(data: CreateStaffDto): Promise<ActionResult<StaffMember>> {
  try {
    await dbConnect();

    // Check if email already exists
    const existingStaff = await Staff.findOne({ email: data.email });
    if (existingStaff) {
      return { success: false, error: 'Email already in use' };
    }

    // In a real app, you would hash the password here
    const hashedPassword = data.password; // Replace with actual hashing

    const newStaff = new Staff({
      ...data,
      password: hashedPassword
    });

    const savedStaff = await newStaff.save();

    revalidatePath('/staff');

    const savedStaffObj = savedStaff.toObject() as LeanStaffMember;
    const staffMember = {
      ...savedStaffObj,
      id: savedStaffObj._id.toString(),
      _id: undefined,
      __v: undefined
    } as StaffMember;

    return { success: true, data: staffMember };
  } catch (error: unknown) {
    console.error('Error creating staff member:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create staff member';
    return { success: false, error: errorMessage };
  }
}

export async function updateStaffMember(id: string, data: UpdateStaffDto): Promise<ActionResult<StaffMember>> {
  try {
    await dbConnect();

    const updateData = { ...data };

    // Don't update password if not provided
    if (updateData.password === '') {
      delete updateData.password;
    } else if (updateData.password) {
      // In a real app, you would hash the password here
      updateData.password = updateData.password; // Replace with actual hashing
    }

    const updatedStaff = await Staff.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedStaff) {
      return { success: false, error: 'Staff member not found' };
    }

    revalidatePath('/staff');
    revalidatePath(`/staff/${id}`);

    const updatedStaffObj = updatedStaff as LeanStaffMember;
    const staffMember = {
      ...updatedStaffObj,
      id: updatedStaffObj._id.toString(),
      _id: undefined,
      __v: undefined
    } as StaffMember;

    return { success: true, data: staffMember };
  } catch (error) {
    console.error(`Error updating staff member ${id}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update staff member';
    return { success: false, error: errorMessage };
  }
}

export async function deleteStaffMember(
  id: string,
  staff: Omit<StaffMember, 'updatedAt' | 'createdAt'>
): Promise<void> {
  if (staff.role === 'admin') {
    throw new Error(`Cannot delete ${staff.firstName}. He's an admin`);
  }

  if (staff.isActive) {
    throw new Error(`Cannot delete an active staff member.`);
  }

  try {
    await dbConnect();

    const result = await Staff.deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      throw new Error('Staff member not found');
    }

    revalidatePath('/staff');
  } catch (error) {
    console.error(`Error deleting staff member ${id}:`, error);
    throw new Error('Failed to delete staff member');
  }
}

export async function toggleStaffStatus(id: string, isActive: boolean): Promise<void> {
  try {
    await dbConnect();

    const result = await Staff.findByIdAndUpdate(id, { $set: { isActive } }, { new: true });

    if (!result) {
      throw new Error('Staff member not found');
    }

    revalidatePath('/staff');
    revalidatePath(`/staff/${id}`);
  } catch (error) {
    console.error(`Error toggling status for staff member ${id}:`, error);
    throw new Error('Failed to update staff status');
  }
}

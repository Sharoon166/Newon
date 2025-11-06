'use server';

import { revalidatePath } from 'next/cache';
// No unused imports
import { StaffMember, CreateStaffDto, UpdateStaffDto, StaffFilters } from '../types';
import dbConnect from '@/lib/db';
import Staff from '../../../models/Staff';

type LeanStaffMember = Omit<StaffMember, '_id' | '__v'> & {
  _id: string;
  __v: number;
};

export async function getStaffMembers(filters?: StaffFilters): Promise<StaffMember[]> {
  try {
    await dbConnect();

    const query: {
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

    const staffMembers = await Staff.find(query).sort({ createdAt: -1 }).lean();

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

export async function createStaffMember(data: CreateStaffDto): Promise<StaffMember> {
  try {
    await dbConnect();

    // Check if email already exists
    const existingStaff = await Staff.findOne({ email: data.email });
    if (existingStaff) {
      throw new Error('Email already in use');
    }

    // In a real app, you would hash the password here
    const hashedPassword = data.password; // Replace with actual hashing

    const newStaff = new Staff({
      ...data,
      password: hashedPassword
    });

    const savedStaff = await newStaff.save();

    revalidatePath('/(dashboard)/staff');

    const savedStaffObj = savedStaff.toObject() as LeanStaffMember;
    return {
      ...savedStaffObj,
      id: savedStaffObj._id.toString(),
      _id: undefined,
      __v: undefined
    } as StaffMember;
  } catch (error: unknown) {
    console.error('Error creating staff member:', error);
    throw new Error((error as Error).message || 'Failed to create staff member');
  }
}

export async function updateStaffMember(id: string, data: UpdateStaffDto): Promise<StaffMember> {
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
      throw new Error('Staff member not found');
    }

    revalidatePath('/(dashboard)/staff');
    revalidatePath(`/(dashboard)/staff/${id}`);

    const updatedStaffObj = updatedStaff as LeanStaffMember;
    return {
      ...updatedStaffObj,
      id: updatedStaffObj._id.toString(),
      _id: undefined,
      __v: undefined
    } as StaffMember;
  } catch (error) {
    console.error(`Error updating staff member ${id}:`, error);
    throw new Error('Failed to update staff member');
  }
}

export async function deleteStaffMember(id: string): Promise<void> {
  try {
    await dbConnect();

    const result = await Staff.deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      throw new Error('Staff member not found');
    }

    revalidatePath('/(dashboard)/staff');
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

    revalidatePath('/(dashboard)/staff');
    revalidatePath(`/(dashboard)/staff/${id}`);
  } catch (error) {
    console.error(`Error toggling status for staff member ${id}:`, error);
    throw new Error('Failed to update staff status');
  }
}

'use server';

import dbConnect from '@/lib/db';
import Staff from '@/models/Staff';
import { revalidatePath } from 'next/cache';

export async function registerStaff(data: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  role: 'admin' | 'staff';
}) {
  try {
    await dbConnect();

    // Check if email already exists
    const existingStaff = await Staff.findOne({ email: data.email });
    if (existingStaff) {
      return { success: false, error: 'Email already registered' };
    }

    // Create new staff
    const staff = await Staff.create({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      phoneNumber: data.phoneNumber,
      role: data.role,
      isActive: true
    });

    revalidatePath('/staff');

    return {
      success: true,
      data: {
        id: staff._id.toString(),
        staffId: staff.staffId,
        email: staff.email,
        name: `${staff.firstName} ${staff.lastName}`
      }
    };
  } catch (error: any) {
    console.error('Registration error:', error);
    return { success: false, error: error.message || 'Failed to register staff' };
  }
}

export async function updateStaffStatus(staffId: string, isActive: boolean) {
  try {
    await dbConnect();

    const staff = await Staff.findByIdAndUpdate(
      staffId,
      { isActive },
      { new: true }
    );

    if (!staff) {
      return { success: false, error: 'Staff not found' };
    }

    revalidatePath('/staff');

    return { success: true };
  } catch (error: any) {
    console.error('Update status error:', error);
    return { success: false, error: error.message || 'Failed to update staff status' };
  }
}

export async function getAllStaff() {
  try {
    await dbConnect();

    const staff = await Staff.find({}).sort({ createdAt: -1 });

    return {
      success: true,
      data: staff.map(s => ({
        id: s._id.toString(),
        staffId: s.staffId,
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email,
        phoneNumber: s.phoneNumber,
        role: s.role,
        isActive: s.isActive,
        createdAt: s.createdAt.toISOString()
      }))
    };
  } catch (error: any) {
    console.error('Get staff error:', error);
    return { success: false, error: error.message || 'Failed to fetch staff' };
  }
}

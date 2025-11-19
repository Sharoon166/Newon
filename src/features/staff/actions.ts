'use server';

import dbConnect from '@/lib/db';
import Staff from '@/models/Staff';
import { revalidatePath } from 'next/cache';
import { CreateStaffDto, UpdateStaffDto, StaffMember } from './types';

export async function createStaffMember(data: CreateStaffDto) {
  try {
    await dbConnect();

    const existingStaff = await Staff.findOne({ email: data.email });
    if (existingStaff) {
      throw new Error('Email already registered');
    }

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
      id: staff._id.toString(),
      firstName: staff.firstName,
      lastName: staff.lastName,
      email: staff.email,
      phoneNumber: staff.phoneNumber,
      role: staff.role,
      isActive: staff.isActive,
      createdAt: staff.createdAt,
      updatedAt: staff.updatedAt
    };
  } catch (error) {
    console.error('Create staff error:', error);
    throw new Error('Failed to create staff member');
  }
}

export async function updateStaffMember(id: string, data: UpdateStaffDto) {
  try {
    await dbConnect();

    const staff = await Staff.findById(id);

    if (!staff) {
      throw new Error('Staff member not found');
    }

    // Update fields
    if (data.firstName) staff.firstName = data.firstName;
    if (data.lastName) staff.lastName = data.lastName;
    if (data.email) staff.email = data.email;
    if (data.phoneNumber !== undefined) staff.phoneNumber = data.phoneNumber;
    if (data.role) staff.role = data.role;
    if (data.isActive !== undefined) staff.isActive = data.isActive;
    
    // Update password if provided (will be hashed by pre-save hook)
    if (data.password) {
      staff.password = data.password;
    }

    await staff.save();

    revalidatePath('/staff');
    revalidatePath(`/staff/${id}/edit`);

    return {
      id: staff._id.toString(),
      firstName: staff.firstName,
      lastName: staff.lastName,
      email: staff.email,
      phoneNumber: staff.phoneNumber,
      role: staff.role,
      isActive: staff.isActive,
      createdAt: staff.createdAt,
      updatedAt: staff.updatedAt
    };
  } catch (error) {
    console.error('Update staff error:', error);
    throw new Error('Failed to update staff member');
  }
}

export async function getStaffMember(id: string): Promise<StaffMember> {
  try {
    await dbConnect();

    const staff = await Staff.findById(id);

    if (!staff) {
      throw new Error('Staff member not found');
    }

    return {
      id: staff._id.toString(),
      firstName: staff.firstName,
      lastName: staff.lastName,
      email: staff.email,
      phoneNumber: staff.phoneNumber,
      role: staff.role,
      isActive: staff.isActive,
      createdAt: staff.createdAt,
      updatedAt: staff.updatedAt
    };
  } catch (error) {
    console.error('Get staff member error:', error);
    throw new Error('Failed to fetch staff member');
  }
}

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Staff from '@/models/Staff';
import { z } from 'zod';

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phoneNumber: z.string().optional(),
  role: z.enum(['admin', 'staff']).default('staff')
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    await dbConnect();

    // Check if email already exists
    const existingStaff = await Staff.findOne({ email: validatedData.email });
    if (existingStaff) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Create new staff
    const staff = await Staff.create(validatedData);

    return NextResponse.json(
      {
        message: 'Registration successful',
        staff: {
          id: staff._id,
          staffId: staff.staffId,
          email: staff.email,
          firstName: staff.firstName,
          lastName: staff.lastName,
          role: staff.role
        }
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}

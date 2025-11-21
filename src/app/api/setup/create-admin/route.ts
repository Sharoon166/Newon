import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Staff from '@/models/Staff';

// GET - Check if admin exists
export async function GET() {
  try {
    await dbConnect();
    
    const adminExists = await Staff.findOne({ role: 'admin' });
    
    return NextResponse.json({
      success: true,
      adminExists: !!adminExists
    });
  } catch (error) {
    console.error('Error checking admin:', error);
    return NextResponse.json(
      { error: 'Failed to check admin status' },
      { status: 500 }
    );
  }
}

// POST - Create admin user
export async function POST(request: Request) {
  try {
    await dbConnect();
    
    // Check if admin already exists
    const existingAdmin = await Staff.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      return NextResponse.json(
        { error: 'Admin user already exists' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { firstName, lastName, email, password, phoneNumber } = body;
    
    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }
    
    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }
    
    // Create admin user
    const admin = await Staff.create({
      firstName,
      lastName,
      email,
      password, // Will be hashed automatically by pre-save hook
      phoneNumber,
      role: 'admin',
      isActive: true
    });
    
    return NextResponse.json({
      success: true,
      message: 'Admin user created successfully!',
      data: {
        email: admin.email,
        staffId: admin.staffId
      }
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    
    // Handle duplicate email error
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create admin' },
      { status: 500 }
    );
  }
}

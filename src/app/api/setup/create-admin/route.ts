import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Staff from '@/models/Staff';

export async function POST() {
  try {
    await dbConnect();
    
    // Check if admin already exists
    const existingAdmin = await Staff.findOne({ email: 'sharoon@newon.com' });
    
    if (existingAdmin) {
      // Delete existing admin to recreate with password
      await Staff.deleteOne({ email: 'sharoon@newon.com' });
      console.log('Deleted existing admin to recreate with password');
    }
    
    // Create admin user
    const admin = await Staff.create({
      firstName: 'Sharoon',
      lastName: 'Shaleem',
      email: 'sharoon@newon.com',
      password: 'admin123', // Will be hashed automatically by pre-save hook
      role: 'admin',
      isActive: true
    });
    
    // Verify password was saved
    const verifyAdmin = await Staff.findById(admin._id).select('+password');
    console.log('Password saved:', !!verifyAdmin?.password);
    
    return NextResponse.json({
      success: true,
      message: 'Admin user created successfully!',
      data: {
        email: admin.email,
        staffId: admin.staffId,
        passwordSet: !!verifyAdmin?.password,
        note: 'Please change the password after first login!'
      }
    });
  } catch (error: any) {
    console.error('Error creating admin:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create admin' },
      { status: 500 }
    );
  }
}

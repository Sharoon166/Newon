'use server';

import dbConnect from '@/lib/db';
import CustomerModel from '@/models/Customer';

export async function checkAndCreateOtcCustomer() {
  try {
    await dbConnect();

    // Check if OTC customer already exists
    const existingOtc = await CustomerModel.findById('otc');

    if (existingOtc) {
      return {
        success: true,
        created: false,
        message: 'OTC customer already exists'
      };
    }

    // Create OTC customer
    const otcCustomer = new CustomerModel({
      _id: 'otc',
      customerId: 'OTC-001',
      name: 'Over the Counter customer',
      email: 'otc@cash.sale',
      company: 'OTC',
      phone: '0000000000',
      address: 'N/A',
      city: 'N/A',
      state: 'N/A',
      zip: '00000',
      totalInvoiced: 0,
      totalPaid: 0,
      outstandingBalance: 0
    });

    await otcCustomer.save();

    return {
      success: true,
      created: true,
      message: 'OTC customer created successfully'
    };
  } catch (error) {
    console.error('Error setting up OTC customer:', error);
    throw new Error('Failed to setup OTC customer');
  }
}

export async function getOtcCustomer() {
  try {
    await dbConnect();

    const otcCustomer = await CustomerModel.findById('otc');

    if (!otcCustomer) {
      throw new Error('OTC customer not found');
    }

    return otcCustomer;
  } catch (error) {
    console.error('Error fetching OTC customer:', error);
    throw new Error('Failed to fetch OTC customer');
  }
}
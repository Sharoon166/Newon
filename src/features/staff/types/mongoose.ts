import { Document } from 'mongoose';

export interface IStaffDocument extends Document {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role: string;
  password: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type StaffDocument = IStaffDocument & Document;

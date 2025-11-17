import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import dbConnect from '@/lib/db';
import Staff from '@/models/Staff';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        await dbConnect();

        const staff = await Staff.findOne({ email: credentials.email }).select('+password');

        if (!staff) {
          throw new Error('Invalid email or password');
        }

        if (!staff.isActive) {
          throw new Error('Account is inactive. Please contact administrator.');
        }

        // Compare password using the model's method
        const isPasswordValid = await staff.comparePassword(credentials.password);

        if (!isPasswordValid) {
          throw new Error('Invalid email or password');
        }

        return {
          id: staff._id.toString(),
          email: staff.email,
          name: `${staff.firstName} ${staff.lastName}`,
          role: staff.role,
          staffId: staff.staffId
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.staffId = user.staffId;
      }
      
      // Handle session updates (when update() is called)
      if (trigger === 'update' && session) {
        if (session.user?.name) {
          token.name = session.user.name;
        }
        if (session.user?.email) {
          token.email = session.user.email;
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as 'admin' | 'staff';
        session.user.staffId = token.staffId as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error'
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET
};

import { getSession } from '@/lib/auth-utils';
import { redirect } from 'next/navigation';

export default async function RootPage() {
  const session = await getSession();

  if (!session) return redirect('/login');
  if (session.user.role === 'admin') return redirect('/dashboard');
  return redirect('/inventory');
}

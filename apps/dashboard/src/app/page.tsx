import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token');
  
  // If logged in, go to dashboard
  if (token) {
    redirect('/app/dashboard');
  }
  
  // If not logged in, show public home page
  redirect('/home');
}


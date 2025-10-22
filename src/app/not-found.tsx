import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex max-sm:flex-col justify-center  items-center gap-4">
      <div>
        <Image src="/404.png" alt="Not Found" width={300} height={300} className="grayscale" />
      </div>
      <div className="space-y-8">
        <h1 className="lg:text-9xl text-primary">404</h1>
        <div className="space-y-2">
          <h2 className="uppercase text-primary">Looks like you&apos;re lost</h2>
          <p className="text-muted-foreground">The page you are looking for is not available</p>
        </div>
        <Link href="/" className="uppercase inline-flex items-center gap-6 group text-secondary">
          Go to Dashboard <ArrowRight className="group-hover:translate-x-2 transition-all" />
        </Link>
      </div>
    </div>
  );
}

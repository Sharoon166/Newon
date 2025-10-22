
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function NotAllowed() {
	return (
		<div className="min-h-screen flex max-sm:flex-col justify-center items-center gap-4 gap-x-12 p-4">
			<div>
				<div className="p-6 rounded-full">
					<AlertCircle className="size-24 text-destructive" />
				</div>
			</div>
			<div className="space-y-8 max-w-md">
				<h1 className="max-sm:text-6xl text-9xl text-destructive">403</h1>
				<div className="space-y-2">
					<h2 className="uppercase max-sm:text-xl text-2xl font-semibold text-destructive">Access Denied</h2>
					<p className="text-muted-foreground max-sm:text-sm">
						You don&apos;t have permission to access this page. Please contact your administrator if you believe this is an error.
					</p>
				</div>
				<div className="flex flex-col sm:flex-row gap-4">
					<Button asChild>
						<Link
							href="/"
						>
							Go to Home
						</Link>
					</Button>
					<Button asChild variant="outline">
						<Link
							href="/login"
						>
							Sign in with a different account
						</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}

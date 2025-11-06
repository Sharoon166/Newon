import { LoginForm } from "@/features/auth/components/login-form";
import { SessionProvider } from "@/features/auth/components/session-provider";

export default async function LoginPage() {
  return (
    <SessionProvider>
      <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </div>
    </SessionProvider>
  )
}

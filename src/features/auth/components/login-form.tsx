"use client"
import { Eye, EyeOff, GalleryVerticalEnd } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { signIn } from "@/services/auth/auth-client"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const router = useRouter()

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const result = await signIn.email({
        email,
        password,
        callbackURL: "/"
      })

      if (result.error) {
        toast.error(result.error.message || "Invalid credentials")
      } else {
        toast.success("Welcome back!")
        router.push("/")
      }
    } catch (error) {
      console.error("💥 Login error:", error)
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("w-full max-w-md mx-auto", className)} {...props}>
      <form onSubmit={handleSubmit}>
        <FieldGroup className="space-y-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex items-center gap-2 font-bold text-primary">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 p-2">
                  <GalleryVerticalEnd className="size-6 " />
                </div>
                Newon Inventory
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">
              Enter your credentials to access your account
            </p>
          </div>
          
          <div className="space-y-4">
            <Field>
              <FieldLabel htmlFor="email">Email address</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                autoComplete="email"
                required
                className="h-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            
            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <a 
                  href="#" 
                  className="text-sm font-medium text-primary hover:underline"
                  onClick={(e) => {
                    e.preventDefault()
                    toast.error("Ask your admin. If you are one that's irresponsible of you")
                    // Handle forgot password
                  }}
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="*********"
                  autoComplete="current-password"
                  required
                  className="h-10 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground "
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {showPassword ? "Hide password" : "Show password"}
                  </span>
                </button>
              </div>
            </Field>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
        </FieldGroup>
      </form>
      
      <div className="space-y-3 text-center mt-4">
        <p className="text-xs text-muted-foreground text-balance">
          This is an internal tool for authorized personnel only.
        </p>
      </div>
    </div>
  )
}

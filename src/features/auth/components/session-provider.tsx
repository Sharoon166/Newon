"use client"

import { useSession } from "@/services/auth/auth-client"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"

interface SessionProviderProps {
  children: React.ReactNode
  requireAuth?: boolean
}

export function SessionProvider({ children, requireAuth = false }: SessionProviderProps) {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isPending) {
      if (requireAuth && !session) {
        router.push("/login")
        return
      }
      
      // If user is authenticated and on login page, redirect to dashboard
      if (session && pathname === "/login") {
        router.push("/customers")
        return
      }
    }
  }, [session, isPending, requireAuth, router, pathname])

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (requireAuth && !session) {
    return null
  }

  return <>{children}</>
}
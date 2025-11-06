"use client"

import { useAuth } from "@/features/auth/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

interface AuthGuardProps {
  children: React.ReactNode
  requiredRole?: "admin" | "manager" | "staff"
  fallbackUrl?: string
}

export function AuthGuard({ 
  children, 
  requiredRole, 
  fallbackUrl = "/login" 
}: AuthGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push(fallbackUrl)
        return
      }

    //   if (requiredRole && user.role && user?.role !== requiredRole) {
    //     // Check role hierarchy: admin > staff
    //     const roleHierarchy = { admin: 2, staff: 1 }
    //     const userLevel = roleHierarchy[user?.role as keyof typeof roleHierarchy] || 0
    //     const requiredLevel = roleHierarchy[requiredRole]

    //     if (userLevel < requiredLevel) {
    //       router.push("/not-allowed")
    //       return
    //     }
    //   }
    }
  }, [isLoading, isAuthenticated, user, requiredRole, router, fallbackUrl])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  // if (requiredRole && user?.role !== requiredRole) {
  //   const roleHierarchy = { admin: 3, manager: 2, staff: 1 }
  //   const userLevel = roleHierarchy[user?.role as keyof typeof roleHierarchy] || 0
  //   const requiredLevel = roleHierarchy[requiredRole]

  //   if (userLevel < requiredLevel) {
  //     return null
  //   }
  // }

  return <>{children}</>
}
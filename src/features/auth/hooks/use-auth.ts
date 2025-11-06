"use client"

import { useSession, signOut } from "@/services/auth/auth-client"
import { useRouter } from "next/navigation"

export function useAuth() {
  const { data: session, isPending } = useSession()
  const router = useRouter()

  const logout = async () => {
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push("/login")
          }
        }
      })
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  return {
    user: session?.user,
    session,
    isLoading: isPending,
    isAuthenticated: !!session,
    logout
  }
}
"use client"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { LogOut } from "lucide-react"

export function LogoutButton() {
  const { logout } = useAuth()

  return (
    <Button variant="outline" onClick={logout} className="gap-2">
      <LogOut className="h-4 w-4" />
      Logout
    </Button>
  )
}
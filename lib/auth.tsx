"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"

type UserRole = "participant" | "admin"

interface User {
  email: string
  name: string
  role: UserRole
}

interface Session {
  user: User
  timestamp: number
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  logout: () => void
  refreshSession: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  logout: () => {},
  refreshSession: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const checkSession = () => {
    console.log("[v0] Checking session...")
    const sessionStr = localStorage.getItem("session")
    if (sessionStr) {
      try {
        const session: Session = JSON.parse(sessionStr)
        // Validate session (check if not expired - 24 hours)
        const now = Date.now()
        const sessionAge = now - session.timestamp
        const twentyFourHours = 24 * 60 * 60 * 1000

        if (sessionAge < twentyFourHours) {
          console.log("[v0] Valid session found:", session.user)
          setUser(session.user)
          return session.user
        } else {
          // Session expired
          console.log("[v0] Session expired")
          localStorage.removeItem("session")
          setUser(null)
          return null
        }
      } catch (error) {
        console.error("[v0] Error parsing session:", error)
        localStorage.removeItem("session")
        setUser(null)
        return null
      }
    }
    console.log("[v0] No session found")
    setUser(null)
    return null
  }

  useEffect(() => {
    checkSession()
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (!isLoading) {
      console.log("[v0] Auth check - user:", user, "pathname:", pathname)
      // Redirect logic
      if (!user && pathname !== "/login" && pathname !== "/") {
        console.log("[v0] No user, redirecting to login")
        router.push("/login")
      }

      // Protect admin routes
      if (user && user.role !== "admin" && pathname?.startsWith("/admin")) {
        console.log("[v0] Non-admin trying to access admin, redirecting")
        router.push("/trip/komodo-2025/overview")
      }

      // Protect participant routes
      if (user && user.role === "admin" && pathname?.startsWith("/trip")) {
        console.log("[v0] Admin trying to access participant, redirecting")
        router.push("/admin/dashboard")
      }
    }
  }, [user, isLoading, pathname, router])

  const logout = () => {
    console.log("[v0] Logging out...")
    localStorage.removeItem("session")
    // Clear all other localStorage items related to the app
    localStorage.removeItem("tripCheckIn")
    localStorage.removeItem("unlockedBadges")
    setUser(null)

    // Force navigate to login and reload
    router.push("/login")

    // Force a slight delay then reload to ensure clean state
    setTimeout(() => {
      window.location.href = "/login"
    }, 100)
  }

  const refreshSession = () => {
    console.log("[v0] Refreshing session...")
    checkSession()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Memuat...</p>
        </div>
      </div>
    )
  }

  return <AuthContext.Provider value={{ user, isLoading, logout, refreshSession }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

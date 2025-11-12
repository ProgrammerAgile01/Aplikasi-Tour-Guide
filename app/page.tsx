"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-client"

export default function Home() {
  // const router = useRouter()
  // const { user, isLoading } = useAuth()

  // useEffect(() => {
  //   if (!isLoading) {
  //     if (!user) {
  //       router.push("/login")
  //     } else if (user.role === "admin") {
  //       router.push("/admin/dashboard")
  //     } else {
  //       router.push("/trip/komodo-2025/overview")
  //     }
  //   }
  // }, [user, isLoading, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
        <p className="mt-4 text-slate-600">Memuat...</p>
      </div>
    </div>
  )
}

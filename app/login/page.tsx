// "use client"

// import type React from "react"

// import { useState, useEffect } from "react"
// import { useRouter } from "next/navigation"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { toast } from "@/hooks/use-toast"
// import { Compass } from "lucide-react"
// import { useAuth } from "@/lib/auth"
// import { playVoiceGreeting } from "@/lib/voice-greeting"

// export default function LoginPage() {
//   const router = useRouter()
//   const { refreshSession, user } = useAuth()
//   const [email, setEmail] = useState("")
//   const [password, setPassword] = useState("")
//   const [role, setRole] = useState<"participant" | "admin">("participant")
//   const [isLoading, setIsLoading] = useState(false)

//   useEffect(() => {
//     console.log("[v0] Login page - checking if user already logged in:", user)
//     if (user) {
//       console.log("[v0] User already logged in, redirecting...")
//       if (user.role === "admin") {
//         router.push("/admin/dashboard")
//       } else {
//         router.push("/trip/komodo-2025/overview")
//       }
//     }
//   }, [user, router])

//   const handleLogin = async (e: React.FormEvent) => {
//     e.preventDefault()
//     setIsLoading(true)

//     console.log("[v0] Attempting login...")

//     // Mock authentication
//     await new Promise((resolve) => setTimeout(resolve, 800))

//     // Mock credentials
//     const validCredentials = {
//       participant: { email: "peserta@trip.com", password: "peserta123" },
//       admin: { email: "admin@trip.com", password: "admin123" },
//     }

//     if (email === validCredentials[role].email && password === validCredentials[role].password) {
//       // Save session to localStorage
//       const session = {
//         user: {
//           email,
//           name: role === "admin" ? "Administrator" : "Peserta VIP",
//           role,
//         },
//         timestamp: Date.now(),
//       }
//       console.log("[v0] Login successful, saving session:", session)
//       localStorage.setItem("session", JSON.stringify(session))

//       refreshSession()

//       if (role === "participant") {
//         playVoiceGreeting(session.user.name)
//       }

//       toast({
//         title: "Login Berhasil",
//         description: `Selamat datang, ${session.user.name}`,
//       })

//       setTimeout(() => {
//         if (role === "admin") {
//           console.log("[v0] Redirecting to admin dashboard")
//           router.push("/admin/dashboard")
//         } else {
//           console.log("[v0] Redirecting to participant overview")
//           router.push("/trip/komodo-2025/overview")
//         }
//       }, 100)
//     } else {
//       setIsLoading(false)
//       console.log("[v0] Login failed - invalid credentials")
//       toast({
//         title: "Login Gagal",
//         description: "Email atau kata sandi salah.",
//         variant: "destructive",
//       })
//     }
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
//       <Card className="w-full max-w-md">
//         <CardHeader className="space-y-4 text-center">
//           <div className="flex justify-center">
//             <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center">
//               <Compass className="w-10 h-10 text-white" />
//             </div>
//           </div>
//           <div>
//             <CardTitle className="text-2xl font-bold text-slate-900">Trip Komodo Executive</CardTitle>
//             <CardDescription className="text-slate-600 mt-2">Sistem Pemandu Wisata Eksekutif</CardDescription>
//           </div>
//         </CardHeader>
//         <CardContent>
//           <form onSubmit={handleLogin} className="space-y-6">
//             <div className="space-y-2">
//               <Label htmlFor="email">Email / Nomor HP</Label>
//               <Input
//                 id="email"
//                 type="text"
//                 placeholder="peserta@trip.com"
//                 value={email}
//                 onChange={(e) => setEmail(e.target.value)}
//                 required
//                 className="h-11"
//               />
//             </div>

//             <div className="space-y-2">
//               <Label htmlFor="password">Kata Sandi</Label>
//               <Input
//                 id="password"
//                 type="password"
//                 placeholder="••••••••"
//                 value={password}
//                 onChange={(e) => setPassword(e.target.value)}
//                 required
//                 className="h-11"
//               />
//             </div>

//             <div className="space-y-3">
//               <Label>Login sebagai</Label>
//               <RadioGroup value={role} onValueChange={(v) => setRole(v as "participant" | "admin")}>
//                 <div className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-slate-50 transition-colors">
//                   <RadioGroupItem value="participant" id="participant" />
//                   <Label htmlFor="participant" className="flex-1 cursor-pointer font-normal">
//                     Peserta
//                   </Label>
//                 </div>
//                 <div className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-slate-50 transition-colors">
//                   <RadioGroupItem value="admin" id="admin" />
//                   <Label htmlFor="admin" className="flex-1 cursor-pointer font-normal">
//                     Admin
//                   </Label>
//                 </div>
//               </RadioGroup>
//             </div>

//             <Button type="submit" className="w-full h-11" disabled={isLoading}>
//               {isLoading ? "Memproses..." : "Masuk"}
//             </Button>

//             <div className="text-xs text-center text-slate-500 space-y-1">
//               <p className="font-medium text-slate-700">Demo Credentials:</p>
//               <p>Peserta: peserta@trip.com / peserta123</p>
//               <p>Admin: admin@trip.com / admin123</p>
//             </div>
//           </form>
//         </CardContent>
//       </Card>
//     </div>
//   )
// }

"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Compass } from "lucide-react";
import { useAuth } from "@/lib/auth-client";
import { playVoiceGreeting } from "@/lib/voice-greeting";

export default function LoginPage() {
  const router = useRouter();
  const { refreshSession, user } = useAuth();
  const [identifier, setIdentifier] = useState(""); // email or whatsapp
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // if (user) {
    //   if (user.role === "ADMIN") router.push("/admin/dashboard");
    //   else router.push("/trip/komodo-2025/overview");
    // }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
        credentials: "same-origin",
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.message || "Login gagal");

      await refreshSession(); // <— biarkan AuthProvider yang redirect

      toast({
        title: "Login Berhasil",
        description: `Selamat datang, ${json?.user?.name ?? "User"}`,
      });

      // opsional: sapa
      if (json?.user?.name) playVoiceGreeting(json.user.name);
    } catch (err: any) {
      console.error("login error:", err);
      toast({
        title: "Login Gagal",
        description: err.message || "Cek kredensial",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center">
              <Compass className="w-10 h-10 text-white" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-slate-900">
              Trip Komodo Executive
            </CardTitle>
            <CardDescription className="text-slate-600 mt-2">
              Sistem Pemandu Wisata Eksekutif
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="identifier">Email atau Nomor WhatsApp</Label>
              <Input
                id="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="email atau +62812..."
                className="h-11"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Kata Sandi</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11"
                required
              />
            </div>

            <Button type="submit" className="w-full h-11" disabled={isLoading}>
              {isLoading ? "Memproses..." : "Masuk"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
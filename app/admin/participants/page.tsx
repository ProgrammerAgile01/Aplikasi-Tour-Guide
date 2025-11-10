"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { Search, CheckCircle2, XCircle, Users } from "lucide-react"

interface Participant {
  id: string
  name: string
  phone: string
  group: string
  lastCheckIn?: string
  totalCheckIns: number
}

export default function AdminParticipantsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [participants, setParticipants] = useState<Participant[]>([
    {
      id: "1",
      name: "Budi Santoso",
      phone: "+62 812-3456-7890",
      group: "Bus A",
      lastCheckIn: "Pulau Komodo - 10:15",
      totalCheckIns: 12,
    },
    {
      id: "2",
      name: "Siti Rahayu",
      phone: "+62 813-9876-5432",
      group: "Bus A",
      lastCheckIn: "Pantai Pink - 08:30",
      totalCheckIns: 11,
    },
    {
      id: "3",
      name: "Ahmad Wijaya",
      phone: "+62 856-1234-5678",
      group: "Bus B",
      lastCheckIn: "Bukit Padar - 06:45",
      totalCheckIns: 10,
    },
    {
      id: "4",
      name: "Dewi Lestari",
      phone: "+62 821-7654-3210",
      group: "Bus B",
      totalCheckIns: 9,
    },
    {
      id: "5",
      name: "Rudi Hartono",
      phone: "+62 877-2468-1357",
      group: "Bus A",
      lastCheckIn: "Pelabuhan - 14:30",
      totalCheckIns: 13,
    },
  ])

  const filteredParticipants = participants.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.includes(searchQuery) ||
      p.group.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleMarkPresent = (id: string) => {
    setParticipants(
      participants.map((p) =>
        p.id === id ? { ...p, lastCheckIn: "Manual Admin - Sekarang", totalCheckIns: p.totalCheckIns + 1 } : p,
      ),
    )
    toast({
      title: "Kehadiran Dikonfirmasi",
      description: "Peserta berhasil ditandai hadir.",
    })
  }

  const handleMarkAllPresent = () => {
    setParticipants(
      participants.map((p) => ({
        ...p,
        lastCheckIn: "Manual Admin - Sekarang",
        totalCheckIns: p.totalCheckIns + 1,
      })),
    )
    toast({
      title: "Semua Ditandai Hadir",
      description: "Seluruh peserta berhasil ditandai hadir.",
    })
  }

  const stats = {
    total: participants.length,
    present: participants.filter((p) => p.lastCheckIn).length,
    absent: participants.filter((p) => !p.lastCheckIn).length,
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Peserta</h1>
          <p className="text-slate-600 mt-1">Kelola data peserta perjalanan</p>
        </div>
        <Button onClick={handleMarkAllPresent} className="gap-2">
          <CheckCircle2 size={16} />
          Tandai Semua Hadir
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-sm text-slate-600">Total Peserta</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.present}</p>
                <p className="text-sm text-slate-600">Sudah Check-in</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.absent}</p>
                <p className="text-sm text-slate-600">Belum Check-in</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <Input
              placeholder="Cari peserta berdasarkan nama, nomor WA, atau grup..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Participants Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Peserta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Nama</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Nomor WA</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Grup/Bus</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Status Kehadiran Terakhir</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Total Check-in</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredParticipants.map((participant) => (
                  <tr key={participant.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-900">{participant.name}</td>
                    <td className="py-3 px-4 text-slate-600">{participant.phone}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {participant.group}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {participant.lastCheckIn ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-green-600" />
                          <span className="text-sm text-slate-700">{participant.lastCheckIn}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <XCircle size={16} className="text-red-600" />
                          <span className="text-sm text-slate-500">Belum hadir</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{participant.totalCheckIns}</td>
                    <td className="py-3 px-4">
                      <Button variant="outline" size="sm" onClick={() => handleMarkPresent(participant.id)}>
                        Tandai Hadir
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

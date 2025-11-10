"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { Search, MapPin, Clock, QrCode, CheckCircle2, XCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AttendanceRecord {
  id: string
  participantName: string
  sessionTitle: string
  location: string
  method: "geo" | "qr" | "admin"
  timestamp: string
  status: "present" | "absent"
}

export default function AdminAttendancePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterMethod, setFilterMethod] = useState<string>("all")
  const [filterLocation, setFilterLocation] = useState<string>("all")

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([
    {
      id: "1",
      participantName: "Budi Santoso",
      sessionTitle: "Explore Pulau Komodo",
      location: "Pulau Komodo",
      method: "geo",
      timestamp: "28 Nov 2025, 10:15",
      status: "present",
    },
    {
      id: "2",
      participantName: "Siti Rahayu",
      sessionTitle: "Pantai Pink",
      location: "Pantai Pink",
      method: "qr",
      timestamp: "28 Nov 2025, 08:30",
      status: "present",
    },
    {
      id: "3",
      participantName: "Ahmad Wijaya",
      sessionTitle: "Sunrise di Bukit Padar",
      location: "Bukit Padar",
      method: "geo",
      timestamp: "28 Nov 2025, 06:45",
      status: "present",
    },
    {
      id: "4",
      participantName: "Dewi Lestari",
      sessionTitle: "Penjemputan di Bandara",
      location: "Komodo Airport",
      method: "admin",
      timestamp: "27 Nov 2025, 13:20",
      status: "present",
    },
    {
      id: "5",
      participantName: "Rudi Hartono",
      sessionTitle: "Menuju Pelabuhan",
      location: "Pelabuhan Labuan Bajo",
      method: "geo",
      timestamp: "27 Nov 2025, 14:30",
      status: "present",
    },
  ])

  const locations = ["all", ...Array.from(new Set(attendanceRecords.map((r) => r.location)))]

  const filteredRecords = attendanceRecords.filter((record) => {
    const matchesSearch =
      record.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.sessionTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.location.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesMethod = filterMethod === "all" || record.method === filterMethod
    const matchesLocation = filterLocation === "all" || record.location === filterLocation

    return matchesSearch && matchesMethod && matchesLocation
  })

  const handleUpdateStatus = (id: string, newStatus: "present" | "absent") => {
    setAttendanceRecords(
      attendanceRecords.map((record) => (record.id === id ? { ...record, status: newStatus } : record)),
    )
    toast({
      title: "Status Diperbarui",
      description: `Status kehadiran berhasil diubah menjadi ${newStatus === "present" ? "Hadir" : "Tidak Hadir"}.`,
    })
  }

  const methodBadge = (method: string) => {
    const styles = {
      geo: "bg-blue-100 text-blue-700",
      qr: "bg-purple-100 text-purple-700",
      admin: "bg-slate-100 text-slate-700",
    }
    const icons = {
      geo: <MapPin size={12} />,
      qr: <QrCode size={12} />,
      admin: <CheckCircle2 size={12} />,
    }
    const labels = {
      geo: "GEO",
      qr: "QR",
      admin: "Admin",
    }

    return (
      <span
        className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full font-medium ${styles[method as keyof typeof styles]}`}
      >
        {icons[method as keyof typeof icons]}
        {labels[method as keyof typeof labels]}
      </span>
    )
  }

  const stats = {
    total: attendanceRecords.length,
    geo: attendanceRecords.filter((r) => r.method === "geo").length,
    qr: attendanceRecords.filter((r) => r.method === "qr").length,
    admin: attendanceRecords.filter((r) => r.method === "admin").length,
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Absensi & Kehadiran</h1>
        <p className="text-slate-600 mt-1">Rekap kehadiran peserta per lokasi dan waktu</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
              <p className="text-sm text-slate-600 mt-1">Total Check-in</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{stats.geo}</p>
              <p className="text-sm text-slate-600 mt-1">Via GEO</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">{stats.qr}</p>
              <p className="text-sm text-slate-600 mt-1">Via QR</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-slate-600">{stats.admin}</p>
              <p className="text-sm text-slate-600 mt-1">Manual Admin</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <Input
                placeholder="Cari peserta atau lokasi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterMethod} onValueChange={setFilterMethod}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter Metode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Metode</SelectItem>
                <SelectItem value="geo">GEO Check</SelectItem>
                <SelectItem value="qr">Scan QR</SelectItem>
                <SelectItem value="admin">Admin Manual</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterLocation} onValueChange={setFilterLocation}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter Lokasi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Lokasi</SelectItem>
                {locations
                  .filter((l) => l !== "all")
                  .map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Rekap Kehadiran</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Nama</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Sesi</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Lokasi</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Metode</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Waktu</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-900">{record.participantName}</td>
                    <td className="py-3 px-4 text-slate-700">{record.sessionTitle}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin size={14} />
                        {record.location}
                      </div>
                    </td>
                    <td className="py-3 px-4">{methodBadge(record.method)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Clock size={14} />
                        {record.timestamp}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {record.status === "present" ? (
                        <span className="flex items-center gap-1 text-green-600 font-medium">
                          <CheckCircle2 size={16} />
                          Hadir
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600 font-medium">
                          <XCircle size={16} />
                          Tidak Hadir
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleUpdateStatus(record.id, record.status === "present" ? "absent" : "present")
                        }
                      >
                        Ubah Status
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

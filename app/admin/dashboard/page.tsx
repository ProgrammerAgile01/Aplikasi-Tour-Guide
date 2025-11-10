"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Calendar, CheckCircle2, ImageIcon } from "lucide-react"

export default function AdminDashboard() {
  // Mock data
  const stats = {
    totalParticipants: 24,
    totalAgenda: 23,
    attendanceRate: 87.5,
    totalPhotos: 156,
  }

  const dailyAttendance = [
    { day: "Hari 1", date: "27 Nov", count: 22, total: 24, percentage: 91.7 },
    { day: "Hari 2", date: "28 Nov", count: 21, total: 24, percentage: 87.5 },
    { day: "Hari 3", date: "29 Nov", count: 20, total: 24, percentage: 83.3 },
  ]

  const maxCount = Math.max(...dailyAttendance.map((d) => d.count))

  const recentActivity = [
    { user: "Budi Santoso", action: "Check-in di Pulau Komodo", time: "2 menit lalu" },
    { user: "Siti Rahayu", action: "Upload foto di galeri", time: "5 menit lalu" },
    { user: "Ahmad Wijaya", action: "Check-in di Pantai Pink", time: "12 menit lalu" },
    { user: "Dewi Lestari", action: "Memberikan rating 5 bintang", time: "18 menit lalu" },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-1">Ringkasan perjalanan Trip Komodo Executive</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Peserta</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.totalParticipants}</div>
            <p className="text-xs text-slate-500 mt-1">Terdaftar dalam trip</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Agenda</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.totalAgenda}</div>
            <p className="text-xs text-slate-500 mt-1">Sesi dalam 3 hari</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Tingkat Kehadiran</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.attendanceRate}%</div>
            <p className="text-xs text-slate-500 mt-1">Rata-rata kehadiran</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Foto di Galeri</CardTitle>
            <ImageIcon className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.totalPhotos}</div>
            <p className="text-xs text-slate-500 mt-1">Diunggah peserta</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">Kehadiran per Hari</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dailyAttendance.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{item.day}</span>
                      <span className="text-slate-500">({item.date})</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-slate-900">
                        {item.count}/{item.total}
                      </span>
                      <span className="text-slate-500 ml-2">({item.percentage}%)</span>
                    </div>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${(item.count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">Aktivitas Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-blue-600">
                      {activity.user
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 font-medium">{activity.user}</p>
                    <p className="text-sm text-slate-600 mt-0.5">{activity.action}</p>
                    <p className="text-xs text-slate-400 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">Aksi Cepat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button className="p-4 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left">
              <div className="font-medium text-slate-900">Tambah Jadwal Baru</div>
              <div className="text-sm text-slate-600 mt-1">Buat agenda tambahan</div>
            </button>
            <button className="p-4 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left">
              <div className="font-medium text-slate-900">Kirim Pengumuman</div>
              <div className="text-sm text-slate-600 mt-1">Broadcast ke semua peserta</div>
            </button>
            <button className="p-4 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left">
              <div className="font-medium text-slate-900">Export Laporan</div>
              <div className="text-sm text-slate-600 mt-1">Download data kehadiran</div>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

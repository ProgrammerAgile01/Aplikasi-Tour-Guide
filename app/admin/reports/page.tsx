"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, TrendingUp, Users, Calendar, ImageIcon } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function AdminReportsPage() {
  const handleExport = (format: "excel" | "pdf") => {
    toast({
      title: "Export Dimulai",
      description: `Laporan sedang diexport ke format ${format.toUpperCase()}...`,
    })

    // Simulate download
    setTimeout(() => {
      toast({
        title: "Export Selesai",
        description: `Laporan berhasil didownload dalam format ${format.toUpperCase()}.`,
      })
    }, 2000)
  }

  const dailyAttendance = [
    { day: "Hari 1", date: "27 Nov", count: 22, total: 24, percentage: 91.7 },
    { day: "Hari 2", date: "28 Nov", count: 21, total: 24, percentage: 87.5 },
    { day: "Hari 3", date: "29 Nov", count: 20, total: 24, percentage: 83.3 },
  ]

  const topAgenda = [
    { title: "Explore Pulau Komodo", checkins: 23, percentage: 95.8 },
    { title: "Sunrise di Bukit Padar", checkins: 22, percentage: 91.7 },
    { title: "Pantai Pink", checkins: 21, percentage: 87.5 },
    { title: "Snorkeling di Manta Point", checkins: 20, percentage: 83.3 },
    { title: "Penjemputan di Bandara", checkins: 24, percentage: 100 },
  ]

  const photoStats = [
    { day: "Hari 1", uploaded: 45, approved: 42, pending: 3 },
    { day: "Hari 2", uploaded: 68, approved: 60, pending: 8 },
    { day: "Hari 3", uploaded: 43, approved: 40, pending: 3 },
  ]

  const maxCheckins = Math.max(...topAgenda.map((a) => a.checkins))

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Laporan & Statistik</h1>
          <p className="text-slate-600 mt-1">Analisis lengkap perjalanan Trip Komodo Executive</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => handleExport("excel")} variant="outline" className="gap-2">
            <Download size={16} />
            Export Excel
          </Button>
          <Button onClick={() => handleExport("pdf")} className="gap-2">
            <Download size={16} />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">24</p>
                <p className="text-sm text-slate-600">Total Peserta</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">23</p>
                <p className="text-sm text-slate-600">Total Agenda</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">87.5%</p>
                <p className="text-sm text-slate-600">Rata-rata Kehadiran</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">156</p>
                <p className="text-sm text-slate-600">Foto Terunggah</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Attendance Graph */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp size={20} />
              Grafik Kehadiran per Hari
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {dailyAttendance.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex flex-col items-center justify-center text-white">
                        <span className="text-xs font-medium">Hari</span>
                        <span className="text-xl font-bold">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{item.date}</p>
                        <p className="text-sm text-slate-600">
                          {item.count} dari {item.total} peserta
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">{item.percentage}%</p>
                    </div>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top 5 Agenda */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar size={20} />
              Top 5 Agenda Paling Banyak Dikonfirmasi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topAgenda.map((agenda, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{agenda.title}</p>
                        <p className="text-sm text-slate-600">{agenda.checkins} check-ins</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="font-semibold text-slate-900">{agenda.percentage}%</p>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${(agenda.checkins / maxCheckins) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Photo Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon size={20} />
            Statistik Foto yang Diunggah Peserta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Periode</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Total Upload</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Disetujui</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Menunggu</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Tingkat Persetujuan</th>
                </tr>
              </thead>
              <tbody>
                {photoStats.map((stat, index) => (
                  <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-900">{stat.day}</td>
                    <td className="py-3 px-4 text-slate-700">{stat.uploaded}</td>
                    <td className="py-3 px-4">
                      <span className="text-green-600 font-medium">{stat.approved}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-orange-600 font-medium">{stat.pending}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[100px]">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${(stat.approved / stat.uploaded) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-slate-700">
                          {Math.round((stat.approved / stat.uploaded) * 100)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold">
                  <td className="py-3 px-4 text-slate-900">Total</td>
                  <td className="py-3 px-4 text-slate-900">{photoStats.reduce((sum, s) => sum + s.uploaded, 0)}</td>
                  <td className="py-3 px-4 text-green-600">{photoStats.reduce((sum, s) => sum + s.approved, 0)}</td>
                  <td className="py-3 px-4 text-orange-600">{photoStats.reduce((sum, s) => sum + s.pending, 0)}</td>
                  <td className="py-3 px-4 text-slate-900">
                    {Math.round(
                      (photoStats.reduce((sum, s) => sum + s.approved, 0) /
                        photoStats.reduce((sum, s) => sum + s.uploaded, 0)) *
                        100,
                    )}
                    %
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Export Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Download className="text-blue-600 flex-shrink-0 mt-1" size={20} />
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">Export Laporan Lengkap</h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                Anda dapat mengexport seluruh data laporan ini ke format Excel atau PDF. Laporan akan mencakup semua
                statistik, grafik kehadiran, data peserta, dan rekap aktivitas selama perjalanan.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

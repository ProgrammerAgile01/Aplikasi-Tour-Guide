"use client"

import { Card } from "@/components/ui/card"
import { AlertCircle, Clock } from "lucide-react"

interface Announcement {
  id: number
  title: string
  content: string
  time: string
  priority: "high" | "normal"
}

export default function AnnouncementsPage() {
  // Mock data
  const announcements: Announcement[] = [
    {
      id: 1,
      title: "Perubahan Jadwal Makan Malam",
      content: "Jadwal makan malam dimajukan ke pukul 18.00. Mohon hadir tepat waktu di area makan kapal.",
      time: "Tadi, 14.30",
      priority: "high",
    },
    {
      id: 2,
      title: "Perhatian Keselamatan",
      content: "Mohon gunakan alas kaki anti-slip saat di dek kapal untuk mencegah tergelincir.",
      time: "Tadi, 10.15",
      priority: "high",
    },
    {
      id: 3,
      title: "Pengambilan Foto Grup",
      content: "Pengambilan foto grup pada pukul 16.30 di dek utama. Dimohon untuk hadir di lokasi tersebut.",
      time: "Kemarin, 08.45",
      priority: "normal",
    },
    {
      id: 4,
      title: "Briefing Sebelum Snorkeling",
      content:
        "Briefing keselamatan snorkeling akan dilakukan pukul 08.00 di area persiapan. Sudah tersedia peralatan snorkeling lengkap.",
      time: "Kemarin, 18.00",
      priority: "normal",
    },
    {
      id: 5,
      title: "Informasi Cuaca",
      content:
        "Cuaca esok hari diprediksi cerah dengan angin lemah. Aktivitas snorkeling dan explore pulau tetap berjalan sesuai jadwal.",
      time: "Kemarin, 16.30",
      priority: "normal",
    },
  ]

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pengumuman Resmi</h1>
        <p className="text-sm text-muted-foreground mt-1">Informasi penting untuk perjalanan Anda</p>
      </div>

      {/* Announcements List */}
      <div className="space-y-3">
        {announcements.map((announcement) => (
          <Card
            key={announcement.id}
            className={`p-4 border ${
              announcement.priority === "high" ? "border-orange-200 bg-orange-50/50" : "border-border"
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-foreground flex-1">{announcement.title}</h3>
                {announcement.priority === "high" && (
                  <AlertCircle size={18} className="text-orange-600 flex-shrink-0" />
                )}
              </div>

              <p className="text-sm text-foreground leading-relaxed">{announcement.content}</p>

              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock size={14} />
                {announcement.time}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

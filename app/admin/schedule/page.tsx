"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { Plus, Edit2, Trash2, Send, Clock, MapPin } from "lucide-react"

interface ScheduleItem {
  id: string
  day: number
  date: string
  time: string
  title: string
  location: string
  description?: string
  isChanged?: boolean
  isAdditional?: boolean
}

export default function AdminSchedulePage() {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([
    {
      id: "1-1",
      day: 1,
      date: "27 November 2025",
      time: "13.00",
      title: "Penjemputan di Bandara Komodo Airport",
      location: "Komodo Airport",
      description: "Tim akan menjemput peserta di bandara",
    },
    {
      id: "1-2",
      day: 1,
      date: "27 November 2025",
      time: "14.30",
      title: "Menuju ke pelabuhan untuk inap di Pinisi Deluxe",
      location: "Pelabuhan Labuan Bajo",
    },
    {
      id: "2-1",
      day: 2,
      date: "28 November 2025",
      time: "05.30",
      title: "Morning call, naik ke Bukit Padar",
      location: "Bukit Padar",
      isChanged: true,
    },
  ])

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null)
  const [formData, setFormData] = useState({
    day: 1,
    date: "",
    time: "",
    title: "",
    location: "",
    description: "",
    isChanged: false,
    isAdditional: false,
  })

  const handleAddSchedule = () => {
    const newSchedule: ScheduleItem = {
      id: `${formData.day}-${Date.now()}`,
      ...formData,
    }
    setSchedules([...schedules, newSchedule])
    setIsAddDialogOpen(false)
    resetForm()
    toast({
      title: "Jadwal Ditambahkan",
      description: "Jadwal baru berhasil ditambahkan.",
    })
  }

  const handleEditSchedule = (schedule: ScheduleItem) => {
    setEditingSchedule(schedule)
    setFormData({
      day: schedule.day,
      date: schedule.date,
      time: schedule.time,
      title: schedule.title,
      location: schedule.location,
      description: schedule.description || "",
      isChanged: schedule.isChanged || false,
      isAdditional: schedule.isAdditional || false,
    })
  }

  const handleUpdateSchedule = () => {
    if (editingSchedule) {
      setSchedules(schedules.map((s) => (s.id === editingSchedule.id ? { ...editingSchedule, ...formData } : s)))
      setEditingSchedule(null)
      resetForm()
      toast({
        title: "Jadwal Diperbarui",
        description: "Perubahan jadwal berhasil disimpan.",
      })
    }
  }

  const handleDeleteSchedule = (id: string) => {
    setSchedules(schedules.filter((s) => s.id !== id))
    toast({
      title: "Jadwal Dihapus",
      description: "Jadwal berhasil dihapus dari daftar.",
    })
  }

  const handleSendToParticipants = () => {
    toast({
      title: "Jadwal Dikirim",
      description: "Perubahan jadwal telah dikirim ke seluruh peserta.",
    })
  }

  const resetForm = () => {
    setFormData({
      day: 1,
      date: "",
      time: "",
      title: "",
      location: "",
      description: "",
      isChanged: false,
      isAdditional: false,
    })
  }

  const schedulesByDay = schedules.reduce(
    (acc, schedule) => {
      if (!acc[schedule.day]) acc[schedule.day] = []
      acc[schedule.day].push(schedule)
      return acc
    },
    {} as Record<number, ScheduleItem[]>,
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Jadwal & Itinerary</h1>
          <p className="text-slate-600 mt-1">Kelola jadwal perjalanan peserta</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSendToParticipants} variant="outline" className="gap-2 bg-transparent">
            <Send size={16} />
            Kirim ke Peserta
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus size={16} />
                Tambah Jadwal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tambah Jadwal Baru</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Hari</Label>
                  <select
                    className="w-full h-10 px-3 border border-slate-200 rounded-md"
                    value={formData.day}
                    onChange={(e) => setFormData({ ...formData, day: Number(e.target.value) })}
                  >
                    <option value={1}>Hari 1 - 27 November 2025</option>
                    <option value={2}>Hari 2 - 28 November 2025</option>
                    <option value={3}>Hari 3 - 29 November 2025</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Waktu</Label>
                  <Input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Judul Aktivitas</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Contoh: Trekking Pulau Komodo"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lokasi</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Contoh: Pulau Komodo"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Deskripsi (Opsional)</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Tambahan informasi tentang aktivitas ini..."
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isAdditional"
                      checked={formData.isAdditional}
                      onCheckedChange={(checked) => setFormData({ ...formData, isAdditional: checked as boolean })}
                    />
                    <Label htmlFor="isAdditional" className="font-normal">
                      Tandai sebagai Jadwal Tambahan
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isChanged"
                      checked={formData.isChanged}
                      onCheckedChange={(checked) => setFormData({ ...formData, isChanged: checked as boolean })}
                    />
                    <Label htmlFor="isChanged" className="font-normal">
                      Tandai sebagai Perubahan Jadwal
                    </Label>
                  </div>
                </div>
                <Button onClick={handleAddSchedule} className="w-full">
                  Simpan Jadwal
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Schedule List by Day */}
      <div className="space-y-6">
        {Object.entries(schedulesByDay)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([day, daySchedules]) => (
            <Card key={day}>
              <CardHeader>
                <CardTitle className="text-lg">
                  Hari {day} - {daySchedules[0]?.date}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {daySchedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-blue-600">
                              <Clock size={16} />
                              <span className="font-semibold">{schedule.time}</span>
                            </div>
                            {schedule.isChanged && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                                Perubahan
                              </span>
                            )}
                            {schedule.isAdditional && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                                Tambahan
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-slate-900">{schedule.title}</h3>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <MapPin size={14} />
                            {schedule.location}
                          </div>
                          {schedule.description && <p className="text-sm text-slate-600">{schedule.description}</p>}
                        </div>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="icon" onClick={() => handleEditSchedule(schedule)}>
                                <Edit2 size={16} />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Edit Jadwal</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label>Waktu</Label>
                                  <Input
                                    type="time"
                                    value={formData.time}
                                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Judul Aktivitas</Label>
                                  <Input
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Lokasi</Label>
                                  <Input
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Deskripsi</Label>
                                  <Textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-3">
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="edit-isAdditional"
                                      checked={formData.isAdditional}
                                      onCheckedChange={(checked) =>
                                        setFormData({ ...formData, isAdditional: checked as boolean })
                                      }
                                    />
                                    <Label htmlFor="edit-isAdditional" className="font-normal">
                                      Jadwal Tambahan
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="edit-isChanged"
                                      checked={formData.isChanged}
                                      onCheckedChange={(checked) =>
                                        setFormData({ ...formData, isChanged: checked as boolean })
                                      }
                                    />
                                    <Label htmlFor="edit-isChanged" className="font-normal">
                                      Perubahan Jadwal
                                    </Label>
                                  </div>
                                </div>
                                <Button onClick={handleUpdateSchedule} className="w-full">
                                  Simpan Perubahan
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button variant="outline" size="icon" onClick={() => handleDeleteSchedule(schedule.id)}>
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { Plus, Edit2, Trash2, Pin, AlertCircle, Info } from "lucide-react"

interface Announcement {
  id: string
  title: string
  content: string
  priority: "normal" | "important"
  isPinned: boolean
  createdAt: string
}

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([
    {
      id: "1",
      title: "Perubahan Jadwal Hari Ke-2",
      content:
        "Waktu keberangkatan ke Bukit Padar dimajukan menjadi pukul 05.30 WIB untuk mengejar sunrise yang sempurna.",
      priority: "important",
      isPinned: true,
      createdAt: "27 Nov 2025, 20:00",
    },
    {
      id: "2",
      title: "Persiapan Snorkeling",
      content: "Harap membawa sunscreen waterproof dan kamera underwater untuk dokumentasi terbaik.",
      priority: "normal",
      isPinned: false,
      createdAt: "27 Nov 2025, 18:30",
    },
    {
      id: "3",
      title: "Bonus Aktivitas",
      content: "Kami menambahkan diving spot di Kanawa Island untuk hari ke-2. Aktivitas ini opsional dan gratis!",
      priority: "important",
      isPinned: true,
      createdAt: "27 Nov 2025, 15:00",
    },
  ])

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    priority: "normal" as "normal" | "important",
    isPinned: false,
  })

  const handleAddAnnouncement = () => {
    const newAnnouncement: Announcement = {
      id: Date.now().toString(),
      ...formData,
      createdAt: new Date().toLocaleString("id-ID"),
    }
    setAnnouncements([newAnnouncement, ...announcements])
    setIsAddDialogOpen(false)
    resetForm()
    toast({
      title: "Pengumuman Ditambahkan",
      description: "Pengumuman baru berhasil dipublikasikan ke peserta.",
    })
  }

  const handleEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncement(announcement)
    setFormData({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      isPinned: announcement.isPinned,
    })
  }

  const handleUpdateAnnouncement = () => {
    if (editingAnnouncement) {
      setAnnouncements(
        announcements.map((a) => (a.id === editingAnnouncement.id ? { ...editingAnnouncement, ...formData } : a)),
      )
      setEditingAnnouncement(null)
      resetForm()
      toast({
        title: "Pengumuman Diperbarui",
        description: "Perubahan berhasil disimpan.",
      })
    }
  }

  const handleDeleteAnnouncement = (id: string) => {
    setAnnouncements(announcements.filter((a) => a.id !== id))
    toast({
      title: "Pengumuman Dihapus",
      description: "Pengumuman berhasil dihapus.",
    })
  }

  const handleTogglePin = (id: string) => {
    setAnnouncements(announcements.map((a) => (a.id === id ? { ...a, isPinned: !a.isPinned } : a)))
    toast({
      title: "Status Pin Diubah",
      description: "Pengumuman berhasil diperbarui.",
    })
  }

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      priority: "normal",
      isPinned: false,
    })
  }

  // Sort: pinned first, then by date
  const sortedAnnouncements = [...announcements].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    return 0
  })

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Pengumuman</h1>
          <p className="text-slate-600 mt-1">Kelola pengumuman untuk peserta</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus size={16} />
              Buat Pengumuman
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Buat Pengumuman Baru</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Judul</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Contoh: Perubahan Jadwal Hari Ke-2"
                />
              </div>
              <div className="space-y-2">
                <Label>Isi Pengumuman</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Tulis detail pengumuman di sini..."
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label>Prioritas</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value as "normal" | "important" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="important">Penting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPinned"
                  checked={formData.isPinned}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPinned: checked as boolean })}
                />
                <Label htmlFor="isPinned" className="font-normal">
                  Pin di urutan teratas
                </Label>
              </div>
              <Button onClick={handleAddAnnouncement} className="w-full">
                Publikasikan
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-slate-900">{announcements.length}</p>
              <p className="text-sm text-slate-600 mt-1">Total Pengumuman</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">
                {announcements.filter((a) => a.priority === "important").length}
              </p>
              <p className="text-sm text-slate-600 mt-1">Penting</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{announcements.filter((a) => a.isPinned).length}</p>
              <p className="text-sm text-slate-600 mt-1">Dipasang Pin</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {sortedAnnouncements.map((announcement) => (
          <Card
            key={announcement.id}
            className={`
              ${announcement.priority === "important" ? "border-red-300 border-2" : ""}
              ${announcement.isPinned ? "bg-blue-50/50" : ""}
            `}
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {announcement.isPinned && (
                      <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                        <Pin size={12} />
                        Dipasang
                      </span>
                    )}
                    {announcement.priority === "important" ? (
                      <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                        <AlertCircle size={12} />
                        Penting
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full font-medium">
                        <Info size={12} />
                        Normal
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">{announcement.title}</h3>
                  <p className="text-slate-700 leading-relaxed">{announcement.content}</p>
                  <p className="text-xs text-slate-500">{announcement.createdAt}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleTogglePin(announcement.id)}
                    className={announcement.isPinned ? "text-blue-600" : ""}
                  >
                    <Pin size={16} />
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon" onClick={() => handleEditAnnouncement(announcement)}>
                        <Edit2 size={16} />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Edit Pengumuman</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Judul</Label>
                          <Input
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Isi Pengumuman</Label>
                          <Textarea
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            rows={5}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Prioritas</Label>
                          <Select
                            value={formData.priority}
                            onValueChange={(value) =>
                              setFormData({ ...formData, priority: value as "normal" | "important" })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="important">Penting</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="edit-isPinned"
                            checked={formData.isPinned}
                            onCheckedChange={(checked) => setFormData({ ...formData, isPinned: checked as boolean })}
                          />
                          <Label htmlFor="edit-isPinned" className="font-normal">
                            Pin di urutan teratas
                          </Label>
                        </div>
                        <Button onClick={handleUpdateAnnouncement} className="w-full">
                          Simpan Perubahan
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button variant="outline" size="icon" onClick={() => handleDeleteAnnouncement(announcement.id)}>
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

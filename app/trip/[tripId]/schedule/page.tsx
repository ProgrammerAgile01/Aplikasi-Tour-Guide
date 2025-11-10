"use client"

import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, MapPin, AlertCircle, Plus } from "lucide-react"

interface SessionItem {
  id: string
  time: string
  title: string
  location?: string
  isCheckedIn?: boolean
  isChanged?: boolean
  isAdditional?: boolean
}

interface DaySchedule {
  day: number
  date: string
  dateValue: Date
  sessions: SessionItem[]
}

export default function SchedulePage({
  params,
}: {
  params: { tripId: string }
}) {
  const router = useRouter()

  const [selectedDay, setSelectedDay] = useState<number>(1)

  // Mock data - Paket Tour Komodo 3 Hari 2 Malam
  const schedule: DaySchedule[] = [
    {
      day: 1,
      date: "27 November 2025",
      dateValue: new Date(2025, 10, 27), // Month is 0-indexed
      sessions: [
        {
          id: "1-1",
          time: "13.00",
          title: "Penjemputan di Bandara Komodo Airport",
          location: "Komodo Airport",
          isCheckedIn: false,
        },
        {
          id: "1-2",
          time: "14.30",
          title: "Menuju ke pelabuhan untuk inap di Pinisi Deluxe",
          location: "Pelabuhan Labuan Bajo",
          isCheckedIn: false,
        },
        {
          id: "1-3",
          time: "16.00",
          title: "Start sailing ke Pulau Kelor",
          location: "Pelabuhan",
          isCheckedIn: false,
        },
        {
          id: "1-4",
          time: "17.30",
          title: "Explore Pulau Kelor & Pulau Manjarite",
          location: "Pulau Kelor",
          isCheckedIn: false,
        },
        {
          id: "1-5",
          time: "18.30",
          title: "Snorkeling di Manjarite",
          location: "Pulau Manjarite",
          isCheckedIn: false,
        },
        {
          id: "1-6",
          time: "19.30",
          title: "Explore Pulau Kalong (spot kelelawar & sunset)",
          location: "Pulau Kalong",
          isCheckedIn: false,
        },
        {
          id: "1-7",
          time: "20.00",
          title: "Makan siang & malam di kapal",
          location: "Pinisi Deluxe",
          isCheckedIn: false,
        },
        {
          id: "1-8",
          time: "22.00",
          title: "Menginap di kapal",
          location: "Pinisi Deluxe",
          isCheckedIn: false,
        },
      ],
    },
    {
      day: 2,
      date: "28 November 2025",
      dateValue: new Date(2025, 10, 28),
      sessions: [
        {
          id: "2-1",
          time: "05.30",
          title: "Morning call, naik ke Bukit Padar",
          location: "Bukit Padar",
          isCheckedIn: false,
        },
        {
          id: "2-2",
          time: "06.30",
          title: "Sunrise di Bukit Padar",
          location: "Bukit Padar",
          isCheckedIn: false,
        },
        {
          id: "2-3",
          time: "08.00",
          title: "Pantai Pink (snorkeling & foto)",
          location: "Pantai Pink",
          isCheckedIn: false,
        },
        {
          id: "2-4",
          time: "10.00",
          title: "Explore Komodo (soft trekking 1 jam bersama ranger)",
          location: "Pulau Komodo",
          isCheckedIn: false,
          isChanged: true, // Example of changed item
        },
        {
          id: "2-5",
          time: "12.00",
          title: "Snorkeling di Manta Point",
          location: "Manta Point",
          isCheckedIn: false,
        },
        {
          id: "2-6",
          time: "14.00",
          title: "Explore Taka Makasar (spot foto instagramable)",
          location: "Taka Makasar",
          isCheckedIn: false,
        },
        {
          id: "2-6b",
          time: "15.00",
          title: "Bonus: Diving spot tambahan",
          location: "Kanawa Island",
          isCheckedIn: false,
          isAdditional: true, // Example of additional item
        },
        {
          id: "2-7",
          time: "16.00",
          title: "Sarapan, makan siang, makan malam di kapal",
          location: "Pinisi Deluxe",
          isCheckedIn: false,
        },
        {
          id: "2-8",
          time: "22.00",
          title: "Menginap di kapal",
          location: "Pinisi Deluxe",
          isCheckedIn: false,
        },
      ],
    },
    {
      day: 3,
      date: "29 November 2025",
      dateValue: new Date(2025, 10, 29),
      sessions: [
        {
          id: "3-1",
          time: "08.00",
          title: "Sarapan, berlayar ke Pulau Kanawa",
          location: "Pulau Kanawa",
          isCheckedIn: false,
        },
        {
          id: "3-2",
          time: "10.00",
          title: "Explore Pulau Kanawa (spot eksotis NTT)",
          location: "Pulau Kanawa",
          isCheckedIn: false,
        },
        {
          id: "3-3",
          time: "12.30",
          title: "Makan siang di kapal",
          location: "Pinisi Deluxe",
          isCheckedIn: false,
        },
        {
          id: "3-4",
          time: "14.00",
          title: "Kembali ke Labuan Bajo",
          location: "Pelabuhan Labuan Bajo",
          isCheckedIn: false,
        },
        {
          id: "3-5",
          time: "16.00",
          title: "City tour sambil menunggu flight",
          location: "Labuan Bajo",
          isCheckedIn: false,
        },
        {
          id: "3-6",
          time: "17.30",
          title: "Menuju bandara",
          location: "Bandara Komodo",
          isCheckedIn: false,
        },
        {
          id: "3-7",
          time: "18.25",
          title: "Take off ke Surabaya",
          location: "Komodo Airport",
          isCheckedIn: false,
        },
      ],
    },
  ]

  useEffect(() => {
    const today = new Date()
    const startDate = new Date(2025, 10, 27) // Nov 27
    const endDate = new Date(2025, 10, 29) // Nov 29

    // Check if today is between start and end date
    if (today >= startDate && today <= endDate) {
      const dayIndex = schedule.findIndex((day) => {
        const dayDate = day.dateValue
        return (
          dayDate.getDate() === today.getDate() &&
          dayDate.getMonth() === today.getMonth() &&
          dayDate.getFullYear() === today.getFullYear()
        )
      })
      if (dayIndex !== -1) {
        setSelectedDay(schedule[dayIndex].day)
      }
    } else {
      // Default to first day if outside date range
      setSelectedDay(1)
    }
  }, [])

  const handleSessionClick = (sessionId: string) => {
    router.push(`/trip/${params.tripId}/session/${sessionId}`)
  }

  const currentDaySchedule = schedule.find((day) => day.day === selectedDay)

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Jadwal Perjalanan</h1>
        <p className="text-sm text-muted-foreground mt-1">Paket Tour Komodo 3 Hari 2 Malam</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {schedule.map((day) => (
          <button
            key={day.day}
            onClick={() => setSelectedDay(day.day)}
            className={`
              flex-shrink-0 px-4 py-3 rounded-lg border transition-all
              ${
                selectedDay === day.day
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card border-border hover:border-primary/50"
              }
            `}
          >
            <p
              className={`text-xs font-medium ${selectedDay === day.day ? "text-primary-foreground" : "text-muted-foreground"}`}
            >
              Hari {day.day}
            </p>
            <p
              className={`text-sm font-semibold mt-0.5 ${selectedDay === day.day ? "text-primary-foreground" : "text-foreground"}`}
            >
              {day.date.split(" ")[0]} {day.date.split(" ")[1]}
            </p>
          </button>
        ))}
      </div>

      {/* Schedule Timeline for Selected Day */}
      {currentDaySchedule && (
        <div className="space-y-4">
          {/* Day Header */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 border border-primary/20">
                <span className="font-bold text-primary text-sm">H{currentDaySchedule.day}</span>
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {currentDaySchedule.day === 1
                    ? "Kedatangan & Penjemputan"
                    : currentDaySchedule.day === 2
                      ? "Eksplorasi Komodo"
                      : "Kepulangan"}
                </p>
                <p className="text-xs text-muted-foreground">{currentDaySchedule.date}</p>
              </div>
            </div>
          </div>

          {/* Sessions Timeline */}
          <div className="space-y-3 pl-6 relative">
            {/* Timeline line */}
            <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-primary/20"></div>

            {currentDaySchedule.sessions.map((session) => (
              <div key={session.id} className="relative">
                {/* Timeline dot */}
                <div className="absolute -left-6 top-2 w-5 h-5 bg-card border-2 border-primary rounded-full z-10"></div>

                {/* Session Card */}
                <Card
                  onClick={() => handleSessionClick(session.id)}
                  className={`
                    p-4 cursor-pointer hover:shadow-md transition-shadow
                    ${session.isChanged || session.isAdditional ? "border-red-300 border-2" : "border border-border"}
                  `}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-primary flex-shrink-0" />
                        <span
                          className={`font-semibold ${session.isChanged || session.isAdditional ? "text-red-600" : "text-foreground"}`}
                        >
                          {session.time}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        {session.isChanged && (
                          <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                            <AlertCircle size={12} />
                            Perubahan
                          </span>
                        )}
                        {session.isAdditional && (
                          <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                            <Plus size={12} />
                            Tambahan
                          </span>
                        )}
                        {session.isCheckedIn && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                            Sudah Check-in
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <p
                        className={`font-medium leading-relaxed ${session.isChanged || session.isAdditional ? "text-red-600 font-semibold" : "text-foreground"}`}
                      >
                        {session.title}
                      </p>
                      {session.location && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                          <MapPin size={14} />
                          {session.location}
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSessionClick(session.id)
                      }}
                      variant="outline"
                      className="w-full text-sm"
                    >
                      Lihat Detail
                    </Button>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

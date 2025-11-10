"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Send, Bot, User, Sparkles } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Halo! Saya adalah AI Concierge Anda untuk Trip Komodo. Saya dapat membantu Anda dengan informasi tentang jadwal, lokasi, dan pertanyaan umum lainnya. Ada yang bisa saya bantu?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  // Knowledge base for AI responses
  const knowledgeBase = {
    schedule: [
      {
        day: 1,
        date: "27 November 2025",
        sessions: [
          { time: "13:00", title: "Penjemputan Bandara Komodo Airport", location: "Bandara Komodo" },
          { time: "14:00", title: "Check-in Pelabuhan Labuan Bajo", location: "Pelabuhan Labuan Bajo" },
          { time: "15:30", title: "Snorkeling Pulau Kelor", location: "Pulau Kelor" },
          { time: "17:00", title: "Trekking Pulau Rinca", location: "Pulau Rinca" },
          { time: "19:00", title: "Dinner di Kapal", location: "Kapal" },
        ],
      },
      {
        day: 2,
        date: "28 November 2025",
        sessions: [
          { time: "06:00", title: "Sunrise Pulau Padar", location: "Pulau Padar" },
          { time: "09:00", title: "Snorkeling Pink Beach", location: "Pink Beach" },
          { time: "11:30", title: "Trekking Pulau Komodo", location: "Pulau Komodo" },
          { time: "14:00", title: "Diving Manta Point", location: "Manta Point" },
          { time: "19:00", title: "Dinner di Kapal", location: "Kapal" },
        ],
      },
      {
        day: 3,
        date: "29 November 2025",
        sessions: [
          { time: "08:00", title: "Snorkeling Taka Makassar", location: "Taka Makassar" },
          { time: "10:30", title: "Relaksasi Kanawa Island", location: "Kanawa Island" },
          { time: "13:00", title: "Kembali ke Labuan Bajo", location: "Pelabuhan Labuan Bajo" },
          { time: "15:00", title: "Check-out & Transfer Bandara", location: "Bandara Komodo" },
        ],
      },
    ],
    locations: {
      "bandara komodo": "Bandara Komodo Airport terletak di Labuan Bajo dengan koordinat -8.4866, 119.8888",
      "labuan bajo": "Pelabuhan Labuan Bajo adalah titik keberangkatan utama dengan fasilitas lengkap",
      "pulau kelor": "Pulau Kelor terkenal dengan spot snorkeling yang indah dan air jernih",
      "pulau rinca": "Pulau Rinca adalah habitat Komodo dengan trekking yang menantang",
      "pulau padar": "Pulau Padar menawarkan pemandangan sunrise terbaik dari puncak bukit",
      "pink beach": "Pink Beach memiliki pasir berwarna pink dan spot snorkeling yang menakjubkan",
      "pulau komodo": "Pulau Komodo adalah habitat utama hewan Komodo yang dilindungi",
      "manta point": "Manta Point adalah lokasi diving terbaik untuk melihat pari manta",
      "taka makassar": "Taka Makassar adalah pulau pasir putih dengan air laut yang sangat jernih",
      "kanawa island": "Kanawa Island sempurna untuk relaksasi dan snorkeling santai",
    },
    faqs: {
      "check-in":
        "Untuk check-in, Anda bisa menggunakan fitur GEO Check (otomatis) atau Scan QR (manual) di halaman detail agenda",
      foto: "Upload foto Anda melalui halaman Galeri untuk berbagi momen indah",
      badge: "Dapatkan badge dengan menyelesaikan agenda di setiap lokasi. Lihat progress di halaman Badges",
      waktu: "Jadwal lengkap tersedia di halaman Jadwal dengan filter per hari",
      kontak: "Hubungi tour guide kami melalui WhatsApp atau langsung di kapal",
    },
  }

  const generateResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase()

    // Check for greetings
    if (lowerMessage.match(/halo|hai|hi|hello|selamat/)) {
      return "Halo! Senang bisa membantu Anda. Silakan tanyakan apa saja tentang jadwal, lokasi, atau informasi trip lainnya."
    }

    // Check for schedule queries
    if (lowerMessage.match(/jadwal|schedule|agenda|hari \d|kapan/)) {
      if (lowerMessage.match(/hari 1|pertama|27 november/)) {
        const day1 = knowledgeBase.schedule[0]
        return `Jadwal Hari 1 (${day1.date}):\n\n${day1.sessions.map((s) => `${s.time} - ${s.title}`).join("\n")}\n\nAda yang ingin ditanyakan lebih lanjut?`
      }
      if (lowerMessage.match(/hari 2|kedua|28 november/)) {
        const day2 = knowledgeBase.schedule[1]
        return `Jadwal Hari 2 (${day2.date}):\n\n${day2.sessions.map((s) => `${s.time} - ${s.title}`).join("\n")}\n\nAda yang ingin ditanyakan lebih lanjut?`
      }
      if (lowerMessage.match(/hari 3|ketiga|terakhir|29 november/)) {
        const day3 = knowledgeBase.schedule[2]
        return `Jadwal Hari 3 (${day3.date}):\n\n${day3.sessions.map((s) => `${s.time} - ${s.title}`).join("\n")}\n\nAda yang ingin ditanyakan lebih lanjut?`
      }
      return "Perjalanan kita berlangsung 3 hari (27-29 November 2025). Hari mana yang ingin Anda ketahui jadwalnya? Atau ketik 'semua jadwal' untuk melihat seluruhnya."
    }

    // Check for location queries
    for (const [loc, info] of Object.entries(knowledgeBase.locations)) {
      if (lowerMessage.includes(loc)) {
        return `${info}. Apakah ada yang ingin Anda tanyakan lebih lanjut tentang lokasi ini?`
      }
    }

    // Check for FAQs
    if (lowerMessage.match(/check.*in|absen|konfirmasi kehadiran/)) {
      return knowledgeBase.faqs["check-in"]
    }
    if (lowerMessage.match(/foto|upload|galeri|gambar/)) {
      return knowledgeBase.faqs.foto
    }
    if (lowerMessage.match(/badge|pencapaian|achievement/)) {
      return knowledgeBase.faqs.badge
    }
    if (lowerMessage.match(/waktu|jam|pukul/)) {
      return knowledgeBase.faqs.waktu
    }
    if (lowerMessage.match(/kontak|hubungi|guide|bantuan/)) {
      return knowledgeBase.faqs.kontak
    }

    // Check for thank you
    if (lowerMessage.match(/terima kasih|thanks|makasih/)) {
      return "Sama-sama! Senang bisa membantu. Jika ada pertanyaan lain, jangan ragu untuk bertanya ya!"
    }

    // Default response
    return "Maaf, saya belum memahami pertanyaan Anda. Saya dapat membantu dengan:\n\n• Informasi jadwal (hari 1, 2, atau 3)\n• Detail lokasi (Pulau Padar, Pink Beach, dll)\n• Cara check-in dan upload foto\n• Badge dan pencapaian\n\nSilakan coba tanyakan dengan cara lain!"
  }

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsTyping(true)

    // Simulate AI processing time
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const response = generateResponse(input.trim())

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: response,
      timestamp: new Date(),
    }

    setIsTyping(false)
    setMessages((prev) => [...prev, assistantMessage])
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const quickQuestions = ["Jadwal hari 1", "Lokasi Pulau Padar", "Cara check-in", "Info badge"]

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-border px-4 py-4 shadow-sm">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <div className="p-2 bg-gradient-to-br from-primary to-purple-600 rounded-xl">
            <Bot size={24} className="text-white" />
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-foreground flex items-center gap-2">
              AI Concierge
              <Sparkles size={16} className="text-primary" />
            </h1>
            <p className="text-xs text-muted-foreground">Asisten cerdas perjalanan Anda</p>
          </div>
          <div className="text-xs text-muted-foreground">Online</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-2xl mx-auto w-full">
        {messages.map((message) => (
          <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.role === "user" ? "bg-primary" : "bg-gradient-to-br from-primary to-purple-600"
              }`}
            >
              {message.role === "user" ? (
                <User size={18} className="text-white" />
              ) : (
                <Bot size={18} className="text-white" />
              )}
            </div>
            <Card
              className={`max-w-[80%] p-3 ${
                message.role === "user" ? "bg-primary text-primary-foreground" : "bg-white border border-border"
              }`}
            >
              <p className="text-sm whitespace-pre-line leading-relaxed">{message.content}</p>
              <p
                className={`text-xs mt-2 ${
                  message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                }`}
              >
                {message.timestamp.toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </Card>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-primary to-purple-600">
              <Bot size={18} className="text-white" />
            </div>
            <Card className="bg-white border border-border p-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200"></div>
              </div>
            </Card>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Questions */}
      {messages.length === 1 && (
        <div className="px-4 pb-2 max-w-2xl mx-auto w-full">
          <p className="text-xs text-muted-foreground mb-2">Pertanyaan Cepat:</p>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((q) => (
              <Button
                key={q}
                variant="outline"
                size="sm"
                onClick={() => setInput(q)}
                className="text-xs bg-white hover:bg-primary hover:text-white"
              >
                {q}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-border px-4 py-4 shadow-lg">
        <div className="flex gap-2 max-w-2xl mx-auto">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ketik pertanyaan Anda..."
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={!input.trim()} className="px-4">
            <Send size={18} />
          </Button>
        </div>
      </div>
    </div>
  )
}

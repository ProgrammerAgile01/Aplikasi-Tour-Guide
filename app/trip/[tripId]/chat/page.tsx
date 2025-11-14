"use client";

import type React from "react";

import { useState, useRef, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Bot, User, Sparkles } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface SessionItem {
  time: string;
  title: string;
  location?: string | null;
}

interface DaySchedule {
  day: number;
  date: string;
  sessions: SessionItem[];
}

interface ChatContext {
  tripName: string;
  tripLocation?: string;
  startDate?: string;
  endDate?: string;
  schedule: DaySchedule[];
}

export default function ChatPage() {
  const params = useParams<{ tripId: string }>();
  const tripId = params?.tripId as string | undefined;

  const [chatContext, setChatContext] = useState<ChatContext | null>(null);
  const [isContextLoading, setIsContextLoading] = useState<boolean>(false);
  const [contextError, setContextError] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Load context trip + jadwal
  useEffect(() => {
    if (!tripId) return;

    const loadContext = async () => {
      setIsContextLoading(true);
      setContextError(null);

      try {
        const res = await fetch(`/api/trips/${tripId}/chat-context`);
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.message ?? "Gagal mengambil data trip");
        }

        const data = await res.json();

        const schedule: DaySchedule[] = (data.schedule ?? []).map((d: any) => ({
          day: d.day,
          date: d.date,
          sessions: (d.sessions ?? []).map((s: any) => ({
            time: s.time,
            title: s.title,
            location: s.location,
          })),
        }));

        const ctx: ChatContext = {
          tripName: data.trip?.name ?? "Trip Anda",
          tripLocation: data.trip?.location ?? undefined,
          startDate: data.trip?.startDate,
          endDate: data.trip?.endDate,
          schedule,
        };

        setChatContext(ctx);

        // Set welcome message berbasis trip
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content:
              `Halo! Saya adalah AI Concierge untuk trip "${ctx.tripName}". ` +
              `Saya bisa membantu info jadwal, lokasi, dan pertanyaan umum selama perjalanan. ` +
              `Silakan tanyakan apa saja 😊`,
            timestamp: new Date(),
          },
        ]);
      } catch (err: any) {
        console.error("loadContext error:", err);
        setContextError(err?.message ?? "Gagal memuat data trip");
        setMessages([
          {
            id: "welcome-error",
            role: "assistant",
            content:
              "Halo! Saya AI Concierge. Saat ini saya mengalami kendala mengambil data trip. " +
              "Silakan coba beberapa saat lagi, atau hubungi tour leader bila butuh info mendesak.",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsContextLoading(false);
      }
    };

    loadContext();
  }, [tripId]);

  // FAQs tetap bisa statis
  const faqs = {
    checkIn:
      "Untuk check-in, Anda bisa menggunakan fitur GEO Check (otomatis) atau Scan QR (manual) di halaman detail agenda.",
    foto: "Upload foto Anda melalui halaman Galeri untuk berbagi momen selama trip.",
    badge:
      "Anda akan mendapatkan badge jika menyelesaikan agenda di tiap lokasi. Lihat progress badge di halaman Badges.",
    waktu:
      "Jadwal lengkap tersedia di halaman Jadwal. Anda dapat memilih hari 1, 2, 3, dst.",
    kontak:
      "Jika butuh bantuan, hubungi tour guide/tour leader yang tertera di info trip atau melalui WhatsApp resmi penyelenggara.",
  };

  const formatScheduleForDay = (day: DaySchedule): string => {
    const header = `Jadwal Hari ${day.day} (${day.date}):`;
    const body = day.sessions
      .map(
        (s) => `${s.time} - ${s.title}${s.location ? ` (${s.location})` : ""}`
      )
      .join("\n");
    return `${header}\n\n${body}`;
  };

  const formatAllSchedule = (schedule: DaySchedule[]): string => {
    if (!schedule.length) {
      return "Saya belum menemukan jadwal untuk trip ini. Silakan konfirmasi ke tour guide ya.";
    }

    return (
      "Berikut ringkasan jadwal trip Anda:\n\n" +
      schedule
        .map((d) => formatScheduleForDay(d))
        .join("\n\n--------------------------\n\n") +
      "\n\nAnda bisa tanya spesifik, misalnya: 'jadwal hari 1' atau 'lokasi Pink Beach'."
    );
  };

  const findLocationSessions = (
    schedule: DaySchedule[],
    userMessage: string
  ) => {
    const lowerMsg = userMessage.toLowerCase();
    const matches: {
      location: string;
      day: number;
      date: string;
      time: string;
      title: string;
    }[] = [];

    for (const day of schedule) {
      for (const s of day.sessions) {
        if (!s.location) continue;

        const locLower = s.location.toLowerCase();

        // cocok kalau nama lokasi muncul dalam pesan,
        // atau sebaliknya kata-kata di pesan ada di nama lokasi
        if (
          lowerMsg.includes(locLower) ||
          locLower.split(/\s+/).some((token) => {
            if (token.length < 3) return false;
            return lowerMsg.includes(token);
          })
        ) {
          matches.push({
            location: s.location,
            day: day.day,
            date: day.date,
            time: s.time,
            title: s.title,
          });
        }
      }
    }

    return matches;
  };

  const generateResponse = (
    userMessage: string,
    ctx: ChatContext | null
  ): string => {
    const lowerMessage = userMessage.toLowerCase();

    // Kalau context belum siap
    if (!ctx) {
      return "Sebentar ya, saya masih memuat data trip Anda. Coba kirim pertanyaan lagi dalam beberapa detik.";
    }

    const schedule = ctx.schedule ?? [];

    // Greetings
    if (lowerMessage.match(/halo|hai|hi|hello|selamat/)) {
      return (
        `Halo! Selamat datang di trip "${ctx.tripName}". ` +
        "Saya bisa bantu cek jadwal, lokasi, dan info umum selama perjalanan. " +
        "Anda bisa tanya misalnya: 'jadwal hari 1', 'lokasi Pulau Padar', atau 'cara check-in'."
      );
    }

    // Jadwal / schedule
    if (lowerMessage.match(/jadwal|schedule|agenda|kapan/)) {
      // "semua jadwal"
      if (
        lowerMessage.includes("semua jadwal") ||
        lowerMessage.includes("full jadwal") ||
        lowerMessage.includes("full schedule")
      ) {
        return formatAllSchedule(schedule);
      }

      // pattern "hari 1", "hari 2", dst
      const dayNumberMatch = lowerMessage.match(/hari\s*(\d+)/);
      if (dayNumberMatch) {
        const dayNum = parseInt(dayNumberMatch[1], 10);
        const dayData =
          schedule.find((d) => d.day === dayNum) ??
          schedule[dayNum - 1] ??
          null;

        if (!dayData) {
          if (!schedule.length) {
            return "Saya belum menemukan jadwal apapun untuk trip ini. Silakan konfirmasi ke tour guide ya.";
          }
          return `Saya belum menemukan jadwal untuk hari ${dayNum}. Coba cek hari ${
            schedule[0].day
          } sampai ${schedule[schedule.length - 1].day}.`;
        }

        return (
          formatScheduleForDay(dayData) +
          "\n\nAda sesi tertentu yang ingin Anda tanyakan lebih detail?"
        );
      }

      // kata-kata: "hari pertama", "hari kedua", "hari terakhir"
      if (lowerMessage.includes("hari pertama")) {
        const first = schedule[0];
        if (!first) {
          return "Saya belum menemukan jadwal hari pertama. Silakan konfirmasi ke tour guide.";
        }
        return (
          formatScheduleForDay(first) + "\n\nAda lagi yang ingin ditanyakan?"
        );
      }

      if (
        lowerMessage.includes("hari kedua") ||
        lowerMessage.includes("hari ke-2")
      ) {
        const second = schedule.find((d) => d.day === 2) ?? schedule[1];
        if (!second) {
          return "Saya belum menemukan jadwal hari kedua. Silakan konfirmasi ke tour guide.";
        }
        return (
          formatScheduleForDay(second) + "\n\nAda lagi yang ingin ditanyakan?"
        );
      }

      if (
        lowerMessage.includes("hari terakhir") ||
        lowerMessage.includes("hari ketiga") ||
        lowerMessage.includes("hari ke-3")
      ) {
        const last =
          schedule.find((d) => d.day === 3) ?? schedule[schedule.length - 1];
        if (!last) {
          return "Saya belum menemukan jadwal hari terakhir. Silakan konfirmasi ke tour guide.";
        }
        return (
          formatScheduleForDay(last) +
          "\n\nSemoga perjalanan hari terakhir menyenangkan! 😊"
        );
      }

      // Default kalau user tanya jadwal tapi tidak spesifik
      if (!schedule.length) {
        return "Trip ini belum memiliki jadwal yang tercatat di sistem. Silakan konfirmasi ke tour guide ya.";
      }

      const first = schedule[0];
      const last = schedule[schedule.length - 1];
      return (
        `Perjalanan Anda berlangsung sekitar ${schedule.length} hari, ` +
        `mulai Hari ${first.day} (${first.date}) sampai Hari ${last.day} (${last.date}).\n\n` +
        `Hari mana yang ingin Anda ketahui? Contoh: "jadwal hari ${first.day}" atau "semua jadwal".`
      );
    }

    // Lokasi (berdasarkan data schedule.location)
    const locationMatches = findLocationSessions(schedule, userMessage);
    if (locationMatches.length > 0) {
      const groupedByLocation: Record<
        string,
        { day: number; date: string; time: string; title: string }[]
      > = {};

      for (const m of locationMatches) {
        const key = m.location;
        if (!groupedByLocation[key]) {
          groupedByLocation[key] = [];
        }
        groupedByLocation[key].push({
          day: m.day,
          date: m.date,
          time: m.time,
          title: m.title,
        });
      }

      const parts: string[] = [];
      for (const [loc, sessions] of Object.entries(groupedByLocation)) {
        const header = `Lokasi: ${loc}`;
        const body = sessions
          .map(
            (s) => `• Hari ${s.day} (${s.date}) pukul ${s.time} - ${s.title}`
          )
          .join("\n");
        parts.push(`${header}\n${body}`);
      }

      return (
        parts.join("\n\n") +
        "\n\nJika butuh panduan lebih detail, silakan tanya lagi ya."
      );
    }

    // FAQs
    if (lowerMessage.match(/check.*in|absen|konfirmasi kehadiran/)) {
      return faqs.checkIn;
    }
    if (lowerMessage.match(/foto|upload|galeri|gambar/)) {
      return faqs.foto;
    }
    if (lowerMessage.match(/badge|pencapaian|achievement/)) {
      return faqs.badge;
    }
    if (lowerMessage.match(/waktu|jam|pukul/)) {
      return faqs.waktu;
    }
    if (lowerMessage.match(/kontak|hubungi|guide|bantuan/)) {
      return faqs.kontak;
    }

    // Thank you
    if (lowerMessage.match(/terima kasih|thanks|makasih/)) {
      return "Sama-sama! Senang bisa membantu 😊 Jika ada pertanyaan lain seputar jadwal atau lokasi, silakan tanya lagi.";
    }

    // Default
    return (
      "Maaf, saya belum memahami pertanyaan Anda.\n\n" +
      "Saya bisa membantu dengan:\n" +
      "• Informasi jadwal (contoh: 'jadwal hari 1', 'semua jadwal')\n" +
      "• Detail lokasi (ketik nama lokasi yang ada di jadwal, misalnya 'Pink Beach', 'Pulau Padar')\n" +
      "• Cara check-in dan upload foto\n" +
      "• Info badge dan pencapaian\n\n" +
      "Silakan coba tanyakan dengan cara lain ya!"
    );
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const content = input.trim();

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Simulasi delay "AI lagi mikir"
    await new Promise((resolve) => setTimeout(resolve, 800));

    const responseText = generateResponse(content, chatContext);

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: responseText,
      timestamp: new Date(),
    };

    setIsTyping(false);
    setMessages((prev) => [...prev, assistantMessage]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickQuestions = useMemo(() => {
    if (!chatContext) {
      // fallback kalau context belum siap
      return ["Cara check-in"];
    }

    const questions: string[] = [];

    // --- 1) Pertanyaan jadwal per hari ---
    const sortedDays = [...chatContext.schedule]
      .map((d) => d.day)
      .sort((a, b) => a - b);

    if (sortedDays.length > 0) {
      questions.push(`Jadwal hari ${sortedDays[0]}`);
    }
    // if (sortedDays.length > 1) {
    //   questions.push(`Jadwal hari ${sortedDays[1]}`);
    // }

    // Tambah opsi semua jadwal kalau ada jadwal
    if (sortedDays.length > 0) {
      questions.push("Semua jadwal");
    }

    // --- 2) Pertanyaan lokasi dari data real ---
    const locationSet = new Set<string>();

    for (const day of chatContext.schedule) {
      for (const s of day.sessions) {
        if (!s.location) continue;

        const locTrimmed = s.location.trim();
        if (!locTrimmed) continue;

        locationSet.add(locTrimmed);
      }
    }

    const uniqueLocations = Array.from(locationSet).slice(0, 1); // max 1 lokasi

    uniqueLocations.forEach((loc) => {
      questions.push(`Lokasi ${loc}`);
    });

    // --- 3) Tambah FAQ umum ---
    questions.push("Cara check-in");

    return questions;
  }, [chatContext]);

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
            <p className="text-xs text-muted-foreground">
              {isContextLoading
                ? "Memuat data trip Anda..."
                : contextError
                ? "Terjadi kendala memuat data trip"
                : chatContext
                ? `Asisten cerdas untuk trip "${chatContext.tripName}"`
                : "Asisten cerdas perjalanan Anda"}
            </p>
          </div>
          <div className="text-xs text-muted-foreground">Online</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-2xl mx-auto w-full">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.role === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.role === "user"
                  ? "bg-primary"
                  : "bg-gradient-to-br from-primary to-purple-600"
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
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-white border border-border"
              }`}
            >
              <p className="text-sm whitespace-pre-line leading-relaxed">
                {message.content}
              </p>
              <p
                className={`text-xs mt-2 ${
                  message.role === "user"
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground"
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
      {messages.length === 1 && !isContextLoading && (
        <div className="px-4 pb-2 max-w-2xl mx-auto w-full">
          <p className="text-xs text-muted-foreground mb-2">
            Pertanyaan Cepat:
          </p>
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
            placeholder={
              isContextLoading
                ? "Menunggu data trip..."
                : "Ketik pertanyaan Anda..."
            }
            disabled={isContextLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isContextLoading}
            className="px-4"
          >
            <Send size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}

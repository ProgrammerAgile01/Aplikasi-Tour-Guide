import { Agenda } from "@/hooks/use-geo-reminder";

function playGeoVoiceReminder(agenda: Agenda) {
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) {
    console.log("[useGeoReminder] Speech synthesis not supported");
    return;
  }

  const synth = window.speechSynthesis;

  // optional: cancel suara sebelumnya biar nggak numpuk
  try {
    synth.cancel();
  } catch {
    // ignore
  }

  // buat kalimat yang enak didengar
  const parts: string[] = [];

  parts.push(`Agenda berikutnya, ${agenda.title}.`);

  if (agenda.time) {
    parts.push(`Dijadwalkan sekitar pukul ${agenda.time}.`);
  }

  if (agenda.locationName) {
    parts.push(`Lokasi, ${agenda.locationName}.`);
  }

  parts.push("Anda sudah dekat dengan lokasi. Jangan lupa melakukan check in.");

  const message = parts.join(" ");

  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = "id-ID";
  utterance.rate = 0.95;
  utterance.pitch = 1.0;
  utterance.volume = 0.9;

  // delay sedikit supaya nggak terlalu “kaget”
  setTimeout(() => {
    synth.speak(utterance);
  }, 500);
}

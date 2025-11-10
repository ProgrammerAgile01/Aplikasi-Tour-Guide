export function playVoiceGreeting(name: string) {
  if (!("speechSynthesis" in window)) {
    console.log("[v0] Speech synthesis not supported")
    return
  }

  const timeOfDay = new Date().getHours()
  let greeting = ""

  if (timeOfDay >= 5 && timeOfDay < 11) {
    greeting = "Selamat pagi"
  } else if (timeOfDay >= 11 && timeOfDay < 15) {
    greeting = "Selamat siang"
  } else if (timeOfDay >= 15 && timeOfDay < 19) {
    greeting = "Selamat sore"
  } else {
    greeting = "Selamat malam"
  }

  const message = `${greeting} ${name}. Selamat datang di Trip Komodo Executive. Semoga perjalanan Anda menyenangkan.`

  const utterance = new SpeechSynthesisUtterance(message)
  utterance.lang = "id-ID"
  utterance.rate = 0.9
  utterance.pitch = 1.0
  utterance.volume = 0.8

  // Delay sedikit agar lebih natural
  setTimeout(() => {
    window.speechSynthesis.speak(utterance)
  }, 500)
}

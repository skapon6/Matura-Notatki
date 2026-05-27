// Obiekt przechowujący załadowane audio, aby nie tworzyć ich na nowo przy każdym kliknięciu
const audioCache: { [key: string]: HTMLAudioElement } = {};

export type SoundType = "click" | "success" | "error";

export const playSound = (type: SoundType) => {
  // Blokada dla renderowania po stronie serwera (SSR)
  if (typeof window === "undefined") return;

  const soundFiles: Record<SoundType, string> = {
    click: "/audio/sounds/click.mp3",
    success: "/audio/sounds/success.mp3",
    error: "/audio/sounds/error.mp3",
  };

  const src = soundFiles[type];
  if (!src) return;

  try {
    // Jeśli dźwięk nie był jeszcze odtwarzany, utwórz go i zapisz w pamięci podręcznej
    if (!audioCache[type]) {
      audioCache[type] = new Audio(src);
    }

    const audio = audioCache[type];
    
    // Przewijamy do początku (na wypadek, gdyby użytkownik klikał bardzo szybko)
    audio.currentTime = 0; 
    audio.volume = type === "click" ? 0.25 : 0.4; // kliknięcie ciszej, powiadomienia głośniej
    
    audio.play().catch((err) => {
      // Ignorujemy błędy, jeśli przeglądarka zablokuje dźwięk przed pierwszą interakcją użytkownika
      console.warn("Odtwarzanie dźwięku zablokowane lub opóźnione:", err);
    });
  } catch (error) {
    console.error("Błąd podczas odtwarzania dźwięku:", error);
  }
};
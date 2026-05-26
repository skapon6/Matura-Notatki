// app/page.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase";
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Cozy quotes for Matura students
const COZY_QUOTES = [
  { text: "Cierpliwość i praca tworzą wielkie dzieła.", author: "Konfucjusz" },
  { text: "Nauka to jedyna rzecz, której umysł nigdy nie wyczerpie, nie boi się ani nie żałuje.", author: "Leonardo da Vinci" },
  { text: "Zrób to, co możesz, tym, co masz, tam, gdzie jesteś.", author: "Theodore Roosevelt" },
  { text: "Nie bój się iść powoli, obawiaj się jedynie stania w miejscu.", author: "Przysłowie chińskie" },
  { text: "Krok po kroku i dojdziesz do celu. Matura to tylko kolejny przystanek.", author: "Wiedza Szyta na Miarę" }
];


// Słownik tłumaczący błędy z języka angielskiego na polski
const translateAuthError = (message: string): string => {
  const msg = message.toLowerCase();
  
  if (msg.includes("user already registered") || msg.includes("already exists")) {
    return "Użytkownik o tym adresie e-mail już istnieje!";
  }
  if (msg.includes("password should be at least")) {
    return "Hasło musi mieć co najmniej 6 znaków!";
  }
  if (msg.includes("invalid login credentials")) {
    return "Niepoprawny adres e-mail lub hasło!";
  }
  if (msg.includes("signup requires a valid email")) {
    return "Wprowadź poprawny adres e-mail!";
  }
  if (msg.includes("email rate limit exceeded") || msg.includes("rate limit")) {
    return "Zbyt wiele prób w krótkim czasie. Odczekaj chwilę!";
  }
  
  // Jeśli pojawi się inny błąd, którego nie znamy, zwracamy go w oryginale
  return message;
};

export default function Home() {
  const router = useRouter();
  // Theme state
  const [cozyTheme, setCozyTheme] = useState<"library" | "rainy" | "fireplace">("library");

  const [newPassword, setNewPassword] = useState("");
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
  
  // Settings modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Search & filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("Wszystkie");

  // Dynamic notes loaded from Supabase
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // AUTH & STRIPE STATES
  const [user, setUser] = useState<any>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Formularz logowania
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isRegisterForm, setIsRegisterForm] = useState(false);
  const [authFormLoading, setAuthFormLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // SYSTEM PRZYTULNYCH POWIADOMIEŃ (ZAMIAST BRZYDKICH ALERTÓW)
  const [cozyNotification, setCozyNotification] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const triggerNotification = (message: string, type: "success" | "error" | "info" = "info") => {
    setCozyNotification({ message, type });
    setTimeout(() => {
      setCozyNotification(null);
    }, 4500);
  };

  // Sprawdzanie stanu zalogowania i płatności
// 1. Bezpieczny nasłuchiwalnik samego logowania (bez zapytań do bazy, aby zapobiec zawieszaniu Supabase!)
  useEffect(() => {
    async function checkInitialSession() {
      setAuthLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    }
    
    checkInitialSession();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
        setHasAccess(false);
      }
      setAuthLoading(false);
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 2. Osobny proces pobierania profilu (uruchamia się automatycznie tylko gdy 'user' się zmieni)
  useEffect(() => {
    async function fetchUserProfile() {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_status')
          .eq('id', user.id)
          .single();
          
        if (profile?.subscription_status === 'paid' || profile?.subscription_status === 'admin') {
          setHasAccess(true);
        } else {
          setHasAccess(false);
        }
      } else {
        setHasAccess(false);
      }
    }
    fetchUserProfile();
  }, [user]);

  // Obsługa logowania / rejestracji
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthFormLoading(true);
    
    if (isRegisterForm) {
      const { error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
      });
      if (error) {
        triggerNotification(translateAuthError(error.message), 'error');
      } else {
        triggerNotification('Konto zostało pomyślnie utworzone! Możesz się teraz zalogować.', 'success');
        setIsRegisterForm(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });
      if (error) {
        triggerNotification(translateAuthError(error.message), 'error');
      } else {
        triggerNotification('Zalogowano pomyślnie!', 'success');
      }
    }
    setAuthFormLoading(false);
  };

  // Obsługa inicjalizacji płatności Stripe
  const handlePaymentInit = async () => {
    setPaymentLoading(true);
    try {
      const response = await fetch('/api/checkout', { method: 'POST' });
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        triggerNotification('Wystąpił błąd podczas generowania płatności: ' + (data.error || 'Brak linku'), 'error');
      }
    } catch (err) {
      console.error(err);
      triggerNotification('Błąd połączenia z serwerem płatności.', 'error');
    } finally {
      setPaymentLoading(false);
    }
  };

  // Funkcja zmiany hasła użytkownika
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      triggerNotification("Hasło musi mieć co najmniej 6 znaków!", "error");
      return;
    }

    setPasswordChangeLoading(true);
    try {
      // Wywołujemy oficjalną funkcję Supabase do aktualizacji danych użytkownika
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        triggerNotification(translateAuthError(error.message), "error");
      } else {
        triggerNotification("Hasło zostało pomyślnie zmienione! 🔑", "success");
        setNewPassword(""); // Czyścimy pole tekstowe po sukcesie
      }
    } catch (err) {
      console.error(err);
      triggerNotification("Wystąpił błąd podczas zmiany hasła.", "error");
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  // Funkcja bezpiecznej nawigacji dla sekcji Premium
const handlePremiumNavigation = (path: string) => {
  if (!user) {
    triggerNotification("🔑 Aby skorzystać z tej funkcji, najpierw się zaloguj!", "info");
    return;
  }
  
  if (!hasAccess) {
    triggerNotification(
      "🔒 Ta funkcja wymaga konta Premium. Odblokuj pełny dostęp klikając przycisk na górze strony!", 
      "error"
    );
  } else {
    router.push(path);
  }
};

  // Pobieranie notatek
// Pobieranie notatek (Zabezpieczone i zoptymalizowane pod kątem widoczności karty)
// Pobieranie notatek (Zoptymalizowana, bezbłędna wersja)
// Pobieranie wszystkich notatek (płatne będą zablokowane na ekranie)
  useEffect(() => {
    async function fetchNotes() {
      setLoading(true)
      try {
        // Pobieramy wszystkie notatki, aby darmowy użytkownik widział całe Archiwum Wiedzy
        const { data, error } = await supabase.from("notes").select("*");

        if (!error && data) {
          setNotes(data as any[]);
        }
      } catch (err) {
        console.error("Error fetching notes:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchNotes()
  }, [hasAccess])

  // Pomodoro state
  const [pomodoroMode, setPomodoroMode] = useState<"work" | "break">("work");
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);

  // Steam mug click count & surprise message state
  const [mugClicks, setMugClicks] = useState(0);
  const [mugMessage, setMugMessage] = useState("Ciepły napar paruje... Kliknij kubek!");

  // Ambient sound synthesizer references
  const [ambientSoundActive, setAmbientSoundActive] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);

  // Quote index state
  const [quoteIndex, setQuoteIndex] = useState(0);

  // Change quote on click
  const rotateQuote = () => {
    setQuoteIndex((prev) => (prev + 1) % COZY_QUOTES.length);
  };

  // Pomodoro Countdown Effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setTimerRunning(false);
      if (pomodoroMode === "work") {
        setPomodoroMode("break");
        setTimeLeft(5 * 60);
        triggerNotification("Czas na przerwę! Napij się herbaty ☕", "success");
      } else {
        setPomodoroMode("work");
        setTimeLeft(25 * 60);
        triggerNotification("Czas wracać do pracy! Skupienie 📚", "info");
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning, timeLeft, pomodoroMode]);

  // Pomodoro controls
  const toggleTimer = () => setTimerRunning(!timerRunning);
  const resetTimer = () => {
    setTimerRunning(false);
    setTimeLeft(pomodoroMode === "work" ? 25 * 60 : 5 * 60);
  };
  const switchPomodoroMode = (mode: "work" | "break") => {
    setTimerRunning(false);
    setPomodoroMode(mode);
    setTimeLeft(mode === "work" ? 25 * 60 : 5 * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Web Audio Rain / Cozy Ambience Synthesizer
  const toggleAmbientSound = () => {
    if (ambientSoundActive) {
      try {
        if (noiseSourceRef.current) {
          noiseSourceRef.current.stop();
          noiseSourceRef.current.disconnect();
        }
      } catch (e) {
        console.error(e);
      }
      setAmbientSoundActive(false);
    } else {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;

        const bufferSize = 2 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          if (cozyTheme === "rainy") {
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5; 
          } else if (cozyTheme === "fireplace") {
            output[i] = (lastOut + (0.05 * white)) / 1.05;
            lastOut = output[i];
            if (Math.random() > 0.9995) {
              output[i] += (Math.random() * 2 - 1) * 0.8;
            }
            output[i] *= 2.5;
          } else {
            output[i] = (lastOut + (0.01 * white)) / 1.01;
            lastOut = output[i];
            output[i] *= 1.5;
          }
        }

        const source = ctx.createBufferSource();
        source.buffer = noiseBuffer;
        source.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = cozyTheme === "rainy" ? 600 : cozyTheme === "fireplace" ? 900 : 400;

        source.connect(filter);
        filter.connect(ctx.destination);
        source.start();

        noiseSourceRef.current = source;
        filterNodeRef.current = filter;
        setAmbientSoundActive(true);
      } catch (err) {
        console.error("Audio Context failed to start:", err);
      }
    }
  };

  // Re-sync ambient sound when theme changes
  useEffect(() => {
    if (ambientSoundActive) {
      toggleAmbientSound();
      toggleAmbientSound();
    }
  }, [cozyTheme]);

  // Mug Click Interaction
  const handleMugClick = () => {
    const clicks = mugClicks + 1;
    setMugClicks(clicks);
    
    const messages = [
      "Mmm... pyszna, ciepła cynamonowa herbata! ☕",
      "Spokojnie, krok po kroku opanujesz cały materiał.",
      "Zrobiłeś sobie przerwę? Bardzo dobrze, mózg potrzebuje odpoczynku.",
      "Czy wiesz, że zapach herbaty obniża poziom stresu?",
      "Klikasz w kubek z determinacją! Matura na 100%! 🚀",
      "Masz ochotę na małą powtórkę? Spójrz na notatki obok.",
      "Czujesz ten zapach goździków i pomarańczy? Wyjątkowo przytulnie."
    ];
    setMugMessage(messages[clicks % messages.length]);
  };

  // Epochs keywords mapping for smart dynamic searching
// Pełna mapa epok maturalnych do wyszukiwania
// Pełna, chronologiczna mapa epok maturalnych do wyszukiwania
  const epochKeywords: Record<string, string[]> = {
    "Antyk": ["antyk", "starożytność", "mitologia", "homer", "sofokles", "biblia", "mit", "antygona", "król edyp", "iliada", "odyseja"],
    "Średniowiecze": ["średniowiecze", "bogurodzica", "lament swietokrzyski", "pieśń o rolandzie", "rozmowa mistrza polikarpa", "gall anonim"],
    "Renesans": ["renesans", "odrodzenie", "kochanowski", "treny", "szachy", "odprawa posłów", "fraszki", "pieśni", "mikołaj rej", "szekspir", "makbet"],
    "Barok": ["barok", "vanitas", "konceptyzm", "sarmatyzm", "marinizm", "paski", "morsztyn", "naborowski", "skąpiec", "molier"],
    "Oświecenie": ["oświecenie", "krasicki", "monachomachia", "hymn do miłości", "żona modna", "powrót posła", "bajki"],
    "Romantyzm": ["romantyzm", "kordian", "mickiewicz", "słowacki", "dziady", "pan tadeusz", "ballady i romanse", "nie-boska komedia", "krasiński"],
    "Pozytywizm": ["pozytywizm", "lalka", "prus", "orzeszkowa", "nad niemnem", "mendel gdanski", "gloria victis", "potop", "sienkiewicz"],
    "Młoda Polska": ["młoda polska", "wesele", "wyspiański", "ludzie bezdomni", "chłopi", "reymont", "deszcz jesienny", "tetmajer", "kasprowicz"],
    "Dwudziestolecie": ["dwudziestolecie", "ferdydurke", "gombrowicz", "przedwiośnie", "żeromski", "granica", "nałkowska", "skamander", "schulz", "sklepy cynamonowe"],
    "Wojna i okupacja": ["wojna", "okupacja", "kamienie na szaniec", "baczyński", "borowski", "opoowiadania borowskiego", "inny świat", "grudziński"],
    "Współczesność": ["współczesność", "tango", "mrożek", "ocalenie", "szymborska", "różewicz", "herbert", "rok 1984", "orwell", "dżuma", "camus"]
  };

  // Filter notes based on search & subject (epoch) selection
  const getExcerpt = (note: any) => {
    if (note.excerpt && typeof note.excerpt === 'string') return note.excerpt;
    const content = note.content;
    if (typeof content === 'string') return content.length > 140 ? content.substring(0, 140) + '...' : content;
    if (Array.isArray(content)) {
      for (const b of content) {
        if (typeof b === 'string') {
          return b.length > 140 ? b.substring(0, 140) + '...' : b;
        }
        if (b && (b.content || b.text || b.body)) {
          const t = b.content || b.text || b.body;
          if (typeof t === 'string') return t.length > 140 ? t.substring(0, 140) + '...' : t;
        }
      }
    }
    if (content && typeof content === 'object') {
      try {
        const s = JSON.stringify(content);
        return s.length > 140 ? s.substring(0, 140) + '...' : s;
      } catch (_) {}
    }
    return note.era ? `Epoka: ${note.era}` : '';
  };

    const filteredNotes = notes.filter((note) => {
    const titleLower = (note.title || "").toLowerCase();
    const contentString = typeof note.content === 'string' ? note.content : JSON.stringify(note.content || "");
    const contentLower = contentString.toLowerCase();
    
    // ZMIANA TUTAJ: Zamieniamy tablicę tagów (chips) na jeden ciąg tekstowy rozdzielony spacjami
    const chipsString = Array.isArray(note.chips) ? note.chips.join(" ") : "";
    const chipsLower = chipsString.toLowerCase();
    
    // Łączymy wszystko razem: tytuł + treść + słowa kluczowe (tagi)
    const textToSearch = `${titleLower} ${contentLower} ${chipsLower}`;
    
    const matchesSearch = textToSearch.includes(searchQuery.toLowerCase());
    
    let matchesSubject = true;
    if (selectedSubject !== "Wszystkie") {
      const keywords = epochKeywords[selectedSubject] || [selectedSubject.toLowerCase()];
      matchesSubject = keywords.some(keyword => textToSearch.includes(keyword));
    }
    
    return matchesSearch && matchesSubject;
  });

  // Get dynamic background and border color classes based on theme
  const getThemeClasses = () => {
    switch (cozyTheme) {
      case "rainy":
        return {
          bg: "bg-[#0d1116]",
          cardBg: "bg-[#151c24]/90",
          cardBorder: "border-slate-800/60",
          accentText: "text-sky-400",
          accentBg: "bg-sky-500",
          accentHover: "hover:bg-sky-400",
          glow: "shadow-sky-500/5",
          btnBorder: "border-sky-500/30",
          textColor: "text-slate-200",
          subText: "text-slate-400"
        };
      case "fireplace":
        return {
          bg: "bg-[#1a0e0e]",
          cardBg: "bg-[#251515]/90",
          cardBorder: "border-red-950/60",
          accentText: "text-amber-500",
          accentBg: "bg-amber-600",
          accentHover: "hover:bg-amber-500",
          glow: "shadow-amber-600/5",
          btnBorder: "border-amber-600/30",
          textColor: "text-rose-100",
          subText: "text-rose-300/70"
        };
      case "library":
      default:
        return {
          bg: "bg-[#14100e]",
          cardBg: "bg-[#1f1915]/90",
          cardBorder: "border-amber-950/40",
          accentText: "text-amber-500/90",
          accentBg: "bg-[#c68a4c]",
          accentHover: "hover:bg-[#d99c5d]",
          glow: "shadow-amber-700/5",
          btnBorder: "border-[#c68a4c]/30",
          textColor: "text-stone-200",
          subText: "text-stone-400"
        };
    }
  };

  const currentTheme = getThemeClasses();

  // Wczytywanie stanu auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#14100e] text-stone-200 flex flex-col items-center justify-center p-8">
        <div className="text-4xl animate-bounce mb-4">☕</div>
        <p className="text-sm tracking-widest font-semibold text-stone-400">
          Rozgrzewanie pieca i parzenie herbaty...
        </p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${currentTheme.bg} text-stone-200 font-sans`}>
      {/* Dynamic Embedded Keyframe Animations for Steam Effect & Slide-In Notification */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes steam {
          0% { transform: translateY(0) scaleX(1); opacity: 0; }
          15% { opacity: 0.4; }
          50% { transform: translateY(-10px) scaleX(1.3); opacity: 0.2; }
          100% { transform: translateY(-22px) scaleX(0.7); opacity: 0; }
        }
        @keyframes slideIn {
          0% { transform: translateY(30px) scale(0.95); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        .steam-line { animation: steam 3.5s infinite ease-in-out; }
        .steam-line-2 { animation: steam 3.5s infinite ease-in-out; animation-delay: 1.2s; }
        .steam-line-3 { animation: steam 3.5s infinite ease-in-out; animation-delay: 2.2s; }
        .animate-slide-in { animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}} />

      {/* HEADER SECTION */}
      <header className={`border-b ${currentTheme.cardBorder} px-6 py-4 flex items-center justify-between backdrop-blur-md sticky top-0 z-40 transition-colors duration-500`}>
        {/* Left: Settings Button */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border ${currentTheme.btnBorder} ${currentTheme.cardBg} hover:scale-105 active:scale-95 transition-all text-sm font-medium ${currentTheme.subText} hover:text-stone-100`}
        >
          <svg className="w-4 h-4 animate-spin-slow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Ustawienia Klimatu
        </button>

        {/* Center: Branding */}
        <div className="flex flex-col items-center select-none">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📖</span>
            <h1 className={`text-xl font-semibold tracking-wide bg-gradient-to-r from-amber-200 via-orange-300 to-amber-100 bg-clip-text text-transparent drop-shadow-sm`}>
              Wiedza Szyta na Miarę
            </h1>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-amber-500/60 font-semibold">
            Maturalny Kącik Spokoju
          </span>
        </div>

        {/* Right: Ambient Sound Indicator & Profile Quick Stats */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleAmbientSound}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border ${
              ambientSoundActive 
                ? `${currentTheme.accentBg} text-stone-900 border-transparent shadow-lg ${currentTheme.glow}` 
                : `${currentTheme.cardBg} ${currentTheme.btnBorder} ${currentTheme.subText} hover:text-stone-100`
            } transition-all duration-300 active:scale-95`}
          >
            <span className="relative flex h-2 w-2">
              {ambientSoundActive && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-stone-950 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${ambientSoundActive ? 'bg-stone-950' : 'bg-amber-600'}`}></span>
            </span>
            {ambientSoundActive ? "Wyłącz Szum Tła 🔇" : "Dźwięk Cozy 🔊"}
          </button>
          
          {user ? (
            <div className="flex items-center gap-2">
              <div className={`hidden sm:flex items-center gap-2 px-3 py-1 text-xs rounded-full bg-stone-900/60 border ${currentTheme.cardBorder}`}>
                <span className={`w-2 h-2 rounded-full ${hasAccess ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                <span>{user.email.split('@')[0]} ({hasAccess ? 'Premium' : 'Darmowy'})</span>
              </div>
                <button
                    onClick={async () => {
                      try {
                        // Próbujemy wylogować użytkownika w chmurze
                        await supabase.auth.signOut();
                      } catch (err) {
                        // Jeśli użytkownik nie istnieje w bazie (lub nie ma internetu), ignorujemy błąd sieciowy
                        console.warn("Wylogowanie w chmurze pominięte (użytkownik prawdopodobnie usunięty z bazy):", err);
                      } finally {
                        // Te linijki wykonają się ZAWSZE. Gwarantuje to, że przeglądarka 
                        // i tak zapomni sesję i natychmiast pokaże ekran logowania!
                        setUser(null);
                        setHasAccess(false);
                        router.refresh();
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border border-red-900/30 bg-red-950/20 text-red-400 hover:bg-red-900 hover:text-white transition-all`}
                  >
                    Wyloguj
                </button>
            </div>
          ) : (
            <div className={`hidden sm:flex items-center gap-2 px-3 py-1 text-xs rounded-full bg-stone-900/60 border ${currentTheme.cardBorder}`}>
              <span className="w-2 h-2 rounded-full bg-stone-500"></span>
              <span>Gość</span>
            </div>
          )}
        </div>
      </header>

      {/* RENDEROWANIE GŁÓWNEGO WIDOKU */}
      {!user ? (
        /* ==========================================
           SYTUACJA 1: Użytkownik NIE JEST zalogowany
           (Strona powitalna z formularzem logowania)
           ========================================== */
        <main className="max-w-4xl mx-auto w-full p-6 flex flex-col md:flex-row items-center justify-center gap-12 flex-1">
          {/* Lewa kolumna: Tekst powitalny */}
          <div className="max-w-md text-center md:text-left">
            <span className="text-xs font-semibold uppercase tracking-widest text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              Matura 2026
            </span>
            <h2 className="text-4xl font-bold text-stone-100 mt-4 leading-tight font-serif tracking-tight">
              Zdasz Maturę z Palcem w Nosie.
            </h2>
            <p className={`mt-4 text-sm sm:text-base ${currentTheme.subText} leading-relaxed`}>
              Witaj w swojej cichej przystani naukowej. Zaloguj się lub utwórz bezpłatne konto, aby uzyskać dostęp do notatek i przygotować się bez zbędnego stresu.
            </p>
            <div className="mt-6 p-4 rounded-2xl bg-stone-900/30 border border-stone-800/40 text-xs italic text-stone-400">
              &quot;{COZY_QUOTES[0].text}&quot; — {COZY_QUOTES[0].author}
            </div>
          </div>

          {/* Prawa kolumna: Formularz logowania / rejestracji */}
          <div className={`w-full max-w-sm rounded-3xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} p-6 sm:p-8 shadow-xl ${currentTheme.glow}`}>
            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
              <h3 className="text-xl font-bold text-stone-100 font-serif text-center">
                {isRegisterForm ? "Załóż darmowe konto" : "Zaloguj się"}
              </h3>
              
              <div className="flex flex-col gap-3 mt-2">
                <input
                  type="email"
                  placeholder="Twój adres e-mail"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  required
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl py-2 px-4 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-700/60"
                />
                <input
                  type="password"
                  placeholder="Hasło"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  required
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl py-2 px-4 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-700/60"
                />
                
                <button
                  type="submit"
                  disabled={authFormLoading}
                  className={`w-full mt-2 py-2.5 rounded-xl ${currentTheme.accentBg} text-stone-950 font-bold ${currentTheme.accentHover} transition-all disabled:bg-gray-500`}
                >
                  {authFormLoading ? "Trwa logowanie..." : isRegisterForm ? "Zarejestruj się" : "Zaloguj się"}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsRegisterForm(!isRegisterForm)}
                className="text-xs text-amber-500 hover:underline text-center mt-2 focus:outline-none"
              >
                {isRegisterForm ? "Masz już konto? Zaloguj się" : "Nie masz konta? Zarejestruj się"}
              </button>
            </form>
          </div>
        </main>
      ) : (
        /* ==========================================
           UŻYTKOWNIK ZALOGOWANY (Główna aplikacja)
           ========================================== */
        <>
          {/* DASHBOARD HERO BANNER (Dostosowany pod kątem braku płatności) */}
          <div className={`max-w-7xl mx-auto w-full px-6 pt-6`}>
            <div className={`relative rounded-3xl overflow-hidden p-6 sm:p-8 border ${currentTheme.cardBorder} ${currentTheme.cardBg} transition-all duration-500 shadow-xl ${currentTheme.glow} flex flex-col md:flex-row items-center justify-between gap-6`}>
              <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange-600/5 rounded-full blur-3xl -z-10 pointer-events-none" />

              <div className="max-w-xl text-center md:text-left">
                <span className="text-xs font-semibold uppercase tracking-widest text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                  {hasAccess ? "Dostęp Aktywny 🎉" : "Matura 2026 🔑"}
                </span>
                
                {hasAccess ? (
                  <>
                    <h2 className="text-3xl sm:text-4xl font-bold text-stone-100 mt-3 leading-tight font-serif tracking-tight">
                      Witaj w pakiecie Premium! 🚀
                    </h2>
                    <p className={`mt-3 text-sm sm:text-base ${currentTheme.subText} leading-relaxed`}>
                      Twój jednorazowy zakup odblokował pełny, nielimitowany dostęp do bazy wiedzy oraz wszystkich modułów AI. Miłej nauki w najprzytulniejszym kąciku w sieci!
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-3xl sm:text-4xl font-bold text-stone-100 mt-3 leading-tight font-serif tracking-tight">
                      Odblokuj pełny dostęp Premium.
                    </h2>
                    <p className={`mt-3 text-sm sm:text-base ${currentTheme.subText} leading-relaxed`}>
                      Masz darmowe konto, które pozwala na przeglądanie kącika. Aby odblokować wszystkie notatki z lektur, moduł oceniania wypracowań AI oraz sprawić, by kłódeczki zniknęły – kliknij przycisk poniżej!
                    </p>
                    <div className="mt-5 flex justify-center md:justify-start">
                      <button
                        onClick={handlePaymentInit}
                        disabled={paymentLoading}
                        className={`px-6 py-3 rounded-xl ${currentTheme.accentBg} text-stone-950 font-bold shadow-md ${currentTheme.accentHover} hover:scale-105 active:scale-98 transition-all flex items-center gap-2`}
                      >
                        <span>🛒</span>
                        {paymentLoading ? "Przygotowywanie..." : "Uzyskaj Pełny Dostęp (80 zł)"}
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-col items-center md:items-end justify-center text-center md:text-right border-t md:border-t-0 md:border-l border-stone-800/80 pt-4 md:pt-0 md:pl-8">
                <span className="text-3xl font-extrabold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                  {hasAccess ? "PREMIUM" : "FREE"}
                </span>
                <span className="text-xs font-medium uppercase tracking-widest text-stone-400 mt-1">
                  Twój Plan
                </span>
                <div className="flex gap-1 mt-2 text-amber-500 text-xs">
                  <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                </div>
                <span className="text-[11px] text-stone-500 mt-1">
                  {hasAccess ? "Dostęp dożywotni bez reklam" : "Zyskaj pełną moc nauki"}
                </span>
              </div>
            </div>
          </div>

          {/* MAIN CONTENT DASHBOARD GRID */}
          <main className="max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
            
            {/* LEFT COLUMN: NAVIGATION & AI ESSAY PLACEHOLDER */}
            <section className="lg:col-span-3 flex flex-col gap-6">
              {/* Navigation Panel */}
                <div className={`rounded-2xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} p-4 transition-colors duration-500`}>
                  <h3 className="text-xs uppercase tracking-widest text-amber-500 font-semibold mb-3 px-1">
                    Nawigacja
                  </h3>
                  <nav className="flex flex-col gap-1">
                    <Link 
                      href="/notes" 
                      className={`flex items-center justify-between p-2.5 rounded-xl hover:bg-stone-900/60 group transition-all`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">📚</span>
                        <span className="text-sm font-medium group-hover:text-amber-400 transition-colors">Wszystkie Notatki</span>
                      </div>
                      <span className="text-xs bg-stone-900 border border-stone-800 text-amber-500/80 px-2 py-0.5 rounded-full">
                        {notes.length}
                      </span>
                    </Link>

                    {/* PRZYCISK: MOJE POSTĘPY */}
                    <button 
                      onClick={() => handlePremiumNavigation("/postepy")}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-stone-900/60 group transition-all text-left w-full"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">📈</span>
                        <span className="text-sm font-medium group-hover:text-amber-400 transition-colors">Moje Postępy</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        hasAccess 
                          ? 'bg-emerald-950/50 border-emerald-900/60 text-emerald-400' 
                          : 'bg-stone-900/60 border-stone-800 text-stone-500'
                      }`}>
                        {hasAccess ? "Wejdź ✨" : "Premium 🔒"}
                      </span>
                    </button>

                    {/* PRZYCISK: SZYBKIE FISZKI */}
                    <button 
                      onClick={() => handlePremiumNavigation("/fiszki")}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-stone-900/60 group transition-all text-left w-full"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">⚡</span>
                        <span className="text-sm font-medium group-hover:text-amber-400 transition-colors">Szybkie Fiszki</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        hasAccess 
                          ? 'bg-purple-950/50 border-purple-900/60 text-purple-300' 
                          : 'bg-stone-900/60 border-stone-800 text-stone-500'
                      }`}>
                        {hasAccess ? "Graj ⚡" : "Premium 🔒"}
                      </span>
                    </button>
                  </nav>
                </div>

              {/* AI Essay Card - Cozy Style */}
              <div className={`rounded-2xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} p-5 relative overflow-hidden transition-colors duration-500 group`}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-600/5 rounded-full blur-2xl group-hover:bg-purple-600/10 transition-all duration-500" />
                
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold uppercase tracking-widest text-purple-400 bg-purple-950/60 px-2.5 py-1 rounded-md border border-purple-800/40">
                    Kryteria CKE + AI
                  </span>
                  <span className="text-stone-500 text-lg">{hasAccess ? "✨" : "🔒"}</span>
                </div>

                <h3 className="text-base font-bold text-stone-100 mt-4 font-serif">
                  Ocenianie Rozprawek AI
                </h3>
                
                <p className="text-xs text-stone-400 mt-2 leading-relaxed">
                  Prześlij swoje wypracowanie maturalne z języka polskiego. Nasz algorytm AI przeanalizuje je w kilka sekund zgodnie z najnowszymi wytycznymi CKE pod kątem:
                </p>

                <ul className="text-[11px] text-stone-500 mt-3 space-y-1">
                  <li className="flex items-center gap-1.5">
                    <span className="text-purple-500">•</span> Sformułowania tezy i argumentacji
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-purple-500">•</span> Spójności tekstu i kompozycji
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-purple-500">•</span> Poprawności językowej i ortograficznej
                  </li>
                </ul>

                <button
                  onClick={() => handlePremiumNavigation("/ocenianie-rozprawek")}
                  className={`w-full mt-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    hasAccess 
                      ? 'bg-purple-600 text-white hover:bg-purple-500' 
                      : 'text-purple-200 border border-purple-900/60 bg-purple-950/20 hover:bg-[#2c1b3d]'
                  }`}
                >
                  {hasAccess ? "Uruchom Edytor ✨" : "Zyskaj Dostęp Premium 🔑"}
                </button>
              </div>
            </section>

            {/* CENTER COLUMN: NOTES BROWSER */}
            <section className="lg:col-span-6 flex flex-col gap-5">
              {/* Search bar & Quick Categories */}
              <div className={`p-4 rounded-2xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} flex flex-col gap-3.5 transition-colors duration-500`}>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Wyszukaj lekturę, motyw lub epokę..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-stone-900/70 border border-stone-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-700/60 focus:ring-1 focus:ring-amber-700/60 transition-all font-sans"
                  />
                  <svg className="w-4 h-4 text-stone-500 absolute left-3.5 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-3.5 text-xs text-stone-500 hover:text-stone-200"
                    >
                      wyczyść
                    </button>
                  )}
                </div>

                {/* Quick subject filter chips */}
                <div className="flex flex-wrap gap-2 pt-1 border-t border-stone-800/40">
                  {[
                      "Wszystkie", 
                      "Antyk", 
                      "Średniowiecze", 
                      "Renesans", 
                      "Barok", 
                      "Oświecenie", 
                      "Romantyzm", 
                      "Pozytywizm", 
                      "Młoda Polska", 
                      "Dwudziestolecie", 
                      "Wojna i okupacja", 
                      "Współczesność"
                    ].map((subject) => (
                    <button
                      key={subject}
                      onClick={() => setSelectedSubject(subject)}
                      className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${
                        selectedSubject === subject
                          ? `${currentTheme.accentBg} text-stone-950 font-bold border-transparent`
                          : "border-stone-800/60 bg-stone-950/40 text-stone-400 hover:border-stone-700 hover:text-stone-200"
                      }`}
                    >
                      {subject}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes list */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold font-serif text-stone-100 flex items-center gap-2">
                    📂 Baza Notatek
                    <span className={`text-[10px] font-sans font-normal px-2 py-0.5 rounded-full bg-stone-900 border ${currentTheme.cardBorder} text-stone-400`}>
                      {filteredNotes.length} z {notes.length}
                    </span>
                  </h3>
                  <a href="/notes" className="text-xs text-amber-500/80 hover:text-amber-400 transition-colors font-medium">
                    zobacz wszystkie →
                  </a>
                </div>

                {loading ? (
                  <div className="rounded-2xl border border-dashed border-amber-950/40 p-8 text-center text-sm text-stone-500 bg-[#1f1915]/30">
                    ☕ Parzenie herbaty i pobieranie notatek z Supabase...
                  </div>
                ) : filteredNotes.length > 0 ? (
                  filteredNotes.map((note) => {
                    const handleNoteClick = (e: React.MouseEvent) => {
                      if (!hasAccess && !note.is_free) {
                        e.preventDefault();
                        triggerNotification("🔒 Ta notatka wymaga konta Premium. Kliknij 'Uzyskaj Pełny Dostęp' u góry strony, aby odblokować całą bazę notatek!", "error");
                      }
                    };

                    return (
                      <a
                        href={`/notes/${note.slug}`}
                        onClick={handleNoteClick}
                        target="_blank"
                        rel="noopener noreferrer"
                        key={note.id}
                        className={`rounded-2xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} p-5 hover:scale-[1.01] hover:shadow-lg transition-all duration-300 flex flex-col justify-between relative overflow-hidden group`}
                      >
                        {/* Subject Tag & Read Time */}
                        <div className="flex items-center justify-between text-[11px] font-semibold text-stone-400">
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">📕</span>
                            <span className="uppercase tracking-wider text-amber-500/80">{note.subject || "Język Polski"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1">
                              ⏱️ {note.read_time || note.readTime || (Math.max(2, Math.round((String(note.content || "")).split(/\s+/).length / 150)) + " min")}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] border bg-amber-950/40 border-amber-900/50 text-amber-400`}>
                              Lektura
                            </span>
                          </div>
                        </div>
                        <h4 className="text-base font-bold text-stone-100 font-serif mt-3 tracking-tight group-hover:text-amber-200 transition-colors">
                          {note.title} {!hasAccess && !note.is_free && "🔒"}
                        </h4>
                        <p className="text-xs text-stone-400/90 leading-relaxed mt-2 line-clamp-3">
                          {getExcerpt(note)}
                        </p>
                        <div className="border-t border-stone-800/40 mt-4 pt-3 flex items-center justify-between text-xs text-stone-500">
                          <span>Zaktualizowano niedawno</span>
                          <span className={`text-amber-500/80 group-hover:text-amber-400 font-medium flex items-center gap-1 transition-colors`}>
                            {hasAccess || note.is_free ? "Otwórz notatkę 📚" : "Odblokuj notatkę 🔒"}
                          </span>
                        </div>
                      </a>
                    );
                  })
                ) : (
                  <div className={`rounded-2xl border border-dashed border-stone-800 p-8 text-center text-sm text-stone-500`}>
                    😴 Brak notatek spełniających wybrane kryteria. Spróbuj zmienić słowo kluczowe.
                  </div>
                )}
              </div>
            </section>

            {/* RIGHT COLUMN: COZY STUDY CORNER */}
            <section className="lg:col-span-3 flex flex-col gap-6">
              
              {/* Animowany Kubek Steaming Mug - Cozy Interaction */}
              <div 
                onClick={handleMugClick}
                className={`rounded-2xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} p-5 text-center cursor-pointer select-none relative overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-xl ${currentTheme.glow} group`}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                <h3 className="text-xs uppercase tracking-widest text-amber-500 font-semibold mb-1">
                  Przytulny Kącik
                </h3>
                
                <div className="relative w-24 h-24 mx-auto flex items-center justify-center my-1 select-none">
                  <svg className="absolute top-1 w-12 h-8 text-stone-400/50" viewBox="0 0 100 100" fill="none">
                    <path className="steam-line" d="M30,80 Q40,60 30,40 T40,10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                    <path className="steam-line-2" d="M50,80 Q60,65 50,45 T60,15" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                    <path className="steam-line-3" d="M70,85 Q80,70 70,50 T80,20" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  </svg>

                  <svg className="w-16 h-16 text-amber-800/80 drop-shadow-md transform group-hover:rotate-3 transition-transform" viewBox="0 0 100 100" fill="currentColor">
                    <path d="M20,35 C20,35 20,80 30,85 C40,90 60,90 70,85 C80,80 80,35 80,35 Z" fill="#694d3f" />
                    <ellipse cx="50" cy="35" rx="30" ry="8" fill="#8b6857" />
                    <ellipse cx="50" cy="35" rx="27" ry="6" fill="#a75d33" />
                    <path d="M80,45 C80,45 92,45 92,60 C92,75 80,75 80,75" stroke="#694d3f" strokeWidth="10" strokeLinecap="round" fill="none" />
                    <path d="M50,50 L52,55 L58,56 L53,60 L55,66 L50,62 L45,66 L47,60 L42,56 L48,55 Z" fill="#e8d5c8" />
                  </svg>
                </div>

                <p className="text-xs font-semibold text-stone-200 mt-2">
                  Zrób łyk ciepłego naparu ☕
                </p>
                <p className="text-[11px] text-stone-400 mt-1 italic leading-relaxed">
                  &quot;{mugMessage}&quot;
                </p>
              </div>

              {/* Działający Pomodoro Timer */}
              <div className={`rounded-2xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} p-5 transition-colors duration-500`}>
                <div className="flex items-center justify-between mb-3.5">
                  <h3 className="text-xs uppercase tracking-widest text-amber-500 font-semibold flex items-center gap-1.5">
                    <span>⏱️</span> Pomodoro
                  </h3>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => switchPomodoroMode("work")}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition-all ${
                        pomodoroMode === "work"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                          : "bg-transparent text-stone-500 hover:text-stone-300"
                      }`}
                    >
                      Nauka
                    </button>
                    <button
                      onClick={() => switchPomodoroMode("break")}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition-all ${
                        pomodoroMode === "break"
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                      : "bg-transparent text-stone-500 hover:text-stone-300"
                  }`}
                >
                  Relaks
                </button>
              </div>
            </div>

            <div className="bg-stone-900/60 border border-stone-800/80 rounded-2xl p-4 text-center">
              <span className="text-3xl font-extrabold tracking-widest text-stone-100 font-mono drop-shadow-sm select-none">
                {formatTime(timeLeft)}
              </span>
              <p className="text-[10px] text-stone-500 mt-1">
                {pomodoroMode === "work" ? "Czas na głębokie skupienie 📚" : "Czas na chwilę wytchnienia ☕"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3.5">
              <button
                onClick={toggleTimer}
                className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  timerRunning
                    ? "bg-stone-800 text-stone-300 border border-stone-700 hover:bg-stone-700"
                    : `${currentTheme.accentBg} text-stone-950 ${currentTheme.accentHover} shadow-md`
                }`}
              >
                {timerRunning ? (
                  <>
                    <span>⏸️</span> Pauza
                  </>
                ) : (
                  <>
                    <span>▶️</span> Start
                  </>
                )}
              </button>

              <button
                onClick={resetTimer}
                className="py-2 rounded-xl text-xs font-bold bg-stone-900 hover:bg-stone-850 border border-stone-800/60 text-stone-400 hover:text-stone-200 transition-all flex items-center justify-center gap-1"
              >
                <span>🔄</span> Reset
              </button>
            </div>
          </div>

          {/* Cytat Dnia z przyciskiem rotacji */}
          <div 
            onClick={rotateQuote}
            className={`rounded-2xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} p-5 cursor-pointer relative overflow-hidden transition-all duration-300 hover:scale-[1.01]`}
          >
            <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
              <span>💡 Mądrość na dziś</span>
              <span className="text-[10px] text-amber-500/80">kliknij po kolejny →</span>
            </div>
            
            <p className="text-xs text-stone-300 font-serif leading-relaxed italic">
              &quot;{COZY_QUOTES[quoteIndex].text}&quot;
            </p>
            
            <p className="text-[10px] text-stone-500 mt-2 text-right">
              — {COZY_QUOTES[quoteIndex].author}
            </p>
          </div>
        </section>
      </main>
    </>
  )}

  {/* CLIMATIC SETTINGS OVERLAY / DIALOG MODAL */}
  {isSettingsOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
      <div className={`w-full max-w-md bg-[#1f1915] border border-amber-950/40 rounded-3xl p-6 shadow-2xl relative`}>
        <button
          onClick={() => setIsSettingsOpen(false)}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-100 text-lg transition-colors"
        >
          ✕
        </button>

        <h3 className="text-lg font-bold font-serif text-stone-100 flex items-center gap-2 mb-2">
          ☕ Ustawienia Twojej Kawiarni Nauki
        </h3>
        <p className="text-xs text-stone-400 mb-5">
          Dostosuj otoczenie do własnego tempa. Zmiana klimatu wpływa na tło strony oraz rodzaj odtwarzanego szumu.
        </p>

        <div className="flex flex-col gap-3">
          <label className="text-xs font-semibold text-amber-500 uppercase tracking-widest">
            Wybierz Motyw Wizualny i Dźwiękowy
          </label>

          <div className="grid grid-cols-1 gap-2.5">
            <button
              onClick={() => setCozyTheme("library")}
              className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                cozyTheme === "library"
                  ? "border-amber-500 bg-[#c68a4c]/10 text-stone-200"
                  : "border-stone-800 bg-stone-900/60 text-stone-400 hover:border-stone-700 hover:text-stone-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🍂</span>
                <div>
                  <p className="text-xs font-bold">Ciepła Biblioteka (Domyślny)</p>
                  <p className="text-[10px] text-stone-500">Cynamonowe barwy, delikatny szum papieru</p>
                </div>
              </div>
              {cozyTheme === "library" && <span className="text-amber-500 text-xs">●</span>}
            </button>

            <button
              onClick={() => setCozyTheme("rainy")}
              className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                cozyTheme === "rainy"
                  ? "border-sky-500 bg-sky-950/15 text-stone-200"
                  : "border-stone-800 bg-stone-900/60 text-stone-400 hover:border-stone-700 hover:text-stone-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🌧️</span>
                <div>
                  <p className="text-xs font-bold">Deszczowy Wieczór</p>
                  <p className="text-[10px] text-stone-500">Głębokie chłodne szarości, szum deszczu za oknem</p>
                </div>
              </div>
              {cozyTheme === "rainy" && <span className="text-sky-500 text-xs">●</span>}
            </button>

            <button
              onClick={() => setCozyTheme("fireplace")}
              className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                cozyTheme === "fireplace"
                  ? "border-red-600 bg-red-950/15 text-stone-200"
                  : "border-stone-800 bg-stone-900/60 text-stone-400 hover:border-stone-700 hover:text-stone-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🔥</span>
                <div>
                  <p className="text-xs font-bold">Kominek w Schronisku</p>
                  <p className="text-[10px] text-stone-500">Ciepła powłoka węglowa, trzaski płonącego drewna</p>
                </div>
              </div>
              {cozyTheme === "fireplace" && <span className="text-red-500 text-xs">●</span>}
            </button>
          </div>
        </div>
        {/* Sekcja zmiany hasła (Widoczna tylko dla zalogowanych użytkowników) */}
            {user && (
              <div className="mt-6 pt-5 border-t border-stone-800 flex flex-col gap-3">
                <label className="text-xs font-semibold text-amber-500 uppercase tracking-widest">
                  Konto i Bezpieczeństwo
                </label>
                <form onSubmit={handlePasswordChange} className="flex flex-col gap-2">
                  <p className="text-[10px] text-stone-500 leading-relaxed">
                    Wpisz nowe, bezpieczne hasło (minimum 6 znaków):
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder="Nowe hasło"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="flex-1 bg-stone-900 border border-stone-800 rounded-xl py-2 px-3 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-700/60"
                    />
                    <button
                      type="submit"
                      disabled={passwordChangeLoading}
                      className="px-4 py-2 bg-stone-900 hover:bg-stone-850 border border-stone-800 text-stone-300 hover:text-stone-100 text-xs font-bold rounded-xl transition-all disabled:bg-gray-500"
                    >
                      {passwordChangeLoading ? "Zmienianie..." : "Zmień"}
                    </button>
                  </div>
                </form>
              </div>
            )}

        <div className="mt-6 pt-4 border-t border-stone-800 flex justify-end">
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 text-stone-950 hover:bg-amber-400 transition-all active:scale-95"
          >
            Zamknij i Zastosuj
          </button>
        </div>
      </div>
    </div>
  )}

  {/* FOOTER */}
    <footer className={`border-t ${currentTheme.cardBorder} mt-auto py-6 px-6 text-center text-xs ${currentTheme.subText} transition-colors duration-500 bg-stone-950/20`}>
      <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-3">
        <p>© 2026 Wiedza Szyta na Miarę. Stworzone z miłości do spokojnej nauki.</p>
        <div className="flex gap-4">
          {/* ZMIANA: Zamiast buttonów z alertami, wstawiamy bezpośrednie odnośniki Link */}
          <Link href="/regulamin" className="hover:text-stone-100 transition-colors">
            Regulamin
          </Link>
          <Link href="/prywatnosc" className="hover:text-stone-100 transition-colors">
            Prywatność
          </Link>
          <Link href="/kontakt" className="hover:text-stone-100 transition-colors">
            Kontakt
          </Link>
        </div>
      </div>
    </footer>

  {/* PRZYTULNE POWIADOMIENIE (ZAMIAST BRZYDKIEGO ALERTU) */}
  {cozyNotification && (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-in">
      <div className={`flex items-center gap-3.5 px-5 py-4 rounded-2xl border shadow-2xl backdrop-blur-md max-w-sm ${
        cozyNotification.type === 'success'
          ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200'
          : cozyNotification.type === 'error'
          ? 'bg-red-950/90 border-red-500/30 text-red-200'
          : 'bg-[#251b15]/95 border-amber-950/40 text-stone-200'
      }`}>
        <span className="text-xl">
          {cozyNotification.type === 'success' ? '✨' : cozyNotification.type === 'error' ? '⚠️' : '☕'}
        </span>
        <p className="text-xs font-semibold leading-relaxed pr-2">
          {cozyNotification.message}
        </p>
        <button 
          onClick={() => setCozyNotification(null)}
          className="text-stone-400 hover:text-stone-100 text-xs ml-auto font-bold focus:outline-none"
        >
          ✕
        </button>
      </div>
    </div>
  )}

</div>
);
}
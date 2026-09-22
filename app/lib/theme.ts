// lib/theme.ts

export type CozyTheme = "library" | "rainy" | "fireplace";

export interface ThemeClasses {
  bg: string;
  cardBg: string;
  cardBorder: string;
  accentText: string;
  accentBg: string;
  accentHover: string;
  glow: string;
  btnBorder: string;
  textColor: string;
  subText: string;
}

export const getThemeClasses = (theme: CozyTheme): ThemeClasses => {
  switch (theme) {
    case "rainy":
      return {
        bg: "bg-[#0b0f14]",
        // 🍏 iOS Frosted Glass (70% krycia + 24px blur + saturacja barw w tle)
        cardBg: "bg-[#131b24]/70 backdrop-blur-xl backdrop-saturate-150 shadow-2xl shadow-black/40",
        cardBorder: "border-sky-500/20 border-t-white/10",
        accentText: "text-sky-400",
        accentBg: "bg-sky-500",
        accentHover: "hover:bg-sky-400",
        glow: "shadow-[0_8px_32px_0_rgba(14,165,233,0.12)]",
        btnBorder: "border-sky-500/30",
        textColor: "text-slate-100",
        subText: "text-slate-400"
      };

    case "fireplace":
      return {
        bg: "bg-[#140808]",
        // 🍏 iOS Frosted Glass (Ciepłe bursztynowo-szklane tło)
        cardBg: "bg-[#1f0e0e]/75 backdrop-blur-xl backdrop-saturate-150 shadow-2xl shadow-black/40",
        cardBorder: "border-amber-600/25 border-t-amber-400/20",
        accentText: "text-amber-500",
        accentBg: "bg-amber-600",
        accentHover: "hover:bg-amber-500",
        glow: "shadow-[0_8px_32px_0_rgba(245,158,11,0.12)]",
        btnBorder: "border-amber-600/35",
        textColor: "text-rose-50",
        subText: "text-rose-200/70"
      };

    case "library":
    default:
      return {
        bg: "bg-[#110d0b]",
        // 🍏 iOS Frosted Glass (Ciemne szlachetne szkło z bursztynowym refleksem)
        cardBg: "bg-[#1c1511]/75 backdrop-blur-xl backdrop-saturate-150 shadow-2xl shadow-black/40",
        cardBorder: "border-[#c68a4c]/20 border-t-amber-400/15",
        accentText: "text-amber-400",
        accentBg: "bg-[#c68a4c]",
        accentHover: "hover:bg-[#d99c5d]",
        glow: "shadow-[0_8px_32px_0_rgba(198,138,76,0.12)]",
        btnBorder: "border-[#c68a4c]/30",
        textColor: "text-stone-100",
        subText: "text-stone-300/80"
      };
  }
};
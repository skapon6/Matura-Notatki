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
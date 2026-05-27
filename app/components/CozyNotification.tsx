import React from "react";

interface CozyNotificationProps {
  notification: {
    message: string;
    type: "success" | "error" | "info";
  } | null;
  onClose: () => void;
}

export const CozyNotification: React.FC<CozyNotificationProps> = ({ notification, onClose }) => {
  if (!notification) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-in">
      <div className={`flex items-center gap-3.5 px-5 py-4 rounded-2xl border shadow-2xl backdrop-blur-md max-w-sm ${
        notification.type === 'success'
          ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200'
          : notification.type === 'error'
          ? 'bg-red-950/90 border-red-500/30 text-red-200'
          : 'bg-[#251b15]/95 border-amber-950/40 text-stone-200'
      }`}>
        <span className="text-xl">
          {notification.type === 'success' ? '✨' : notification.type === 'error' ? '⚠️' : '☕'}
        </span>
        <p className="text-xs font-semibold leading-relaxed pr-2">
          {notification.message}
        </p>
        <button 
          onClick={onClose}
          className="text-stone-400 hover:text-stone-100 text-xs ml-auto font-bold focus:outline-none"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
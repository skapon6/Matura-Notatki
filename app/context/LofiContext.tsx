"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";

export interface LofiTrack {
  name: string;
  src: string;
}

interface LofiContextType {
  lofiActive: boolean;
  currentTrackIndex: number;
  lofiVolume: number;
  lofiTracks: LofiTrack[];
  toggleLofi: () => void;
  handleNextTrack: () => void;
  handlePrevTrack: () => void;
  handleVolumeChange: (vol: number) => void;
}

const LofiContext = createContext<LofiContextType | undefined>(undefined);

export const lofiTracks: LofiTrack[] = [
  { name: "Chill Lofi 1", src: "/audio/track1.mp3" },
  { name: "Cozy Lofi 2", src: "/audio/track2.mp3" },
];

export const LofiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const lofiAudioRef = useRef<HTMLAudioElement | null>(null);
  const [lofiActive, setLofiActive] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [lofiVolume, setLofiVolume] = useState(0.3);

  const toggleLofi = () => {
    if (!lofiAudioRef.current) {
      lofiAudioRef.current = new Audio(lofiTracks[currentTrackIndex].src);
      lofiAudioRef.current.volume = lofiVolume;
      
      lofiAudioRef.current.addEventListener("ended", () => {
        handleNextTrack();
      });
    }

    if (lofiActive) {
      lofiAudioRef.current.pause();
      setLofiActive(false);
    } else {
      lofiAudioRef.current.play().catch((err) => {
        console.error("Autoodtwarzanie zablokowane:", err);
      });
      setLofiActive(true);
    }
  };

  const handleNextTrack = () => {
    setCurrentTrackIndex((prevIndex) => (prevIndex + 1) % lofiTracks.length);
  };

  const handlePrevTrack = () => {
    setCurrentTrackIndex((prevIndex) => (prevIndex - 1 + lofiTracks.length) % lofiTracks.length);
  };

  const handleVolumeChange = (newVolume: number) => {
    setLofiVolume(newVolume);
    if (lofiAudioRef.current) {
      lofiAudioRef.current.volume = newVolume;
    }
  };

  // Reakcja na zmianę utworu
  useEffect(() => {
    if (lofiAudioRef.current) {
      const wasPlaying = lofiActive;
      lofiAudioRef.current.pause();
      lofiAudioRef.current.src = lofiTracks[currentTrackIndex].src;
      lofiAudioRef.current.load();
      if (wasPlaying) {
        lofiAudioRef.current.play().catch((err) => console.error(err));
      }
    }
  }, [currentTrackIndex]);

  // Czyszczenie na unmount
  useEffect(() => {
    return () => {
      if (lofiAudioRef.current) {
        lofiAudioRef.current.pause();
      }
    };
  }, []);

  return (
    <LofiContext.Provider value={{
      lofiActive,
      currentTrackIndex,
      lofiVolume,
      lofiTracks,
      toggleLofi,
      handleNextTrack,
      handlePrevTrack,
      handleVolumeChange
    }}>
      {children}
    </LofiContext.Provider>
  );
};

export const useLofi = () => {
  const context = useContext(LofiContext);
  if (!context) {
    throw new Error("useLofi must be used within a LofiProvider");
  }
  return context;
};
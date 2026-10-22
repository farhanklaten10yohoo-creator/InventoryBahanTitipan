"use client";

import { useEffect } from "react";

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
}

export function SuccessModal({ isOpen, onClose, title, message }: SuccessModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Menunda audio sedikit (misal 100 milidetik) agar pas dengan awal goresan centang
      const timer = setTimeout(() => {
        const audio = new Audio("/success-sound.mp3");
        audio.volume = 0.5;
        audio.play().catch((err) => {
          console.log("Audio play blocked by browser:", err);
        });
      }, 100); // Sesuaikan angka milidetik ini (0 hingga 200) untuk ketepatan suara

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-center space-y-4">
        
        {/* ANIMASI CENTANG BERGERAK (DRAW-CHECK) */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <svg className="h-8 w-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
              d="M5 13l4 4L19 7"
              style={{
                strokeDasharray: 50,
                strokeDashoffset: 0,
                animation: "drawCheck 0.6s ease-in-out forwards",
              }}
            />
          </svg>
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <p className="mt-1 text-xs text-slate-500">{message}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-semibold text-white shadow-sm transition"
        >
          OK
        </button>
      </div>
    </div>
  );
}
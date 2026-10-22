"use client";

interface SuccessModalProps {
  isOpen: boolean;
  message: string;
  onClose: () => void;
}

export function SuccessModal({ isOpen, message, onClose }: SuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-center space-y-5 animate-in fade-in zoom-in duration-200">
        
        {/* Lingkaran Ikon Centang Animasi */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center border-4 border-emerald-100">
            <svg
              className="w-10 h-10 text-emerald-600"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
                className="animate-draw-check"
              />
            </svg>
          </div>
        </div>

        {/* Teks Pesan */}
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-slate-900">Sukses</h3>
          <p className="text-sm text-slate-600 px-2">{message}</p>
        </div>

        {/* Tombol OK */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md transition"
        >
          OK
        </button>
      </div>
    </div>
  );
}
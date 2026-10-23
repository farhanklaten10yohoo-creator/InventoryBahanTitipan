"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Alert, Card, Input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const cleanUsername = username.trim().toLowerCase();
    const formattedEmail = cleanUsername.includes("@")
      ? cleanUsername
      : `${cleanUsername}@titipan.com`;

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: formattedEmail,
      password,
    });
    setLoading(false);

    if (loginError) {
      console.error("Login error:", loginError);
      if (loginError.message.includes("Email not confirmed")) {
        setError("Email belum dikonfirmasi di Supabase Dashboard.");
      } else if (loginError.message.includes("Invalid login credentials")) {
        setError("Username atau Password salah. Pastikan user sudah dibuat di Supabase.");
      } else {
        setError(`Gagal Login: ${loginError.message}`);
      }
    } else if (data.session) {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-white shadow-2xl rounded-2xl border-0 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto flex items-center justify-center">
            <img src="/Logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory Titipan</h1>
          <p className="text-xs text-slate-500">
            Masukkan username dan password Anda
          </p>
        </div>
        {error ? <Alert tone="error">{error}</Alert> : null}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Username
            </label>
            <Input
              type="text"
              required
              placeholder="Masukkan Username yang Terdaftar"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Password
            </label>
            <Input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {/* TOMBOL MASUK APLIKASI BERWARNA HIJAU */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
          >
            {loading ? "Memproses Login..." : "Masuk Aplikasi"}
          </button>
        </form>
        <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-100">
          Progam By Farhan &copy; 2026
        </div>
      </Card>
    </div>
  );
}
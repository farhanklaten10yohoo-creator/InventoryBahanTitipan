"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface AppShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function AppShell({ title, subtitle, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  
  // STATE DEFAULT SIDEBAR TERTUTUP/TERSEMBUNYI
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
      } else {
        setUserEmail(session.user.email ?? null);
        setCheckingAuth(false);
      }
    };

    void checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push("/login");
      } else {
        setUserEmail(session.user.email ?? null);
        setCheckingAuth(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const handleLogout = async () => {
    if (confirm("Apakah Anda yakin ingin keluar dari aplikasi?")) {
      await supabase.auth.signOut();
      router.push("/login");
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-700 text-sm font-medium">
        Memeriksa status login...
      </div>
    );
  }

  const navItems = [
    {
      label: "Dashboard Rekap",
      sublabel: "Pantau order & kekurangan",
      href: "/",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      label: "Master Barang Titipan",
      sublabel: "Katalog bahan & kode",
      href: "/master",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      label: "Input Barang Titipan",
      sublabel: "Input order customer",
      href: "/usulan",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-3-3v6m-9 1V7a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex overflow-x-hidden relative">
      {/* SENSOR HOVER PINGGIR LAYAR PALING KIRI */}
      <div
        onMouseEnter={() => setIsSidebarOpen(true)}
        className="fixed inset-y-0 left-0 w-3 z-40 bg-transparent"
      />

      {/* OVERLAY TRANSPARAN SAAT SIDEBAR MUNCUL */}
      {isSidebarOpen ? (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-[1px] z-40 transition-opacity"
        />
      ) : null}

      {/* SIDEBAR NAVIGATION TEMA TERANG / SELARAS */}
      <aside
        onMouseEnter={() => setIsSidebarOpen(true)}
        onMouseLeave={() => setIsSidebarOpen(false)}
        className={`${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } w-64 transition-transform duration-300 ease-in-out bg-white border-r border-slate-200 text-slate-800 flex flex-col fixed inset-y-0 left-0 z-50 overflow-hidden shadow-xl`}
      >
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-sm">
              BT
            </div>
            <div>
              <h1 className="font-bold text-sm leading-tight text-slate-900">Inventory</h1>
              <p className="text-xs text-slate-500">Barang Titipan</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-start gap-3 p-3 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <div className={`mt-0.5 ${isActive ? "text-emerald-700" : "text-slate-500"}`}>
                  {item.icon}
                </div>
                <div>
                  <div className={`font-semibold ${isActive ? "text-emerald-900" : "text-slate-800"}`}>
                    {item.label}
                  </div>
                  <div className={`text-xs font-normal ${isActive ? "text-emerald-600" : "text-slate-500"}`}>
                    {item.sublabel}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* AREA PROFIL & TOMBOL LOGOUT */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50 space-y-3">
          {userEmail ? (
            <div className="text-xs text-slate-500 truncate">
              Login sebagai: <strong className="text-slate-800 block truncate">{userEmail.replace('@titipan.com', '')}</strong>
            </div>
          ) : null}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-600 hover:text-white transition text-xs font-semibold"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Keluar / Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ml-0">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-30">
          <button
            type="button"
            onMouseEnter={() => setIsSidebarOpen(true)}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition focus:outline-none"
            title="Arahkan kursor ke sini untuk membuka menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div>
         
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">{title}</h1>
            {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
          </div>
        </header>

        <main className="flex-1 p-6 min-w-0 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageBanner } from "@/components/page-banner";
import { SuccessModal } from "@/components/success-modal";
import { Alert, Button, Card, EmptyState, Input } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import type { UsulanWithBarang } from "@/lib/types";
import { explainError } from "@/lib/utils";

export default function UsulanPage() {
  const [rows, setRows] = useState<UsulanWithBarang[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: fetchError } = await supabase
      .from("usulan_barang_titipan")
      .select("*, master_barang_titipan(*)")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(explainError(fetchError.message));
    } else {
      setRows((data ?? []) as UsulanWithBarang[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = rows.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.no_spo.toLowerCase().includes(q) ||
      (item.nama_pemesan && item.nama_pemesan.toLowerCase().includes(q)) ||
      (item.nama_order && item.nama_order.toLowerCase().includes(q)) ||
      (item.master_barang_titipan?.kode_barang && item.master_barang_titipan.kode_barang.toLowerCase().includes(q))
    );
  });

  return (
    <AppShell title="" subtitle="">
      <div className="space-y-6 w-full min-w-0">
        
        {/* PAGE BANNER UTAMA */}
        <PageBanner
          title="Input Barang Titipan"
          subtitle="Input transaksi inputan, catat kedatangan barang, dan kelola riwayat order."
        />

        {error ? <Alert tone="error">{error}</Alert> : null}

        <div className="p-0 overflow-hidden w-full min-w-0 shadow-lg border border-slate-200 rounded-2xl bg-white">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Daftar Transaksi Inputan</h2>
              <p className="text-xs text-slate-500">
                Kelola data usulan dan pantau kedatangan barang titipan di sini.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="w-full sm:w-72">
                <Input
                  placeholder="Cari SPO, order, pemesan, atau barang..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button onClick={() => setSuccessModalOpen(true)}>
                + Tambah Inputan
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Memuat data usulan...</div>
          ) : filteredRows.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="Tidak ada data inputan"
                text={search ? "Tidak ada data yang cocok dengan pencarian." : "Belum ada transaksi inputan yang dicatat."}
              />
            </div>
          ) : (
            <div className="overflow-x-auto w-full p-4">
              <table className="w-full border-collapse border border-slate-200 text-left text-sm text-slate-800">
                <thead className="bg-slate-100 text-xs font-bold uppercase text-slate-700">
                  <tr>
                    <th className="border border-slate-200 px-4 py-3">NO SPO</th>
                    <th className="border border-slate-200 px-4 py-3">NAMA ORDER</th>
                    <th className="border border-slate-200 px-4 py-3">NAMA PEMESAN</th>
                    <th className="border border-slate-200 px-4 py-3">BARANG TITIPAN</th>
                    <th className="border border-slate-200 px-4 py-3 text-right">JUMLAH ORDER</th>
                    <th className="border border-slate-200 px-4 py-3 text-right">KEDATANGAN</th>
                    <th className="border border-slate-200 px-4 py-3">KETERANGAN</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      <td className="border border-slate-200 px-4 py-3 font-semibold font-mono text-slate-900">
                        {item.no_spo}
                      </td>
                      <td className="border border-slate-200 px-4 py-3">{item.nama_order || "-"}</td>
                      <td className="border border-slate-200 px-4 py-3">{item.nama_pemesan || "-"}</td>
                      <td className="border border-slate-200 px-4 py-3">
                        <span className="inline-block rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs font-mono font-medium text-slate-800 mr-1.5">
                          {item.master_barang_titipan?.kode_barang || "-"}
                        </span>
                        {item.master_barang_titipan?.nama_bahan || "-"}
                      </td>
                      <td className="border border-slate-200 px-4 py-3 text-right font-medium">
                        {item.jumlah_order.toLocaleString("id-ID")}
                      </td>
                      <td className="border border-slate-200 px-4 py-3 text-right font-medium text-emerald-700">
                        {item.jumlah_kedatangan.toLocaleString("id-ID")}
                      </td>
                      <td className="border border-slate-200 px-4 py-3 text-slate-600">
                        {item.keterangan || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <SuccessModal
          isOpen={successModalOpen}
          onClose={() => setSuccessModalOpen(false)}
          title="Berhasil Disimpan!"
          message="Data inputan barang titipan baru telah berhasil ditambahkan ke sistem."
        />
      </div>
    </AppShell>
  );
}
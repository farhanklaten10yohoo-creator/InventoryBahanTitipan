"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { AppShell } from "@/components/app-shell";
import { Alert, Button, Card, EmptyState, Input } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import type { UsulanWithBarang } from "@/lib/types";
import { explainError, toNumber } from "@/lib/utils";

type GroupedRekap = {
  no_spo: string;
  nama_order: string;
  nama_pemesan: string;
  kode_barang: string;
  nama_bahan: string;
  jumlah_order: number;
  total_kedatangan: number;
  kekurangan: number;
};

export default function DashboardPage() {
  const [rows, setRows] = useState<UsulanWithBarang[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // STATE UNTUK PAGINASI & ROWS PER PAGE
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

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

  // RESET KE HALAMAN 1 SAAT FILTER ATAU JUMLAH BARIS DIUBAH
  useEffect(() => {
    setCurrentPage(1);
  }, [search, pageSize]);

  // AKUMULASI REKAP DATA PER SPO
  const groupedData = useMemo(() => {
    const map = new Map<string, GroupedRekap>();
    rows.forEach((row) => {
      const spoKey = row.no_spo.trim();
      const kedatangan = toNumber(row.jumlah_kedatangan);
      const order = toNumber(row.jumlah_order);

      if (!map.has(spoKey)) {
        map.set(spoKey, {
          no_spo: spoKey,
          nama_order: row.nama_order || "-",
          nama_pemesan: row.nama_pemesan || "-",
          kode_barang: row.master_barang_titipan?.kode_barang || "-",
          nama_bahan: row.master_barang_titipan?.nama_bahan || "-",
          jumlah_order: order,
          total_kedatangan: kedatangan,
          kekurangan: Math.max(0, order - kedatangan),
        });
      } else {
        const existing = map.get(spoKey)!;
        existing.total_kedatangan += kedatangan;
        existing.kekurangan = Math.max(0, existing.jumlah_order - existing.total_kedatangan);
      }
    });
    return Array.from(map.values());
  }, [rows]);

  // FILTER PENCARIAN
  const filteredData = useMemo(() => {
    if (!search.trim()) return groupedData;
    const q = search.toLowerCase();
    return groupedData.filter(
      (item) =>
        item.no_spo.toLowerCase().includes(q) ||
        item.nama_pemesan.toLowerCase().includes(q) ||
        item.nama_order.toLowerCase().includes(q) ||
        item.kode_barang.toLowerCase().includes(q)
    );
  }, [groupedData, search]);

  // PAGINATION SLICE
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const startIndex = filteredData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, filteredData.length);

  // STATISTIK RINGKASAN
  const totalSPO = groupedData.length;
  const totalJumlahOrder = groupedData.reduce((acc, item) => acc + item.jumlah_order, 0);
  const totalSudahDatang = groupedData.reduce((acc, item) => acc + item.total_kedatangan, 0);
  const totalKekurangan = Math.max(0, totalJumlahOrder - totalSudahDatang);

  // FUNGSI EXPORT DATA KE EXCEL
  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      alert("Tidak ada data untuk diekspor.");
      return;
    }
    const dataToExport = filteredData.map((item, index) => ({
      No: index + 1,
      "No SPO": item.no_spo,
      "Nama Order": item.nama_order,
      "Nama Pemesan": item.nama_pemesan,
      "Kode Barang": item.kode_barang,
      "Nama Bahan": item.nama_bahan,
      "Jumlah Order": item.jumlah_order,
      "Kedatangan": item.total_kedatangan,
      "Kekurangan": item.kekurangan,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Titipan");
    const dateStr = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `Rekap_Barang_Titipan_${dateStr}.xlsx`);
  };

  return (
    <AppShell
      title="Dashboard Rekap Data"
      subtitle="Ringkasan inputan barang titipan, akumulasi kekurangan, dan pencarian cepat."
    >
      <div className="space-y-6 w-full min-w-0">
        {/* CARD RINGKASAN */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-5">
            <p className="text-sm font-medium text-slate-500">Total SPO / Inputan</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{totalSPO}</p>
          </Card>
          <Card className="p-5">
            <p className="text-sm font-medium text-slate-500">Jumlah Order</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {totalJumlahOrder.toLocaleString("id-ID")}
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-sm font-medium text-slate-500">Sudah Datang</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {totalSudahDatang.toLocaleString("id-ID")}
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-sm font-medium text-slate-500">Kekurangan</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {totalKekurangan.toLocaleString("id-ID")}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {groupedData.filter((i) => i.kekurangan > 0).length} SPO masih ada kekurangan
            </p>
          </Card>
        </div>

        {error ? <Alert tone="error">{error}</Alert> : null}

        {/* TABEL REKAP UTAMA */}
        <Card className="p-0 overflow-hidden w-full min-w-0">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Rekap Inputan</h2>
              <p className="text-xs text-slate-500">
                Kekurangan dihitung otomatis dari jumlah order dikurangi akumulasi kedatangan barang.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="w-full sm:w-72">
                <Input
                  placeholder="Cari No SPO, pemesan, atau order..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={handleExportExcel}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm transition whitespace-nowrap"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Excel
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Memuat rekap data...</div>
          ) : filteredData.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="Tidak ada data rekap"
                text={search ? "Tidak ada inputan yang cocok dengan pencarian." : "Belum ada inputan barang yang dicatat."}
              />
            </div>
          ) : (
            <>
              {/* TABEL REKAP */}
              <div className="overflow-x-auto w-full p-4 bg-white">
                <table className="w-full border-collapse border border-slate-300 text-left text-sm text-slate-700">
                  <thead className="bg-slate-100 text-xs font-semibold uppercase text-slate-700">
                    <tr>
                      <th className="border border-slate-300 p-0 text-center relative group hover:border-emerald-500 transition-colors">
                        <div className="px-4 py-3 min-w-[140px] text-center select-none">
                          NO SPO
                        </div>
                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-emerald-500 transition-colors pointer-events-none" />
                      </th>
                      <th className="border border-slate-300 p-0 text-center relative group hover:border-emerald-500 transition-colors">
                        <div className="px-4 py-3 min-w-[220px] text-center select-none">
                          NAMA ORDER
                        </div>
                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-emerald-500 transition-colors pointer-events-none" />
                      </th>
                      <th className="border border-slate-300 p-0 text-center relative group hover:border-emerald-500 transition-colors">
                        <div className="px-4 py-3 min-w-[200px] text-center select-none">
                          NAMA PEMESAN
                        </div>
                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-emerald-500 transition-colors pointer-events-none" />
                      </th>
                      <th className="border border-slate-300 p-0 text-center relative group hover:border-emerald-500 transition-colors">
                        <div className="px-4 py-3 min-w-[240px] text-center select-none">
                          NAMA / KODE BARANG
                        </div>
                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-emerald-500 transition-colors pointer-events-none" />
                      </th>
                      <th className="border border-slate-300 p-0 text-center relative group hover:border-emerald-500 transition-colors">
                        <div className="px-4 py-3 min-w-[150px] text-center select-none">
                          JUMLAH ORDER
                        </div>
                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-emerald-500 transition-colors pointer-events-none" />
                      </th>
                      <th className="border border-slate-300 p-0 text-center relative group hover:border-emerald-500 transition-colors">
                        <div className="px-4 py-3 min-w-[140px] text-center select-none">
                          KEDATANGAN
                        </div>
                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-emerald-500 transition-colors pointer-events-none" />
                      </th>
                      <th className="border border-slate-300 p-0 text-center relative group hover:border-emerald-500 transition-colors">
                        <div className="px-4 py-3 min-w-[140px] text-center select-none">
                          KEKURANGAN
                        </div>
                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-emerald-500 transition-colors pointer-events-none" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {paginatedData.map((item) => (
                      <tr key={item.no_spo} className="hover:bg-slate-50 transition">
                        <td className="border border-slate-300 px-4 py-3 font-semibold text-slate-900 whitespace-normal break-words font-mono">
                          {item.no_spo}
                        </td>
                        <td className="border border-slate-300 px-4 py-3 font-medium text-slate-800 whitespace-normal break-words">
                          {item.nama_order}
                        </td>
                        <td className="border border-slate-300 px-4 py-3 text-slate-800 font-medium whitespace-normal break-words">
                          {item.nama_pemesan}
                        </td>
                        <td className="border border-slate-300 px-4 py-3 whitespace-normal break-words">
                          <span className="inline-block rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs font-mono font-medium text-slate-800 mr-1.5 mb-1">
                            {item.kode_barang}
                          </span>
                          <span className="text-slate-700">{item.nama_bahan}</span>
                        </td>
                        <td className="border border-slate-300 px-4 py-3 text-right font-medium text-slate-900 whitespace-nowrap">
                          {item.jumlah_order.toLocaleString("id-ID")}
                        </td>
                        <td className="border border-slate-300 px-4 py-3 text-right font-medium text-emerald-700 whitespace-nowrap">
                          {item.total_kedatangan.toLocaleString("id-ID")}
                        </td>
                        <td className="border border-slate-300 px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs ${
                              item.kekurangan > 0 ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"
                            }`}
                          >
                            {item.kekurangan.toLocaleString("id-ID")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* FOOTER PAGINASI */}
              <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span>Tampilkan:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-800 focus:border-slate-500 focus:outline-none"
                  >
                    <option value={5}>5 baris</option>
                    <option value={10}>10 baris</option>
                    <option value={25}>25 baris</option>
                    <option value={50}>50 baris</option>
                    <option value={100}>100 baris</option>
                  </select>
                  <span>
                    | Menampilkan <strong>{startIndex}</strong> - <strong>{endIndex}</strong> dari{" "}
                    <strong>{filteredData.length}</strong> data
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    className="px-3 py-1 text-xs"
                  >
                    Sebelumnya
                  </Button>
                  <span className="font-semibold text-slate-700">
                    Halaman {currentPage} dari {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    className="px-3 py-1 text-xs"
                  >
                    Selanjutnya
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
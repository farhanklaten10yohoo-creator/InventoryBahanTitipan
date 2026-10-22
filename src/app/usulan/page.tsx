"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageBanner } from "@/components/page-banner";
import { SuccessModal } from "@/components/success-modal";
import { Alert, Button, EmptyState, Input } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import type { MasterBarang, UsulanWithBarang } from "@/lib/types";
import { explainError, toNumber } from "@/lib/utils";

type MasterSpo = {
  no_spo: string;
  nama_pemesan: string;
  nama_order: string;
  jumlah_order: number;
};

export default function UsulanPage() {
  const [rows, setRows] = useState<UsulanWithBarang[]>([]);
  const [masterBarang, setMasterBarang] = useState<MasterBarang[]>([]);
  const [masterSpoList, setMasterSpoList] = useState<MasterSpo[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("Data inputan barang titipan berhasil disimpan.");

  // State Modal Form Tambah
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [noSpo, setNoSpo] = useState("");
  const [namaOrder, setNamaOrder] = useState("");
  const [namaPemesan, setNamaPemesan] = useState("");
  const [masterBarangId, setMasterBarangId] = useState("");
  const [jumlahOrder, setJumlahOrder] = useState("");
  const [jumlahKedatangan, setJumlahKedatangan] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Paginasi & Resizing Kolom
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({
    no_spo: 140,
    nama_order: 200,
    nama_pemesan: 180,
    barang: 220,
    jumlah_order: 140,
    kedatangan: 130,
    keterangan: 160,
  });

  const resizingRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

  const startResizing = (key: string, e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = {
      key,
      startX: e.clientX,
      startWidth: columnWidths[key] || 150,
    };

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingRef.current) return;
      const { key, startX, startWidth } = resizingRef.current;
      const diff = moveEvent.clientX - startX;
      const newWidth = Math.max(80, startWidth + diff);
      setColumnWidths((prev) => ({ ...prev, [key]: newWidth }));
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      resizingRef.current = null;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const [usulanRes, masterBarangRes, masterSpoRes] = await Promise.all([
      supabase.from("usulan_barang_titipan").select("*, master_barang_titipan(*)").order("created_at", { ascending: false }),
      supabase.from("master_barang_titipan").select("*").order("kode_barang", { ascending: true }),
      supabase.from("master_spo").select("no_spo, nama_pemesan, nama_order, jumlah_order"),
    ]);

    if (usulanRes.error) {
      setError(explainError(usulanRes.error.message));
    } else {
      setRows((usulanRes.data ?? []) as UsulanWithBarang[]);
    }

    if (masterBarangRes.data) {
      setMasterBarang(masterBarangRes.data as MasterBarang[]);
    }

    if (masterSpoRes.data) {
      setMasterSpoList(masterSpoRes.data as MasterSpo[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, pageSize]);

  // FUNGSI XLOOKUP OTOMATIS DARI TABEL master_spo
  const handleNoSpoChange = (val: string) => {
    setNoSpo(val);
    if (!val.trim()) return;

    // Cari data di master_spo berdasarkan no_spo
    const found = masterSpoList.find((item) => item.no_spo.trim().toLowerCase() === val.trim().toLowerCase());
    if (found) {
      if (found.nama_order) setNamaOrder(found.nama_order);
      if (found.nama_pemesan) setNamaPemesan(found.nama_pemesan);
      if (found.jumlah_order !== undefined && found.jumlah_order !== null) {
        setJumlahOrder(found.jumlah_order.toString());
      }
    }
  };

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (item) =>
        item.no_spo.toLowerCase().includes(q) ||
        (item.nama_pemesan && item.nama_pemesan.toLowerCase().includes(q)) ||
        (item.nama_order && item.nama_order.toLowerCase().includes(q)) ||
        (item.master_barang_titipan?.kode_barang && item.master_barang_titipan.kode_barang.toLowerCase().includes(q)) ||
        (item.master_barang_titipan?.nama_bahan && item.master_barang_titipan.nama_bahan.toLowerCase().includes(q))
    );
  }, [rows, search]);

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const startIndex = filteredRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, filteredRows.length);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noSpo.trim() || !masterBarangId) {
      alert("No SPO dan Barang Titipan wajib diisi.");
      return;
    }

    setSubmitting(true);
    setError("");

    const { error: insertError } = await supabase.from("usulan_barang_titipan").insert({
      no_spo: noSpo.trim(),
      nama_order: namaOrder.trim(),
      nama_pemesan: namaPemesan.trim(),
      master_barang_id: Number(masterBarangId),
      jumlah_order: toNumber(jumlahOrder),
      jumlah_kedatangan: toNumber(jumlahKedatangan),
      keterangan: keterangan.trim(),
    });

    setSubmitting(false);

    if (insertError) {
      setError(explainError(insertError.message));
    } else {
      setIsModalOpen(false);
      setNoSpo("");
      setNamaOrder("");
      setNamaPemesan("");
      setMasterBarangId("");
      setJumlahOrder("");
      setJumlahKedatangan("");
      setKeterangan("");
      setSuccessMessage("Data inputan barang titipan berhasil ditambahkan.");
      setSuccessModalOpen(true);
      void loadData();
    }
  };

  return (
    <AppShell title="" subtitle="">
      <div className="space-y-6 w-full min-w-0">
        
        {/* PAGE BANNER */}
        <PageBanner
          title="Input Barang Titipan"
          subtitle="Input transaksi usulan, catat kedatangan barang, dan kelola riwayat order."
        />

        {error ? <Alert tone="error">{error}</Alert> : null}

        {/* TABEL UTAMA */}
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
              <Button onClick={() => setIsModalOpen(true)}>
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
            <>
              <div className="overflow-x-auto w-full p-4">
                <table className="w-full border-collapse border border-slate-200 text-left text-sm text-slate-800 table-fixed shadow-sm">
                  <thead className="bg-slate-100 text-xs font-bold uppercase text-slate-700 select-none">
                    <tr>
                      {[
                        { key: "no_spo", label: "NO SPO" },
                        { key: "nama_order", label: "NAMA ORDER" },
                        { key: "nama_pemesan", label: "NAMA PEMESAN" },
                        { key: "barang", label: "BARANG TITIPAN" },
                        { key: "jumlah_order", label: "JUMLAH ORDER" },
                        { key: "kedatangan", label: "KEDATANGAN" },
                        { key: "keterangan", label: "KETERANGAN" },
                      ].map((col) => (
                        <th
                          key={col.key}
                          style={{ width: columnWidths[col.key] }}
                          className="border border-slate-200 p-0 text-center relative group hover:border-emerald-600 transition-colors"
                        >
                          <div className="px-4 py-3 text-center truncate">
                            {col.label}
                          </div>
                          <div
                            onMouseDown={(e) => startResizing(col.key, e)}
                            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize bg-transparent group-hover:bg-emerald-600 transition-colors"
                          />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        <td className="border border-slate-200 px-4 py-3 font-semibold font-mono text-slate-900 truncate">
                          {item.no_spo}
                        </td>
                        <td className="border border-slate-200 px-4 py-3 truncate">{item.nama_order || "-"}</td>
                        <td className="border border-slate-200 px-4 py-3 truncate">{item.nama_pemesan || "-"}</td>
                        <td className="border border-slate-200 px-4 py-3 truncate">
                          <span className="inline-block rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs font-mono font-medium text-slate-800 mr-1.5">
                            {item.master_barang_titipan?.kode_barang || "-"}
                          </span>
                          <span className="text-slate-700">{item.master_barang_titipan?.nama_bahan || "-"}</span>
                        </td>
                        <td className="border border-slate-200 px-4 py-3 text-right font-medium whitespace-nowrap">
                          {item.jumlah_order.toLocaleString("id-ID")}
                        </td>
                        <td className="border border-slate-200 px-4 py-3 text-right font-medium text-emerald-700 whitespace-nowrap">
                          {item.jumlah_kedatangan.toLocaleString("id-ID")}
                        </td>
                        <td className="border border-slate-200 px-4 py-3 text-slate-600 truncate">
                          {item.keterangan || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* FOOTER PAGINASI & SELECT PAGE SIZE */}
              <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
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
                    <strong>{filteredRows.length}</strong> data
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
                  <span className="font-semibold text-slate-800">
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
        </div>

        {/* MODAL FORM TAMBAH INPUTAN DENGAN FITUR XLOOKUP MASTER SPO */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Tambah Inputan Barang Titipan</h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">No SPO *</label>
                  <div className="flex gap-2">
                    <Input
                      list="list-spo"
                      placeholder="Contoh: 001/EKS/10/2026"
                      value={noSpo}
                      onChange={(e) => handleNoSpoChange(e.target.value)}
                      required
                    />
                    <datalist id="list-spo">
                      {masterSpoList.map((spo) => (
                        <option key={spo.no_spo} value={spo.no_spo}>
                          {spo.nama_order ? `- ${spo.nama_order}` : ""}
                        </option>
                      ))}
                    </datalist>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">
                    *Ketik atau pilih No SPO dari master untuk mengisi Nama Order, Pemesan, dan Jumlah Order otomatis.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Order</label>
                    <Input
                      placeholder="Contoh: Buku Hardcover"
                      value={namaOrder}
                      onChange={(e) => setNamaOrder(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Pemesan</label>
                    <Input
                      placeholder="Nama pemesan / klien"
                      value={namaPemesan}
                      onChange={(e) => setNamaPemesan(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Barang Titipan *</label>
                  <select
                    value={masterBarangId}
                    onChange={(e) => setMasterBarangId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-500 focus:outline-none"
                    required
                  >
                    <option value="">-- Pilih Barang dari Master --</option>
                    {masterBarang.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.kode_barang} - {item.nama_bahan} ({item.kategori})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah Order</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={jumlahOrder}
                      onChange={(e) => setJumlahOrder(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah Kedatangan</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={jumlahKedatangan}
                      onChange={(e) => setJumlahKedatangan(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan</label>
                  <Input
                    placeholder="Catatan tambahan (opsional)"
                    value={keterangan}
                    onChange={(e) => setKeterangan(e.target.value)}
                  />
                </div>
                <div className="pt-3 flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Batal
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Menyimpan..." : "Simpan Data"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        <SuccessModal
          isOpen={successModalOpen}
          onClose={() => setSuccessModalOpen(false)}
          title="Berhasil Disimpan!"
          message={successMessage}
        />
      </div>
    </AppShell>
  );
}
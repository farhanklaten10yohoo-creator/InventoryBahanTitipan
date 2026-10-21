"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Alert, Button, Card, EmptyState, Input } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import type { MasterBarang, UsulanWithBarang } from "@/lib/types";
import { explainError, toNumber } from "@/lib/utils";

export default function UsulanPage() {
  const [usulanList, setUsulanList] = useState<UsulanWithBarang[]>([]);
  const [masterList, setMasterList] = useState<MasterBarang[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [noSpo, setNoSpo] = useState("");
  const [namaOrder, setNamaOrder] = useState("");
  const [namaPemesan, setNamaPemesan] = useState("");
  const [masterBarangId, setMasterBarangId] = useState("");
  const [jumlahOrder, setJumlahOrder] = useState<number | "">("");
  const [jumlahKedatangan, setJumlahKedatangan] = useState<number | "">(0);
  const [keterangan, setKeterangan] = useState("");

  // State untuk lebar kolom interaktif
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({
    no_spo: 140,
    nama_order: 220,
    nama_pemesan: 200,
    barang: 240,
    jumlah_order: 140,
    kedatangan: 140,
    keterangan: 200,
    aksi: 130,
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
    const [resUsulan, resMaster] = await Promise.all([
      supabase
        .from("usulan_barang_titipan")
        .select("*, master_barang_titipan(*)")
        .order("created_at", { ascending: false }),
      supabase
        .from("master_barang_titipan")
        .select("*")
        .order("nama_bahan", { ascending: true }),
    ]);

    if (resUsulan.error) {
      setError(explainError(resUsulan.error.message));
    } else {
      setUsulanList((resUsulan.data ?? []) as UsulanWithBarang[]);
    }
    if (resMaster.data) {
      setMasterList(resMaster.data as MasterBarang[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const executeXLookup = async (val: string) => {
    const cleanVal = val.trim();
    if (!cleanVal) {
      alert("Mohon ketik No SPO terlebih dahulu!");
      return;
    }

    const { data, error } = await supabase
      .from("master_spo")
      .select("*")
      .ilike("no_spo", `%${cleanVal}%`)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Supabase error:", error);
      alert(`Error database: ${error.message}. Periksa RLS tabel master_spo.`);
      return;
    }

    if (data) {
      setNamaOrder(data.nama_order || "");
      setNamaPemesan(data.nama_pemesan || "");
      setJumlahOrder(data.jumlah_order !== undefined ? Number(data.jumlah_order) : "");
    } else {
      alert(`No SPO "${cleanVal}" tidak ditemukan di database master_spo!`);
      setNamaOrder("");
      setNamaPemesan("");
      setJumlahOrder("");
    }
  };

  const handleNoSpoChange = (val: string) => {
    setNoSpo(val);
  };

  const pemesanSuggestions = useMemo(() => {
    const set = new Set<string>();
    usulanList.forEach((item) => {
      if (item.nama_pemesan?.trim()) {
        set.add(item.nama_pemesan.trim());
      }
    });
    return Array.from(set);
  }, [usulanList]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, pageSize]);

  const resetForm = () => {
    setEditingId(null);
    setNoSpo("");
    setNamaOrder("");
    setNamaPemesan("");
    setMasterBarangId("");
    setJumlahOrder("");
    setJumlahKedatangan(0);
    setKeterangan("");
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (item: UsulanWithBarang) => {
    setEditingId(item.id);
    setNoSpo(item.no_spo || "");
    setNamaOrder(item.nama_order || "");
    setNamaPemesan(item.nama_pemesan || "");
    setMasterBarangId(item.master_barang_id || "");
    setJumlahOrder(item.jumlah_order);
    setJumlahKedatangan(item.jumlah_kedatangan || 0);
    setKeterangan(item.keterangan || "");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noSpo.trim() || !namaOrder.trim() || !masterBarangId) {
      alert("Mohon isi No SPO, Nama Order, dan pilih Barang Titipan.");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      no_spo: noSpo.trim(),
      nama_order: namaOrder.trim(),
      nama_pemesan: namaPemesan.trim(),
      master_barang_id: masterBarangId,
      jumlah_order: toNumber(jumlahOrder),
      jumlah_kedatangan: toNumber(jumlahKedatangan),
      keterangan: keterangan.trim(),
    };

    let resError = null;
    if (editingId) {
      const { error: err } = await supabase
        .from("usulan_barang_titipan")
        .update(payload)
        .eq("id", editingId);
      resError = err;
    } else {
      const { error: err } = await supabase
        .from("usulan_barang_titipan")
        .insert([payload]);
      resError = err;
    }

    setSaving(false);

    if (resError) {
      setError(explainError(resError.message));
    } else {
      setIsModalOpen(false);
      resetForm();
      void loadData();
    }
  };

  const handleDelete = async (id: string, spo: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus inputan SPO: "${spo}"?`)) return;
    const { error: delErr } = await supabase
      .from("usulan_barang_titipan")
      .delete()
      .eq("id", id);

    if (delErr) {
      alert(`Gagal menghapus: ${explainError(delErr.message)}`);
    } else {
      void loadData();
    }
  };

  const filteredUsulan = useMemo(() => {
    if (!search.trim()) return usulanList;
    const q = search.toLowerCase();
    return usulanList.filter(
      (item) =>
        item.no_spo.toLowerCase().includes(q) ||
        item.nama_order.toLowerCase().includes(q) ||
        item.nama_pemesan.toLowerCase().includes(q) ||
        item.master_barang_titipan?.kode_barang.toLowerCase().includes(q) ||
        item.master_barang_titipan?.nama_bahan.toLowerCase().includes(q)
    );
  }, [usulanList, search]);

  const totalPages = Math.ceil(filteredUsulan.length / pageSize) || 1;
  const paginatedUsulan = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsulan.slice(start, start + pageSize);
  }, [filteredUsulan, currentPage, pageSize]);

  const startIndex = filteredUsulan.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, filteredUsulan.length);

  return (
    <AppShell
      title="Input Barang Titipan"
      subtitle="Input transaksi inputan, catat kedatangan barang, dan kelola riwayat order."
    >
      <div className="space-y-6 w-full min-w-0">
        {error ? <Alert tone="error">{error}</Alert> : null}

        <Card className="p-0 overflow-hidden w-full min-w-0">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white">
            <div className="w-full sm:w-80">
              <Input
                placeholder="Cari SPO, order, pemesan, atau barang..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button onClick={openCreateModal}>+ Tambah Inputan</Button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Memuat data inputan...</div>
          ) : filteredUsulan.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="Belum Ada Inputan"
                text={search ? "Tidak ditemukan data inputan yang sesuai." : "Klik tombol '+ Tambah Inputan' untuk membuat catatan order baru."}
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto w-full p-4 bg-white">
                <table className="w-full border-collapse border border-slate-300 text-left text-sm text-slate-700 table-fixed">
                  <thead className="bg-slate-100 text-xs font-semibold uppercase text-slate-700 select-none">
                    <tr>
                      {[
                        { key: "no_spo", label: "NO SPO" },
                        { key: "nama_order", label: "NAMA ORDER" },
                        { key: "nama_pemesan", label: "NAMA PEMESAN" },
                        { key: "barang", label: "BARANG TITIPAN" },
                        { key: "jumlah_order", label: "JUMLAH ORDER" },
                        { key: "kedatangan", label: "KEDATANGAN" },
                        { key: "keterangan", label: "KETERANGAN" },
                        { key: "aksi", label: "AKSI" },
                      ].map((col) => (
                        <th
                          key={col.key}
                          style={{ width: columnWidths[col.key] }}
                          className="border border-slate-300 p-0 text-center relative group hover:border-emerald-500 transition-colors"
                        >
                          <div className="px-4 py-3 text-center truncate">
                            {col.label}
                          </div>
                          <div
                            onMouseDown={(e) => startResizing(col.key, e)}
                            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize bg-transparent group-hover:bg-emerald-500 transition-colors"
                          />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {paginatedUsulan.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        <td className="border border-slate-300 px-4 py-3 font-semibold text-slate-900 truncate font-mono">
                          {item.no_spo}
                        </td>
                        <td className="border border-slate-300 px-4 py-3 font-medium text-slate-800 truncate">
                          {item.nama_order}
                        </td>
                        <td className="border border-slate-300 px-4 py-3 text-slate-800 font-medium truncate">
                          {item.nama_pemesan || "-"}
                        </td>
                        <td className="border border-slate-300 px-4 py-3 truncate">
                          <span className="inline-block rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs font-mono font-medium text-slate-800 mr-1.5">
                            {item.master_barang_titipan?.kode_barang || "-"}
                          </span>
                          <span className="text-slate-700">
                            {item.master_barang_titipan?.nama_bahan || "-"}
                          </span>
                        </td>
                        <td className="border border-slate-300 px-4 py-3 text-right font-medium text-slate-900 whitespace-nowrap">
                          {item.jumlah_order.toLocaleString("id-ID")}
                        </td>
                        <td className="border border-slate-300 px-4 py-3 text-right font-medium text-emerald-700 whitespace-nowrap">
                          {item.jumlah_kedatangan.toLocaleString("id-ID")}
                        </td>
                        <td className="border border-slate-300 px-4 py-3 text-slate-600 truncate">
                          {item.keterangan || "-"}
                        </td>
                        <td className="border border-slate-300 px-4 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              Ubah
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id, item.no_spo)}
                              className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

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
                    <strong>{filteredUsulan.length}</strong> data
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

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              {editingId ? "Ubah Inputan Barang" : "Tambah Inputan Barang"}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  NO SPO <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      required
                      placeholder="Ketik No SPO (misal: 001/EKS/10/2026)..."
                      value={noSpo}
                      onChange={(e) => handleNoSpoChange(e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void executeXLookup(noSpo)}
                    className="px-4 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold"
                  >
                    Cari SPO
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  NAMA ORDER <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  placeholder="Terisi otomatis dari master SPO"
                  value={namaOrder}
                  onChange={(e) => setNamaOrder(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  NAMA PEMESAN
                </label>
                <Input
                  placeholder="Terisi otomatis dari master SPO"
                  value={namaPemesan}
                  onChange={(e) => setNamaPemesan(e.target.value)}
                  list="list-pemesan"
                />
                <datalist id="list-pemesan">
                  {pemesanSuggestions.map((pemesan) => (
                    <option key={pemesan} value={pemesan} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  PILIH BARANG TITIPAN <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={masterBarangId}
                  onChange={(e) => setMasterBarangId(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-500 focus:outline-none"
                >
                  <option value="">-- Pilih Master Barang --</option>
                  {masterList.map((b) => (
                    <option key={b.id} value={b.id}>
                      [{b.kode_barang}] {b.nama_bahan}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    JUMLAH ORDER <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="number"
                    required
                    min={0}
                    placeholder="Terisi otomatis"
                    value={jumlahOrder}
                    onChange={(e) =>
                      setJumlahOrder(e.target.value === "" ? "" : Number(e.target.value))
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    KEDATANGAN BARANG
                  </label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={jumlahKedatangan}
                    onChange={(e) =>
                      setJumlahKedatangan(e.target.value === "" ? "" : Number(e.target.value))
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  KETERANGAN
                </label>
                <Input
                  placeholder="Contoh: Sudah di GBJ"
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Menyimpan..." : "Simpan"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
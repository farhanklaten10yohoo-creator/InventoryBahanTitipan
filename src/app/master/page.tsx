"use client";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageBanner } from "@/components/page-banner";
import { SuccessModal } from "@/components/success-modal";
import { Alert, Button, Card, EmptyState, Field, Input } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import type { MasterBarang } from "@/lib/types";
import { explainError, nextSequentialCode } from "@/lib/utils";

const emptyForm = {
  kategori_bahan: "",
  kode_barang: "",
  nama_bahan: "",
  ukuran: "",
  satuan: "",
};

export default function MasterPage() {
  const [rows, setRows] = useState<MasterBarang[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  
  // State untuk Paginasi tabel
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  
  // State untuk SuccessModal beranimasi centang
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("Master barang berhasil disimpan.");

  // Resizing kolom tabel berbasis mouse drag
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({
    kode: 130,
    nama_bahan: 240,
    kategori: 160,
    ukuran: 130,
    satuan: 130,
    update: 150,
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

  // Mengambil daftar unik kategori bahan untuk dropdown
  const daftarKategori = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((row) => {
      if (row.kategori_bahan && row.kategori_bahan.trim() !== "") {
        set.add(row.kategori_bahan.trim());
      }
    });
    return Array.from(set).sort();
  }, [rows]);

  // Mengambil daftar unik satuan barang untuk dropdown
  const daftarSatuan = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((row) => {
      if (row.satuan && row.satuan.trim() !== "") {
        set.add(row.satuan.trim());
      }
    });
    return Array.from(set).sort();
  }, [rows]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from("master_barang_titipan")
      .select("*")
      .order("kode_barang", { ascending: true });

    if (queryError) {
      setError(explainError(queryError.message));
    } else {
      const list = (data ?? []) as MasterBarang[];
      setRows(list);
      if (!editingId) {
        setForm((prev) => ({
          ...prev,
          kode_barang: nextSequentialCode(
            list.map((item) => item.kode_barang),
            "BRG",
          ),
        }));
      }
    }
    setLoading(false);
  }, [editingId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Paginasi Data
  const totalPages = Math.ceil(rows.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, currentPage, pageSize]);

  const startIndex = rows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, rows.length);

  function startCreate() {
    setEditingId(null);
    setError("");
    setForm({
      ...emptyForm,
      kode_barang: nextSequentialCode(
        rows.map((item) => item.kode_barang),
        "BRG",
      ),
    });
    setIsModalOpen(true);
  }

  function startEdit(row: MasterBarang) {
    setEditingId(row.id);
    setError("");
    setForm({
      kategori_bahan: row.kategori_bahan || "",
      kode_barang: row.kode_barang || "",
      nama_bahan: row.nama_bahan || "",
      ukuran: row.ukuran || "",
      satuan: row.satuan || "",
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingId(null);
    setError("");
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      kategori_bahan: form.kategori_bahan.trim(),
      kode_barang: form.kode_barang.trim(),
      nama_bahan: form.nama_bahan.trim(),
      ukuran: form.ukuran.trim(),
      satuan: form.satuan.trim(),
    };

    const result = editingId
      ? await supabase.from("master_barang_titipan").update(payload).eq("id", editingId)
      : await supabase.from("master_barang_titipan").insert(payload);

    if (result.error) {
      setError(explainError(result.error.message));
    } else {
      setSuccessMessage(editingId ? "Master barang berhasil diperbarui." : "Master barang berhasil disimpan.");
      closeModal();
      setSuccessModalOpen(true);
      await load();
    }
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm("Hapus barang ini dari master?")) return;
    const { error: deleteError } = await supabase
      .from("master_barang_titipan")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError(explainError(deleteError.message));
      return;
    }
    setSuccessMessage("Master barang berhasil dihapus.");
    if (editingId === id) closeModal();
    setSuccessModalOpen(true);
    await load();
  }

  return (
    <AppShell title="" subtitle="">
      <div className="space-y-6 w-full min-w-0">
        
        {/* PAGE BANNER UTAMA */}
        <PageBanner
          title="Master Barang Titipan"
          subtitle="Buat Master untuk Input Barang Titipan"
        />

        {error && !isModalOpen ? <Alert tone="error">{error}</Alert> : null}

        {/* TABEL KATALOG MASTER BARANG DENGAN BORDER KARTU STANDAR */}
        <div className="p-0 overflow-hidden w-full min-w-0 shadow-lg border border-slate-200 rounded-2xl bg-[#FFFDF2]">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Katalog Master Barang</h2>
              <p className="text-xs text-slate-500">
                Total master terdaftar: <span className="font-semibold text-slate-800">{rows.length}</span> item
              </p>
            </div>
            {/* TOMBOL TAMBAH MASTER BARANG BERWARNA HIJAU */}
            <button
              onClick={startCreate}
              type="button"
              className="self-start sm:self-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition whitespace-nowrap"
            >
              + Tambah Master Barang
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Memuat data...</div>
          ) : rows.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="Belum ada master barang"
                text="Klik tombol '+ Tambah Master Barang' untuk mendaftarkan barang pertama."
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto w-full p-4">
                <table className="w-full border-collapse border border-slate-900 text-left text-sm text-slate-900 table-fixed shadow-sm">
                  <thead className="bg-slate-200 text-xs font-bold uppercase text-slate-900 select-none">
                    <tr>
                      {[
                        { key: "kode", label: "KODE" },
                        { key: "nama_bahan", label: "NAMA BAHAN" },
                        { key: "kategori", label: "KATEGORI" },
                        { key: "ukuran", label: "UKURAN" },
                        { key: "satuan", label: "SATUAN" },
                        { key: "update", label: "UPDATE" },
                      ].map((col) => (
                        <th
                          key={col.key}
                          style={{ width: columnWidths[col.key] }}
                          className="border border-slate-900 p-0 text-center relative group hover:border-emerald-600 transition-colors"
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
                  <tbody className="divide-y divide-slate-900">
                    {paginatedData.map((row, index) => {
                      const rowBg = index % 2 === 0 ? "bg-[#FFFDF2]" : "bg-amber-100/60";
                      return (
                        <tr
                          key={row.id}
                          className="group transition hover:bg-amber-300"
                        >
                          <td className={`border border-slate-900 px-4 py-3 font-mono font-semibold text-slate-900 truncate ${rowBg} group-hover:bg-inherit transition-colors`}>
                            <span className="inline-block rounded bg-white border border-slate-900 px-2 py-0.5 text-xs text-slate-900 font-bold">
                              {row.kode_barang}
                            </span>
                          </td>
                          <td className={`border border-slate-900 px-4 py-3 font-medium text-slate-900 truncate ${rowBg} group-hover:bg-inherit transition-colors`}>
                            {row.nama_bahan}
                          </td>
                          <td className={`border border-slate-900 px-4 py-3 text-slate-900 truncate ${rowBg} group-hover:bg-inherit transition-colors`}>
                            {row.kategori_bahan || "-"}
                          </td>
                          <td className={`border border-slate-900 px-4 py-3 text-slate-900 truncate ${rowBg} group-hover:bg-inherit transition-colors`}>
                            {row.ukuran || "-"}
                          </td>
                          <td className={`border border-slate-900 px-4 py-3 text-slate-900 font-mono truncate ${rowBg} group-hover:bg-inherit transition-colors`}>
                            {row.satuan || "-"}
                          </td>
                          <td className={`border border-slate-900 px-4 py-3 text-center whitespace-nowrap ${rowBg} group-hover:bg-inherit transition-colors`}>
                            <div className="flex items-center justify-center gap-2">
                              {/* TOMBOL UBAH BERWARNA BIRU */}
                              <button
                                className="rounded bg-blue-100 border border-blue-300 px-2.5 py-1 text-xs font-semibold text-blue-900 hover:bg-blue-200 transition"
                                onClick={() => startEdit(row)}
                                type="button"
                              >
                                Ubah
                              </button>
                              <button
                                className="rounded bg-rose-100 border border-rose-300 px-2.5 py-1 text-xs font-semibold text-rose-900 hover:bg-rose-200 transition"
                                onClick={() => void remove(row.id)}
                                type="button"
                              >
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* FOOTER PAGINASI */}
              <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span>Tampilkan:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 focus:border-slate-500 focus:outline-none"
                  >
                    <option value={5}>5 baris</option>
                    <option value={10}>10 baris</option>
                    <option value={25}>25 baris</option>
                    <option value={50}>50 baris</option>
                    <option value={100}>100 baris</option>
                  </select>
                  <span>
                    | Menampilkan <strong>{startIndex}</strong> - <strong>{endIndex}</strong> dari{" "}
                    <strong>{rows.length}</strong> data
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
        </div>
      </div>

      {/* MODAL POP-UP FORM INPUT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl transition-all my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingId ? "Ubah barang" : "Tambah barang"}
                </h3>
                <p className="text-xs text-slate-500">
                  Isi kategori, nama, ukuran, dan satuan. Kode dikunci agar tetap berurutan.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>
            <form className="mt-4 space-y-4" onSubmit={onSubmit}>
              <Field label="Kategori bahan" hint="Pilih dari daftar atau ketik kategori baru">
                <Input
                  required
                  list="daftar-kategori"
                  value={form.kategori_bahan}
                  onChange={(e) => setForm({ ...form, kategori_bahan: e.target.value })}
                  placeholder="Pilih atau ketik kategori"
                />
                <datalist id="daftar-kategori">
                  {daftarKategori.map((kat) => (
                    <option key={kat} value={kat} />
                  ))}
                </datalist>
              </Field>
              <Field label="Kode barang" hint="Digenerate otomatis">
                <Input required readOnly value={form.kode_barang} />
              </Field>
              <Field label="Nama bahan">
                <Input
                  required
                  value={form.nama_bahan}
                  onChange={(e) => setForm({ ...form, nama_bahan: e.target.value })}
                  placeholder="Nama bahan / barang titipan"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ukuran">
                  <Input
                    required
                    value={form.ukuran}
                    onChange={(e) => setForm({ ...form, ukuran: e.target.value })}
                    placeholder=""
                  />
                </Field>
                <Field label="Satuan barang" hint="Pilih atau ketik satuan">
                  <Input
                    required
                    list="daftar-satuan"
                    value={form.satuan}
                    onChange={(e) => setForm({ ...form, satuan: e.target.value })}
                    placeholder=""
                  />
                  <datalist id="daftar-satuan">
                    {daftarSatuan.map((sat) => (
                      <option key={sat} value={sat} />
                    ))}
                  </datalist>
                </Field>
              </div>
              {error ? <Alert tone="error">{error}</Alert> : null}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <Button type="button" variant="secondary" onClick={closeModal}>
                  Batal
                </Button>
                {/* TOMBOL SIMPAN / PERBARUI BARANG BERWARNA HIJAU */}
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition whitespace-nowrap disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : editingId ? "Simpan perubahan" : "Simpan barang"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SUKSES DENGAN ANIMASI CENTANG BERGERAK */}
      <SuccessModal
        isOpen={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
        title="Berhasil!"
        message={successMessage}
      />
    </AppShell>
  );
}
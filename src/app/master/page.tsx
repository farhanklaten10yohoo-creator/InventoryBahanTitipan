"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
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
  const [notice, setNotice] = useState("");

  // Mengambil daftar unik kategori bahan dari data yang tersimpan untuk dropdown
  const daftarKategori = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((row) => {
      if (row.kategori_bahan && row.kategori_bahan.trim() !== "") {
        set.add(row.kategori_bahan.trim());
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

  function startCreate() {
    setEditingId(null);
    setError("");
    setNotice("");
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
    setNotice("");
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
    setNotice("");

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
      setNotice(editingId ? "Master barang diperbarui." : "Master barang disimpan.");
      closeModal();
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

    setNotice("Master barang berhasil dihapus.");
    if (editingId === id) closeModal();
    await load();
  }

  return (
    <AppShell
      title="Master Barang Titipan"
      subtitle="Kelola katalog bahan titipan. Kode barang dibuat otomatis, misalnya BRG-001."
    >
      <div className="space-y-4">
        {/* HEADER ATAS: JUDUL & TOMBOL TAMBAH */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Katalog Master Barang</h2>
            <p className="text-sm text-slate-500">
              Total barang terdaftar: <span className="font-semibold text-slate-800">{rows.length}</span> item
            </p>
          </div>
          <Button onClick={startCreate} className="self-start sm:self-auto bg-emerald-600 hover:bg-emerald-700">
            + Tambah Master Barang
          </Button>
        </div>

        {notice ? <Alert tone="success">{notice}</Alert> : null}
        {error && !isModalOpen ? <Alert tone="error">{error}</Alert> : null}

        {/* TABEL REKAP MASTER BARANG LEBAR */}
        <Card className="p-0 overflow-hidden">
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
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-100 text-xs font-semibold uppercase text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Kode</th>
                    <th className="px-4 py-3">Nama bahan</th>
                    <th className="px-4 py-3">Kategori</th>
                    <th className="px-4 py-3">Ukuran</th>
                    <th className="px-4 py-3">Satuan</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                        <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-800">
                          {row.kode_barang}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">{row.nama_bahan}</td>
                      <td className="px-4 py-3 text-slate-600">{row.kategori_bahan || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{row.ukuran || "-"}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono">{row.satuan || "-"}</td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-200 transition"
                            onClick={() => startEdit(row)}
                            type="button"
                          >
                            ✏️ Ubah
                          </button>
                          <button
                            className="rounded-lg bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-200 transition"
                            onClick={() => void remove(row.id)}
                            type="button"
                          >
                            🗑️ Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
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
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
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
                  placeholder="Pilih atau ketik kategori (misal: Kain, Acc, Packing)"
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
                    placeholder="Contoh: 150cm, M, 20x30"
                  />
                </Field>
                <Field label="Satuan barang">
                  <Input
                    required
                    value={form.satuan}
                    onChange={(e) => setForm({ ...form, satuan: e.target.value })}
                    placeholder="Contoh: yard, pcs, roll"
                  />
                </Field>
              </div>

              {error ? <Alert tone="error">{error}</Alert> : null}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <Button type="button" variant="secondary" onClick={closeModal}>
                  Batal
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Menyimpan..." : editingId ? "Simpan perubahan" : "Simpan barang"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
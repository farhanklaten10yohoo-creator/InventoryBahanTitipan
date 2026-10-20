export type MasterBarang = {
  id: string;
  created_at: string;
  kode_barang: string;
  kategori_bahan: string;
  nama_bahan: string;
  ukuran: string;
  satuan: string;
};

export type MasterPemesan = {
  id: string;
  created_at: string;
  nama_pemesan: string;
};

export type UsulanBarang = {
  id: string;
  created_at: string;
  tanggal_usulan: string;
  no_usulan: string;
  barang_id: string;
  nama_pemesan: string;
  no_spo: string;
  jumlah_order: number;
  jumlah_kedatangan: number;
  keterangan: string | null;
  nama_order: string;
  master_barang_titipan?: MasterBarang | null;
};

export type UsulanWithBarang = UsulanBarang & {
  master_barang_titipan: MasterBarang | null;
};

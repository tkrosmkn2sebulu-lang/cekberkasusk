import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, UserPlus, FileText, FileBadge, Image as ImageIcon, CreditCard, Upload, Download, Printer, Edit2, Trash2, Save, X, Lock, Unlock, DownloadCloud, ScrollText, RefreshCw } from 'lucide-react';

// GANTI URL INI DENGAN URL DARI GOOGLE APPS SCRIPT ANDA
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbyUDx6AP2hRCxL7ENXg1JrozljSa1UOmfjBhIxWBc0tpkB3hk-S46dMngd7puogSWJq3g/exec';

// Komponen Textarea Khusus untuk menghindari cursor jump saat real-time sync
const KeteranganInput = ({ value, id, onSave, disabled }) => {
  const [text, setText] = useState(value || '');
  useEffect(() => { setText(value || '') }, [value]);
  
  return (
    <textarea
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => onSave(id, text)}
      disabled={disabled}
      placeholder={disabled ? "-" : "Isi catatan manual di sini..."}
      className={`w-full p-2 text-sm border rounded-lg outline-none resize-none transition-colors print:border-none print:bg-transparent print:p-0 print:resize-none ${
        disabled
          ? 'bg-transparent border-transparent text-slate-700 cursor-default'
          : 'border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 hover:bg-white'
      }`}
      rows="2"
    />
  );
};

export default function App() {
  const [peserta, setPeserta] = useState([]);
  const [namaBaru, setNamaBaru] = useState('');
  const [kelasBaru, setKelasBaru] = useState('');
  const [koneksi, setKoneksi] = useState('Memuat data...');
  const [isLoading, setIsLoading] = useState(false);
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null });
  const [alertDialog, setAlertDialog] = useState({ isOpen: false, title: '', message: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ nama: '', kelas: '' });

  const showAlert = (title, message) => setAlertDialog({ isOpen: true, title, message });

  // Fungsi untuk mengambil data dari Google Sheets
  const loadData = async () => {
    if (GOOGLE_SHEET_URL.includes('ISI_CONTOH_URL')) {
      setKoneksi('URL Google Sheet belum diisi!');
      return;
    }
    
    setIsLoading(true);
    setKoneksi('Menyinkronkan...');
    try {
      const response = await fetch(GOOGLE_SHEET_URL, {
        method: "GET",
        redirect: "follow" // Penting untuk Google Apps Script
      });
      
      const data = await response.json();
      
      // Memastikan format boolean dari Sheets dibaca dengan benar
      const formattedData = data.map(item => ({
        ...item,
        ktp: item.ktp === true || item.ktp === 'true' || item.ktp === 'TRUE',
        foto: item.foto === true || item.foto === 'true' || item.foto === 'TRUE',
        rapot: item.rapot === true || item.rapot === 'true' || item.rapot === 'TRUE',
        sertifikat: item.sertifikat === true || item.sertifikat === 'true' || item.sertifikat === 'TRUE',
        suratKeterangan: item.suratKeterangan === true || item.suratKeterangan === 'true' || item.suratKeterangan === 'TRUE',
      }));
      
      setPeserta(formattedData.sort((a, b) => a.createdAt - b.createdAt));
      setKoneksi('Terhubung (Google Sheets)');
    } catch (error) {
      console.error("Gagal memuat data:", error);
      // Menangkap error "Failed to fetch" yang biasanya adalah masalah izin akses Apps Script
      if (error.message && error.message.includes('Failed to fetch')) {
        setKoneksi('Error Akses: Pastikan Deploy Apps Script diatur ke "Siapa Saja"');
      } else {
        setKoneksi('Gagal terhubung');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Muat data saat aplikasi pertama dibuka
  useEffect(() => {
    loadData();
    // Refresh data otomatis setiap 15 detik untuk simulasi real-time
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  // Fungsi Helper untuk mengirim ke Google Sheets
  const sendToGoogleSheets = async (data) => {
    try {
      await fetch(GOOGLE_SHEET_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8' // Sangat penting agar tidak diblokir CORS preflight
        },
        body: JSON.stringify(data),
        redirect: "follow"
      });
      loadData(); // Tarik data terbaru setelah mengubah
    } catch (error) {
      console.error("Error mengirim ke Sheets:", error);
      showAlert("Error Akses", "Gagal menyimpan ke database. Jika ini terus berlanjut, ulangi proses 'Deploy' di Apps Script dan pastikan 'Akses/Who has access' disetel ke 'Siapa saja' (Anyone).");
    }
  };

  const handleLoginClick = () => { setShowLogin(true); setPin(''); setPinError(''); };
  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pin === "1234") { setIsAdmin(true); setShowLogin(false); } 
    else { setPinError("PIN salah!"); }
  };
  const requestLogout = () => {
    setConfirmDialog({
      isOpen: true,
      message: "Yakin ingin keluar dari mode Admin?",
      onConfirm: () => { setIsAdmin(false); setEditingId(null); setConfirmDialog({ isOpen: false, message: '', onConfirm: null }); }
    });
  };

  // ---------------- FUNGSI CRUD KE GOOGLE SHEETS ----------------

  const toggleStatus = async (id, dokumen) => {
    const p = peserta.find(x => x.id === id);
    if (!p) return;
    
    // Update tampilan instan agar terasa cepat
    setPeserta(prev => prev.map(item => item.id === id ? { ...item, [dokumen]: !item[dokumen] } : item));

    // Kirim perubahan ke Sheets
    sendToGoogleSheets({ action: "update", id: id, [dokumen]: !p[dokumen] });
  };

  const updateKeterangan = async (id, teks) => {
    sendToGoogleSheets({ action: "update", id: id, keterangan: teks });
  };

  const tambahPeserta = async (e) => {
    e.preventDefault();
    if (!namaBaru.trim()) return;

    const newId = Date.now().toString();
    const pesertaBaru = {
      action: "create",
      id: newId,
      nama: namaBaru,
      kelas: kelasBaru || '-',
      ktp: false, foto: false, rapot: false, sertifikat: false, suratKeterangan: false,
      keterangan: '',
      createdAt: Date.now()
    };

    setNamaBaru('');
    setKelasBaru('');
    
    // Update UI instan
    setPeserta(prev => [...prev, pesertaBaru]);
    sendToGoogleSheets(pesertaBaru);
  };

  const hapusPeserta = async (id, nama) => {
    setConfirmDialog({
      isOpen: true,
      message: `Yakin ingin menghapus data ${nama} dari database?`,
      onConfirm: async () => {
        setPeserta(prev => prev.filter(p => p.id !== id)); // Hapus dari UI
        sendToGoogleSheets({ action: "delete", id: id });
        setConfirmDialog({ isOpen: false, message: '', onConfirm: null });
      }
    });
  };

  const mulaiEdit = (p) => { setEditingId(p.id); setEditForm({ nama: p.nama, kelas: p.kelas }); };
  const batalEdit = () => { setEditingId(null); };
  const simpanEdit = async (id) => {
    if (!editForm.nama.trim()) { showAlert("Peringatan", "Nama tidak boleh kosong!"); return; }
    
    setPeserta(prev => prev.map(p => p.id === id ? { ...p, nama: editForm.nama, kelas: editForm.kelas } : p));
    setEditingId(null);
    sendToGoogleSheets({ action: "update", id: id, nama: editForm.nama, kelas: editForm.kelas || '-' });
  };

  // ---------------- FUNGSI IMPORT, BACKUP, & CETAK ----------------
  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const baris = text.split(/\r?\n/);
      let count = 0;
      let currentTimestamp = Date.now();
      
      setKoneksi('Mengimpor data...');
      setIsLoading(true);

      for (const barisData of baris) {
        if (!barisData.trim()) continue;
        const parts = barisData.split(',');
        const nama = parts[0]?.trim();
        const kelas = parts[1]?.trim() || '-';

        if (nama && nama.toLowerCase() !== 'nama') {
          const newId = (currentTimestamp++).toString();
          const pesertaBaru = {
            action: "create", id: newId, nama: nama, kelas: kelas,
            ktp: false, foto: false, rapot: false, sertifikat: false, suratKeterangan: false,
            keterangan: '', createdAt: currentTimestamp
          };
          
          setPeserta(prev => [...prev, pesertaBaru]); // Update UI instan
          
          try {
            await fetch(GOOGLE_SHEET_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify(pesertaBaru),
              redirect: "follow"
            });
            count++;
          } catch (err) {
            console.error("Gagal import baris:", err);
          }
        }
      }

      setKoneksi('Terhubung (Google Sheets)');
      setIsLoading(false);
      if (count > 0) showAlert("Sukses", `Berhasil mengimpor ${count} data siswa ke database.`);
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const handleBackup = () => {
    if (peserta.length === 0) {
      showAlert("Peringatan", "Tidak ada data untuk dibackup.");
      return;
    }

    const headers = ['Nama', 'Kelas', 'KTP', 'Foto', 'Rapot', 'Sertifikat PKL', 'Surat Keterangan', 'Keterangan'];
    const csvRows = [headers.join(',')];

    peserta.forEach(p => {
      const row = [
        `"${p.nama}"`, `"${p.kelas}"`,
        p.ktp ? 'Sudah' : 'Belum', p.foto ? 'Sudah' : 'Belum',
        p.rapot ? 'Sudah' : 'Belum', p.sertifikat ? 'Sudah' : 'Belum',
        p.suratKeterangan ? 'Sudah' : 'Belum', `"${p.keterangan || ''}"`
      ];
      csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Backup_Data_Berkas_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (peserta.length === 0) {
      showAlert("Peringatan", "Tidak ada data untuk dicetak.");
      return;
    }

    const tableRows = peserta.map((p, index) => {
      const st = (val) => val ? '<td class="status-sudah">Sudah</td>' : '<td class="status-belum">Belum</td>';
      return '<tr>' +
        '<td style="text-align: center;">' + (index + 1) + '</td>' +
        '<td>' + p.nama + '</td>' +
        '<td>' + p.kelas + '</td>' +
        st(p.ktp) + st(p.foto) + st(p.rapot) + st(p.sertifikat) + st(p.suratKeterangan) +
        '<td>' + (p.keterangan || '-') + '</td>' +
      '</tr>';
    }).join('');

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Cetak Laporan - Pengecekan Berkas</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
              .header { text-align: center; margin-bottom: 30px; }
              .header h1 { margin: 0 0 10px 0; font-size: 24px; }
              .header p { margin: 0; color: #666; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ccc; padding: 10px 12px; text-align: left; font-size: 14px; }
              th { background-color: #f4f4f4; font-weight: bold; }
              .status-sudah { color: #16a34a; font-weight: bold; text-align: center; }
              .status-belum { color: #dc2626; font-weight: bold; text-align: center; }
              @media print {
                @page { margin: 1cm; }
                body { padding: 0; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Laporan Pengecekan Berkas</h1>
              <p>Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p>Total Peserta: ${peserta.length}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="text-align: center; width: 40px;">No</th>
                  <th>Nama Lengkap</th>
                  <th>Kelas</th>
                  <th style="text-align: center;">KTP</th>
                  <th style="text-align: center;">Foto</th>
                  <th style="text-align: center;">Rapot</th>
                  <th style="text-align: center;">Sertifikat PKL</th>
                  <th style="text-align: center;">Surat Keterangan</th>
                  <th>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
            <script>
              window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      showAlert("Peringatan", "Gagal membuka jendela cetak. Pastikan pop-up tidak diblokir.");
      window.print();
    }
  };
  // ---------------------------------------------------------------

  const totalPeserta = peserta.length;
  const totalSelesai = peserta.filter(p => p.ktp && p.foto && p.rapot && p.sertifikat && p.suratKeterangan).length;

  const TombolStatus = ({ status, onClick, disabled }) => {
    return (
      <button
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        className={`flex items-center justify-center w-full gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-all duration-200 shadow-sm print:shadow-none print:bg-transparent print:border-none print:p-0 print:justify-start ${
          status ? 'bg-green-100 text-green-700 border-green-300' : 'bg-rose-100 text-rose-700 border-rose-300'
        } ${disabled ? 'opacity-80 cursor-default border-transparent shadow-none' : (status ? 'hover:bg-green-200 cursor-pointer border' : 'hover:bg-rose-200 cursor-pointer border')}`}
      >
        {status ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
        {status ? 'Sudah' : 'Belum'}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800 print:bg-white print:p-0">
      <div className="max-w-6xl mx-auto space-y-6 print:space-y-4">
        
        {/* Header & Statistik */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:shadow-none print:border-none print:p-0">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              Sistem Pengecekan Berkas
              <span className={`text-xs px-2 py-1 rounded-full text-white font-medium print:hidden ${koneksi.includes('Terhubung') ? 'bg-emerald-500' : (koneksi.includes('belum diisi') ? 'bg-rose-500' : 'bg-amber-500')}`}>
                {koneksi}
              </span>
            </h1>
            <p className="text-slate-500 mt-1">Database menggunakan Google Sheets.</p>
          </div>
          <div className="flex gap-4 items-center">
            
            <button onClick={loadData} disabled={isLoading} className="text-slate-500 hover:text-blue-600 print:hidden transition-colors" title="Segarkan Data">
              <RefreshCw size={20} className={isLoading ? 'animate-spin text-blue-600' : ''} />
            </button>

            <div className="bg-blue-50 px-4 py-3 rounded-xl border border-blue-100 text-center min-w-[120px] print:bg-transparent print:border-slate-300">
              <p className="text-blue-600 text-sm font-medium print:text-slate-600">Total Peserta</p>
              <p className="text-2xl font-bold text-blue-700 print:text-slate-900">{totalPeserta}</p>
            </div>
            <div className="bg-green-50 px-4 py-3 rounded-xl border border-green-100 text-center min-w-[120px] print:bg-transparent print:border-slate-300">
              <p className="text-green-600 text-sm font-medium print:text-slate-600">Berkas Lengkap</p>
              <p className="text-2xl font-bold text-green-700 print:text-slate-900">{totalSelesai}</p>
            </div>
            
            <div className="print:hidden border-l border-slate-200 pl-4 ml-2 flex items-center">
              {isAdmin ? (
                <button onClick={requestLogout} className="flex flex-col items-center justify-center gap-1 text-rose-600 hover:text-rose-700 transition-colors">
                  <Lock size={20} />
                  <span className="text-xs font-semibold">Logout</span>
                </button>
              ) : (
                <button onClick={handleLoginClick} className="flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-slate-800 transition-colors">
                  <Unlock size={20} />
                  <span className="text-xs font-semibold">Login Admin</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Form Tambah Peserta & Aksi */}
        {isAdmin ? (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 print:hidden">
            <form onSubmit={tambahPeserta} className="flex flex-col md:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Peserta</label>
                <input type="text" value={namaBaru} onChange={(e) => setNamaBaru(e.target.value)} placeholder="Masukkan nama lengkap..." className="w-full pl-4 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
              <div className="w-full md:w-32">
                <label className="block text-sm font-medium text-slate-700 mb-1">Kelas</label>
                <input type="text" value={kelasBaru} onChange={(e) => setKelasBaru(e.target.value)} placeholder="Contoh: 10-A" className="w-full pl-4 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
              <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 h-auto whitespace-nowrap">
                  <UserPlus size={18} /> Tambah
                </button>

                {/* Tombol Import File */}
                <label className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 cursor-pointer h-auto whitespace-nowrap">
                  <Upload size={18} /> Import
                  <input type="file" accept=".txt,.csv" className="hidden" onChange={handleImport} />
                </label>

                {/* Tombol Backup/Export */}
                <button type="button" onClick={handleBackup} className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 h-auto whitespace-nowrap">
                  <Download size={18} /> Backup
                </button>

                {/* Tombol Cetak Laporan */}
                <button type="button" onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 h-auto whitespace-nowrap">
                  <Printer size={18} /> Cetak
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center print:hidden">
            <p className="text-sm text-slate-500 italic">Anda dalam mode <span className="font-semibold text-slate-700">Read-Only</span>. Login Admin untuk mengedit.</p>
            <button type="button" onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 h-auto whitespace-nowrap">
              <Printer size={18} /> Cetak Laporan
            </button>
          </div>
        )}

        {/* Tabel Data */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden print:shadow-none print:border-slate-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 font-semibold text-slate-700 min-w-[150px]">Nama Lengkap</th>
                  <th className="p-4 font-semibold text-slate-700 w-24">Kelas</th>
                  <th className="p-4 font-semibold text-slate-700 w-32 text-center">KTP</th>
                  <th className="p-4 font-semibold text-slate-700 w-32 text-center">Foto</th>
                  <th className="p-4 font-semibold text-slate-700 w-32 text-center">Rapot</th>
                  <th className="p-4 font-semibold text-slate-700 w-32 text-center">Sertifikat</th>
                  <th className="p-4 font-semibold text-slate-700 w-32 text-center">Surat Ket</th>
                  <th className="p-4 font-semibold text-slate-700">Keterangan</th>
                  {isAdmin && <th className="p-4 font-semibold text-slate-700 w-24 text-center print:hidden">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {peserta.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? "9" : "8"} className="p-8 text-center text-slate-500">
                      {koneksi.includes('Error') ? 'Terjadi masalah dengan URL Database.' : 'Belum ada data / Sedang memuat...'}
                    </td>
                  </tr>
                ) : (
                  peserta.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        {editingId === p.id ? <input type="text" value={editForm.nama} onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })} className="w-full p-2 border border-blue-300 rounded-lg outline-none" autoFocus /> : p.nama}
                      </td>
                      <td className="p-4 text-slate-600 font-medium">
                        {editingId === p.id ? <input type="text" value={editForm.kelas} onChange={(e) => setEditForm({ ...editForm, kelas: e.target.value })} className="w-full p-2 border border-blue-300 rounded-lg outline-none" /> : p.kelas}
                      </td>
                      <td className="p-4"><TombolStatus status={p.ktp} onClick={() => toggleStatus(p.id, 'ktp')} disabled={!isAdmin} /></td>
                      <td className="p-4"><TombolStatus status={p.foto} onClick={() => toggleStatus(p.id, 'foto')} disabled={!isAdmin} /></td>
                      <td className="p-4"><TombolStatus status={p.rapot} onClick={() => toggleStatus(p.id, 'rapot')} disabled={!isAdmin} /></td>
                      <td className="p-4"><TombolStatus status={p.sertifikat} onClick={() => toggleStatus(p.id, 'sertifikat')} disabled={!isAdmin} /></td>
                      <td className="p-4"><TombolStatus status={p.suratKeterangan} onClick={() => toggleStatus(p.id, 'suratKeterangan')} disabled={!isAdmin} /></td>
                      <td className="p-4"><KeteranganInput value={p.keterangan} id={p.id} onSave={updateKeterangan} disabled={!isAdmin} /></td>
                      {isAdmin && (
                        <td className="p-4 print:hidden">
                          {editingId === p.id ? (
                            <div className="flex gap-1 justify-center">
                              <button onClick={() => simpanEdit(p.id)} title="Simpan" className="text-emerald-600 bg-emerald-50 hover:bg-emerald-100 p-2 rounded-lg transition-colors"><Save size={18} /></button>
                              <button onClick={batalEdit} title="Batal" className="text-slate-500 bg-slate-100 hover:bg-slate-200 p-2 rounded-lg transition-colors"><X size={18} /></button>
                            </div>
                          ) : (
                            <div className="flex gap-1 justify-center">
                              <button onClick={() => mulaiEdit(p)} title="Edit" className="text-blue-600 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg transition-colors"><Edit2 size={18} /></button>
                              <button onClick={() => hapusPeserta(p.id, p.nama)} title="Hapus" className="text-rose-600 bg-rose-50 hover:bg-rose-100 p-2 rounded-lg transition-colors"><Trash2 size={18} /></button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal-modal (Login, Confirm, Alert) */}
        {alertDialog.isOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 print:hidden">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
              <h3 className="text-lg font-bold text-slate-900 mb-2">{alertDialog.title}</h3>
              <p className="text-slate-600 mb-6">{alertDialog.message}</p>
              <button onClick={() => setAlertDialog({ isOpen: false, title: '', message: '' })} className="w-full py-2.5 bg-blue-600 text-white rounded-lg">Tutup</button>
            </div>
          </div>
        )}

        {confirmDialog.isOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 print:hidden">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Konfirmasi</h3>
              <p className="text-slate-600 mb-6">{confirmDialog.message}</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setConfirmDialog({ isOpen: false, message: '', onConfirm: null })} className="px-4 py-2 bg-slate-100 rounded-lg">Batal</button>
                <button onClick={confirmDialog.onConfirm} className="px-4 py-2 text-white bg-rose-600 rounded-lg">Ya, Hapus</button>
              </div>
            </div>
          </div>
        )}

        {showLogin && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 print:hidden">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-900">Login Admin</h3>
                <button onClick={() => setShowLogin(false)} className="text-slate-400"><X size={20} /></button>
              </div>
              <form onSubmit={handlePinSubmit}>
                <input type="password" value={pin} onChange={(e) => { setPin(e.target.value); setPinError(''); }} className="w-full p-2.5 border rounded-lg outline-none mb-2" placeholder="PIN: 1234" autoFocus />
                {pinError && <p className="text-rose-500 text-sm mb-2">{pinError}</p>}
                <button type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded-lg mt-2">Masuk</button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

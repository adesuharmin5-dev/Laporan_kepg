const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Create a professional sample Excel template with 2 sheets:
// Sheet 1: Data_Kehadiran
// Sheet 2: Data_Demografi

const wb = XLSX.utils.book_new();

// Sheet 1: Kehadiran
const attendanceHeaders = [
  "No", "Nama", "Menit_Bulan_Ini", "Menit_Bulan_Lalu", "Hari_Bulan_Ini", "Hari_Bulan_Lalu",
  "Izin", "Sakit", "Sakit_Tanpa_Surat", "Alfa", "Cuti", "WFH", "Skor_Kehadiran"
];

// Sample rows from Juni 2026 data
const sampleAttendanceRows = [
  [1, "A. Gymnastiar", 530, 579, 12, 13, 0, 0, 0, 0, 0, 0, 26.0],
  [2, "Ade Mursidin", 18, 162, 2, 4, 0, 0, 0, 0, 0, 0, 92.1],
  [3, "Ade Suharmin", 242, 192, 14, 14, 0, 0, 0, 0, 0, 0, 35.68],
  [4, "Dicky Nursalim", 128, 52, 12, 9, 0, 0, 0, 0, 0, 0, 51.04],
  [5, "Fahmi Sabila Dinnulhaq", 16, 3, 2, 0, 0, 0, 0, 0, 0, 0, 92.26]
];

const wsAttendance = XLSX.utils.aoa_to_sheet([attendanceHeaders, ...sampleAttendanceRows]);
XLSX.utils.book_append_sheet(wb, wsAttendance, "Data_Kehadiran");

// Sheet 2: Demografi
const demographicData = [
  ["Kategori", "Label", "Jumlah", "Persentase"],
  ["Status", "Direktur", 1, 3.03],
  ["Status", "Manager", 2, 6.06],
  ["Status", "Karyawan Tetap", 11, 33.33],
  ["Status", "Karyawan Kontrak", 17, 51.52],
  ["Status", "Probation", 2, 6.06],
  ["Gender", "Laki Laki", 31, 93.94],
  ["Gender", "Perempuan", 2, 6.06],
  ["Pendidikan", "SMK/SMA", 17, 51.52],
  ["Pendidikan", "D3", 5, 15.15],
  ["Pendidikan", "S1", 11, 33.33],
  ["Jabatan", "Direktur", 1, 3.03],
  ["Jabatan", "Manager", 2, 6.06],
  ["Jabatan", "LEAD", 4, 12.12],
  ["Jabatan", "STAF", 26, 78.79]
];

const wsDemographics = XLSX.utils.aoa_to_sheet(demographicData);
XLSX.utils.book_append_sheet(wb, wsDemographics, "Data_Demografi");

const templatePath = path.join(__dirname, 'public', 'template_kehadiran_karyawan.xlsx');
XLSX.writeFile(wb, templatePath);

// Also generate CSV template
const csvHeader = attendanceHeaders.join(',') + '\n';
const csvRows = sampleAttendanceRows.map(r => r.join(',')).join('\n');
fs.writeFileSync(path.join(__dirname, 'public', 'template_kehadiran_karyawan.csv'), csvHeader + csvRows, 'utf8');

console.log('Templates created successfully at public/template_kehadiran_karyawan.xlsx & csv');

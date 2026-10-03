const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { DATA_DIR, ensureDataDir } = require('./storage_path');

const DB_FILE = path.join(DATA_DIR, 'database_kepegawaian.xlsx');
const PERIODS_INDEX_FILE = path.join(DATA_DIR, 'periods.json');

/**
 * Synchronizes all locked periods and attendance data into database_kepegawaian.xlsx
 */
function syncDatabaseToSpreadsheet() {
  ensureDataDir();

  let periods = [];
  try {
    if (fs.existsSync(PERIODS_INDEX_FILE)) {
      periods = JSON.parse(fs.readFileSync(PERIODS_INDEX_FILE, 'utf8'));
    }
  } catch (e) {
    periods = [];
  }

  // Sheet 1: Daftar_Periode
  const periodeRows = [
    ["ID Periode", "Nama Periode", "Status Kunci", "Waktu Kunci", "Periode Pembanding", "Total Pegawai", "Total Kehadiran", "Total Menit Telat", "Rata-rata Skor (%)"]
  ];

  // Sheet 2: Data_Kehadiran
  const kehadiranRows = [
    ["ID Periode", "Nama Periode", "No", "Nama Pegawai", "Menit Bulan Ini", "Menit Bulan Lalu", "Selisih Menit", "Hari Bulan Ini", "Hari Bulan Lalu", "Selisih Hari", "Izin", "Sakit", "Sakit TS", "Alfa", "Cuti", "WFH", "Skor Kehadiran"]
  ];

  // Sheet 3: Demografi
  const demografiRows = [
    ["ID Periode", "Nama Periode", "Kategori", "Label", "Jumlah", "Persentase (%)"]
  ];

  // Sheet 4: Master_Pegawai
  const masterPegawaiMap = new Map();

  for (const p of periods) {
    periodeRows.push([
      p.id,
      p.periode,
      p.isLocked ? "Terkunci" : "Draft",
      p.lockedAt || new Date().toISOString(),
      p.previousPeriodName || "-",
      p.totalPegawai || 0,
      p.totalKehadiran || 0,
      p.totalMnt || 0,
      p.avgSkor || 0
    ]);

    const periodFilePath = path.join(DATA_DIR, `${p.id}.json`);
    if (fs.existsSync(periodFilePath)) {
      try {
        const pData = JSON.parse(fs.readFileSync(periodFilePath, 'utf8'));

        (pData.attendance || []).forEach((row, idx) => {
          kehadiranRows.push([
            p.id,
            p.periode,
            row.no || (idx + 1),
            row.name || "",
            row.mntCurrent || 0,
            row.mntLast || 0,
            row.deltaMnt || 0,
            row.hariCurrent || 0,
            row.hariLast || 0,
            row.deltaHari || 0,
            row.izin || 0,
            row.sakit || 0,
            row.sakitTS || 0,
            row.alfa || 0,
            row.cuti || 0,
            row.wfh || 0,
            row.skor || 0
          ]);

          if (row.name) {
            const key = row.name.trim().toLowerCase();
            if (!masterPegawaiMap.has(key)) {
              masterPegawaiMap.set(key, {
                name: row.name.trim(),
                firstSeenPeriod: p.periode
              });
            }
          }
        });

        if (pData.demographics) {
          ['status', 'gender', 'education', 'position'].forEach(cat => {
            const list = pData.demographics[cat] || [];
            list.forEach(item => {
              demografiRows.push([
                p.id,
                p.periode,
                cat.toUpperCase(),
                item.label,
                item.count,
                item.pct
              ]);
            });
          });
        }
      } catch (err) {
        console.error(`Error parsing period file ${periodFilePath}:`, err);
      }
    }
  }

  // Sheet 4: Master_Pegawai
  const masterPegawaiRows = [
    ["No", "Nama Pegawai", "Periode Terdaftar", "Status"]
  ];
  let empIdx = 1;
  masterPegawaiMap.forEach(emp => {
    masterPegawaiRows.push([
      empIdx++,
      emp.name,
      emp.firstSeenPeriod,
      "Aktif"
    ]);
  });

  const wb = xlsx.utils.book_new();

  const wsPeriode = xlsx.utils.aoa_to_sheet(periodeRows);
  const wsKehadiran = xlsx.utils.aoa_to_sheet(kehadiranRows);
  const wsDemografi = xlsx.utils.aoa_to_sheet(demografiRows);
  const wsMaster = xlsx.utils.aoa_to_sheet(masterPegawaiRows);

  xlsx.utils.book_append_sheet(wb, wsPeriode, "Daftar_Periode");
  xlsx.utils.book_append_sheet(wb, wsKehadiran, "Data_Kehadiran");
  xlsx.utils.book_append_sheet(wb, wsDemografi, "Demografi");
  xlsx.utils.book_append_sheet(wb, wsMaster, "Master_Pegawai");

  xlsx.writeFile(wb, DB_FILE);
  return {
    filePath: DB_FILE,
    totalPeriods: periods.length,
    totalAttendance: kehadiranRows.length - 1,
    totalDemographics: demografiRows.length - 1,
    totalEmployees: masterPegawaiMap.size
  };
}

/**
 * Returns statistics of database_kepegawaian.xlsx
 */
function getDatabaseStats() {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    syncDatabaseToSpreadsheet();
  }

  const stat = fs.statSync(DB_FILE);
  let periods = [];
  try {
    periods = JSON.parse(fs.readFileSync(PERIODS_INDEX_FILE, 'utf8'));
  } catch (e) {
    periods = [];
  }

  const wb = xlsx.readFile(DB_FILE);
  const kehadiranSheet = wb.Sheets["Data_Kehadiran"];
  const attendanceRows = kehadiranSheet ? xlsx.utils.sheet_to_json(kehadiranSheet) : [];

  return {
    fileName: 'database_kepegawaian.xlsx',
    filePath: DB_FILE,
    sizeBytes: stat.size,
    sizeFormatted: (stat.size / 1024).toFixed(1) + ' KB',
    lastModified: stat.mtime.toISOString(),
    totalPeriods: periods.length,
    totalAttendanceRows: attendanceRows.length,
    sheets: wb.SheetNames
  };
}

/**
 * Loads and restores periods and attendance data from an uploaded .xlsx buffer
 */
function loadDatabaseFromSpreadsheet(buffer) {
  ensureDataDir();
  const wb = xlsx.read(buffer, { type: 'buffer' });

  // 1. Check required sheets
  if (!wb.Sheets["Daftar_Periode"] || !wb.Sheets["Data_Kehadiran"]) {
    throw new Error("Format spreadsheet database tidak sesuai. Lembar 'Daftar_Periode' dan 'Data_Kehadiran' wajib ada.");
  }

  const periodRows = xlsx.utils.sheet_to_json(wb.Sheets["Daftar_Periode"]);
  const attendanceRows = xlsx.utils.sheet_to_json(wb.Sheets["Data_Kehadiran"]);
  const demografiRows = wb.Sheets["Demografi"] ? xlsx.utils.sheet_to_json(wb.Sheets["Demografi"]) : [];

  const periodsList = [];

  for (const pr of periodRows) {
    const periodId = String(pr["ID Periode"] || pr["id"] || '').trim();
    const periodName = String(pr["Nama Periode"] || pr["periode"] || '').trim();
    if (!periodId || !periodName) continue;

    // Filter attendance for this period
    const matchedAttendance = attendanceRows
      .filter(ar => {
        const arId = String(ar["ID Periode"] || ar["id"] || '').trim();
        const arName = String(ar["Nama Periode"] || ar["periode"] || '').trim();
        return arId === periodId || arName.toLowerCase() === periodName.toLowerCase();
      })
      .map((ar, idx) => ({
        no: Number(ar["No"] || (idx + 1)),
        name: String(ar["Nama Pegawai"] || ar["Nama"] || ar["name"] || '').trim(),
        mntCurrent: Number(ar["Menit Bulan Ini"] || ar["mntCurrent"] || 0),
        mntLast: Number(ar["Menit Bulan Lalu"] || ar["mntLast"] || 0),
        deltaMnt: Number(ar["Selisih Menit"] || ar["deltaMnt"] || 0),
        hariCurrent: Number(ar["Hari Bulan Ini"] || ar["hariCurrent"] || 0),
        hariLast: Number(ar["Hari Bulan Lalu"] || ar["hariLast"] || 0),
        deltaHari: Number(ar["Selisih Hari"] || ar["deltaHari"] || 0),
        izin: Number(ar["Izin"] || ar["izin"] || 0),
        sakit: Number(ar["Sakit"] || ar["sakit"] || 0),
        sakitTS: Number(ar["Sakit TS"] || ar["sakitTS"] || 0),
        alfa: Number(ar["Alfa"] || ar["alfa"] || 0),
        cuti: Number(ar["Cuti"] || ar["cuti"] || 0),
        wfh: Number(ar["WFH"] || ar["wfh"] || 0),
        skor: Number(ar["Skor Kehadiran"] || ar["skor"] || 0)
      }));

    // Demographics
    const matchedDemo = demografiRows.filter(dr => {
      const drId = String(dr["ID Periode"] || dr["id"] || '').trim();
      const drName = String(dr["Nama Periode"] || dr["periode"] || '').trim();
      return drId === periodId || drName.toLowerCase() === periodName.toLowerCase();
    });

    const demoObj = { status: [], gender: [], education: [], position: [] };
    matchedDemo.forEach(dr => {
      const cat = String(dr["Kategori"] || '').trim().toLowerCase();
      if (demoObj[cat]) {
        demoObj[cat].push({
          label: String(dr["Label"] || '').trim(),
          count: Number(dr["Jumlah"] || 0),
          pct: Number(dr["Persentase (%)"] || dr["Persentase"] || 0)
        });
      }
    });

    const periodData = {
      id: periodId,
      periode: periodName,
      bulanLaluName: String(pr["Periode Pembanding"] || "-"),
      previousPeriodId: null,
      totalPegawaiHeader: Number(pr["Total Pegawai"] || matchedAttendance.length),
      demographics: demoObj,
      attendance: matchedAttendance,
      isLocked: String(pr["Status Kunci"] || '').toLowerCase().includes('kunci'),
      lockedAt: pr["Waktu Kunci"] || new Date().toISOString()
    };

    // Save individual period json
    fs.writeFileSync(path.join(DATA_DIR, `${periodId}.json`), JSON.stringify(periodData, null, 2), 'utf8');

    periodsList.push({
      id: periodId,
      periode: periodName,
      isLocked: periodData.isLocked,
      lockedAt: periodData.lockedAt,
      previousPeriodId: periodData.previousPeriodId,
      previousPeriodName: periodData.bulanLaluName,
      totalPegawai: periodData.totalPegawaiHeader,
      totalKehadiran: matchedAttendance.length,
      totalMnt: matchedAttendance.reduce((s, e) => s + e.mntCurrent, 0),
      avgSkor: matchedAttendance.length ? Number((matchedAttendance.reduce((s, e) => s + e.skor, 0) / matchedAttendance.length).toFixed(2)) : 0
    });
  }

  // Update periods.json
  fs.writeFileSync(PERIODS_INDEX_FILE, JSON.stringify(periodsList, null, 2), 'utf8');

  // Also write back normalized database_kepegawaian.xlsx
  fs.writeFileSync(DB_FILE, buffer);

  return {
    success: true,
    message: `Berhasil memuat database spreadsheet. ${periodsList.length} periode dipulihkan.`,
    totalPeriods: periodsList.length
  };
}

module.exports = {
  DB_FILE,
  syncDatabaseToSpreadsheet,
  getDatabaseStats,
  loadDatabaseFromSpreadsheet
};

const fs = require('fs');
const path = require('path');
const { calculateMetrics } = require('./calculator');
const { syncDatabaseToSpreadsheet, getDatabaseStats, loadDatabaseFromSpreadsheet } = require('./spreadsheet_db');

const DATA_DIR = path.join(__dirname, '..', 'data');
const PERIODS_INDEX_FILE = path.join(DATA_DIR, 'periods.json');

function initPeriodsIndex() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(PERIODS_INDEX_FILE)) {
    // Seed initial periods
    const initialList = [
      {
        id: "juni_2026",
        periode: "Juni 2026",
        isLocked: true,
        lockedAt: "2026-06-30T17:00:00.000Z",
        previousPeriodId: "mei_2026",
        previousPeriodName: "Mei 2026",
        totalPegawai: 33,
        totalKehadiran: 28,
        totalMnt: 3717,
        avgSkor: 71.38
      },
      {
        id: "agustus_2026",
        periode: "Agustus 2026",
        isLocked: true,
        lockedAt: "2026-08-31T17:00:00.000Z",
        previousPeriodId: "juli_2026",
        previousPeriodName: "Juli 2026",
        totalPegawai: 33,
        totalKehadiran: 27,
        totalMnt: 5289,
        avgSkor: 61.09
      }
    ];
    fs.writeFileSync(PERIODS_INDEX_FILE, JSON.stringify(initialList, null, 2), 'utf8');
  }
}

function getLockedPeriods() {
  initPeriodsIndex();
  try {
    return JSON.parse(fs.readFileSync(PERIODS_INDEX_FILE, 'utf8'));
  } catch (err) {
    return [];
  }
}

function getPeriodData(id) {
  initPeriodsIndex();
  const filePath = path.join(DATA_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function lockAndSavePeriod({ id, periode, previousPeriodId, previousPeriodName, demographics, attendance, totalPegawaiHeader }) {
  initPeriodsIndex();

  const periodId = id || periode.toLowerCase().replace(/[^a-z0-9]+/g, '_');

  // If previousPeriodId is supplied and exists, link baseline
  let previousData = null;
  if (previousPeriodId) {
    previousData = getPeriodData(previousPeriodId);
  }

  // Enhance attendance rows with previous baseline if needed
  const processedAttendance = attendance.map((row, idx) => {
    let mntCurrent = Number(row.mntCurrent || row.menit || row.mnt || 0);
    let hariCurrent = Number(row.hariCurrent || row.hari || row.telat || 0);

    let mntLast = Number(row.mntLast || 0);
    let hariLast = Number(row.hariLast || 0);

    // If previous dataset exists and mntLast is not explicitly provided in the file, look up by name
    if (previousData && previousData.attendance && (!row.mntLast && row.mntLast !== 0)) {
      const prevEmp = previousData.attendance.find(p => p.name.trim().toLowerCase() === row.name.trim().toLowerCase());
      if (prevEmp) {
        mntLast = prevEmp.mntCurrent;
        hariLast = prevEmp.hariCurrent;
      }
    }

    const deltaMnt = mntLast - mntCurrent; // positive = membaik
    const deltaHari = hariLast - hariCurrent;

    return {
      no: row.no || (idx + 1),
      name: row.name,
      mntCurrent,
      mntLast,
      deltaMnt: row.deltaMnt !== undefined ? row.deltaMnt : deltaMnt,
      hariCurrent,
      hariLast,
      deltaHari: row.deltaHari !== undefined ? row.deltaHari : deltaHari,
      izin: Number(row.izin || 0),
      sakit: Number(row.sakit || 0),
      sakitTS: Number(row.sakitTS || row.sakit_tanpa_surat || 0),
      alfa: Number(row.alfa || 0),
      cuti: Number(row.cuti || 0),
      wfh: Number(row.wfh || 0),
      skor: Number(row.skor || 0)
    };
  });

  const fullDataset = {
    id: periodId,
    periode,
    bulanLaluName: previousPeriodName || (previousData ? previousData.periode : "Bulan lalu"),
    previousPeriodId: previousPeriodId || null,
    totalPegawaiHeader: Number(totalPegawaiHeader || processedAttendance.length),
    demographics: demographics || (previousData ? previousData.demographics : { status: [], gender: [], education: [], position: [] }),
    attendance: processedAttendance,
    isLocked: true,
    lockedAt: new Date().toISOString()
  };

  // Save period JSON file
  fs.writeFileSync(path.join(DATA_DIR, `${periodId}.json`), JSON.stringify(fullDataset, null, 2), 'utf8');

  // Update periods index
  const metrics = calculateMetrics(fullDataset);
  const periodsList = getLockedPeriods().filter(p => p.id !== periodId);

  periodsList.unshift({
    id: periodId,
    periode,
    isLocked: true,
    lockedAt: fullDataset.lockedAt,
    previousPeriodId: fullDataset.previousPeriodId,
    previousPeriodName: fullDataset.bulanLaluName,
    totalPegawai: fullDataset.totalPegawaiHeader,
    totalKehadiran: processedAttendance.length,
    totalMnt: metrics.totalMntCurrent,
    avgSkor: Number(metrics.avgSkor.toFixed(2))
  });

  fs.writeFileSync(PERIODS_INDEX_FILE, JSON.stringify(periodsList, null, 2), 'utf8');

  // Automatically keep spreadsheet database (database_kepegawaian.xlsx) in sync
  try {
    syncDatabaseToSpreadsheet();
  } catch (err) {
    console.error('Failed to auto-sync spreadsheet database:', err);
  }

  return fullDataset;
}

module.exports = {
  getLockedPeriods,
  getPeriodData,
  lockAndSavePeriod,
  syncDatabaseToSpreadsheet,
  getDatabaseStats,
  loadDatabaseFromSpreadsheet
};

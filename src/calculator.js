// Calculator module for HR Attendance & Demographics
function calculateMetrics(dataset) {
  const { periode, bulanLaluName, totalPegawaiHeader, demographics, attendance } = dataset;
  const totalKehadiran = attendance.length;

  const totalMntCurrent = attendance.reduce((s, e) => s + (e.mntCurrent || 0), 0);
  const totalMntLast = attendance.reduce((s, e) => s + (e.mntLast || 0), 0);
  const diffMnt = totalMntCurrent - totalMntLast;
  const pctMnt = totalMntLast ? ((diffMnt / totalMntLast) * 100) : 0;

  const totalHariCurrent = attendance.reduce((s, e) => s + (e.hariCurrent || 0), 0);
  const totalHariLast = attendance.reduce((s, e) => s + (e.hariLast || 0), 0);
  const diffHari = totalHariCurrent - totalHariLast;
  const pctHari = totalHariLast ? ((diffHari / totalHariLast) * 100) : 0;

  const avgSkor = totalKehadiran ? (attendance.reduce((s, e) => s + (e.skor || 0), 0) / totalKehadiran) : 0;
  const countUnder60 = attendance.filter(e => e.skor < 60).length;

  // Score distribution
  const distGe90 = attendance.filter(e => e.skor >= 90).length;
  const dist75_90 = attendance.filter(e => e.skor >= 75 && e.skor < 90).length;
  const dist60_75 = attendance.filter(e => e.skor >= 60 && e.skor < 75).length;
  const distLt60 = attendance.filter(e => e.skor < 60).length;

  // Absences
  const totalIzin = attendance.reduce((s, e) => s + (e.izin || 0), 0);
  const totalSakit = attendance.reduce((s, e) => s + (e.sakit || 0), 0);
  const totalSakitTS = attendance.reduce((s, e) => s + (e.sakitTS || 0), 0);
  const totalAlfa = attendance.reduce((s, e) => s + (e.alfa || 0), 0);
  const totalCuti = attendance.reduce((s, e) => s + (e.cuti || 0), 0);
  const totalWFH = attendance.reduce((s, e) => s + (e.wfh || 0), 0);

  // Changes per employee
  // deltaMnt = mntLast - mntCurrent (positive = membaik, negative = memburuk)
  const mntMembaik = attendance.filter(e => e.deltaMnt > 0).length;
  const mntMemburuk = attendance.filter(e => e.deltaMnt < 0).length;
  const mntTetap = attendance.filter(e => e.deltaMnt === 0).length;

  const hariMembaik = attendance.filter(e => e.deltaHari > 0).length;
  const hariMemburuk = attendance.filter(e => e.deltaHari < 0).length;
  const hariTetap = attendance.filter(e => e.deltaHari === 0).length;

  // Rankings
  const topPerbaikanMnt = [...attendance].sort((a, b) => b.deltaMnt - a.deltaMnt).slice(0, 5);
  const topPenurunanMnt = [...attendance].sort((a, b) => a.deltaMnt - b.deltaMnt).slice(0, 5);

  const top5SkorRendah = [...attendance].sort((a, b) => a.skor - b.skor).slice(0, 5);
  const top5MntTertinggi = [...attendance].sort((a, b) => b.mntCurrent - a.mntCurrent).slice(0, 5);
  const top5HariTerbanyak = [...attendance].sort((a, b) => b.hariCurrent - a.hariCurrent).slice(0, 5);

  const top3Membaik = [...attendance].sort((a, b) => b.deltaMnt - a.deltaMnt).slice(0, 3);
  const top3Memburuk = [...attendance].sort((a, b) => a.deltaMnt - b.deltaMnt).slice(0, 3);

  // Overall trend
  const isOverallWorse = diffMnt > 0 || diffHari > 0;

  // Demographic totals check
  const totalStatus = demographics?.status?.reduce((s, d) => s + d.count, 0) || totalPegawaiHeader;
  const totalGender = demographics?.gender?.reduce((s, d) => s + d.count, 0) || totalPegawaiHeader;
  const totalEdu = demographics?.education?.reduce((s, d) => s + d.count, 0) || totalPegawaiHeader;
  const totalPos = demographics?.position?.reduce((s, d) => s + d.count, 0) || totalPegawaiHeader;

  return {
    periode,
    bulanLaluName: bulanLaluName || "Bulan lalu",
    totalPegawaiHeader,
    totalKehadiran,
    totalMntCurrent,
    totalMntLast,
    diffMnt,
    pctMnt,
    totalHariCurrent,
    totalHariLast,
    diffHari,
    pctHari,
    avgSkor,
    countUnder60,
    scoreDist: {
      ge90: distGe90,
      b75_90: dist75_90,
      b60_75: dist60_75,
      lt60: distLt60
    },
    absence: {
      izin: totalIzin,
      sakit: totalSakit,
      sakitTS: totalSakitTS,
      alfa: totalAlfa,
      cuti: totalCuti,
      wfh: totalWFH
    },
    changesMnt: {
      membaik: mntMembaik,
      memburuk: mntMemburuk,
      tetap: mntTetap
    },
    changesHari: {
      membaik: hariMembaik,
      memburuk: hariMemburuk,
      tetap: hariTetap
    },
    topPerbaikanMnt,
    topPenurunanMnt,
    top5SkorRendah,
    top5MntTertinggi,
    top5HariTerbanyak,
    top3Membaik,
    top3Memburuk,
    isOverallWorse,
    dataIntegrity: {
      header: totalPegawaiHeader,
      demographicsCount: totalStatus,
      attendanceCount: totalKehadiran,
      isConsistent: (totalPegawaiHeader === totalStatus && totalStatus === totalKehadiran)
    },
    demographics
  };
}

module.exports = { calculateMetrics };

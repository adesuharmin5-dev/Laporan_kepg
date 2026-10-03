// Client side script for web app with period locking, upload, and ALL-PAGES print
let currentPeriod = 'juni_2026';
let currentLang = 'id';
let currentPage = 1;
let cachedData = {};
let lockedPeriodsList = [];
let uploadedPayload = null;

async function loadLockedPeriods() {
  try {
    const res = await fetch('/api/locked-periods');
    lockedPeriodsList = await res.json();
    renderPeriodDropdown();
    renderPrevPeriodDropdown();
  } catch (err) {
    console.error('Failed to load locked periods', err);
  }
}

function renderPeriodDropdown() {
  const select = document.getElementById('periodSelect');
  select.innerHTML = lockedPeriodsList.map(p => `
    <option value="${p.id}" ${p.id === currentPeriod ? 'selected' : ''}>
      ${p.isLocked ? '🔒 ' : ''}${p.periode} (${p.totalKehadiran} Pegawai)
    </option>
  `).join('');
}

function renderPrevPeriodDropdown() {
  const select = document.getElementById('prevPeriodSelect');
  if (!select) return;
  const options = lockedPeriodsList.map(p => `
    <option value="${p.id}">🔒 ${p.periode} (Total Menit: ${p.totalMnt.toLocaleString('id-ID')}, Skor: ${p.avgSkor})</option>
  `).join('');
  select.innerHTML = `
    <option value="">-- Gunakan Kolom 'Bulan Lalu' dari File yang Diupload --</option>
    ${options}
  `;
}

async function loadData(period) {
  if (cachedData[period]) return cachedData[period];
  const res = await fetch(`/api/data?period=${period}`);
  const data = await res.json();
  cachedData[period] = data;
  return data;
}

function calculate(dataset) {
  const { periode, totalPegawaiHeader, demographics, attendance } = dataset;
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

  const scoreDist = {
    ge90: attendance.filter(e => e.skor >= 90).length,
    b75_90: attendance.filter(e => e.skor >= 75 && e.skor < 90).length,
    b60_75: attendance.filter(e => e.skor >= 60 && e.skor < 75).length,
    lt60: attendance.filter(e => e.skor < 60).length
  };

  const absence = {
    izin: attendance.reduce((s, e) => s + (e.izin || 0), 0),
    sakit: attendance.reduce((s, e) => s + (e.sakit || 0), 0),
    sakitTS: attendance.reduce((s, e) => s + (e.sakitTS || 0), 0),
    alfa: attendance.reduce((s, e) => s + (e.alfa || 0), 0),
    cuti: attendance.reduce((s, e) => s + (e.cuti || 0), 0),
    wfh: attendance.reduce((s, e) => s + (e.wfh || 0), 0)
  };

  const changesMnt = {
    membaik: attendance.filter(e => e.deltaMnt > 0).length,
    memburuk: attendance.filter(e => e.deltaMnt < 0).length,
    tetap: attendance.filter(e => e.deltaMnt === 0).length
  };

  const changesHari = {
    membaik: attendance.filter(e => e.deltaHari > 0).length,
    memburuk: attendance.filter(e => e.deltaHari < 0).length,
    tetap: attendance.filter(e => e.deltaHari === 0).length
  };

  const topPerbaikanMnt = [...attendance].sort((a, b) => b.deltaMnt - a.deltaMnt).slice(0, 5);
  const topPenurunanMnt = [...attendance].sort((a, b) => a.deltaMnt - b.deltaMnt).slice(0, 5);

  const top5SkorRendah = [...attendance].sort((a, b) => a.skor - b.skor).slice(0, 5);
  const top5MntTertinggi = [...attendance].sort((a, b) => b.mntCurrent - a.mntCurrent).slice(0, 5);
  const top5HariTerbanyak = [...attendance].sort((a, b) => b.hariCurrent - a.hariCurrent).slice(0, 5);

  const top3Membaik = [...attendance].sort((a, b) => b.deltaMnt - a.deltaMnt).slice(0, 3);
  const top3Memburuk = [...attendance].sort((a, b) => a.deltaMnt - b.deltaMnt).slice(0, 3);

  const totalStatus = demographics?.status?.reduce((s, d) => s + d.count, 0) || totalPegawaiHeader;

  return {
    periode,
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
    scoreDist,
    absence,
    changesMnt,
    changesHari,
    topPerbaikanMnt,
    topPenurunanMnt,
    top5SkorRendah,
    top5MntTertinggi,
    top5HariTerbanyak,
    top3Membaik,
    top3Memburuk,
    dataIntegrity: {
      header: totalPegawaiHeader,
      demographicsCount: totalStatus,
      attendanceCount: totalKehadiran,
      isConsistent: (totalPegawaiHeader === totalStatus && totalStatus === totalKehadiran)
    },
    demographics,
    attendance
  };
}

function renderSlide(m, page, lang) {
  const isId = lang === 'id';
  const fmtNum = (n) => (n === 0 || !n) ? '-' : (isId ? n.toLocaleString('id-ID') : n.toLocaleString('en-US'));
  const fmtScore = (s) => (s === null || s === undefined) ? '-' : (isId ? Number(s).toFixed(2).replace('.', ',') : Number(s).toFixed(2));
  const monthShort = m.periode.split(' ')[0];

  const mntTrendWord = m.diffMnt > 0 ? (isId ? "meningkat" : "increased") : (isId ? "menurun" : "decreased");
  const mntNaikTurun = m.diffMnt > 0 ? (isId ? "naik" : "up") : (isId ? "turun" : "down");
  const hariTrendWord = m.diffHari > 0 ? (isId ? "meningkat" : "increased") : (isId ? "menurun" : "decreased");
  const hariNaikTurun = m.diffHari > 0 ? (isId ? "naik" : "up") : (isId ? "turun" : "down");
  const riskNames = m.top5SkorRendah.map(e => e.name).slice(0, 5).join(", ");
  const topImprover = m.topPerbaikanMnt[0];
  const secondImprover = m.topPerbaikanMnt[1];

  const header = (badge, title, subtitle) => `
    <div class="bg-[#0f1e36] text-white px-8 py-3.5 flex justify-between items-center shrink-0">
      <div>
        <div class="text-[10px] font-bold tracking-wider text-slate-300 uppercase">${badge}</div>
        <h1 class="text-lg font-extrabold tracking-tight">${title}</h1>
      </div>
      <div class="text-xs font-semibold text-slate-300">${subtitle}</div>
    </div>
  `;

  const footer = (pg) => `
    <div class="px-8 py-2 border-t border-slate-200 text-[10px] text-slate-400 flex justify-between items-center bg-white shrink-0">
      <span>Confidential - Internal Management Use</span>
      <span>Periode ${m.periode} | ${isId ? 'Halaman' : 'Page'} ${pg}</span>
    </div>
  `;

  if (page === 1) {
    return `
      <div class="slide-page">
        ${header('EXECUTIVE MANAGEMENT REPORT', isId ? 'LAPORAN KEPEGAWAIAN & KEHADIRAN KARYAWAN' : 'WORKFORCE & ATTENDANCE EXECUTIVE REPORT', `Periode ${m.periode}`)}
        <div class="p-5 flex-1 flex flex-col justify-between overflow-hidden bg-slate-50">
          <div class="grid grid-cols-6 gap-2.5">
            <div class="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
              <div class="text-[9px] font-bold text-slate-500 uppercase">${isId ? 'TOTAL PEGAWAI' : 'TOTAL EMPLOYEES'}</div>
              <div class="text-2xl font-black text-slate-800 my-0.5">${m.totalPegawaiHeader}</div>
              <div class="text-[9px] text-slate-400 font-medium">${isId ? 'Header laporan' : 'Report header'}</div>
            </div>
            <div class="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
              <div class="text-[9px] font-bold text-slate-500 uppercase">${isId ? 'DATA KEHADIRAN' : 'ATTENDANCE DATA'}</div>
              <div class="text-2xl font-black text-slate-800 my-0.5">${m.totalKehadiran}</div>
              <div class="text-[9px] text-slate-400 font-medium">${isId ? 'Pegawai pada tabel detail' : 'Detail records'}</div>
            </div>
            <div class="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
              <div class="text-[9px] font-bold text-slate-500 uppercase">${isId ? 'MENIT TERLAMBAT' : 'LATE MINUTES'}</div>
              <div class="text-2xl font-black text-slate-800 my-0.5">${fmtNum(m.totalMntCurrent)}</div>
              <div class="text-[9px] font-bold ${m.diffMnt <= 0 ? 'text-emerald-600' : 'text-rose-600'}">
                ${m.diffMnt > 0 ? '+' : ''}${fmtNum(m.diffMnt)} ${isId ? 'vs bulan lalu' : 'vs last mo'}
              </div>
            </div>
            <div class="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
              <div class="text-[9px] font-bold text-slate-500 uppercase">${isId ? 'HARI TERLAMBAT' : 'LATE DAYS'}</div>
              <div class="text-2xl font-black text-slate-800 my-0.5">${m.totalHariCurrent}</div>
              <div class="text-[9px] font-bold ${m.diffHari <= 0 ? 'text-emerald-600' : 'text-rose-600'}">
                ${m.diffHari > 0 ? '+' : ''}${m.diffHari} ${isId ? 'vs bulan lalu' : 'vs last mo'}
              </div>
            </div>
            <div class="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
              <div class="text-[9px] font-bold text-slate-500 uppercase">${isId ? 'RATA-RATA SKOR' : 'AVG SCORE'}</div>
              <div class="text-2xl font-black text-slate-800 my-0.5">${fmtScore(m.avgSkor)}</div>
              <div class="text-[9px] text-slate-400 font-medium">${isId ? 'Basis ' + m.totalKehadiran + ' pegawai' : 'Basis ' + m.totalKehadiran + ' staff'}</div>
            </div>
            <div class="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
              <div class="text-[9px] font-bold text-slate-500 uppercase">${isId ? 'SKOR < 60' : 'SCORE < 60'}</div>
              <div class="text-2xl font-black ${m.countUnder60 > 0 ? 'text-rose-600' : 'text-emerald-600'} my-0.5">${m.countUnder60}</div>
              <div class="text-[9px] text-slate-400 font-medium">${isId ? 'Band analisis dashboard' : 'Risk threshold'}</div>
            </div>
          </div>

          <div class="grid grid-cols-4 gap-2.5 mt-2.5">
            <div class="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
              <div class="text-xs font-bold text-slate-800 mb-1.5">${isId ? 'Total Menit Keterlambatan' : 'Total Late Minutes'}</div>
              <div class="space-y-1.5 text-[10px]">
                <div><div class="flex justify-between text-slate-500"><span>${isId ? 'Bulan lalu' : 'Last month'}</span><span class="font-semibold text-slate-700">${fmtNum(m.totalMntLast)} mnt</span></div><div class="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-slate-400" style="width: 80%"></div></div></div>
                <div><div class="flex justify-between text-slate-700 font-semibold"><span>${monthShort}</span><span class="font-bold text-blue-700">${fmtNum(m.totalMntCurrent)} mnt</span></div><div class="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-blue-600" style="width: ${Math.min(100, Math.round((m.totalMntCurrent/(Math.max(m.totalMntLast, m.totalMntCurrent)||1))*100))}%"></div></div></div>
              </div>
              <div class="mt-1.5 text-[10px] font-bold ${m.diffMnt <= 0 ? 'text-emerald-600' : 'text-rose-600'}">
                ${m.diffMnt <= 0 ? (isId ? 'Membaik' : 'Improved') : (isId ? 'Memburuk' : 'Worsened')}: ${m.diffMnt > 0 ? '+' : ''}${fmtNum(m.diffMnt)} mnt
              </div>
            </div>

            <div class="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
              <div class="text-xs font-bold text-slate-800 mb-1.5">${isId ? 'Total Hari Terlambat' : 'Total Late Days'}</div>
              <div class="space-y-1.5 text-[10px]">
                <div><div class="flex justify-between text-slate-500"><span>${isId ? 'Bulan lalu' : 'Last month'}</span><span class="font-semibold text-slate-700">${m.totalHariLast} hari</span></div><div class="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-slate-400" style="width: 80%"></div></div></div>
                <div><div class="flex justify-between text-slate-700 font-semibold"><span>${monthShort}</span><span class="font-bold text-blue-700">${m.totalHariCurrent} hari</span></div><div class="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-blue-600" style="width: ${Math.min(100, Math.round((m.totalHariCurrent/(Math.max(m.totalHariLast, m.totalHariCurrent)||1))*100))}%"></div></div></div>
              </div>
              <div class="mt-1.5 text-[10px] font-bold ${m.diffHari <= 0 ? 'text-emerald-600' : 'text-rose-600'}">
                ${m.diffHari <= 0 ? (isId ? 'Membaik' : 'Improved') : (isId ? 'Memburuk' : 'Worsened')}: ${m.diffHari > 0 ? '+' : ''}${m.diffHari} hari
              </div>
            </div>

            <div class="bg-white p-3 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
              <div class="text-xs font-bold text-slate-800 mb-1">${isId ? 'Distribusi Skor Kehadiran' : 'Score Distribution'}</div>
              <div class="flex h-4 rounded overflow-hidden text-[9px] font-bold text-white text-center">
                <div style="width: ${(m.scoreDist.ge90/m.totalKehadiran)*100}%; background-color: #10b981;">${m.scoreDist.ge90}</div>
                <div style="width: ${(m.scoreDist.b75_90/m.totalKehadiran)*100}%; background-color: #06b6d4;">${m.scoreDist.b75_90}</div>
                <div style="width: ${(m.scoreDist.b60_75/m.totalKehadiran)*100}%; background-color: #f59e0b;">${m.scoreDist.b60_75}</div>
                <div style="width: ${(m.scoreDist.lt60/m.totalKehadiran)*100}%; background-color: #ef4444;">${m.scoreDist.lt60}</div>
              </div>
              <div class="grid grid-cols-2 gap-1 text-[9px] text-slate-600 mt-1">
                <div><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1"></span> >=90: ${m.scoreDist.ge90}</div>
                <div><span class="w-1.5 h-1.5 rounded-full bg-cyan-500 inline-block mr-1"></span> 75-89,99: ${m.scoreDist.b75_90}</div>
                <div><span class="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block mr-1"></span> 60-74,99: ${m.scoreDist.b60_75}</div>
                <div><span class="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block mr-1"></span> &lt;60: ${m.scoreDist.lt60}</div>
              </div>
            </div>

            <div class="bg-white p-3 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
              <div class="text-xs font-bold text-slate-800 mb-1">${isId ? 'Ketidakhadiran & WFH' : 'Absence & WFH'}</div>
              <div class="grid grid-cols-3 gap-1 text-center">
                <div class="bg-amber-50 border border-amber-200/60 rounded p-1"><div class="text-xs font-bold text-amber-700">${m.absence.izin}</div><div class="text-[8px] text-amber-600 font-semibold">${isId ? 'Izin' : 'Permit'}</div></div>
                <div class="bg-rose-50 border border-rose-200/60 rounded p-1"><div class="text-xs font-bold text-rose-700">${m.absence.sakit}</div><div class="text-[8px] text-rose-600 font-semibold">${isId ? 'Sakit' : 'Sick'}</div></div>
                <div class="bg-purple-50 border border-purple-200/60 rounded p-1"><div class="text-xs font-bold text-purple-700">${m.absence.sakitTS}</div><div class="text-[8px] text-purple-600 font-semibold leading-tight">${isId ? 'Sakit TS' : 'No Note'}</div></div>
                <div class="bg-slate-50 border border-slate-200/60 rounded p-1"><div class="text-xs font-bold text-slate-700">${m.absence.alfa}</div><div class="text-[8px] text-slate-500 font-semibold">${isId ? 'Alfa' : 'Unexcused'}</div></div>
                <div class="bg-blue-50 border border-blue-200/60 rounded p-1"><div class="text-xs font-bold text-blue-700">${m.absence.cuti}</div><div class="text-[8px] text-blue-600 font-semibold">${isId ? 'Cuti' : 'Leave'}</div></div>
                <div class="bg-emerald-50 border border-emerald-200/60 rounded p-1"><div class="text-xs font-bold text-emerald-700">${m.absence.wfh}</div><div class="text-[8px] text-emerald-600 font-semibold">WFH</div></div>
              </div>
            </div>
          </div>

          <div class="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs mt-2.5 flex-1">
            <h3 class="text-xs font-bold text-slate-900 mb-1.5 flex items-center gap-1.5">
              <span class="w-1.5 h-3 bg-blue-600 rounded-xs"></span>
              ${isId ? 'Executive Summary - Fokus Direksi' : 'Executive Summary - Board Focus'}
            </h3>
            <div class="grid grid-cols-2 gap-x-5 gap-y-1 text-[10.5px] text-slate-700 leading-relaxed">
              <div class="flex items-start gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1"></span><span>${isId ? `Keterlambatan ${m.periode} ${mntTrendWord} dari ${fmtNum(m.totalMntLast)} menjadi ${fmtNum(m.totalMntCurrent)} menit: ${mntNaikTurun} ${fmtNum(Math.abs(m.diffMnt))} menit (${Math.abs(m.pctMnt).toFixed(1).replace('.', ',')}%).` : `Lateness ${mntTrendWord} to ${fmtNum(m.totalMntCurrent)} min.`}</span></div>
              <div class="flex items-start gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1"></span><span>${isId ? `Frekuensi keterlambatan ${hariTrendWord} dari ${m.totalHariLast} menjadi ${m.totalHariCurrent} hari: ${hariNaikTurun} ${Math.abs(m.diffHari)} hari (${Math.abs(m.pctHari).toFixed(1).replace('.', ',')}%).` : `Lateness frequency ${hariTrendWord} to ${m.totalHariCurrent} days.`}</span></div>
              <div class="flex items-start gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1"></span><span>${isId ? `Dari ${m.totalKehadiran} pegawai pada detail kehadiran, ${m.scoreDist.ge90} memiliki skor >=90 dan ${m.countUnder60} memiliki skor <60.` : `${m.scoreDist.ge90} scored >=90, ${m.countUnder60} scored <60.`}</span></div>
              <div class="flex items-start gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1"></span><span>${isId ? `Risiko tertinggi terkonsentrasi pada ${riskNames}.` : `Highest risk on ${riskNames}.`}</span></div>
              <div class="flex items-start gap-1.5 col-span-2"><span class="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1"></span><span>${isId ? `Cakupan data: header ${m.dataIntegrity.header} pegawai, profil demografi ${m.dataIntegrity.demographicsCount} pegawai, dan detail kehadiran ${m.totalKehadiran} pegawai.` : `Data scope: header ${m.dataIntegrity.header}, profile ${m.dataIntegrity.demographicsCount}, attendance ${m.totalKehadiran}.`}</span></div>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-2.5 mt-2.5">
            <div class="${m.diffMnt > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'} border rounded-lg p-2 flex items-center justify-between">
              <div><div class="text-xs font-black ${m.diffMnt > 0 ? 'text-rose-700' : 'text-emerald-700'} uppercase">${m.diffMnt > 0 ? (isId ? 'MEMBURUK' : 'WORSENED') : (isId ? 'MEMBAIK' : 'IMPROVED')}</div><div class="text-[9px] font-bold text-slate-500">${isId ? 'TREND KESELURUHAN' : 'OVERALL TREND'}</div></div>
              <div class="text-[10px] font-semibold text-slate-700">Menit ${m.diffMnt > 0 ? '+' : ''}${m.pctMnt.toFixed(1).replace('.', ',')}% | Hari ${m.diffHari > 0 ? '+' : ''}${m.pctHari.toFixed(1).replace('.', ',')}%</div>
            </div>
            <div class="bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-center justify-between">
              <div><div class="text-xs font-black text-amber-700 uppercase">${m.countUnder60} ${isId ? 'PEGAWAI' : 'STAFF'}</div><div class="text-[9px] font-bold text-slate-500">${isId ? 'KELOMPOK RISIKO' : 'RISK GROUP'}</div></div>
              <div class="text-[10px] font-semibold text-slate-700">Skor &lt; 60 dari ${m.totalKehadiran} pegawai</div>
            </div>
            <div class="bg-slate-100 border border-slate-200 rounded-lg p-2 flex items-center justify-between">
              <div><div class="text-xs font-black text-slate-800">${m.dataIntegrity.header} / ${m.dataIntegrity.demographicsCount} / ${m.totalKehadiran}</div><div class="text-[9px] font-bold text-slate-500">${isId ? 'INTEGRITAS DATA' : 'DATA INTEGRITY'}</div></div>
              <div class="text-[10px] font-semibold text-slate-600">${m.dataIntegrity.isConsistent ? (isId ? 'Basis data konsisten' : 'Data consistent') : (isId ? 'Basis data belum konsisten' : 'Basis inconsistent')}</div>
            </div>
          </div>
        </div>
        ${footer(1)}
      </div>
    `;
  }

  if (page === 2) {
    return `
      <div class="slide-page">
        ${header('WORKFORCE PROFILE', isId ? 'PROFIL PEGAWAI' : 'EMPLOYEE PROFILE', isId ? 'Komposisi sesuai data pada PDF sumber' : 'Source composition')}
        <div class="p-5 flex-1 flex flex-col justify-between overflow-hidden bg-slate-50">
          <div class="grid grid-cols-2 gap-3.5 flex-1">
            <div class="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
              <div class="text-xs font-bold text-slate-800 mb-1.5">${isId ? 'Status Pegawai' : 'Status'}</div>
              <div class="space-y-2 text-[10px]">
                ${(m.demographics?.status || []).map(item => `
                  <div>
                    <div class="flex justify-between text-slate-600 mb-0.5"><span class="font-medium">${item.label}</span><span class="font-semibold text-slate-800">${item.count} | ${item.pct.toFixed(2).replace('.', ',')}%</span></div>
                    <div class="h-2 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-blue-600 rounded-full" style="width: ${item.pct}%"></div></div>
                  </div>
                `).join('')}
              </div>
            </div>
            <div class="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
              <div class="text-xs font-bold text-slate-800 mb-1.5">${isId ? 'Jenis Kelamin' : 'Gender'}</div>
              <div class="space-y-3 text-[10px]">
                ${(m.demographics?.gender || []).map(item => `
                  <div>
                    <div class="flex justify-between text-slate-600 mb-0.5"><span class="font-medium">${item.label}</span><span class="font-semibold text-slate-800">${item.count} | ${item.pct.toFixed(2).replace('.', ',')}%</span></div>
                    <div class="h-2 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-blue-600 rounded-full" style="width: ${item.pct}%"></div></div>
                  </div>
                `).join('')}
              </div>
            </div>
            <div class="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
              <div class="text-xs font-bold text-slate-800 mb-1.5">${isId ? 'Pendidikan' : 'Education'}</div>
              <div class="space-y-2 text-[10px]">
                ${(m.demographics?.education || []).map(item => `
                  <div>
                    <div class="flex justify-between text-slate-600 mb-0.5"><span class="font-medium">${item.label}</span><span class="font-semibold text-slate-800">${item.count} | ${item.pct.toFixed(2).replace('.', ',')}%</span></div>
                    <div class="h-2 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-blue-600 rounded-full" style="width: ${item.pct}%"></div></div>
                  </div>
                `).join('')}
              </div>
            </div>
            <div class="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
              <div class="text-xs font-bold text-slate-800 mb-1.5">${isId ? 'Jabatan' : 'Position'}</div>
              <div class="space-y-2 text-[10px]">
                ${(m.demographics?.position || []).map(item => `
                  <div>
                    <div class="flex justify-between text-slate-600 mb-0.5"><span class="font-medium">${item.label}</span><span class="font-semibold text-slate-800">${item.count} | ${item.pct.toFixed(2).replace('.', ',')}%</span></div>
                    <div class="h-2 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-blue-600 rounded-full" style="width: ${item.pct}%"></div></div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
          <div class="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs mt-3 shrink-0">
            <h3 class="text-xs font-bold text-slate-900 mb-1.5 flex items-center gap-1.5"><span class="w-1.5 h-3 bg-blue-600 rounded-xs"></span>${isId ? 'Catatan Validasi Data Profil' : 'Validation Notes'}</h3>
            <div class="grid grid-cols-2 gap-3 text-[10px] text-slate-700 leading-relaxed">
              <div class="flex items-start gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1"></span><span>Header dan tabel jenis kelamin mencatat ${m.dataIntegrity.header} pegawai.</span></div>
              <div class="flex items-start gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1"></span><span>Tabel status, pendidikan, dan jabatan masing-masing berjumlah ${m.dataIntegrity.demographicsCount} pegawai.</span></div>
            </div>
          </div>
        </div>
        ${footer(2)}
      </div>
    `;
  }

  if (page === 3) {
    return `
      <div class="slide-page">
        ${header('ATTENDANCE ANALYTICS', isId ? 'ANALISIS KEHADIRAN & KETERLAMBATAN' : 'ATTENDANCE & LATENESS ANALYSIS', `${m.periode} ${isId ? 'dibanding bulan lalu' : 'vs last mo'}`)}
        <div class="p-5 flex-1 flex flex-col justify-between overflow-hidden bg-slate-50">
          <div class="grid grid-cols-3 gap-2.5">
            <div class="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
              <div class="text-xs font-bold text-slate-800 mb-1.5">${isId ? 'Perbandingan Menit Terlambat' : 'Late Minutes'}</div>
              <div class="space-y-1.5 text-[10px]">
                <div><div class="flex justify-between text-slate-500"><span>${isId ? 'Bulan lalu' : 'Last mo'}</span><span class="font-semibold text-slate-700">${fmtNum(m.totalMntLast)} mnt</span></div><div class="h-2 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-slate-400" style="width: 80%"></div></div></div>
                <div><div class="flex justify-between text-slate-700 font-semibold"><span>${monthShort}</span><span class="font-bold text-blue-700">${fmtNum(m.totalMntCurrent)} mnt</span></div><div class="h-2 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-blue-600" style="width: ${Math.min(100, Math.round((m.totalMntCurrent/(Math.max(m.totalMntLast, m.totalMntCurrent)||1))*100))}%"></div></div></div>
              </div>
              <div class="mt-1.5 text-[10px] font-bold ${m.diffMnt <= 0 ? 'text-emerald-600' : 'text-rose-600'}">${m.diffMnt <= 0 ? 'Membaik' : 'Memburuk'}: ${m.diffMnt > 0 ? '+' : ''}${fmtNum(m.diffMnt)} mnt</div>
            </div>
            <div class="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
              <div class="text-xs font-bold text-slate-800 mb-1.5">${isId ? 'Perbandingan Hari Terlambat' : 'Late Days'}</div>
              <div class="space-y-1.5 text-[10px]">
                <div><div class="flex justify-between text-slate-500"><span>${isId ? 'Bulan lalu' : 'Last mo'}</span><span class="font-semibold text-slate-700">${m.totalHariLast} hari</span></div><div class="h-2 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-slate-400" style="width: 80%"></div></div></div>
                <div><div class="flex justify-between text-slate-700 font-semibold"><span>${monthShort}</span><span class="font-bold text-blue-700">${m.totalHariCurrent} hari</span></div><div class="h-2 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-blue-600" style="width: ${Math.min(100, Math.round((m.totalHariCurrent/(Math.max(m.totalHariLast, m.totalHariCurrent)||1))*100))}%"></div></div></div>
              </div>
              <div class="mt-1.5 text-[10px] font-bold ${m.diffHari <= 0 ? 'text-emerald-600' : 'text-rose-600'}">${m.diffHari <= 0 ? 'Membaik' : 'Memburuk'}: ${m.diffHari > 0 ? '+' : ''}${m.diffHari} hari</div>
            </div>
            <div class="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
              <div class="text-xs font-bold text-slate-800 mb-1.5">${isId ? 'Perubahan per Pegawai - Menit' : 'Change - Minutes'}</div>
              <div class="space-y-1 text-[10px]">
                <div class="flex justify-between"><span class="text-slate-600">Membaik</span><span class="font-bold text-emerald-600">${m.changesMnt.membaik}</span></div>
                <div class="flex justify-between"><span class="text-slate-600">Memburuk</span><span class="font-bold text-rose-600">${m.changesMnt.memburuk}</span></div>
                <div class="flex justify-between"><span class="text-slate-600">Tetap</span><span class="font-bold text-slate-600">${m.changesMnt.tetap}</span></div>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-2.5 mt-2.5">
            <div class="bg-white p-3 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
              <div class="text-xs font-bold text-slate-800 mb-1.5">${isId ? 'Perubahan per Pegawai - Hari' : 'Change - Days'}</div>
              <div class="space-y-1 text-[10px]">
                <div class="flex justify-between"><span class="text-slate-600">Membaik</span><span class="font-bold text-emerald-600">${m.changesHari.membaik}</span></div>
                <div class="flex justify-between"><span class="text-slate-600">Memburuk</span><span class="font-bold text-rose-600">${m.changesHari.memburuk}</span></div>
                <div class="flex justify-between"><span class="text-slate-600">Tetap</span><span class="font-bold text-slate-600">${m.changesHari.tetap}</span></div>
              </div>
            </div>
            <div class="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
              <div class="text-xs font-bold text-slate-800 mb-1">Perbaikan Menit Terbesar</div>
              <table class="w-full text-[9.5px]"><thead><tr class="bg-slate-800 text-white"><th class="p-1 text-left rounded-l">No</th><th class="p-1 text-left">Nama</th><th class="p-1 text-right rounded-r">(+/-)</th></tr></thead><tbody class="divide-y divide-slate-100">
                ${m.topPerbaikanMnt.map((e, idx) => `<tr><td class="p-1 text-slate-400">${idx+1}</td><td class="p-1 font-medium truncate max-w-[110px]">${e.name}</td><td class="p-1 text-right font-bold text-emerald-600">+${e.deltaMnt}</td></tr>`).join('')}
              </tbody></table>
            </div>
            <div class="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
              <div class="text-xs font-bold text-slate-800 mb-1">Penurunan Menit Terbesar</div>
              <table class="w-full text-[9.5px]"><thead><tr class="bg-slate-800 text-white"><th class="p-1 text-left rounded-l">No</th><th class="p-1 text-left">Nama</th><th class="p-1 text-right rounded-r">(+/-)</th></tr></thead><tbody class="divide-y divide-slate-100">
                ${m.topPenurunanMnt.map((e, idx) => `<tr><td class="p-1 text-slate-400">${idx+1}</td><td class="p-1 font-medium truncate max-w-[110px]">${e.name}</td><td class="p-1 text-right font-bold text-rose-600">${e.deltaMnt}</td></tr>`).join('')}
              </tbody></table>
            </div>
          </div>

          <div class="bg-white p-3 rounded-lg border border-slate-200 shadow-xs mt-2.5 flex-1">
            <h3 class="text-xs font-bold text-slate-900 mb-1 flex items-center gap-1.5"><span class="w-1.5 h-3 bg-blue-600 rounded-xs"></span>Interpretasi Analisis</h3>
            <div class="space-y-1 text-[10.5px] text-slate-700 leading-relaxed">
              <div class="flex items-start gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1"></span><span>Kolom (+/-) adalah Bulan Lalu - ${m.periode}: nilai positif berarti keterlambatan menurun (membaik), nilai negatif berarti meningkat (memburuk).</span></div>
              <div class="flex items-start gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1"></span><span>Secara total, ${m.periode} ${m.diffMnt > 0 ? "memburuk" : "membaik"} ${Math.abs(m.pctMnt).toFixed(1).replace('.', ',')}% pada menit keterlambatan dan ${m.diffHari > 0 ? "memburuk" : "membaik"} ${Math.abs(m.pctHari).toFixed(1).replace('.', ',')}% pada jumlah hari terlambat.</span></div>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-2.5 mt-2.5">
            <div class="bg-slate-100 border border-slate-200 rounded-lg p-2 flex items-center justify-between"><div><div class="text-xs font-black ${m.changesMnt.memburuk > m.changesMnt.membaik ? 'text-rose-700' : 'text-emerald-700'}">${m.changesMnt.memburuk > m.changesMnt.membaik ? m.changesMnt.memburuk + ' MEMBURUK' : m.changesMnt.membaik + ' MEMBAIK'}</div><div class="text-[9px] font-bold text-slate-500">PERUBAHAN MENIT</div></div><div class="text-[10px] font-semibold text-slate-600">${m.changesMnt.membaik} membaik | ${m.changesMnt.tetap} tetap</div></div>
            <div class="bg-slate-100 border border-slate-200 rounded-lg p-2 flex items-center justify-between"><div><div class="text-xs font-black ${m.changesHari.memburuk > m.changesHari.membaik ? 'text-rose-700' : 'text-emerald-700'}">${m.changesHari.memburuk > m.changesHari.membaik ? m.changesHari.memburuk + ' MEMBURUK' : m.changesHari.membaik + ' MEMBAIK'}</div><div class="text-[9px] font-bold text-slate-500">PERUBAHAN HARI</div></div><div class="text-[10px] font-semibold text-slate-600">${m.changesHari.membaik} membaik | ${m.changesHari.tetap} tetap</div></div>
            <div class="bg-slate-100 border border-slate-200 rounded-lg p-2 flex items-center justify-between"><div><div class="text-xs font-black ${m.diffMnt > 0 ? 'text-rose-700' : 'text-emerald-700'}">${m.diffMnt > 0 ? 'NEGATIF' : 'POSITIF'}</div><div class="text-[9px] font-bold text-slate-500">KESIMPULAN TREN</div></div><div class="text-[10px] font-semibold text-slate-600">${m.diffMnt > 0 ? 'Lebih buruk dari bln lalu' : 'Lebih baik dari bln lalu'}</div></div>
          </div>
        </div>
        ${footer(3)}
      </div>
    `;
  }

  if (page === 4) {
    return `
      <div class="slide-page">
        ${header('RISK MONITORING', 'EMPLOYEE ATTENDANCE RISK', 'Prioritas monitoring berbasis skor, menit, dan frekuensi')}
        <div class="p-5 flex-1 flex flex-col justify-between overflow-hidden bg-slate-50">
          <div class="grid grid-cols-2 gap-3.5 flex-1">
            <div class="bg-white p-3 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
              <div class="text-xs font-bold text-slate-800 mb-1">5 Skor Kehadiran Terendah</div>
              <table class="w-full text-[9.5px]"><thead><tr class="bg-slate-800 text-white"><th class="p-1 text-left rounded-l">No</th><th class="p-1 text-left">Nama</th><th class="p-1 text-center">Skor</th><th class="p-1 text-center">Menit</th><th class="p-1 text-center rounded-r">Hari</th></tr></thead><tbody class="divide-y divide-slate-100">
                ${m.top5SkorRendah.map((e, idx) => `<tr><td class="p-1 text-slate-400">${idx+1}</td><td class="p-1 font-medium truncate max-w-[130px]">${e.name}</td><td class="p-1 text-center font-bold text-rose-600 bg-rose-50/50">${fmtScore(e.skor)}</td><td class="p-1 text-center">${e.mntCurrent}</td><td class="p-1 text-center">${e.hariCurrent}</td></tr>`).join('')}
              </tbody></table>
            </div>
            <div class="bg-white p-3 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
              <div class="text-xs font-bold text-slate-800 mb-1">5 Menit Keterlambatan Tertinggi</div>
              <table class="w-full text-[9.5px]"><thead><tr class="bg-slate-800 text-white"><th class="p-1 text-left rounded-l">No</th><th class="p-1 text-left">Nama</th><th class="p-1 text-center">Menit</th><th class="p-1 text-center">Hari</th><th class="p-1 text-center rounded-r">Skor</th></tr></thead><tbody class="divide-y divide-slate-100">
                ${m.top5MntTertinggi.map((e, idx) => `<tr><td class="p-1 text-slate-400">${idx+1}</td><td class="p-1 font-medium truncate max-w-[130px]">${e.name}</td><td class="p-1 text-center font-bold text-slate-800">${e.mntCurrent}</td><td class="p-1 text-center">${e.hariCurrent}</td><td class="p-1 text-center font-semibold">${fmtScore(e.skor)}</td></tr>`).join('')}
              </tbody></table>
            </div>
            <div class="bg-white p-3 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
              <div class="text-xs font-bold text-slate-800 mb-1">5 Hari Terlambat Terbanyak</div>
              <table class="w-full text-[9.5px]"><thead><tr class="bg-slate-800 text-white"><th class="p-1 text-left rounded-l">No</th><th class="p-1 text-left">Nama</th><th class="p-1 text-center">Hari</th><th class="p-1 text-center">Menit</th><th class="p-1 text-center rounded-r">Skor</th></tr></thead><tbody class="divide-y divide-slate-100">
                ${m.top5HariTerbanyak.map((e, idx) => `<tr><td class="p-1 text-slate-400">${idx+1}</td><td class="p-1 font-medium truncate max-w-[130px]">${e.name}</td><td class="p-1 text-center font-bold text-slate-800">${e.hariCurrent}</td><td class="p-1 text-center">${e.mntCurrent}</td><td class="p-1 text-center font-semibold">${fmtScore(e.skor)}</td></tr>`).join('')}
              </tbody></table>
            </div>
            <div class="bg-white p-3 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
              <div class="text-xs font-bold text-slate-800 mb-1">Perubahan Paling Signifikan</div>
              <table class="w-full text-[9.5px]"><thead><tr class="bg-slate-800 text-white"><th class="p-1 text-left rounded-l">Status</th><th class="p-1 text-left">Nama</th><th class="p-1 text-right rounded-r">Perubahan</th></tr></thead><tbody class="divide-y divide-slate-100">
                ${m.top3Membaik.map(e => `<tr><td class="p-1"><span class="px-1 py-0.5 rounded text-[8.5px] font-bold bg-emerald-100 text-emerald-800">Membaik</span></td><td class="p-1 font-medium truncate max-w-[130px]">${e.name}</td><td class="p-1 text-right font-bold text-emerald-600">+${e.deltaMnt} mnt</td></tr>`).join('')}
                ${m.top3Memburuk.map(e => `<tr><td class="p-1"><span class="px-1 py-0.5 rounded text-[8.5px] font-bold bg-rose-100 text-rose-800">Memburuk</span></td><td class="p-1 font-medium truncate max-w-[130px]">${e.name}</td><td class="p-1 text-right font-bold text-rose-600">${e.deltaMnt} mnt</td></tr>`).join('')}
              </tbody></table>
            </div>
          </div>
          <div class="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs mt-3 shrink-0">
            <h3 class="text-xs font-bold text-slate-900 mb-1.5 flex items-center gap-1.5"><span class="w-1.5 h-3 bg-blue-600 rounded-xs"></span>Risk Interpretation</h3>
            <div class="grid grid-cols-2 gap-3 text-[10px] text-slate-700 leading-relaxed">
              <div class="flex items-start gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1"></span><span>Prioritas monitoring utama adalah pegawai yang muncul bersamaan pada skor rendah dan daftar menit/hari keterlambatan tertinggi.</span></div>
              <div class="flex items-start gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1"></span><span>${m.top5SkorRendah[0]?.name} dan ${m.top5SkorRendah[1]?.name} memiliki skor terendah serta akumulasi keterlambatan yang memerlukan bimbingan.</span></div>
            </div>
          </div>
        </div>
        ${footer(4)}
      </div>
    `;
  }

  if (page === 5) {
    return `
      <div class="slide-page">
        ${header('MANAGEMENT REVIEW', 'MANAGEMENT INSIGHT & RECOMMENDATION', 'Ringkasan keputusan untuk Direksi')}
        <div class="p-5 flex-1 flex flex-col justify-between overflow-hidden bg-slate-50">
          <div class="grid grid-cols-2 gap-4 flex-1">
            <div class="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col">
              <h3 class="text-xs font-bold text-slate-900 mb-2.5 flex items-center gap-1.5"><span class="w-1.5 h-3 bg-blue-600 rounded-xs"></span>Management Insight</h3>
              <div class="space-y-2 text-[10.5px] text-slate-700 leading-relaxed flex-1">
                <div class="flex items-start gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1"></span><span>Disiplin kehadiran secara agregat ${m.diffMnt > 0 ? "memburuk" : "membaik"}: total menit ${mntNaikTurun} ${fmtNum(Math.abs(m.diffMnt))} (${Math.abs(m.pctMnt).toFixed(1).replace('.', ',')}%) dan total hari terlambat ${hariNaikTurun} ${Math.abs(m.diffHari)} (${Math.abs(m.pctHari).toFixed(1).replace('.', ',')}%).</span></div>
                <div class="flex items-start gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1"></span><span>Sebanyak ${m.countUnder60} dari ${m.totalKehadiran} pegawai berada pada band skor <60; ${m.scoreDist.ge90} berada pada skor >=90.</span></div>
                <div class="flex items-start gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1"></span><span>Risiko paling jelas terdapat pada ${riskNames} berdasarkan kombinasi skor rendah dan keterlambatan tinggi.</span></div>
                <div class="flex items-start gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1"></span><span>${topImprover?.name} menunjukkan perbaikan menit terbesar (+${topImprover?.deltaMnt}), disusul ${secondImprover?.name} (+${secondImprover?.deltaMnt}).</span></div>
                <div class="flex items-start gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1"></span><span>Ketidakhadiran yang tercatat: izin ${m.absence.izin}, sakit ${m.absence.sakit}, sakit tanpa surat ${m.absence.sakitTS}, alfa ${m.absence.alfa}, cuti ${m.absence.cuti}, WFH ${m.absence.wfh}.</span></div>
              </div>
            </div>

            <div class="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col">
              <h3 class="text-xs font-bold text-slate-900 mb-2.5 flex items-center gap-1.5"><span class="w-1.5 h-3 bg-emerald-600 rounded-xs"></span>Recommended Management Actions</h3>
              <div class="space-y-2 text-[10.5px] text-slate-700 leading-relaxed flex-1">
                <div class="flex items-start gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0 mt-1"></span><span>Tetapkan monitoring bulanan untuk pegawai dengan skor <60 dan review kembali hasilnya pada periode berikutnya.</span></div>
                <div class="flex items-start gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0 mt-1"></span><span>Lakukan coaching atau klarifikasi penyebab bagi pegawai yang mengalami penurunan besar pada menit maupun frekuensi keterlambatan.</span></div>
                <div class="flex items-start gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0 mt-1"></span><span>Bedakan pendekatan antara masalah durasi keterlambatan dan frekuensi keterlambatan agar tindak lanjut lebih tepat.</span></div>
                <div class="flex items-start gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0 mt-1"></span><span>Pantau keberlanjutan perbaikan pada pegawai dengan nilai (+/-) positif besar agar tren membaik tidak hanya bersifat sementara.</span></div>
                <div class="flex items-start gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0 mt-1"></span><span>Lakukan rekonsiliasi data pegawai sebelum laporan digunakan sebagai dasar keputusan formal demi akurasi menyeluruh.</span></div>
              </div>
            </div>
          </div>

          <div class="bg-[#0f1e36] text-white p-4 rounded-lg shadow-md mt-3.5 shrink-0">
            <div class="text-[9px] font-bold text-sky-400 tracking-wider uppercase mb-1">EXECUTIVE CONCLUSION</div>
            <div class="text-sm font-extrabold tracking-tight mb-1.5">
              ${m.diffMnt > 0 ? `${m.periode} menunjukkan penurunan disiplin kehadiran yang perlu perhatian manajemen.` : `${m.periode} menunjukkan perbaikan kedisiplinan kehadiran dengan penurunan total durasi keterlambatan.`}
            </div>
            <div class="text-[10px] text-slate-300 space-y-0.5 leading-relaxed">
              <p>Prioritas keputusan: monitoring pegawai berisiko, klarifikasi penyebab keterlambatan, dan evaluasi hasil perbaikan pada periode berikutnya.</p>
              <p class="text-slate-400">Sebelum tindakan formal, konsistensi cakupan data pegawai perlu direkonsiliasi agar basis keputusan Direksi sama.</p>
            </div>
          </div>
        </div>
        ${footer(5)}
      </div>
    `;
  }

  if (page === 6) {
    return `
      <div class="slide-page">
        ${header('APPENDIX', 'DETAIL DATA KEHADIRAN PEGAWAI', "Nilai 0 ditampilkan sebagai '-' untuk meningkatkan keterbacaan")}
        <div class="p-5 flex-1 flex flex-col justify-between overflow-hidden bg-slate-50">
          <div class="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden flex-1 flex flex-col">
            <div class="overflow-y-auto flex-1">
              <table class="w-full text-[9px] border-collapse">
                <thead class="sticky top-0 bg-slate-800 text-white font-semibold">
                  <tr>
                    <th class="py-1 px-1 text-center border-r border-slate-700 w-6">No</th>
                    <th class="py-1 px-2 text-left border-r border-slate-700 min-w-[130px]">Nama</th>
                    <th class="py-1 px-1 text-center border-r border-slate-700">Mnt ${monthShort}</th>
                    <th class="py-1 px-1 text-center border-r border-slate-700">Mnt Lalu</th>
                    <th class="py-1 px-1 text-center border-r border-slate-700 bg-slate-700 font-bold">(+/-)</th>
                    <th class="py-1 px-1 text-center border-r border-slate-700">Hari ${monthShort}</th>
                    <th class="py-1 px-1 text-center border-r border-slate-700">Hari Lalu</th>
                    <th class="py-1 px-1 text-center border-r border-slate-700 bg-slate-700 font-bold">(+/-)</th>
                    <th class="py-1 px-1 text-center border-r border-slate-700">Izin</th>
                    <th class="py-1 px-1 text-center border-r border-slate-700">Sakit</th>
                    <th class="py-1 px-1 text-center border-r border-slate-700">Sakit TS</th>
                    <th class="py-1 px-1 text-center border-r border-slate-700">Alfa</th>
                    <th class="py-1 px-1 text-center border-r border-slate-700">Cuti</th>
                    <th class="py-1 px-1 text-center border-r border-slate-700">WFH</th>
                    <th class="py-1 px-1.5 text-center bg-slate-900 font-black">Skor</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-slate-700">
                  ${m.attendance.map((e, idx) => `
                    <tr class="${idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'} hover:bg-blue-50/40">
                      <td class="py-0.5 px-1 text-center text-slate-400 border-r border-slate-100">${e.no || (idx+1)}</td>
                      <td class="py-0.5 px-2 font-medium text-slate-800 border-r border-slate-100 truncate max-w-[130px]">${e.name}</td>
                      <td class="py-0.5 px-1 text-center border-r border-slate-100">${fmtNum(e.mntCurrent)}</td>
                      <td class="py-0.5 px-1 text-center border-r border-slate-100">${fmtNum(e.mntLast)}</td>
                      <td class="py-0.5 px-1 text-center font-bold border-r border-slate-100 ${e.deltaMnt > 0 ? 'text-emerald-600 bg-emerald-50/30' : (e.deltaMnt < 0 ? 'text-rose-600 bg-rose-50/30' : 'text-slate-400')}">
                        ${e.deltaMnt > 0 ? '+' : ''}${e.deltaMnt === 0 ? '-' : e.deltaMnt}
                      </td>
                      <td class="py-0.5 px-1 text-center border-r border-slate-100">${fmtNum(e.hariCurrent)}</td>
                      <td class="py-0.5 px-1 text-center border-r border-slate-100">${fmtNum(e.hariLast)}</td>
                      <td class="py-0.5 px-1 text-center font-bold border-r border-slate-100 ${e.deltaHari > 0 ? 'text-emerald-600 bg-emerald-50/30' : (e.deltaHari < 0 ? 'text-rose-600 bg-rose-50/30' : 'text-slate-400')}">
                        ${e.deltaHari > 0 ? '+' : ''}${e.deltaHari === 0 ? '-' : e.deltaHari}
                      </td>
                      <td class="py-0.5 px-1 text-center border-r border-slate-100">${fmtNum(e.izin)}</td>
                      <td class="py-0.5 px-1 text-center border-r border-slate-100">${fmtNum(e.sakit)}</td>
                      <td class="py-0.5 px-1 text-center border-r border-slate-100">${fmtNum(e.sakitTS)}</td>
                      <td class="py-0.5 px-1 text-center border-r border-slate-100">${fmtNum(e.alfa)}</td>
                      <td class="py-0.5 px-1 text-center border-r border-slate-100">${fmtNum(e.cuti)}</td>
                      <td class="py-0.5 px-1 text-center border-r border-slate-100">${fmtNum(e.wfh)}</td>
                      <td class="py-0.5 px-1.5 text-center font-bold ${e.skor < 60 ? 'text-rose-600 bg-rose-50/50' : (e.skor >= 90 ? 'text-emerald-600' : 'text-slate-800')}">
                        ${fmtScore(e.skor)}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
          <div class="mt-1.5 text-[9px] text-slate-500 font-medium">Keterangan (+/-): Bulan Lalu - ${m.periode}. Positif = membaik; negatif = memburuk.</div>
        </div>
        ${footer(6)}
      </div>
    `;
  }
}

let loadedSlidesCache = {};

async function fetchSlidesForCurrent() {
  const cacheKey = `${currentPeriod}_${currentLang}`;
  if (loadedSlidesCache[cacheKey]) {
    return loadedSlidesCache[cacheKey];
  }
  try {
    const res = await fetch(`/report/${currentPeriod}_${currentLang}`);
    if (res.ok) {
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const slides = Array.from(doc.querySelectorAll('.slide-page'));
      if (slides.length >= 6) {
        loadedSlidesCache[cacheKey] = slides;
        return slides;
      }
    }
  } catch (err) {
    console.warn('Fallback to client renderer:', err);
  }
  return null;
}

async function updateView() {
  const data = await loadData(currentPeriod);
  const metrics = calculate(data);

  document.getElementById('currentPeriodLabel').textContent = metrics.periode;

  // Render pixel-perfect slide identical to gold-standard template
  const serverSlides = await fetchSlidesForCurrent();
  if (serverSlides && serverSlides[currentPage - 1]) {
    document.getElementById('slideContent').innerHTML = serverSlides[currentPage - 1].outerHTML;
  } else {
    document.getElementById('slideContent').innerHTML = renderSlide(metrics, currentPage, currentLang);
  }

  document.getElementById('pageIndicator').textContent = `${currentPage} / 6`;

  // Update tabs
  for (let i = 1; i <= 6; i++) {
    const btn = document.getElementById(`tabBtn${i}`);
    if (i === currentPage) {
      btn.className = "page-tab px-3 py-1.5 rounded-md font-semibold text-white bg-blue-600 shadow-sm transition";
    } else {
      btn.className = "page-tab px-3 py-1.5 rounded-md font-medium text-slate-300 hover:bg-slate-700/50 transition";
    }
  }

  // Update links
  const idLink = document.getElementById('fullReportIdLink');
  const enLink = document.getElementById('fullReportEnLink');
  if (idLink) idLink.href = `/report/${currentPeriod}_id`;
  if (enLink) enLink.href = `/report/${currentPeriod}_en`;

  // Update lang buttons
  document.getElementById('langIdBtn').className = `text-xs px-2.5 py-1.5 rounded font-semibold transition ${currentLang === 'id' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`;
  document.getElementById('langEnBtn').className = `text-xs px-2.5 py-1.5 rounded font-semibold transition ${currentLang === 'en' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`;
}

// ==================== ALL-PAGES PRINT FUNCTION ====================
async function printAllPages() {
  const serverSlides = await fetchSlidesForCurrent();
  const printContainer = document.getElementById('allPagesPrintContainer');

  if (serverSlides && serverSlides.length >= 6) {
    printContainer.innerHTML = serverSlides.map(s => s.outerHTML).join('');
  } else {
    const data = await loadData(currentPeriod);
    const metrics = calculate(data);
    let fullHtml = '';
    for (let p = 1; p <= 6; p++) {
      fullHtml += renderSlide(metrics, p, currentLang);
    }
    printContainer.innerHTML = fullHtml;
  }

  // Trigger print
  window.print();
}

async function printCurrentPageOnly() {
  const serverSlides = await fetchSlidesForCurrent();
  const printContainer = document.getElementById('allPagesPrintContainer');
  if (serverSlides && serverSlides[currentPage - 1]) {
    printContainer.innerHTML = serverSlides[currentPage - 1].outerHTML;
  } else {
    const data = await loadData(currentPeriod);
    const metrics = calculate(data);
    printContainer.innerHTML = renderSlide(metrics, currentPage, currentLang);
  }
  window.print();
}

function goToPage(pg) {
  currentPage = pg;
  updateView();
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    updateView();
  }
}

function nextPage() {
  if (currentPage < 6) {
    currentPage++;
    updateView();
  }
}

function setLanguage(lang) {
  currentLang = lang;
  loadedSlidesCache = {};
  updateView();
}

function switchPeriod(p) {
  currentPeriod = p;
  loadedSlidesCache = {};
  updateView();
}

// Modal controls
function openUploadModal() {
  renderPrevPeriodDropdown();
  document.getElementById('uploadModal').classList.remove('hidden');
}

function closeUploadModal() {
  document.getElementById('uploadModal').classList.add('hidden');
}

async function handleFileSelected(file) {
  if (!file) return;
  const statusText = document.getElementById('uploadStatusText');
  statusText.textContent = `Sedang memproses & mengekstrak data dari: ${file.name}...`;

  try {
    let response;
    if (file.name.endsWith('.json')) {
      const text = await file.text();
      response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-file-name': encodeURIComponent(file.name)
        },
        body: text
      });
    } else {
      const buffer = await file.arrayBuffer();
      response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/octet-stream',
          'x-file-name': encodeURIComponent(file.name)
        },
        body: buffer
      });
    }

    const res = await response.json();
    if (res.success && res.attendance && res.attendance.length) {
      uploadedPayload = res;
      statusText.innerHTML = `✓ <b>${file.name}</b> berhasil diekstrak AI!`;
      document.getElementById('parsedSummaryBox').classList.remove('hidden');

      // Auto-generate employee count from inside application
      const autoCount = res.autoGeneratedTotalEmployees || res.attendance.length;
      document.getElementById('detectedRowCount').textContent = `${autoCount} Pegawai (Auto-Generated)`;
      document.getElementById('headerTotalInput').value = autoCount;

      if (res.period && res.period !== 'Periode Baru') {
        document.getElementById('newPeriodNameInput').value = res.period;
      }

      const totMnt = res.attendance.reduce((s, e) => s + (e.mntCurrent || 0), 0);
      const totHari = res.attendance.reduce((s, e) => s + (e.hariCurrent || 0), 0);
      document.getElementById('previewTotalMnt').textContent = `${totMnt.toLocaleString('id-ID')} menit`;
      document.getElementById('previewTotalHari').textContent = `${totHari} hari`;

      const aiDetails = document.getElementById('aiParserDetails');
      if (aiDetails) {
        aiDetails.textContent = `AI mengekstrak ${res.attendance.length} pegawai (${file.name.split('.').pop().toUpperCase()}), jumlah pegawai digenerate otomatis: ${autoCount} orang.`;
      }

      document.getElementById('lockPeriodSubmitBtn').disabled = false;
    } else {
      statusText.textContent = `Gagal memproses berkas: ${res.error || 'Format berkas tidak sesuai'}`;
    }
  } catch (err) {
    statusText.textContent = `Error: ${err.message}`;
  }
}

async function submitLockPeriod() {
  if (!uploadedPayload || !uploadedPayload.attendance) {
    alert('Silakan upload berkas data terlebih dahulu.');
    return;
  }

  const periodName = document.getElementById('newPeriodNameInput').value.trim();
  if (!periodName) {
    alert('Nama periode wajib diisi (Contoh: Juli 2026).');
    return;
  }

  const prevPeriodId = document.getElementById('prevPeriodSelect').value;
  const headerTotal = Number(document.getElementById('headerTotalInput').value) || uploadedPayload.attendance.length;

  const btn = document.getElementById('lockPeriodSubmitBtn');
  btn.disabled = true;
  btn.innerHTML = `<span>⏳ Mengunci Periode...</span>`;

  try {
    const res = await fetch('/api/lock-period', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        periode: periodName,
        previousPeriodId: prevPeriodId || null,
        totalPegawaiHeader: headerTotal,
        attendance: uploadedPayload.attendance,
        demographics: uploadedPayload.demographics
      })
    });

    const result = await res.json();
    if (result.success) {
      alert(`Periode "${periodName}" berhasil dikunci dan disimpan!`);
      closeUploadModal();
      currentPeriod = result.period;
      cachedData[currentPeriod] = result.data;
      loadedSlidesCache = {};
      await loadLockedPeriods();
      updateView();
    } else {
      alert(`Gagal: ${result.error}`);
    }
  } catch (err) {
    alert(`Error: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span>🔒</span><span>Kunci Periode & Simpan Laporan</span>`;
  }
}

// Drag & drop listeners
const dropZone = document.getElementById('dropZone');
if (dropZone) {
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-blue-500', 'bg-slate-800');
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-blue-500', 'bg-slate-800');
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-blue-500', 'bg-slate-800');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });
}

// ==========================================
// SPREADSHEET DATABASE & GOOGLE SHEETS CLOUD
// ==========================================

let gsheetPresets = [];
let selectedGsheetId = '';

async function openSpreadsheetModal(defaultTab = 'local') {
  const modal = document.getElementById('spreadsheetModal');
  if (!modal) return;
  modal.classList.remove('hidden');

  const pushPeriodLabel = document.getElementById('pushActivePeriodName');
  if (pushPeriodLabel) {
    const activePeriodObj = lockedPeriodsList.find(p => p.id === currentPeriod);
    pushPeriodLabel.innerText = activePeriodObj ? activePeriodObj.periode : currentPeriod;
  }

  // Load local stats
  await loadSpreadsheetStats();

  // Load Google sheets presets & status
  await loadGsheetPresets();

  if (defaultTab === 'gsheets' || defaultTab === 'cloud') {
    switchDbModalTab('cloud');
  } else {
    switchDbModalTab('local');
  }
}

function closeSpreadsheetModal() {
  const modal = document.getElementById('spreadsheetModal');
  if (modal) modal.classList.add('hidden');
}

function switchDbModalTab(tab) {
  const localBtn = document.getElementById('modalTabLocalBtn');
  const cloudBtn = document.getElementById('modalTabCloudBtn');
  const localContent = document.getElementById('tabContentLocal');
  const cloudContent = document.getElementById('tabContentCloud');

  if (tab === 'local') {
    localBtn.className = "px-4 py-2.5 text-xs font-bold border-b-2 border-indigo-500 text-indigo-400 transition flex items-center gap-1.5";
    cloudBtn.className = "px-4 py-2.5 text-xs font-bold border-b-2 border-transparent text-slate-400 hover:text-slate-200 transition flex items-center gap-1.5";
    localContent.classList.remove('hidden');
    cloudContent.classList.add('hidden');
  } else {
    cloudBtn.className = "px-4 py-2.5 text-xs font-bold border-b-2 border-indigo-500 text-indigo-400 transition flex items-center gap-1.5";
    localBtn.className = "px-4 py-2.5 text-xs font-bold border-b-2 border-transparent text-slate-400 hover:text-slate-200 transition flex items-center gap-1.5";
    cloudContent.classList.remove('hidden');
    localContent.classList.add('hidden');
  }
}

async function loadSpreadsheetStats() {
  try {
    const res = await fetch('/api/db/stats');
    const data = await res.json();
    if (data.success) {
      document.getElementById('dbStatPeriods').innerText = `${data.totalPeriods} Periode`;
      document.getElementById('dbStatRows').innerText = `${data.totalAttendanceRows} Baris`;
      document.getElementById('dbStatSize').innerText = data.sizeFormatted;
    }
  } catch (err) {
    console.error('Failed to load DB stats', err);
  }
}

async function syncSpreadsheetDatabase() {
  try {
    const res = await fetch('/api/db/sync', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      await loadSpreadsheetStats();
      await loadLockedPeriods();
      alert(`✅ ${data.message}\nTotal: ${data.totalPeriods} Periode, ${data.totalAttendance} baris kehadiran.`);
    } else {
      alert(`❌ Gagal sinkronisasi: ${data.error}`);
    }
  } catch (err) {
    alert(`❌ Terjadi kesalahan: ${err.message}`);
  }
}

async function handleDbFileSelected(file) {
  if (!file) return;
  if (!file.name.endsWith('.xlsx')) {
    alert('Harap pilih file spreadsheet berformat .xlsx');
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/api/db/upload', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (data.success) {
      alert(`✅ ${data.message}`);
      await loadSpreadsheetStats();
      await loadLockedPeriods();
      await switchPeriod(lockedPeriodsList[0]?.id || currentPeriod);
    } else {
      alert(`❌ Gagal memuat database: ${data.error}`);
    }
  } catch (err) {
    alert(`❌ Error upload database: ${err.message}`);
  }
}

async function loadGsheetPresets() {
  const select = document.getElementById('gsheetSelect');
  if (!select) return;

  try {
    const res = await fetch('/api/gsheets/presets');
    const data = await res.json();
    gsheetPresets = data.presets || [];

    select.innerHTML = gsheetPresets.map(p => `
      <option value="${p.id}">📄 ${p.name} - ${p.description}</option>
    `).join('') + `
      <option value="__custom__">🔗 Masukkan ID / URL Spreadsheet Lainnya...</option>
    `;

    if (gsheetPresets.length > 0) {
      selectedGsheetId = gsheetPresets[0].id;
      await loadGsheetTabs(selectedGsheetId);
    }
  } catch (err) {
    console.error('Failed to load gsheet presets', err);
  }
}

async function handleGsheetSelected(val) {
  const customBox = document.getElementById('customGsheetBox');
  if (val === '__custom__') {
    customBox.classList.remove('hidden');
  } else {
    customBox.classList.add('hidden');
    selectedGsheetId = val;
    await loadGsheetTabs(val);
  }
}

async function loadCustomGsheetTabs() {
  const input = document.getElementById('customGsheetInput').value.trim();
  if (!input) {
    alert('Masukkan Google Spreadsheet ID atau URL yang valid.');
    return;
  }
  selectedGsheetId = input;
  await loadGsheetTabs(input);
}

async function loadGsheetTabs(sId) {
  const tabSelect = document.getElementById('gsheetTabSelect');
  const countLabel = document.getElementById('tabCountLabel');
  countLabel.innerText = "Memuat tab...";

  try {
    const res = await fetch(`/api/gsheets/tabs?spreadsheetId=${encodeURIComponent(sId)}`);
    const data = await res.json();
    if (data.success && data.tabs) {
      countLabel.innerText = `${data.tabs.length} Lembar Ditemukan`;
      tabSelect.innerHTML = data.tabs.map(t => `
        <option value="${t.title}">📑 ${t.title} (${t.rowCount} baris)</option>
      `).join('');
    } else {
      countLabel.innerText = "Gagal memuat";
      tabSelect.innerHTML = `<option value="">-- Gagal memuat lembar kerja --</option>`;
    }
  } catch (err) {
    countLabel.innerText = "Error";
    console.error('Failed to load tabs', err);
  }
}

async function pullDataFromSelectedGsheet() {
  const tabSelect = document.getElementById('gsheetTabSelect');
  const tabName = tabSelect.value;
  if (!tabName) {
    alert('Pilih lembar kerja (tab) terlebih dahulu.');
    return;
  }

  const btn = document.getElementById('pullGsheetBtn');
  const origText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span>⏳ Menarik data dari Cloud...</span>`;

  try {
    const res = await fetch('/api/gsheets/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spreadsheetId: selectedGsheetId,
        tabName: tabName
      })
    });

    const data = await res.json();
    if (!data.success) {
      alert(`❌ Gagal menarik data: ${data.error}`);
      return;
    }

    // Set uploaded payload
    uploadedPayload = {
      periode: data.periode || tabName,
      totalPegawaiHeader: data.totalPegawaiHeader || data.detectedRows,
      demographics: data.demographics,
      attendance: data.attendance
    };

    // Close spreadsheet modal and open upload review modal
    closeSpreadsheetModal();
    openUploadModal();

    // Populate upload modal inputs
    document.getElementById('newPeriodNameInput').value = uploadedPayload.periode;
    document.getElementById('headerTotalInput').value = uploadedPayload.totalPegawaiHeader;
    document.getElementById('uploadStatusText').innerHTML = `
      <span class="text-emerald-400 font-bold">☁️ Berhasil menarik data dari Google Spreadsheet:</span> <b>${tabName}</b>
    `;

    document.getElementById('parsedSummaryBox').classList.remove('hidden');
    document.getElementById('detectedRowCount').innerText = `${uploadedPayload.attendance.length} Pegawai Terdeteksi`;
    document.getElementById('aiParserDetails').innerText = `Data diambil langsung dari Google Sheet (${tabName}). Silakan periksa periode pembanding lalu klik 'Kunci Periode'.`;

    const totalMnt = uploadedPayload.attendance.reduce((s, e) => s + (e.mntCurrent || 0), 0);
    const totalHari = uploadedPayload.attendance.reduce((s, e) => s + (e.hariCurrent || 0), 0);
    document.getElementById('previewTotalMnt').innerText = `${totalMnt.toLocaleString('id-ID')} menit`;
    document.getElementById('previewTotalHari').innerText = `${totalHari} hari`;

    document.getElementById('lockPeriodSubmitBtn').disabled = false;
  } catch (err) {
    alert(`❌ Terjadi error: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.innerHTML = origText;
  }
}

async function pushActivePeriodToGsheet() {
  const btn = document.getElementById('pushGsheetBtn');
  const origText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span>⏳ Menyimpan ke Google Sheet...</span>`;

  const resultBox = document.getElementById('gsheetActionResult');

  try {
    const res = await fetch('/api/gsheets/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spreadsheetId: selectedGsheetId,
        periodId: currentPeriod
      })
    });

    const data = await res.json();
    if (data.success) {
      resultBox.className = "bg-emerald-950/80 border border-emerald-500/50 p-3 rounded-lg text-emerald-200 text-xs block space-y-1";
      resultBox.innerHTML = `
        <div class="font-bold flex items-center gap-1.5">
          <span>✓</span> Berhasil diekspor ke Google Sheet!
        </div>
        <div>Tab baru dibuat: <b>${data.tabTitle}</b> (${data.updatedRows} baris data).</div>
        <div class="mt-1">
          <a href="${data.spreadsheetUrl}" target="_blank" class="text-emerald-300 font-bold underline flex items-center gap-1">
            <span>🔗 Buka Spreadsheet di Google Drive</span>
          </a>
        </div>
      `;
      // Reload tab list
      await loadGsheetTabs(selectedGsheetId);
    } else {
      resultBox.className = "bg-rose-950/80 border border-rose-500/50 p-3 rounded-lg text-rose-200 text-xs block";
      resultBox.innerHTML = `❌ Gagal menyimpan ke Google Sheet: ${data.error}`;
    }
  } catch (err) {
    resultBox.className = "bg-rose-950/80 border border-rose-500/50 p-3 rounded-lg text-rose-200 text-xs block";
    resultBox.innerHTML = `❌ Error: ${err.message}`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = origText;
  }
}

// Initial load
loadLockedPeriods().then(() => {
  updateView();
});

const { translations } = require('./i18n');
const { generateNarratives } = require('./narrative_ai');

function formatNumber(num, isIndonesian = true) {
  if (num === null || num === undefined || num === 0) return "-";
  return isIndonesian ? num.toLocaleString('id-ID') : num.toLocaleString('en-US');
}

function formatScore(score, isIndonesian = true) {
  if (score === null || score === undefined) return "-";
  const str = Number(score).toFixed(2);
  return isIndonesian ? str.replace('.', ',') : str;
}

function renderReportHTML(metrics, lang = 'id') {
  const t = translations[lang] || translations.id;
  const isId = lang === 'id';
  const narratives = generateNarratives(metrics, lang);

  const {
    periode,
    bulanLaluName,
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
    isOverallWorse,
    dataIntegrity,
    demographics
  } = metrics;

  const currentMonthShort = periode.split(' ')[0];

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.mainTitle} - ${periode}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    @page {
      size: 297mm 210mm;
      margin: 0;
    }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #0b1320;
      color: #1e293b;
      margin: 0;
      padding: 0;
    }
    .slide-page {
      width: 1280px;
      height: 720px;
      margin: 20px auto;
      background: #f8fafc;
      box-shadow: 0 10px 30px rgba(0,0,0,0.35);
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      page-break-after: always;
      box-sizing: border-box;
    }
    @media print {
      html, body {
        background: transparent !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 297mm !important;
        height: 210mm !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .slide-page {
        margin: 0 !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        width: 297mm !important;
        height: 210mm !important;
        max-width: 297mm !important;
        max-height: 210mm !important;
        page-break-after: always !important;
        break-after: page !important;
        page-break-inside: avoid !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
      }
      .no-print {
        display: none !important;
      }
    }
    .custom-bar-track {
      background: #e2e8f0;
      height: 14px;
      border-radius: 9999px;
      overflow: hidden;
      display: flex;
    }
    .custom-bar-fill {
      height: 100%;
      border-radius: 9999px;
      transition: width 0.3s ease;
    }
  </style>
</head>
<body class="py-6 print:py-0">

  <!-- ==================== PAGE 1: EXECUTIVE MANAGEMENT REPORT ==================== -->
  <div class="slide-page">
    <!-- Header -->
    <div class="bg-[#0f1e36] text-white px-8 py-3.5 flex justify-between items-center shrink-0">
      <div>
        <div class="text-[11px] font-bold tracking-wider text-slate-300 uppercase">${t.badgeHeader}</div>
        <h1 class="text-xl font-extrabold tracking-tight">${t.mainTitle}</h1>
      </div>
      <div class="text-xs font-semibold text-slate-300">
        Periode ${periode}
      </div>
    </div>

    <!-- Main Content Container -->
    <div class="p-6 flex-1 flex flex-col justify-between overflow-hidden">
      <!-- 6 Top KPI Cards -->
      <div class="grid grid-cols-6 gap-3">
        <div class="bg-white p-3 rounded-lg border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div class="text-[10px] font-bold text-slate-500 tracking-wider">${t.totalEmployees}</div>
          <div class="text-2xl font-black text-slate-800 my-1">${totalPegawaiHeader}</div>
          <div class="text-[10px] text-slate-400 font-medium">${t.reportHeader}</div>
        </div>
        <div class="bg-white p-3 rounded-lg border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div class="text-[10px] font-bold text-slate-500 tracking-wider">${t.attendanceData}</div>
          <div class="text-2xl font-black text-slate-800 my-1">${totalKehadiran}</div>
          <div class="text-[10px] text-slate-400 font-medium">${t.detailTable}</div>
        </div>
        <div class="bg-white p-3 rounded-lg border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div class="text-[10px] font-bold text-slate-500 tracking-wider">${t.lateMinutes}</div>
          <div class="text-2xl font-black text-slate-800 my-1">${totalMntCurrent.toLocaleString(isId ? 'id-ID' : 'en-US')}</div>
          <div class="text-[10px] font-bold ${diffMnt <= 0 ? 'text-emerald-600' : 'text-rose-600'}">
            ${diffMnt > 0 ? '+' : ''}${diffMnt.toLocaleString(isId ? 'id-ID' : 'en-US')} ${t.vsLastMonth}
          </div>
        </div>
        <div class="bg-white p-3 rounded-lg border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div class="text-[10px] font-bold text-slate-500 tracking-wider">${t.lateDays}</div>
          <div class="text-2xl font-black text-slate-800 my-1">${totalHariCurrent}</div>
          <div class="text-[10px] font-bold ${diffHari <= 0 ? 'text-emerald-600' : 'text-rose-600'}">
            ${diffHari > 0 ? '+' : ''}${diffHari} ${t.vsLastMonth}
          </div>
        </div>
        <div class="bg-white p-3 rounded-lg border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div class="text-[10px] font-bold text-slate-500 tracking-wider">${t.avgScore}</div>
          <div class="text-2xl font-black text-slate-800 my-1">${formatScore(avgSkor, isId)}</div>
          <div class="text-[10px] text-slate-400 font-medium">${t.basisEmployees.replace('{n}', totalKehadiran)}</div>
        </div>
        <div class="bg-white p-3 rounded-lg border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div class="text-[10px] font-bold text-slate-500 tracking-wider">${t.scoreUnder60}</div>
          <div class="text-2xl font-black ${countUnder60 > 0 ? 'text-rose-600' : 'text-emerald-600'} my-1">${countUnder60}</div>
          <div class="text-[10px] text-slate-400 font-medium">${t.dashboardAnalysisBand}</div>
        </div>
      </div>

      <!-- Second Row: Charts & Matrix -->
      <div class="grid grid-cols-4 gap-3 mt-3">
        <!-- Minutes Comparison -->
        <div class="bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-xs">
          <div class="text-xs font-bold text-slate-800 mb-2">${t.totalLateMinutesTitle}</div>
          <div class="space-y-2 text-[11px]">
            <div>
              <div class="flex justify-between text-slate-500 mb-0.5">
                <span>${t.lastMonth}</span>
                <span class="font-semibold text-slate-700">${totalMntLast.toLocaleString(isId ? 'id-ID' : 'en-US')} mnt</span>
              </div>
              <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-slate-400" style="width: 85%"></div>
              </div>
            </div>
            <div>
              <div class="flex justify-between text-slate-700 font-semibold mb-0.5">
                <span>${currentMonthShort}</span>
                <span class="font-bold text-blue-700">${totalMntCurrent.toLocaleString(isId ? 'id-ID' : 'en-US')} mnt</span>
              </div>
              <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-blue-600" style="width: ${Math.min(100, Math.round((totalMntCurrent / (Math.max(totalMntLast, totalMntCurrent) || 1)) * 100))}%"></div>
              </div>
            </div>
          </div>
          <div class="mt-2 text-[11px] font-bold ${diffMnt <= 0 ? 'text-emerald-600' : 'text-rose-600'}">
            ${diffMnt <= 0 ? t.improved : t.worsened}: ${diffMnt > 0 ? '+' : ''}${diffMnt.toLocaleString(isId ? 'id-ID' : 'en-US')} mnt
          </div>
        </div>

        <!-- Days Comparison -->
        <div class="bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-xs">
          <div class="text-xs font-bold text-slate-800 mb-2">${t.totalLateDaysTitle}</div>
          <div class="space-y-2 text-[11px]">
            <div>
              <div class="flex justify-between text-slate-500 mb-0.5">
                <span>${t.lastMonth}</span>
                <span class="font-semibold text-slate-700">${totalHariLast} hari</span>
              </div>
              <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-slate-400" style="width: 85%"></div>
              </div>
            </div>
            <div>
              <div class="flex justify-between text-slate-700 font-semibold mb-0.5">
                <span>${currentMonthShort}</span>
                <span class="font-bold text-blue-700">${totalHariCurrent} hari</span>
              </div>
              <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-blue-600" style="width: ${Math.min(100, Math.round((totalHariCurrent / (Math.max(totalHariLast, totalHariCurrent) || 1)) * 100))}%"></div>
              </div>
            </div>
          </div>
          <div class="mt-2 text-[11px] font-bold ${diffHari <= 0 ? 'text-emerald-600' : 'text-rose-600'}">
            ${diffHari <= 0 ? t.improved : t.worsened}: ${diffHari > 0 ? '+' : ''}${diffHari} hari
          </div>
        </div>

        <!-- Score Distribution -->
        <div class="bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div class="text-xs font-bold text-slate-800 mb-1">${t.scoreDistTitle}</div>
          <div class="flex h-5 rounded overflow-hidden text-[10px] font-bold text-white text-center">
            <div style="width: ${(scoreDist.ge90/totalKehadiran)*100}%; background-color: #10b981;" title=">=90">${scoreDist.ge90}</div>
            <div style="width: ${(scoreDist.b75_90/totalKehadiran)*100}%; background-color: #06b6d4;" title="75-89.99">${scoreDist.b75_90}</div>
            <div style="width: ${(scoreDist.b60_75/totalKehadiran)*100}%; background-color: #f59e0b;" title="60-74.99">${scoreDist.b60_75}</div>
            <div style="width: ${(scoreDist.lt60/totalKehadiran)*100}%; background-color: #ef4444;" title="<60">${scoreDist.lt60}</div>
          </div>
          <div class="grid grid-cols-2 gap-1 text-[10px] text-slate-600 mt-2">
            <div class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> >=90: ${scoreDist.ge90}</div>
            <div class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-cyan-500 inline-block"></span> 75-89,99: ${scoreDist.b75_90}</div>
            <div class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-amber-500 inline-block"></span> 60-74,99: ${scoreDist.b60_75}</div>
            <div class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-rose-500 inline-block"></span> &lt;60: ${scoreDist.lt60}</div>
          </div>
        </div>

        <!-- Absence & WFH Matrix -->
        <div class="bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div class="text-xs font-bold text-slate-800 mb-1">${t.absenceWfhTitle}</div>
          <div class="grid grid-cols-3 gap-1.5 text-center">
            <div class="bg-amber-50/70 border border-amber-200/60 rounded p-1">
              <div class="text-sm font-black text-amber-700">${absence.izin}</div>
              <div class="text-[9px] text-amber-600 font-semibold">${t.izin}</div>
            </div>
            <div class="bg-rose-50/70 border border-rose-200/60 rounded p-1">
              <div class="text-sm font-black text-rose-700">${absence.sakit}</div>
              <div class="text-[9px] text-rose-600 font-semibold">${t.sakit}</div>
            </div>
            <div class="bg-purple-50/70 border border-purple-200/60 rounded p-1">
              <div class="text-sm font-black text-purple-700">${absence.sakitTS}</div>
              <div class="text-[9px] text-purple-600 font-semibold leading-tight">${t.sakitTS}</div>
            </div>
            <div class="bg-slate-50 border border-slate-200/60 rounded p-1">
              <div class="text-sm font-black text-slate-700">${absence.alfa}</div>
              <div class="text-[9px] text-slate-500 font-semibold">${t.alfa}</div>
            </div>
            <div class="bg-blue-50/70 border border-blue-200/60 rounded p-1">
              <div class="text-sm font-black text-blue-700">${absence.cuti}</div>
              <div class="text-[9px] text-blue-600 font-semibold">${t.cuti}</div>
            </div>
            <div class="bg-emerald-50/70 border border-emerald-200/60 rounded p-1">
              <div class="text-sm font-black text-emerald-700">${absence.wfh}</div>
              <div class="text-[9px] text-emerald-600 font-semibold">${t.wfh}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Third Row: Executive Summary (AI Narratives) -->
      <div class="bg-white p-4 rounded-lg border border-slate-200/80 shadow-xs mt-3 flex-1">
        <h3 class="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
          <span class="w-1.5 h-3.5 bg-blue-600 rounded-xs"></span>
          ${t.execSummaryTitle}
        </h3>
        <div class="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[11px] text-slate-700 leading-relaxed">
          ${narratives.execSummary.map(point => `
            <div class="flex items-start gap-2">
              <span class="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1.5"></span>
              <span>${point}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Fourth Row: Bottom 3 Highlight Badges -->
      <div class="grid grid-cols-3 gap-3 mt-3">
        <div class="${diffMnt > 0 ? 'bg-rose-50/80 border-rose-200' : 'bg-emerald-50/80 border-emerald-200'} border rounded-lg p-2.5 flex items-center justify-between">
          <div>
            <div class="text-xs font-black ${diffMnt > 0 ? 'text-rose-700' : 'text-emerald-700'} uppercase">
              ${diffMnt > 0 ? t.worsened : t.improved}
            </div>
            <div class="text-[10px] font-bold text-slate-500">${t.overallTrend}</div>
          </div>
          <div class="text-[11px] font-semibold text-slate-700">
            Menit ${diffMnt > 0 ? '+' : ''}${pctMnt.toFixed(1).replace('.', ',')}% | Hari ${diffHari > 0 ? '+' : ''}${pctHari.toFixed(1).replace('.', ',')}%
          </div>
        </div>

        <div class="bg-amber-50/80 border border-amber-200 rounded-lg p-2.5 flex items-center justify-between">
          <div>
            <div class="text-xs font-black text-amber-700 uppercase">${countUnder60} ${isId ? 'PEGAWAI' : 'EMPLOYEES'}</div>
            <div class="text-[10px] font-bold text-slate-500">${t.riskGroup}</div>
          </div>
          <div class="text-[11px] font-semibold text-slate-700">
            Skor &lt; 60 dari ${totalKehadiran} pegawai
          </div>
        </div>

        <div class="bg-slate-100 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between">
          <div>
            <div class="text-xs font-black text-slate-800">${dataIntegrity.header} / ${dataIntegrity.demographicsCount} / ${totalKehadiran}</div>
            <div class="text-[10px] font-bold text-slate-500">${t.dataIntegrity}</div>
          </div>
          <div class="text-[11px] font-semibold text-slate-600">
            ${dataIntegrity.isConsistent ? t.consistentData : t.inconsistentData}
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="px-8 py-2 border-t border-slate-200 text-[10px] text-slate-400 flex justify-between items-center bg-white shrink-0">
      <span>${t.pageFooter}</span>
      <span>Periode ${periode} | ${t.page} 1</span>
    </div>
  </div>


  <!-- ==================== PAGE 2: WORKFORCE PROFILE ==================== -->
  <div class="slide-page">
    <div class="bg-[#0f1e36] text-white px-8 py-3.5 flex justify-between items-center shrink-0">
      <div>
        <div class="text-[11px] font-bold tracking-wider text-slate-300 uppercase">${t.workforceProfileBadge}</div>
        <h1 class="text-xl font-extrabold tracking-tight">${t.workforceProfileTitle}</h1>
      </div>
      <div class="text-xs font-semibold text-slate-300">${t.workforceSubtitle}</div>
    </div>

    <div class="p-6 flex-1 flex flex-col justify-between overflow-hidden">
      <!-- 2x2 Demographic Grid -->
      <div class="grid grid-cols-2 gap-4 flex-1">
        <!-- Status Pegawai -->
        <div class="bg-white p-4 rounded-lg border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div class="text-xs font-bold text-slate-800 mb-2">${t.empStatus}</div>
          <div class="space-y-2 text-[11px]">
            ${(demographics?.status || []).map(item => `
              <div>
                <div class="flex justify-between text-slate-600 mb-0.5">
                  <span class="font-medium">${item.label}</span>
                  <span class="font-semibold text-slate-800">${item.count} | ${item.pct.toFixed(2).replace('.', ',')}%</span>
                </div>
                <div class="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div class="h-full bg-blue-600 rounded-full" style="width: ${item.pct}%"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Jenis Kelamin -->
        <div class="bg-white p-4 rounded-lg border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div class="text-xs font-bold text-slate-800 mb-2">${t.gender}</div>
          <div class="space-y-3 text-[11px]">
            ${(demographics?.gender || []).map(item => `
              <div>
                <div class="flex justify-between text-slate-600 mb-0.5">
                  <span class="font-medium">${item.label}</span>
                  <span class="font-semibold text-slate-800">${item.count} | ${item.pct.toFixed(2).replace('.', ',')}%</span>
                </div>
                <div class="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div class="h-full bg-blue-600 rounded-full" style="width: ${item.pct}%"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Pendidikan -->
        <div class="bg-white p-4 rounded-lg border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div class="text-xs font-bold text-slate-800 mb-2">${t.education}</div>
          <div class="space-y-2 text-[11px]">
            ${(demographics?.education || []).map(item => `
              <div>
                <div class="flex justify-between text-slate-600 mb-0.5">
                  <span class="font-medium">${item.label}</span>
                  <span class="font-semibold text-slate-800">${item.count} | ${item.pct.toFixed(2).replace('.', ',')}%</span>
                </div>
                <div class="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div class="h-full bg-blue-600 rounded-full" style="width: ${item.pct}%"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Jabatan -->
        <div class="bg-white p-4 rounded-lg border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div class="text-xs font-bold text-slate-800 mb-2">${t.jobPosition}</div>
          <div class="space-y-2 text-[11px]">
            ${(demographics?.position || []).map(item => `
              <div>
                <div class="flex justify-between text-slate-600 mb-0.5">
                  <span class="font-medium">${item.label}</span>
                  <span class="font-semibold text-slate-800">${item.count} | ${item.pct.toFixed(2).replace('.', ',')}%</span>
                </div>
                <div class="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div class="h-full bg-blue-600 rounded-full" style="width: ${item.pct}%"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Catatan Validasi Data Profil -->
      <div class="bg-white p-4 rounded-lg border border-slate-200/80 shadow-xs mt-4 shrink-0">
        <h3 class="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
          <span class="w-1.5 h-3.5 bg-blue-600 rounded-xs"></span>
          ${t.profileValidationNotes}
        </h3>
        <div class="grid grid-cols-2 gap-4 text-[11px] text-slate-700 leading-relaxed">
          ${narratives.profileValidation.map(point => `
            <div class="flex items-start gap-2">
              <span class="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1.5"></span>
              <span>${point}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <div class="px-8 py-2 border-t border-slate-200 text-[10px] text-slate-400 flex justify-between items-center bg-white shrink-0">
      <span>${t.pageFooter}</span>
      <span>Periode ${periode} | ${t.page} 2</span>
    </div>
  </div>


  <!-- ==================== PAGE 3: ATTENDANCE ANALYTICS ==================== -->
  <div class="slide-page">
    <div class="bg-[#0f1e36] text-white px-8 py-3.5 flex justify-between items-center shrink-0">
      <div>
        <div class="text-[11px] font-bold tracking-wider text-slate-300 uppercase">${t.analyticsBadge}</div>
        <h1 class="text-xl font-extrabold tracking-tight">${t.analyticsTitle}</h1>
      </div>
      <div class="text-xs font-semibold text-slate-300">${t.analyticsSubtitle.replace('{current}', periode)}</div>
    </div>

    <div class="p-6 flex-1 flex flex-col justify-between overflow-hidden">
      <!-- 3 Columns Top -->
      <div class="grid grid-cols-3 gap-3">
        <!-- Min Comparison -->
        <div class="bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-xs">
          <div class="text-xs font-bold text-slate-800 mb-2">${t.minComparisonTitle}</div>
          <div class="space-y-2 text-[11px]">
            <div>
              <div class="flex justify-between text-slate-500 mb-0.5">
                <span>${t.lastMonth}</span>
                <span class="font-semibold text-slate-700">${totalMntLast.toLocaleString(isId ? 'id-ID' : 'en-US')} menit</span>
              </div>
              <div class="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-slate-400 rounded-full" style="width: 80%"></div>
              </div>
            </div>
            <div>
              <div class="flex justify-between text-slate-700 font-semibold mb-0.5">
                <span>${currentMonthShort}</span>
                <span class="font-bold text-blue-700">${totalMntCurrent.toLocaleString(isId ? 'id-ID' : 'en-US')} menit</span>
              </div>
              <div class="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-blue-600 rounded-full" style="width: ${Math.min(100, Math.round((totalMntCurrent / (Math.max(totalMntLast, totalMntCurrent) || 1)) * 100))}%"></div>
              </div>
            </div>
          </div>
          <div class="mt-2 text-[11px] font-bold ${diffMnt <= 0 ? 'text-emerald-600' : 'text-rose-600'}">
            ${diffMnt <= 0 ? t.improved : t.worsened}: ${diffMnt > 0 ? '+' : ''}${diffMnt.toLocaleString(isId ? 'id-ID' : 'en-US')} menit
          </div>
        </div>

        <!-- Day Comparison -->
        <div class="bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-xs">
          <div class="text-xs font-bold text-slate-800 mb-2">${t.dayComparisonTitle}</div>
          <div class="space-y-2 text-[11px]">
            <div>
              <div class="flex justify-between text-slate-500 mb-0.5">
                <span>${t.lastMonth}</span>
                <span class="font-semibold text-slate-700">${totalHariLast} hari</span>
              </div>
              <div class="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-slate-400 rounded-full" style="width: 80%"></div>
              </div>
            </div>
            <div>
              <div class="flex justify-between text-slate-700 font-semibold mb-0.5">
                <span>${currentMonthShort}</span>
                <span class="font-bold text-blue-700">${totalHariCurrent} hari</span>
              </div>
              <div class="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-blue-600 rounded-full" style="width: ${Math.min(100, Math.round((totalHariCurrent / (Math.max(totalHariLast, totalHariCurrent) || 1)) * 100))}%"></div>
              </div>
            </div>
          </div>
          <div class="mt-2 text-[11px] font-bold ${diffHari <= 0 ? 'text-emerald-600' : 'text-rose-600'}">
            ${diffHari <= 0 ? t.improved : t.worsened}: ${diffHari > 0 ? '+' : ''}${diffHari} hari
          </div>
        </div>

        <!-- Change per employee (Minutes) -->
        <div class="bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-xs">
          <div class="text-xs font-bold text-slate-800 mb-2">${t.empChangeMinTitle}</div>
          <div class="space-y-1.5 text-[11px]">
            <div class="flex items-center justify-between">
              <span class="text-slate-600">${t.membaikLabel}</span>
              <div class="flex items-center gap-2">
                <div class="w-24 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div class="h-full bg-emerald-500 rounded-full" style="width: ${(changesMnt.membaik/totalKehadiran)*100}%"></div>
                </div>
                <span class="font-bold text-slate-800 w-4 text-right">${changesMnt.membaik}</span>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-600">${t.memburukLabel}</span>
              <div class="flex items-center gap-2">
                <div class="w-24 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div class="h-full bg-rose-500 rounded-full" style="width: ${(changesMnt.memburuk/totalKehadiran)*100}%"></div>
                </div>
                <span class="font-bold text-slate-800 w-4 text-right">${changesMnt.memburuk}</span>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-600">${t.tetapLabel}</span>
              <div class="flex items-center gap-2">
                <div class="w-24 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div class="h-full bg-slate-400 rounded-full" style="width: ${(changesMnt.tetap/totalKehadiran)*100}%"></div>
                </div>
                <span class="font-bold text-slate-800 w-4 text-right">${changesMnt.tetap}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 3 Columns Middle: Days change & Top Tables -->
      <div class="grid grid-cols-3 gap-3 mt-3">
        <!-- Change per employee (Days) -->
        <div class="bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div class="text-xs font-bold text-slate-800 mb-2">${t.empChangeDayTitle}</div>
          <div class="space-y-1.5 text-[11px]">
            <div class="flex items-center justify-between">
              <span class="text-slate-600">${t.membaikLabel}</span>
              <div class="flex items-center gap-2">
                <div class="w-24 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div class="h-full bg-emerald-500 rounded-full" style="width: ${(changesHari.membaik/totalKehadiran)*100}%"></div>
                </div>
                <span class="font-bold text-slate-800 w-4 text-right">${changesHari.membaik}</span>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-600">${t.memburukLabel}</span>
              <div class="flex items-center gap-2">
                <div class="w-24 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div class="h-full bg-rose-500 rounded-full" style="width: ${(changesHari.memburuk/totalKehadiran)*100}%"></div>
                </div>
                <span class="font-bold text-slate-800 w-4 text-right">${changesHari.memburuk}</span>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-600">${t.tetapLabel}</span>
              <div class="flex items-center gap-2">
                <div class="w-24 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div class="h-full bg-slate-400 rounded-full" style="width: ${(changesHari.tetap/totalKehadiran)*100}%"></div>
                </div>
                <span class="font-bold text-slate-800 w-4 text-right">${changesHari.tetap}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Top Improvements Table -->
        <div class="bg-white p-3 rounded-lg border border-slate-200/80 shadow-xs">
          <div class="text-xs font-bold text-slate-800 mb-1.5">${t.topImprovementsMin}</div>
          <table class="w-full text-[10px]">
            <thead>
              <tr class="bg-slate-800 text-white">
                <th class="py-1 px-1.5 text-left rounded-l">No</th>
                <th class="py-1 px-1.5 text-left">Nama</th>
                <th class="py-1 px-1.5 text-right rounded-r">(+/-)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${topPerbaikanMnt.map((e, idx) => `
                <tr>
                  <td class="py-1 px-1.5 text-slate-400">${idx+1}</td>
                  <td class="py-1 px-1.5 font-medium text-slate-700 truncate max-w-[130px]">${e.name}</td>
                  <td class="py-1 px-1.5 text-right font-bold text-emerald-600">+${e.deltaMnt}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Top Declines Table -->
        <div class="bg-white p-3 rounded-lg border border-slate-200/80 shadow-xs">
          <div class="text-xs font-bold text-slate-800 mb-1.5">${t.topDeclinesMin}</div>
          <table class="w-full text-[10px]">
            <thead>
              <tr class="bg-slate-800 text-white">
                <th class="py-1 px-1.5 text-left rounded-l">No</th>
                <th class="py-1 px-1.5 text-left">Nama</th>
                <th class="py-1 px-1.5 text-right rounded-r">(+/-)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${topPenurunanMnt.map((e, idx) => `
                <tr>
                  <td class="py-1 px-1.5 text-slate-400">${idx+1}</td>
                  <td class="py-1 px-1.5 font-medium text-slate-700 truncate max-w-[130px]">${e.name}</td>
                  <td class="py-1 px-1.5 text-right font-bold text-rose-600">${e.deltaMnt}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Interpretasi Analisis -->
      <div class="bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-xs mt-3 flex-1">
        <h3 class="text-xs font-bold text-slate-900 mb-1.5 flex items-center gap-1.5">
          <span class="w-1.5 h-3.5 bg-blue-600 rounded-xs"></span>
          ${t.analysisInterpretationTitle}
        </h3>
        <div class="space-y-1 text-[11px] text-slate-700 leading-relaxed">
          ${narratives.analysisInterpretation.map(point => `
            <div class="flex items-start gap-2">
              <span class="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1.5"></span>
              <span>${point}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Bottom Summary Cards -->
      <div class="grid grid-cols-3 gap-3 mt-3">
        <div class="bg-slate-100 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between">
          <div>
            <div class="text-xs font-black ${changesMnt.memburuk > changesMnt.membaik ? 'text-rose-700' : 'text-emerald-700'}">
              ${changesMnt.memburuk > changesMnt.membaik ? changesMnt.memburuk + ' MEMBURUK' : changesMnt.membaik + ' MEMBAIK'}
            </div>
            <div class="text-[10px] font-bold text-slate-500">PERUBAHAN MENIT</div>
          </div>
          <div class="text-[11px] font-semibold text-slate-600">
            ${changesMnt.membaik} membaik | ${changesMnt.tetap} tetap
          </div>
        </div>

        <div class="bg-slate-100 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between">
          <div>
            <div class="text-xs font-black ${changesHari.memburuk > changesHari.membaik ? 'text-rose-700' : 'text-emerald-700'}">
              ${changesHari.memburuk > changesHari.membaik ? changesHari.memburuk + ' MEMBURUK' : changesHari.membaik + ' MEMBAIK'}
            </div>
            <div class="text-[10px] font-bold text-slate-500">PERUBAHAN HARI</div>
          </div>
          <div class="text-[11px] font-semibold text-slate-600">
            ${changesHari.membaik} membaik | ${changesHari.tetap} tetap
          </div>
        </div>

        <div class="bg-slate-100 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between">
          <div>
            <div class="text-xs font-black ${diffMnt > 0 ? 'text-rose-700' : 'text-emerald-700'}">
              ${diffMnt > 0 ? 'NEGATIF' : 'POSITIF'}
            </div>
            <div class="text-[10px] font-bold text-slate-500">${t.trendConclusion}</div>
          </div>
          <div class="text-[11px] font-semibold text-slate-600 truncate max-w-[190px]">
            ${diffMnt > 0 ? t.trendWorse.replace('{current}', currentMonthShort) : t.trendBetter.replace('{current}', currentMonthShort)}
          </div>
        </div>
      </div>
    </div>

    <div class="px-8 py-2 border-t border-slate-200 text-[10px] text-slate-400 flex justify-between items-center bg-white shrink-0">
      <span>${t.pageFooter}</span>
      <span>Periode ${periode} | ${t.page} 3</span>
    </div>
  </div>


  <!-- ==================== PAGE 4: RISK MONITORING ==================== -->
  <div class="slide-page">
    <div class="bg-[#0f1e36] text-white px-8 py-3.5 flex justify-between items-center shrink-0">
      <div>
        <div class="text-[11px] font-bold tracking-wider text-slate-300 uppercase">${t.riskBadge}</div>
        <h1 class="text-xl font-extrabold tracking-tight">${t.riskTitle}</h1>
      </div>
      <div class="text-xs font-semibold text-slate-300">${t.riskSubtitle}</div>
    </div>

    <div class="p-6 flex-1 flex flex-col justify-between overflow-hidden">
      <!-- 2x2 Tables Grid -->
      <div class="grid grid-cols-2 gap-4 flex-1">
        <!-- 5 Skor Terendah -->
        <div class="bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div class="text-xs font-bold text-slate-800 mb-1.5">${t.bottom5ScoresTitle}</div>
          <table class="w-full text-[10px]">
            <thead>
              <tr class="bg-slate-800 text-white">
                <th class="py-1 px-2 text-left rounded-l">No</th>
                <th class="py-1 px-2 text-left">Nama</th>
                <th class="py-1 px-2 text-center">Skor</th>
                <th class="py-1 px-2 text-center">Menit</th>
                <th class="py-1 px-2 text-center rounded-r">Hari</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${top5SkorRendah.map((e, idx) => `
                <tr>
                  <td class="py-1 px-2 text-slate-400">${idx+1}</td>
                  <td class="py-1 px-2 font-medium text-slate-700 truncate max-w-[150px]">${e.name}</td>
                  <td class="py-1 px-2 text-center font-bold text-rose-600 bg-rose-50/50">${formatScore(e.skor, isId)}</td>
                  <td class="py-1 px-2 text-center text-slate-700">${e.mntCurrent}</td>
                  <td class="py-1 px-2 text-center text-slate-700">${e.hariCurrent}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- 5 Menit Tertinggi -->
        <div class="bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div class="text-xs font-bold text-slate-800 mb-1.5">${t.top5MinutesTitle}</div>
          <table class="w-full text-[10px]">
            <thead>
              <tr class="bg-slate-800 text-white">
                <th class="py-1 px-2 text-left rounded-l">No</th>
                <th class="py-1 px-2 text-left">Nama</th>
                <th class="py-1 px-2 text-center">Menit</th>
                <th class="py-1 px-2 text-center">Hari</th>
                <th class="py-1 px-2 text-center rounded-r">Skor</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${top5MntTertinggi.map((e, idx) => `
                <tr>
                  <td class="py-1 px-2 text-slate-400">${idx+1}</td>
                  <td class="py-1 px-2 font-medium text-slate-700 truncate max-w-[150px]">${e.name}</td>
                  <td class="py-1 px-2 text-center font-bold text-slate-800">${e.mntCurrent}</td>
                  <td class="py-1 px-2 text-center text-slate-700">${e.hariCurrent}</td>
                  <td class="py-1 px-2 text-center font-semibold text-slate-700">${formatScore(e.skor, isId)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- 5 Hari Terbanyak -->
        <div class="bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div class="text-xs font-bold text-slate-800 mb-1.5">${t.top5DaysTitle}</div>
          <table class="w-full text-[10px]">
            <thead>
              <tr class="bg-slate-800 text-white">
                <th class="py-1 px-2 text-left rounded-l">No</th>
                <th class="py-1 px-2 text-left">Nama</th>
                <th class="py-1 px-2 text-center">Hari</th>
                <th class="py-1 px-2 text-center">Menit</th>
                <th class="py-1 px-2 text-center rounded-r">Skor</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${top5HariTerbanyak.map((e, idx) => `
                <tr>
                  <td class="py-1 px-2 text-slate-400">${idx+1}</td>
                  <td class="py-1 px-2 font-medium text-slate-700 truncate max-w-[150px]">${e.name}</td>
                  <td class="py-1 px-2 text-center font-bold text-slate-800">${e.hariCurrent}</td>
                  <td class="py-1 px-2 text-center text-slate-700">${e.mntCurrent}</td>
                  <td class="py-1 px-2 text-center font-semibold text-slate-700">${formatScore(e.skor, isId)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Perubahan Paling Signifikan -->
        <div class="bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div class="text-xs font-bold text-slate-800 mb-1.5">${t.mostSignificantChangesTitle}</div>
          <table class="w-full text-[10px]">
            <thead>
              <tr class="bg-slate-800 text-white">
                <th class="py-1 px-2 text-left rounded-l">Status</th>
                <th class="py-1 px-2 text-left">Nama</th>
                <th class="py-1 px-2 text-right rounded-r">Perubahan</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${top3Membaik.map(e => `
                <tr>
                  <td class="py-1 px-2"><span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">${t.membaikLabel}</span></td>
                  <td class="py-1 px-2 font-medium text-slate-700 truncate max-w-[150px]">${e.name}</td>
                  <td class="py-1 px-2 text-right font-bold text-emerald-600">+${e.deltaMnt} mnt</td>
                </tr>
              `).join('')}
              ${top3Memburuk.map(e => `
                <tr>
                  <td class="py-1 px-2"><span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800">${t.memburukLabel}</span></td>
                  <td class="py-1 px-2 font-medium text-slate-700 truncate max-w-[150px]">${e.name}</td>
                  <td class="py-1 px-2 text-right font-bold text-rose-600">${e.deltaMnt} mnt</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Risk Interpretation Box -->
      <div class="bg-white p-4 rounded-lg border border-slate-200/80 shadow-xs mt-3 shrink-0">
        <h3 class="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
          <span class="w-1.5 h-3.5 bg-blue-600 rounded-xs"></span>
          ${t.riskInterpretationTitle}
        </h3>
        <div class="grid grid-cols-2 gap-4 text-[11px] text-slate-700 leading-relaxed">
          ${narratives.riskInterpretation.map(point => `
            <div class="flex items-start gap-2">
              <span class="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1.5"></span>
              <span>${point}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <div class="px-8 py-2 border-t border-slate-200 text-[10px] text-slate-400 flex justify-between items-center bg-white shrink-0">
      <span>${t.pageFooter}</span>
      <span>Periode ${periode} | ${t.page} 4</span>
    </div>
  </div>


  <!-- ==================== PAGE 5: MANAGEMENT REVIEW ==================== -->
  <div class="slide-page">
    <div class="bg-[#0f1e36] text-white px-8 py-3.5 flex justify-between items-center shrink-0">
      <div>
        <div class="text-[11px] font-bold tracking-wider text-slate-300 uppercase">${t.reviewBadge}</div>
        <h1 class="text-xl font-extrabold tracking-tight">${t.reviewTitle}</h1>
      </div>
      <div class="text-xs font-semibold text-slate-300">${t.reviewSubtitle}</div>
    </div>

    <div class="p-6 flex-1 flex flex-col justify-between overflow-hidden">
      <!-- 2 Columns: Insight & Recommendations -->
      <div class="grid grid-cols-2 gap-4 flex-1">
        <!-- Management Insight -->
        <div class="bg-white p-4 rounded-lg border border-slate-200/80 shadow-xs flex flex-col">
          <h3 class="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
            <span class="w-1.5 h-3.5 bg-blue-600 rounded-xs"></span>
            ${t.managementInsightTitle}
          </h3>
          <div class="space-y-2.5 text-[11px] text-slate-700 leading-relaxed flex-1">
            ${narratives.managementInsight.map(point => `
              <div class="flex items-start gap-2">
                <span class="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1.5"></span>
                <span>${point}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Recommended Actions -->
        <div class="bg-white p-4 rounded-lg border border-slate-200/80 shadow-xs flex flex-col">
          <h3 class="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
            <span class="w-1.5 h-3.5 bg-emerald-600 rounded-xs"></span>
            ${t.recommendedActionsTitle}
          </h3>
          <div class="space-y-2.5 text-[11px] text-slate-700 leading-relaxed flex-1">
            ${narratives.recommendedActions.map(point => `
              <div class="flex items-start gap-2">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0 mt-1.5"></span>
                <span>${point}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Executive Conclusion Banner -->
      <div class="bg-[#0f1e36] text-white p-5 rounded-lg shadow-md mt-4 shrink-0">
        <div class="text-[10px] font-bold text-sky-400 tracking-wider uppercase mb-1.5">
          ${t.executiveConclusionTitle}
        </div>
        <div class="text-base font-extrabold tracking-tight mb-2">
          ${narratives.executiveConclusion.headline}
        </div>
        <div class="text-[11px] text-slate-300 space-y-1 leading-relaxed">
          <p>${narratives.executiveConclusion.p1}</p>
          <p class="text-slate-400">${narratives.executiveConclusion.p2}</p>
        </div>
      </div>
    </div>

    <div class="px-8 py-2 border-t border-slate-200 text-[10px] text-slate-400 flex justify-between items-center bg-white shrink-0">
      <span>${t.pageFooter}</span>
      <span>Periode ${periode} | ${t.page} 5</span>
    </div>
  </div>


  <!-- ==================== PAGE 6: APPENDIX DETAIL DATA ==================== -->
  <div class="slide-page">
    <div class="bg-[#0f1e36] text-white px-8 py-3.5 flex justify-between items-center shrink-0">
      <div>
        <div class="text-[11px] font-bold tracking-wider text-slate-300 uppercase">${t.appendixBadge}</div>
        <h1 class="text-xl font-extrabold tracking-tight">${t.appendixTitle}</h1>
      </div>
      <div class="text-xs font-semibold text-slate-300">${t.appendixSubtitle}</div>
    </div>

    <div class="p-6 flex-1 flex flex-col justify-between overflow-hidden">
      <!-- Full Table -->
      <div class="bg-white rounded-lg border border-slate-200/80 shadow-xs overflow-hidden flex-1 flex flex-col">
        <div class="overflow-x-auto overflow-y-auto flex-1">
          <table class="w-full text-[10px] border-collapse">
            <thead class="sticky top-0 bg-slate-800 text-white font-semibold">
              <tr>
                <th class="py-1 px-1.5 text-center border-r border-slate-700 w-7">${t.tableColNo}</th>
                <th class="py-1 px-2 text-left border-r border-slate-700 min-w-[130px]">${t.tableColName}</th>
                <th class="py-1 px-1.5 text-center border-r border-slate-700">${t.tableColMntCurr.replace('{curr}', currentMonthShort)}</th>
                <th class="py-1 px-1.5 text-center border-r border-slate-700">${t.tableColMntLast}</th>
                <th class="py-1 px-1.5 text-center border-r border-slate-700 bg-slate-700 font-bold">${t.tableColDeltaMnt}</th>
                <th class="py-1 px-1.5 text-center border-r border-slate-700">${t.tableColHariCurr.replace('{curr}', currentMonthShort)}</th>
                <th class="py-1 px-1.5 text-center border-r border-slate-700">${t.tableColHariLast}</th>
                <th class="py-1 px-1.5 text-center border-r border-slate-700 bg-slate-700 font-bold">${t.tableColDeltaHari}</th>
                <th class="py-1 px-1 text-center border-r border-slate-700">${t.izin}</th>
                <th class="py-1 px-1 text-center border-r border-slate-700">${t.sakit}</th>
                <th class="py-1 px-1 text-center border-r border-slate-700">Sakit T.S.</th>
                <th class="py-1 px-1 text-center border-r border-slate-700">${t.alfa}</th>
                <th class="py-1 px-1 text-center border-r border-slate-700">${t.cuti}</th>
                <th class="py-1 px-1 text-center border-r border-slate-700">${t.wfh}</th>
                <th class="py-1 px-2 text-center bg-slate-900 font-black">${t.tableColScore}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-slate-700">
              ${metrics.attendance.map((e, idx) => `
                <tr class="${idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'} hover:bg-blue-50/40">
                  <td class="py-0.5 px-1.5 text-center text-slate-400 border-r border-slate-100">${e.no || (idx+1)}</td>
                  <td class="py-0.5 px-2 font-medium text-slate-800 border-r border-slate-100 truncate max-w-[130px]">${e.name}</td>
                  <td class="py-0.5 px-1.5 text-center border-r border-slate-100">${formatNumber(e.mntCurrent, isId)}</td>
                  <td class="py-0.5 px-1.5 text-center border-r border-slate-100">${formatNumber(e.mntLast, isId)}</td>
                  <td class="py-0.5 px-1.5 text-center font-bold border-r border-slate-100 ${e.deltaMnt > 0 ? 'text-emerald-600 bg-emerald-50/30' : (e.deltaMnt < 0 ? 'text-rose-600 bg-rose-50/30' : 'text-slate-400')}">
                    ${e.deltaMnt > 0 ? '+' : ''}${e.deltaMnt === 0 ? '-' : e.deltaMnt}
                  </td>
                  <td class="py-0.5 px-1.5 text-center border-r border-slate-100">${formatNumber(e.hariCurrent, isId)}</td>
                  <td class="py-0.5 px-1.5 text-center border-r border-slate-100">${formatNumber(e.hariLast, isId)}</td>
                  <td class="py-0.5 px-1.5 text-center font-bold border-r border-slate-100 ${e.deltaHari > 0 ? 'text-emerald-600 bg-emerald-50/30' : (e.deltaHari < 0 ? 'text-rose-600 bg-rose-50/30' : 'text-slate-400')}">
                    ${e.deltaHari > 0 ? '+' : ''}${e.deltaHari === 0 ? '-' : e.deltaHari}
                  </td>
                  <td class="py-0.5 px-1 text-center border-r border-slate-100">${formatNumber(e.izin, isId)}</td>
                  <td class="py-0.5 px-1 text-center border-r border-slate-100">${formatNumber(e.sakit, isId)}</td>
                  <td class="py-0.5 px-1 text-center border-r border-slate-100">${formatNumber(e.sakitTS, isId)}</td>
                  <td class="py-0.5 px-1 text-center border-r border-slate-100">${formatNumber(e.alfa, isId)}</td>
                  <td class="py-0.5 px-1 text-center border-r border-slate-100">${formatNumber(e.cuti, isId)}</td>
                  <td class="py-0.5 px-1 text-center border-r border-slate-100">${formatNumber(e.wfh, isId)}</td>
                  <td class="py-0.5 px-2 text-center font-bold ${e.skor < 60 ? 'text-rose-600 bg-rose-50/50' : (e.skor >= 90 ? 'text-emerald-600' : 'text-slate-800')}">
                    ${formatScore(e.skor, isId)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Footnote -->
      <div class="mt-2 text-[10px] text-slate-500 font-medium">
        ${t.tableNote.replace('{curr}', currentMonthShort)}
      </div>
    </div>

    <div class="px-8 py-2 border-t border-slate-200 text-[10px] text-slate-400 flex justify-between items-center bg-white shrink-0">
      <span>${t.pageFooter}</span>
      <span>Periode ${periode} | ${t.page} 6</span>
    </div>
  </div>

</body>
</html>`;
}

module.exports = { renderReportHTML };

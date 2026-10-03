// AI Narrative generator with built-in template engine & LLM API integration
function generateNarratives(metrics, lang = 'id') {
  const isId = lang === 'id';
  const {
    periode,
    totalKehadiran,
    totalMntCurrent,
    totalMntLast,
    diffMnt,
    pctMnt,
    totalHariCurrent,
    totalHariLast,
    diffHari,
    pctHari,
    scoreDist,
    countUnder60,
    top5SkorRendah,
    topPerbaikanMnt,
    topPenurunanMnt,
    changesMnt,
    absence,
    dataIntegrity
  } = metrics;

  const mntDeltaAbs = Math.abs(diffMnt);
  const mntPctAbs = Math.abs(pctMnt).toFixed(1).replace('.', ',');
  const mntTrendWord = diffMnt > 0 ? (isId ? "meningkat" : "increased") : (isId ? "menurun" : "decreased");
  const mntNaikTurun = diffMnt > 0 ? (isId ? "naik" : "up") : (isId ? "turun" : "down");

  const hariDeltaAbs = Math.abs(diffHari);
  const hariPctAbs = Math.abs(pctHari).toFixed(1).replace('.', ',');
  const hariTrendWord = diffHari > 0 ? (isId ? "meningkat" : "increased") : (isId ? "menurun" : "decreased");
  const hariNaikTurun = diffHari > 0 ? (isId ? "naik" : "up") : (isId ? "turun" : "down");

  const riskNames = top5SkorRendah.map(e => e.name).slice(0, 5).join(", ");
  const topImprover = topPerbaikanMnt[0];
  const secondImprover = topPerbaikanMnt[1];
  const thirdImprover = topPerbaikanMnt[2];

  if (isId) {
    return {
      // Page 1
      execSummary: [
        `Keterlambatan ${periode} ${mntTrendWord} dari ${totalMntLast.toLocaleString('id-ID')} menjadi ${totalMntCurrent.toLocaleString('id-ID')} menit: ${mntNaikTurun} ${mntDeltaAbs.toLocaleString('id-ID')} menit (${mntPctAbs}%).`,
        `Frekuensi keterlambatan ${hariTrendWord} dari ${totalHariLast} menjadi ${totalHariCurrent} hari: ${hariNaikTurun} ${hariDeltaAbs} hari (${hariPctAbs}%).`,
        `Dari ${totalKehadiran} pegawai pada detail kehadiran, ${scoreDist.ge90} memiliki skor >=90 dan ${countUnder60} memiliki skor <60.`,
        `Risiko tertinggi terkonsentrasi pada ${riskNames}.`,
        `Cakupan data: header ${dataIntegrity.header} pegawai, profil demografi ${dataIntegrity.demographicsCount} pegawai, dan detail kehadiran ${totalKehadiran} pegawai.`
      ],

      // Page 2
      profileValidation: [
        `Header dan tabel jenis kelamin mencatat ${dataIntegrity.header} pegawai.`,
        `Tabel status, pendidikan, dan jabatan masing-masing berjumlah ${dataIntegrity.demographicsCount} pegawai.`,
        dataIntegrity.isConsistent
          ? `Distribusi data profil dan kehadiran telah konsisten secara menyeluruh.`
          : `Terdapat perbedaan basis antara data master (${dataIntegrity.header}), profil (${dataIntegrity.demographicsCount}), dan detail absensi (${totalKehadiran}); angka sumber ditampilkan apa adanya.`
      ],

      // Page 3
      analysisInterpretation: [
        `Kolom (+/-) pada data adalah Bulan Lalu - ${periode}: nilai positif berarti keterlambatan menurun (membaik), nilai negatif berarti meningkat (memburuk).`,
        `Secara total, ${periode} ${diffMnt > 0 ? "memburuk" : "membaik"} ${mntPctAbs}% pada menit keterlambatan dan ${diffHari > 0 ? "memburuk" : "membaik"} ${hariPctAbs}% pada jumlah hari terlambat.`,
        `Pegawai yang memburuk pada menit keterlambatan: ${changesMnt.memburuk} dari ${totalKehadiran}; yang membaik: ${changesMnt.membaik}; tetap: ${changesMnt.tetap}.`
      ],

      // Page 4
      riskInterpretation: [
        `Prioritas monitoring utama adalah pegawai yang muncul bersamaan pada skor rendah dan daftar menit/hari keterlambatan tertinggi.`,
        `${top5SkorRendah[0]?.name || ''} dan ${top5SkorRendah[1]?.name || ''} memiliki skor masing-masing ${String(top5SkorRendah[0]?.skor).replace('.', ',')} dan ${String(top5SkorRendah[1]?.skor).replace('.', ',')} serta akumulasi keterlambatan yang memerlukan perhatian khusus.`
      ],

      // Page 5
      managementInsight: [
        `Disiplin kehadiran secara agregat ${diffMnt > 0 ? "memburuk" : "membaik"}: total menit ${mntNaikTurun} ${mntDeltaAbs.toLocaleString('id-ID')} (${mntPctAbs}%) dan total hari terlambat ${hariNaikTurun} ${hariDeltaAbs} (${hariPctAbs}%).`,
        `Sebanyak ${countUnder60} dari ${totalKehadiran} pegawai berada pada band skor <60; ${scoreDist.ge90} pegawai berada pada skor >=90.`,
        `Risiko paling jelas terdapat pada ${riskNames} berdasarkan kombinasi skor rendah dan keterlambatan tinggi.`,
        topImprover ? `${topImprover.name} menunjukkan perbaikan menit terbesar (+${topImprover.deltaMnt}), disusul ${secondImprover ? secondImprover.name + ' (+' + secondImprover.deltaMnt + ')' : ''}.` : '',
        `Ketidakhadiran yang tercatat: izin ${absence.izin}, sakit ${absence.sakit}, sakit tanpa surat ${absence.sakitTS}, alfa ${absence.alfa}, cuti ${absence.cuti}, WFH ${absence.wfh}.`
      ].filter(Boolean),

      recommendedActions: [
        `Tetapkan monitoring bulanan untuk pegawai dengan skor <60 dan review kembali hasilnya pada periode berikutnya.`,
        `Lakukan coaching atau klarifikasi penyebab bagi pegawai yang mengalami penurunan besar pada menit maupun frekuensi keterlambatan.`,
        `Bedakan pendekatan antara masalah durasi keterlambatan dan frekuensi keterlambatan agar tindak lanjut lebih tepat.`,
        `Pantau keberlanjutan perbaikan pada pegawai dengan nilai (+/-) positif besar agar tren membaik tidak hanya bersifat sementara.`,
        `Lakukan rekonsiliasi data pegawai sebelum laporan digunakan sebagai dasar keputusan formal karena basis data (${dataIntegrity.header}, ${dataIntegrity.demographicsCount}, dan ${totalKehadiran}) ${dataIntegrity.isConsistent ? 'telah selaras' : 'belum sepenuhnya konsisten'}.`
      ],

      executiveConclusion: {
        headline: diffMnt > 0
          ? `${periode} menunjukkan penurunan disiplin kehadiran yang perlu perhatian manajemen.`
          : `${periode} menunjukkan peningkatan kedisiplinan kehadiran secara umum dengan penurunan total keterlambatan.`,
        p1: `Prioritas keputusan: monitoring pegawai berisiko, klarifikasi penyebab keterlambatan, dan evaluasi hasil perbaikan pada periode berikutnya.`,
        p2: dataIntegrity.isConsistent
          ? `Basis data telah selaras dan siap dijadikan landasan evaluasi berkala bagi Direksi.`
          : `Sebelum tindakan formal, konsistensi cakupan data pegawai perlu direkonsiliasi agar basis keputusan Direksi sama.`
      }
    };
  } else {
    // English
    return {
      execSummary: [
        `Lateness in ${periode} ${mntTrendWord} from ${totalMntLast.toLocaleString('en-US')} to ${totalMntCurrent.toLocaleString('en-US')} minutes: ${mntNaikTurun} ${mntDeltaAbs.toLocaleString('en-US')} minutes (${mntPctAbs}%).`,
        `Lateness frequency ${hariTrendWord} from ${totalHariLast} to ${totalHariCurrent} days: ${hariNaikTurun} ${hariDeltaAbs} days (${hariPctAbs}%).`,
        `Out of ${totalKehadiran} employees on the detail table, ${scoreDist.ge90} scored >=90 and ${countUnder60} scored <60.`,
        `Highest risk is concentrated on ${riskNames}.`,
        `Data scope: header ${dataIntegrity.header} employees, workforce profile ${dataIntegrity.demographicsCount} employees, and attendance detail ${totalKehadiran} employees.`
      ],

      profileValidation: [
        `Header and gender records show ${dataIntegrity.header} employees.`,
        `Status, education, and position tables each record ${dataIntegrity.demographicsCount} employees.`,
        dataIntegrity.isConsistent
          ? `Workforce profile data is fully reconciled with attendance detail.`
          : `Difference observed across master data (${dataIntegrity.header}), demographic profile (${dataIntegrity.demographicsCount}), and attendance table (${totalKehadiran}); presented as-is.`
      ],

      analysisInterpretation: [
        `The (+/-) column represents Previous Month - ${periode}: positive values denote lateness reduction (improvement), negative values denote increase (decline).`,
        `Aggregately, ${periode} ${diffMnt > 0 ? "worsened" : "improved"} by ${mntPctAbs}% in late minutes and ${diffHari > 0 ? "worsened" : "improved"} by ${hariPctAbs}% in late days.`,
        `Employees declining in late minutes: ${changesMnt.memburuk} out of ${totalKehadiran}; improving: ${changesMnt.membaik}; stable: ${changesMnt.tetap}.`
      ],

      riskInterpretation: [
        `Primary monitoring priority is placed on employees appearing simultaneously in low scores and high lateness duration/frequency.`,
        `${top5SkorRendah[0]?.name || ''} and ${top5SkorRendah[1]?.name || ''} recorded scores of ${top5SkorRendah[0]?.skor} and ${top5SkorRendah[1]?.skor} with significant lateness requiring targeted intervention.`
      ],

      managementInsight: [
        `Aggregate attendance discipline ${diffMnt > 0 ? "worsened" : "improved"}: total late minutes ${mntNaikTurun} ${mntDeltaAbs.toLocaleString('en-US')} (${mntPctAbs}%) and late days ${hariNaikTurun} ${hariDeltaAbs} (${hariPctAbs}%).`,
        `A total of ${countUnder60} out of ${totalKehadiran} employees fall into the <60 score band; ${scoreDist.ge90} achieved >=90 score.`,
        `Concentrated risk identified for ${riskNames} based on the combination of low score and high late metrics.`,
        topImprover ? `${topImprover.name} demonstrated the largest minute improvement (+${topImprover.deltaMnt}), followed by ${secondImprover ? secondImprover.name + ' (+' + secondImprover.deltaMnt + ')' : ''}.` : '',
        `Recorded absences: permit ${absence.izin}, sick ${absence.sakit}, sick without note ${absence.sakitTS}, unexcused ${absence.alfa}, leave ${absence.cuti}, WFH ${absence.wfh}.`
      ].filter(Boolean),

      recommendedActions: [
        `Institute monthly monitoring for employees with score <60 and review outcomes in the subsequent cycle.`,
        `Conduct coaching or causal clarification for employees experiencing notable deterioration in lateness minutes or days.`,
        `Differentiate management approaches between lateness duration issues and lateness frequency issues.`,
        `Monitor sustainability of gains among high-improving employees to ensure positive momentum is sustained.`,
        `Reconcile employee count discrepancy (${dataIntegrity.header}, ${dataIntegrity.demographicsCount}, and ${totalKehadiran}) before utilizing data for formal policy decisions.`
      ],

      executiveConclusion: {
        headline: diffMnt > 0
          ? `${periode} indicates an increase in tardiness requiring management attention.`
          : `${periode} indicates an overall improvement in attendance discipline with lateness reduction.`,
        p1: `Decision priorities: monitor high-risk personnel, investigate root causes of delays, and evaluate corrective actions next period.`,
        p2: dataIntegrity.isConsistent
          ? `Data basis is reconciled and ready for executive evaluation.`
          : `Prior to formal actions, employee coverage basis should be reconciled to align executive decision-making.`
      }
    };
  }
}

// Function to construct an LLM prompt for custom AI generation
function buildAIPrompt(metrics, targetLanguage = 'id') {
  return `You are a Chief Human Resources Officer and Executive Analyst. 
Analyze the following corporate attendance data and generate an executive summary, analysis interpretation, risk interpretation, management insight, recommended actions, and executive conclusion.

Data Summary:
- Period: ${metrics.periode}
- Total Employees: ${metrics.totalPegawaiHeader} (Attendance records: ${metrics.totalKehadiran})
- Late Minutes: Current ${metrics.totalMntCurrent} vs Previous ${metrics.totalMntLast} (Delta: ${metrics.diffMnt}, ${metrics.pctMnt.toFixed(1)}%)
- Late Days: Current ${metrics.totalHariCurrent} vs Previous ${metrics.totalHariLast} (Delta: ${metrics.diffHari}, ${metrics.pctHari.toFixed(1)}%)
- Average Score: ${metrics.avgSkor.toFixed(2)} (Employees with score < 60: ${metrics.countUnder60})
- Score Distribution: >=90: ${metrics.scoreDist.ge90}, 75-89.99: ${metrics.scoreDist.b75_90}, 60-74.99: ${metrics.scoreDist.b60_75}, <60: ${metrics.scoreDist.lt60}
- Absences: Permit: ${metrics.absence.izin}, Sick: ${metrics.absence.sakit}, Sick without note: ${metrics.absence.sakitTS}, Unexcused: ${metrics.absence.alfa}, Leave: ${metrics.absence.cuti}, WFH: ${metrics.absence.wfh}
- Top Risk Employees: ${JSON.stringify(metrics.top5SkorRendah.map(e => ({ name: e.name, score: e.skor, minutes: e.mntCurrent, days: e.hariCurrent })))}
- Top Improvements: ${JSON.stringify(metrics.topPerbaikanMnt.map(e => ({ name: e.name, deltaMinutes: e.deltaMnt })))}
- Top Declines: ${JSON.stringify(metrics.topPenurunanMnt.map(e => ({ name: e.name, deltaMinutes: e.deltaMnt })))}

Target Language: ${targetLanguage === 'id' ? 'Bahasa Indonesia (Formal Executive Corporate)' : 'English (Executive Boardroom)'}

Return JSON with keys:
- execSummary (array of 5 strings)
- profileValidation (array of 3 strings)
- analysisInterpretation (array of 3 strings)
- riskInterpretation (array of 2 strings)
- managementInsight (array of 5 strings)
- recommendedActions (array of 5 strings)
- executiveConclusion (object with headline, p1, p2)
`;
}

module.exports = { generateNarratives, buildAIPrompt };

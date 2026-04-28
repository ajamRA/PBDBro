"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/lib/supabase/client";

type Workspace = {
  id: string;
  name: string;
};

type ClassInfo = {
  id: string;
  name: string;
  year_label: string;
  academic_year: string;
};

type Student = {
  id: string;
  full_name: string;
};

type SubjectItem = {
  id: string;
  name: string;
  code: string | null;
};

type SkillItem = {
  id: string;
  name: string;
  code: string | null;
};

type AssessmentRow = {
  student_id: string;
  recorded_at: string;
  mastery_level: string;
  created_at: string;
};

type StudentHistoryRow = {
  id: string;
  recorded_at: string;
  mastery_level: string;
  created_at: string;
  note: string | null;
};

const TP_RANK: Record<string, number> = {
  TP1: 1,
  TP2: 2,
  TP3: 3,
  TP4: 4,
  TP5: 5,
  TP6: 6,
};

function getDefaultMonth() {
  return new Date().toISOString().slice(0, 7);
}

function parseMonthRange(monthValue: string) {
  const [yearRaw, monthRaw] = monthValue.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const start = `${monthValue}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${monthValue}-${String(lastDay).padStart(2, "0")}`;
  return { start, end, lastDay, year, month };
}

function getDayFromDate(isoDate: string) {
  const parts = isoDate.split("-");
  return Number(parts[2] ?? "0");
}

function buildCellKey(studentId: string, day: number) {
  return `${studentId}::${day}`;
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ms-MY");
}

export default function MonthlyClassReportPage() {
  const router = useRouter();
  const params = useParams<{ classId: string }>();
  const classId = params.classId;

  const [loading, setLoading] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [user, setUser] = useState<User | null>(null);
  const [teacherName, setTeacherName] = useState("-");
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [skills, setSkills] = useState<SkillItem[]>([]);

  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(getDefaultMonth());
  const [assessmentRows, setAssessmentRows] = useState<AssessmentRow[]>([]);

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedHistoryStudent, setSelectedHistoryStudent] = useState<Student | null>(null);
  const [historyRows, setHistoryRows] = useState<StudentHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const loadPage = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        router.replace("/login");
        return;
      }
      setUser(currentUser);

      const { data: ws, error: workspaceError } = await supabase
        .from("workspaces")
        .select("id, name")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (workspaceError) {
        setError(workspaceError.message);
        setLoading(false);
        return;
      }
      if (!ws) {
        setError("Workspace tidak dijumpai.");
        setLoading(false);
        return;
      }
      setWorkspace(ws);

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("display_name, email")
        .eq("id", currentUser.id)
        .maybeSingle();

      setTeacherName(
        String(
          profileRow?.display_name ??
            profileRow?.email ??
            currentUser.email ??
            "Guru",
        ),
      );

      const { data: classRow, error: classError } = await supabase
        .from("classes")
        .select("id, name, year_label, academic_year")
        .eq("id", classId)
        .eq("workspace_id", ws.id)
        .maybeSingle();

      if (classError) {
        setError(classError.message);
        setLoading(false);
        return;
      }
      if (!classRow) {
        setError("Kelas tidak dijumpai untuk workspace semasa.");
        setLoading(false);
        return;
      }
      setClassInfo(classRow as ClassInfo);

      const { data: studentRows, error: studentsError } = await supabase
        .from("students")
        .select("id, full_name")
        .eq("workspace_id", ws.id)
        .eq("class_id", classId)
        .order("full_name", { ascending: true });

      if (studentsError) {
        setError(studentsError.message);
        setLoading(false);
        return;
      }
      setStudents((studentRows ?? []) as Student[]);

      const { data: mapRows, error: mapsError } = await supabase
        .from("class_subjects")
        .select("subject_id")
        .eq("workspace_id", ws.id)
        .eq("class_id", classId);

      if (mapsError) {
        setError(mapsError.message);
        setLoading(false);
        return;
      }

      const subjectIds = (mapRows ?? []).map((row) => String(row.subject_id));
      if (subjectIds.length === 0) {
        setSubjects([]);
        setSelectedSubjectId("");
        setLoading(false);
        return;
      }

      const { data: subjectRows, error: subjectError } = await supabase
        .from("subjects")
        .select("id, name, code")
        .eq("workspace_id", ws.id)
        .in("id", subjectIds)
        .order("name", { ascending: true });

      if (subjectError) {
        setError(subjectError.message);
        setLoading(false);
        return;
      }

      const loadedSubjects = (subjectRows ?? []) as SubjectItem[];
      setSubjects(loadedSubjects);
      setSelectedSubjectId(loadedSubjects[0]?.id ?? "");
      setLoading(false);
    };

    void loadPage();
  }, [classId, router]);

  useEffect(() => {
    const loadSkills = async () => {
      if (!workspace || !selectedSubjectId) {
        setSkills([]);
        setSelectedSkillId("");
        return;
      }

      const { data: skillRows, error: skillsError } = await supabase
        .from("skills")
        .select("id, name, code")
        .eq("workspace_id", workspace.id)
        .eq("subject_id", selectedSubjectId)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });

      if (skillsError) {
        setError(skillsError.message);
        return;
      }

      const loadedSkills = (skillRows ?? []) as SkillItem[];
      setSkills(loadedSkills);
      setSelectedSkillId((prev) =>
        loadedSkills.some((skill) => skill.id === prev) ? prev : loadedSkills[0]?.id ?? "",
      );
    };

    void loadSkills();
  }, [workspace, selectedSubjectId]);

  useEffect(() => {
    const loadRows = async () => {
      if (!workspace || !classInfo || !selectedSubjectId || !selectedSkillId) {
        setAssessmentRows([]);
        return;
      }
      if (students.length === 0) {
        setAssessmentRows([]);
        return;
      }

      setLoadingRows(true);
      setError("");
      setSuccess("");

      const { start, end } = parseMonthRange(selectedMonth);
      const studentIds = students.map((student) => student.id);

      const { data, error: rowsError } = await supabase
        .from("assessments")
        .select("student_id, recorded_at, mastery_level, created_at")
        .eq("workspace_id", workspace.id)
        .eq("class_id", classInfo.id)
        .eq("subject_id", selectedSubjectId)
        .eq("skill_id", selectedSkillId)
        .gte("recorded_at", start)
        .lte("recorded_at", end)
        .in("student_id", studentIds)
        .order("student_id", { ascending: true })
        .order("recorded_at", { ascending: true })
        .order("created_at", { ascending: true });

      if (rowsError) {
        setError(rowsError.message);
        setLoadingRows(false);
        return;
      }

      setAssessmentRows((data ?? []) as AssessmentRow[]);
      setLoadingRows(false);
    };

    void loadRows();
  }, [workspace, classInfo, selectedSubjectId, selectedSkillId, selectedMonth, students]);

  const { dayCount, dayNumbers, cellValues, summaryRows } = useMemo(() => {
    const { lastDay, year, month } = parseMonthRange(selectedMonth);
    const numbers = Array.from({ length: lastDay }, (_, i) => i + 1);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const todayDate = now.getDate();

    const latestByCell = new Map<string, { mastery_level: string; created_at: string }>();
    for (const row of assessmentRows) {
      const day = getDayFromDate(row.recorded_at);
      if (!day || day < 1 || day > lastDay) continue;
      const key = buildCellKey(row.student_id, day);
      const existing = latestByCell.get(key);
      if (!existing || new Date(row.created_at).getTime() >= new Date(existing.created_at).getTime()) {
        latestByCell.set(key, { mastery_level: row.mastery_level, created_at: row.created_at });
      }
    }

    const cellMap: Record<string, string> = {};
    for (const [key, val] of latestByCell.entries()) {
      cellMap[key] = val.mastery_level;
    }

    const getCellDisplay = (studentId: string, day: number) => {
      const key = buildCellKey(studentId, day);
      if (cellMap[key]) return cellMap[key];

      const isFutureInMonth =
        year > currentYear ||
        (year === currentYear && month > currentMonth) ||
        (year === currentYear && month === currentMonth && day > todayDate);

      // kosong = tiada data (future date), "—" = belum taksir (past/current date)
      return isFutureInMonth ? "" : "—";
    };

    const studentSummaries = students.map((student) => {
      const timeline = numbers
        .map((day) => ({
          day,
          value: cellMap[buildCellKey(student.id, day)] ?? "",
        }))
        .filter((item) => item.value !== "");

      const first = timeline[0]?.value ?? "—";
      const last = timeline[timeline.length - 1]?.value ?? "—";

      let trend = "—";
      if (timeline.length >= 2) {
        const firstRank = TP_RANK[first] ?? 0;
        const lastRank = TP_RANK[last] ?? 0;
        if (lastRank > firstRank) trend = "↑";
        else if (lastRank < firstRank) trend = "↓";
        else trend = "=";
      }

      return { studentId: student.id, first, last, trend };
    });

    return {
      dayCount: lastDay,
      dayNumbers: numbers,
      cellValues: getCellDisplay,
      summaryRows: studentSummaries,
    };
  }, [assessmentRows, selectedMonth, students]);

  const selectedSubject = subjects.find((subject) => subject.id === selectedSubjectId) ?? null;
  const selectedSkill = skills.find((skill) => skill.id === selectedSkillId) ?? null;

  const handleOpenStudentHistory = async (student: Student) => {
    if (!workspace || !selectedSubjectId || !selectedSkillId) return;

    setHistoryModalOpen(true);
    setSelectedHistoryStudent(student);
    setHistoryRows([]);
    setHistoryLoading(true);
    setError("");

    const { data, error: historyError } = await supabase
      .from("assessments")
      .select("id, recorded_at, mastery_level, created_at, note")
      .eq("workspace_id", workspace.id)
      .eq("class_id", classId)
      .eq("subject_id", selectedSubjectId)
      .eq("skill_id", selectedSkillId)
      .eq("student_id", student.id)
      .order("recorded_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);

    if (historyError) {
      setError(historyError.message);
      setHistoryLoading(false);
      return;
    }

    setHistoryRows((data ?? []) as StudentHistoryRow[]);
    setHistoryLoading(false);
  };

  const handleExportPdf = async () => {
    if (!classInfo || !selectedSubject || !selectedSkill) return;
    setExportingPdf(true);
    setError("");

    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      doc.setFontSize(14);
      doc.text("Perkembangan Murid (Jadual Bulanan)", 10, 10);
      doc.setFontSize(10);
      doc.text(`Kelas: ${classInfo.name}`, 10, 16);
      doc.text(
        `Subjek: ${selectedSubject.name}${selectedSubject.code ? ` [${selectedSubject.code}]` : ""} | Tahun: ${classInfo.year_label} | Kemahiran: ${selectedSkill.name}`,
        10,
        21,
      );
      doc.text(`Bulan: ${selectedMonth}`, 10, 26);
      doc.text(`Nama Guru: ${teacherName}`, 10, 31);
      doc.text(`Tarikh Cetak: ${formatDateTime(new Date().toISOString())}`, 80, 31);

      const head = [
        [
          "Nama",
          ...dayNumbers.map((day) => String(day)),
          "First",
          "Last",
          "Trend",
        ],
      ];

      const body = students.map((student) => {
        const summary = summaryRows.find((row) => row.studentId === student.id);
        return [
          student.full_name,
          ...dayNumbers.map((day) => cellValues(student.id, day)),
          summary?.first ?? "—",
          summary?.last ?? "—",
          summary?.trend ?? "—",
        ];
      });

      autoTable(doc, {
        startY: 35,
        head,
        body,
        theme: "grid",
        styles: { fontSize: 6.5, cellPadding: 1.2 },
        headStyles: { fillColor: [250, 241, 220], textColor: [0, 0, 0] },
        columnStyles: { 0: { cellWidth: 55 } },
      });

      const fileName = `laporan-bulanan-${classInfo.name}-${selectedSubject.name}-${selectedMonth}.pdf`
        .replace(/\s+/g, "-")
        .toLowerCase();
      doc.save(fileName);
      setSuccess("PDF berjaya diexport.");
    } catch (pdfError) {
      setError(pdfError instanceof Error ? pdfError.message : "Gagal export PDF.");
    } finally {
      setExportingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveSnapshot = async () => {
    if (!workspace || !classInfo || !selectedSubject || !selectedSkill || !user) return;
    setSavingSnapshot(true);
    setError("");
    setSuccess("");

    const payload = {
      generated_at: new Date().toISOString(),
      generated_by: teacherName,
      class: classInfo,
      subject: selectedSubject,
      skill: selectedSkill,
      month: selectedMonth,
      summary: summaryRows,
      rows: students.map((student) => ({
        student_id: student.id,
        student_name: student.full_name,
        daily: dayNumbers.map((day) => ({
          day,
          value: cellValues(student.id, day),
        })),
      })),
    };

    const { error: snapshotError } = await supabase.from("report_snapshots").insert({
      workspace_id: workspace.id,
      class_id: classInfo.id,
      subject_id: selectedSubject.id,
      skill_id: selectedSkill.id,
      month_label: selectedMonth,
      snapshot_payload: payload,
      created_by: user.id,
    });

    if (snapshotError) {
      const missingTable =
        snapshotError.code === "42P01" ||
        snapshotError.message.toLowerCase().includes("report_snapshots");
      if (missingTable) {
        setError("Table report_snapshots belum ada. Run migration 20260427000400_report_snapshots.sql dulu.");
      } else {
        setError(snapshotError.message);
      }
      setSavingSnapshot(false);
      return;
    }

    setSuccess("Snapshot report berjaya disimpan untuk audit.");
    setSavingSnapshot(false);
  };

  if (loading) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-[96vw] px-4 py-8">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">Loading laporan bulanan...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[96vw] px-4 py-8">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="no-print flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Laporan Bulanan</h1>
            <p className="mt-1 text-sm text-slate-600">Klik nama murid untuk lihat sejarah detail.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleSaveSnapshot()}
              disabled={savingSnapshot || !selectedSkill}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
            >
              {savingSnapshot ? "Menyimpan..." : "Simpan Snapshot"}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={!selectedSkill}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
            >
              Print
            </button>
            <button
              type="button"
              onClick={() => void handleExportPdf()}
              disabled={exportingPdf || !selectedSkill}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {exportingPdf ? "Exporting..." : "Export PDF"}
            </button>
            <Link href={`/classes/${classId}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
              Kembali Kelas
            </Link>
          </div>
        </div>

        {error ? <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {success ? <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

        <section className="no-print mt-4 grid gap-3 rounded-md border border-slate-200 p-3 md:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor="monthly-subject" className="text-sm font-medium">
              Subjek (class_subjects)
            </label>
            <select
              id="monthly-subject"
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {subjects.length === 0 ? <option value="">Tiada subjek di-assign</option> : null}
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="monthly-skill" className="text-sm font-medium">
              Kemahiran
            </label>
            <select
              id="monthly-skill"
              value={selectedSkillId}
              onChange={(e) => setSelectedSkillId(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {skills.length === 0 ? <option value="">Tiada kemahiran</option> : null}
              {skills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="monthly-month" className="text-sm font-medium">
              Bulan
            </label>
            <input
              id="monthly-month"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </section>

        <section className="mt-3 rounded-md border border-slate-200 p-2 text-sm">
          <p><span className="font-medium">Kelas:</span> {classInfo?.name ?? "-"}</p>
          <p>
            <span className="font-medium">Subjek:</span>{" "}
            {selectedSubject ? `${selectedSubject.name}${selectedSubject.code ? ` [${selectedSubject.code}]` : ""}` : "-"}{" "}
            | <span className="font-medium">Tahun:</span> {classInfo?.year_label ?? "-"} |{" "}
            <span className="font-medium">Kemahiran:</span> {selectedSkill?.name ?? "-"}
          </p>
          <p><span className="font-medium">Bulan:</span> {selectedMonth}</p>
          <p><span className="font-medium">Nama Guru:</span> {teacherName}</p>
          <p><span className="font-medium">Tarikh Cetak:</span> {formatDateTime(new Date().toISOString())}</p>
          <p className="mt-1 text-xs text-slate-500">
            Nota: Kosong = tiada data (tarikh belum tiba), “—” = belum taksir.
          </p>
        </section>

        {subjects.length === 0 ? (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Tiada subjek di-assign pada kelas ini. Setup subjek dulu di halaman kelas.
          </p>
        ) : null}

        {loadingRows ? (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">Memuatkan data laporan...</p>
        ) : null}

        <section className="mt-4 overflow-auto rounded-md border border-slate-200">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky top-0 left-0 z-30 border border-amber-200 bg-amber-50 px-2 py-1 text-left">Nama</th>
                <th className="sticky top-0 z-20 border border-amber-200 bg-amber-50 px-2 py-1 text-center">Bil</th>
                {dayNumbers.map((day) => (
                  <th key={`day-${day}`} className="sticky top-0 z-20 border border-amber-200 bg-amber-50 px-2 py-1 text-center">
                    {day}
                  </th>
                ))}
                <th className="sticky top-0 z-20 border border-amber-200 bg-amber-50 px-2 py-1 text-center">First</th>
                <th className="sticky top-0 z-20 border border-amber-200 bg-amber-50 px-2 py-1 text-center">Last</th>
                <th className="sticky top-0 z-20 border border-amber-200 bg-amber-50 px-2 py-1 text-center">Trend</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={dayCount + 6} className="border border-amber-100 px-2 py-2 text-slate-600">
                    Tiada murid untuk kelas ini.
                  </td>
                </tr>
              ) : (
                students.map((student, index) => {
                  const summary = summaryRows.find((row) => row.studentId === student.id);
                  return (
                    <tr key={student.id}>
                      <td className="sticky left-0 z-10 border border-amber-100 bg-white px-2 py-1">
                        <button
                          type="button"
                          onClick={() => void handleOpenStudentHistory(student)}
                          className="text-left text-xs font-medium text-slate-900 underline"
                        >
                          {student.full_name}
                        </button>
                      </td>
                      <td className="border border-amber-100 px-2 py-1 text-center">{index + 1}</td>
                      {dayNumbers.map((day) => (
                        <td key={`${student.id}-${day}`} className="border border-amber-100 px-2 py-1 text-center">
                          {cellValues(student.id, day)}
                        </td>
                      ))}
                      <td className="border border-amber-100 px-2 py-1 text-center">{summary?.first ?? "—"}</td>
                      <td className="border border-amber-100 px-2 py-1 text-center">{summary?.last ?? "—"}</td>
                      <td
                        className={`border border-amber-100 px-2 py-1 text-center font-semibold ${
                          summary?.trend === "↑"
                            ? "text-emerald-700"
                            : summary?.trend === "↓"
                              ? "text-red-700"
                              : "text-slate-700"
                        }`}
                      >
                        {summary?.trend ?? "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>
      </div>

      {historyModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">History Murid</h2>
                <p className="text-sm text-slate-600">{selectedHistoryStudent?.full_name ?? "-"}</p>
                <p className="text-xs text-slate-500">
                  {selectedSubject?.name ?? "-"} | {selectedSkill?.name ?? "-"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                Tutup
              </button>
            </div>

            {historyLoading ? (
              <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">Loading history...</p>
            ) : historyRows.length === 0 ? (
              <p className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">
                Tiada history untuk murid ini.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {historyRows.map((row) => (
                  <li key={row.id} className="rounded-md border border-slate-200 p-3 text-sm">
                    <p>
                      <span className="font-medium">Tarikh:</span> {row.recorded_at} |{" "}
                      <span className="font-medium">TP:</span> {row.mastery_level}
                    </p>
                    <p className="text-xs text-slate-600">
                      Created: {formatDateTime(row.created_at)} | Note: {row.note ?? "-"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm;
          }

          body {
            background: #fff !important;
            color: #000 !important;
          }

          .no-print {
            display: none !important;
          }

          table {
            width: 100%;
            table-layout: fixed;
          }

          th,
          td {
            font-size: 10px !important;
            padding: 2px 3px !important;
            white-space: nowrap;
          }

          thead {
            display: table-header-group;
          }
        }
      `}</style>
    </main>
  );
}

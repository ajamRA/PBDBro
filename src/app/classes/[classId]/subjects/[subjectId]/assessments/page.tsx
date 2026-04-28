"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

type SubjectInfo = {
  id: string;
  name: string;
  code: string | null;
  year_label: string | null;
};

type Student = {
  id: string;
  full_name: string;
};

type Skill = {
  id: string;
  name: string;
  code: string | null;
  display_order: number;
};

type MasteryLevel = "TP1" | "TP2" | "TP3" | "TP4" | "TP5" | "TP6";
type CellStatus = "idle" | "saving" | "saved" | "error";

const TP_OPTIONS: Array<{ value: ""; label: "Belum Taksir" } | { value: MasteryLevel; label: MasteryLevel }> = [
  { value: "", label: "Belum Taksir" },
  { value: "TP1", label: "TP1" },
  { value: "TP2", label: "TP2" },
  { value: "TP3", label: "TP3" },
  { value: "TP4", label: "TP4" },
  { value: "TP5", label: "TP5" },
  { value: "TP6", label: "TP6" },
];

function buildCellKey(studentId: string, skillId: string) {
  return `${studentId}::${skillId}`;
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function AssessmentsPage() {
  const router = useRouter();
  const params = useParams<{ classId: string; subjectId: string }>();
  const classId = params.classId;
  const subjectId = params.subjectId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [subjectInfo, setSubjectInfo] = useState<SubjectInfo | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [cellValues, setCellValues] = useState<Record<string, string>>({});
  const [cellStatus, setCellStatus] = useState<Record<string, CellStatus>>({});
  const [cellError, setCellError] = useState<Record<string, string>>({});
  const [viewFilter, setViewFilter] = useState<"all" | "incomplete">("all");
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [loadingDateData, setLoadingDateData] = useState(false);

  useEffect(() => {
    const loadPage = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        router.replace("/login");
        return;
      }

      setCurrentUserId(currentUser.id);

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
        setError("Kelas tidak sah untuk workspace semasa.");
        setLoading(false);
        return;
      }

      setClassInfo(classRow as ClassInfo);

      const { data: subjectRow, error: subjectError } = await supabase
        .from("subjects")
        .select("id, name, code, year_label")
        .eq("id", subjectId)
        .eq("workspace_id", ws.id)
        .maybeSingle();

      if (subjectError) {
        setError(subjectError.message);
        setLoading(false);
        return;
      }

      if (!subjectRow) {
        setError("Subject tidak sah untuk workspace semasa.");
        setLoading(false);
        return;
      }

      setSubjectInfo(subjectRow as SubjectInfo);

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

      const loadedStudents = (studentRows ?? []) as Student[];
      setStudents(loadedStudents);

      const { data: skillRows, error: skillsError } = await supabase
        .from("skills")
        .select("id, name, code, display_order")
        .eq("workspace_id", ws.id)
        .eq("subject_id", subjectId)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });

      if (skillsError) {
        setError(skillsError.message);
        setLoading(false);
        return;
      }

      const loadedSkills = (skillRows ?? []) as Skill[];
      setSkills(loadedSkills);

      setLoading(false);
    };

    void loadPage();
  }, [classId, subjectId, router]);

  useEffect(() => {
    const loadAssessmentsByDate = async () => {
      if (!workspace || !classInfo || !subjectInfo) return;

      setLoadingDateData(true);
      setError("");
      setCellValues({});
      setCellStatus({});
      setCellError({});

      if (students.length === 0 || skills.length === 0) {
        setLoadingDateData(false);
        return;
      }

      const studentIds = students.map((s) => s.id);
      const skillIds = skills.map((s) => s.id);

      const { data: assessmentRows, error: assessmentsError } = await supabase
        .from("assessments")
        .select("student_id, skill_id, mastery_level")
        .eq("workspace_id", workspace.id)
        .eq("class_id", classInfo.id)
        .eq("subject_id", subjectInfo.id)
        .eq("recorded_at", selectedDate)
        .in("student_id", studentIds)
        .in("skill_id", skillIds);

      if (assessmentsError) {
        setError(assessmentsError.message);
        setLoadingDateData(false);
        return;
      }

      const initialValues: Record<string, string> = {};
      for (const row of assessmentRows ?? []) {
        const key = buildCellKey(row.student_id as string, row.skill_id as string);
        initialValues[key] = String(row.mastery_level ?? "");
      }
      setCellValues(initialValues);
      setLoadingDateData(false);
    };

    void loadAssessmentsByDate();
  }, [workspace, classInfo, subjectInfo, students, skills, selectedDate]);

  const handleTpChange = async (studentId: string, skillId: string, value: string) => {
    if (!workspace || !classInfo || !subjectInfo || !currentUserId) {
      return;
    }

    const key = buildCellKey(studentId, skillId);

    setCellValues((prev) => ({
      ...prev,
      [key]: value,
    }));
    setCellStatus((prev) => ({
      ...prev,
      [key]: "saving",
    }));
    setCellError((prev) => ({
      ...prev,
      [key]: "",
    }));

    if (value === "") {
      const { error: deleteError } = await supabase
        .from("assessments")
        .delete()
        .eq("workspace_id", workspace.id)
        .eq("class_id", classInfo.id)
        .eq("subject_id", subjectInfo.id)
        .eq("student_id", studentId)
        .eq("skill_id", skillId)
        .eq("recorded_at", selectedDate);

      if (deleteError) {
        setCellStatus((prev) => ({ ...prev, [key]: "error" }));
        setCellError((prev) => ({ ...prev, [key]: deleteError.message }));
        return;
      }

      setCellStatus((prev) => ({ ...prev, [key]: "saved" }));
      return;
    }

    const { error: upsertError } = await supabase.from("assessments").upsert(
      {
        workspace_id: workspace.id,
        class_id: classInfo.id,
        student_id: studentId,
        subject_id: subjectInfo.id,
        skill_id: skillId,
        mastery_level: value as MasteryLevel,
        recorded_by: currentUserId,
        recorded_at: selectedDate,
      },
      {
        onConflict: "class_id,subject_id,student_id,skill_id,recorded_at",
      },
    );

    if (upsertError) {
      setCellStatus((prev) => ({ ...prev, [key]: "error" }));
      setCellError((prev) => ({ ...prev, [key]: upsertError.message }));
      return;
    }

    setCellStatus((prev) => ({ ...prev, [key]: "saved" }));
  };

  const summary = useMemo(() => {
    const totalStudents = students.length;
    const totalSkills = skills.length;
    const totalCells = totalStudents * totalSkills;

    let assessedCells = 0;
    for (const student of students) {
      for (const skill of skills) {
        const key = buildCellKey(student.id, skill.id);
        if ((cellValues[key] ?? "") !== "") {
          assessedCells += 1;
        }
      }
    }

    const remainingCells = Math.max(0, totalCells - assessedCells);
    const completionPercentage =
      totalCells === 0 ? 0 : Math.round((assessedCells / totalCells) * 100);

    return {
      totalStudents,
      totalSkills,
      totalCells,
      assessedCells,
      remainingCells,
      completionPercentage,
    };
  }, [students, skills, cellValues]);

  const filteredStudents = useMemo(() => {
    if (viewFilter === "all" || skills.length === 0) {
      return students;
    }

    return students.filter((student) =>
      skills.some((skill) => {
        const key = buildCellKey(student.id, skill.id);
        return (cellValues[key] ?? "") === "";
      }),
    );
  }, [viewFilter, students, skills, cellValues]);

  const studentCompletionRows = useMemo(() => {
    return students.map((student) => {
      const expectedSkills = skills.length;
      let completedSkills = 0;

      for (const skill of skills) {
        const key = buildCellKey(student.id, skill.id);
        if ((cellValues[key] ?? "") !== "") {
          completedSkills += 1;
        }
      }

      return {
        studentId: student.id,
        studentName: student.full_name,
        expectedSkills,
        completedSkills,
        incompleteSkills: Math.max(0, expectedSkills - completedSkills),
      };
    });
  }, [students, skills, cellValues]);

  const studentsNotFullyAssessed = useMemo(
    () => studentCompletionRows.filter((row) => row.incompleteSkills > 0),
    [studentCompletionRows],
  );

  if (loading) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">Loading assessment page...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Assessment</h1>
            <p className="mt-1 text-sm text-slate-600">FASA 6 Phase B: pilih TP dan terus simpan.</p>
          </div>
          <Link href={`/classes/${classId}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            Kembali Class
          </Link>
        </div>

        {error ? (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        <section className="mt-6 grid gap-3 rounded-md border border-slate-200 p-3 text-sm md:grid-cols-3">
          <p>
            <span className="font-medium">Workspace:</span> {workspace?.name ?? "-"}
          </p>
          <p>
            <span className="font-medium">Class:</span>{" "}
            {classInfo ? `${classInfo.name} (${classInfo.year_label} - ${classInfo.academic_year})` : "-"}
          </p>
          <p>
            <span className="font-medium">Subject:</span>{" "}
            {subjectInfo ? `${subjectInfo.name}${subjectInfo.code ? ` [${subjectInfo.code}]` : ""}` : "-"}
          </p>
        </section>

        <section className="mt-6 grid gap-2 rounded-md border border-slate-200 p-3 text-sm md:grid-cols-3">
          <p>
            <span className="font-medium">Total students:</span> {summary.totalStudents}
          </p>
          <p>
            <span className="font-medium">Total skills:</span> {summary.totalSkills}
          </p>
          <p>
            <span className="font-medium">Total cells:</span> {summary.totalCells}
          </p>
          <p>
            <span className="font-medium">Assessed cells:</span> {summary.assessedCells}
          </p>
          <p>
            <span className="font-medium">Remaining cells:</span> {summary.remainingCells}
          </p>
          <p>
            <span className="font-medium">Completion:</span> {summary.completionPercentage}%
          </p>
        </section>

        <section className="mt-4 rounded-md border border-slate-200 p-3 text-sm">
          <h2 className="text-base font-semibold">Laporan Penyempurnaan (Tarikh: {selectedDate})</h2>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <p>
              <span className="font-medium">Total students:</span> {summary.totalStudents}
            </p>
            <p>
              <span className="font-medium">Total assessment items/skills:</span> {summary.totalSkills}
            </p>
            <p>
              <span className="font-medium">Total expected cells:</span> {summary.totalCells}
            </p>
            <p>
              <span className="font-medium">Completed cells:</span> {summary.assessedCells}
            </p>
            <p>
              <span className="font-medium">Incomplete cells:</span> {summary.remainingCells}
            </p>
            <p>
              <span className="font-medium">Completion percentage:</span> {summary.completionPercentage}%
            </p>
          </div>

          <div className="mt-3">
            <p className="font-medium">Murid belum lengkap taksir:</p>
            {studentsNotFullyAssessed.length === 0 ? (
              <p className="mt-1 rounded-md bg-emerald-50 px-3 py-2 text-emerald-700">
                Semua murid sudah lengkap untuk tarikh ini.
              </p>
            ) : (
              <ul className="mt-2 space-y-1">
                {studentsNotFullyAssessed.map((row) => (
                  <li key={row.studentId} className="rounded-md bg-amber-50 px-3 py-2 text-amber-800">
                    {row.studentName} - {row.completedSkills}/{row.expectedSkills} selesai (baki {row.incompleteSkills})
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="assessment-date" className="font-medium">
              Tarikh:
            </label>
            <input
              id="assessment-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-md border border-slate-300 px-2 py-1"
            />
            <label htmlFor="view-filter" className="font-medium">
              Filter:
            </label>
            <select
              id="view-filter"
              value={viewFilter}
              onChange={(e) => setViewFilter(e.target.value as "all" | "incomplete")}
              className="rounded-md border border-slate-300 px-2 py-1"
            >
              <option value="all">Show all</option>
              <option value="incomplete">Show incomplete students</option>
            </select>
          </div>
          <p className="text-slate-600">
            TP indicator: TP1 / TP2 / TP3 / TP4 / TP5 / TP6
          </p>
        </section>

        {loadingDateData ? (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Memuatkan data pentaksiran untuk tarikh dipilih...
          </p>
        ) : null}

        <section className="mt-6 rounded-md border border-slate-200">
          <div className="max-h-[70vh] overflow-auto">
            <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky top-0 left-0 z-30 border border-slate-200 bg-slate-100 px-3 py-2 text-left">
                  Murid
                </th>
                {skills.map((skill) => (
                  <th
                    key={skill.id}
                    className="sticky top-0 z-20 border border-slate-200 bg-slate-50 px-3 py-2 text-left"
                  >
                    {skill.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={Math.max(1, skills.length + 1)}
                    className="border border-slate-200 px-3 py-3 text-slate-600"
                  >
                    Tiada murid untuk dipaparkan bagi filter semasa.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id}>
                    <td className="sticky left-0 z-10 border border-slate-200 bg-white px-3 py-2">
                      {student.full_name}
                    </td>
                    {skills.length === 0 ? (
                      <td className="border border-slate-200 px-3 py-2 text-slate-500">-</td>
                    ) : (
                      skills.map((skill) => {
                        const key = buildCellKey(student.id, skill.id);
                        const status = cellStatus[key] ?? "idle";
                        const statusText =
                          status === "saving"
                            ? "saving"
                            : status === "saved"
                              ? "saved"
                              : status === "error"
                                ? "error"
                                : "";

                        return (
                          <td key={key} className="border border-slate-200 px-3 py-2">
                            <div className="flex flex-col gap-1">
                              <select
                                value={cellValues[key] ?? ""}
                                onChange={(e) => void handleTpChange(student.id, skill.id, e.target.value)}
                                className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                              >
                                {TP_OPTIONS.map((opt) => (
                                  <option key={opt.value || "empty"} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              {statusText ? (
                                <span
                                  className={`text-xs ${
                                    statusText === "error"
                                      ? "text-red-600"
                                      : statusText === "saving"
                                        ? "text-amber-600"
                                        : "text-emerald-600"
                                  }`}
                                >
                                  {statusText}
                                </span>
                              ) : null}
                              {cellValues[key] ? (
                                <span className="text-xs text-slate-600">{cellValues[key]}</span>
                              ) : null}
                              {cellError[key] ? (
                                <span className="text-xs text-red-600">{cellError[key]}</span>
                              ) : null}
                            </div>
                          </td>
                        );
                      })
                    )}
                  </tr>
                ))
              )}
            </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

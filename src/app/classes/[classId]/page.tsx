"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
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
  student_no: string | null;
  gender: string | null;
};

type SubjectItem = {
  id: string;
  name: string;
  code: string | null;
  year_label: string | null;
};

type ClassSubjectMap = {
  subject_id: string;
};

type SkillItem = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  display_order: number;
};

type MasteryLevel = "TP1" | "TP2" | "TP3" | "TP4" | "TP5" | "TP6";

const TP_OPTIONS: Array<{ value: ""; label: "Belum Taksir" } | { value: MasteryLevel; label: MasteryLevel }> = [
  { value: "", label: "Belum Taksir" },
  { value: "TP1", label: "TP1" },
  { value: "TP2", label: "TP2" },
  { value: "TP3", label: "TP3" },
  { value: "TP4", label: "TP4" },
  { value: "TP5", label: "TP5" },
  { value: "TP6", label: "TP6" },
];

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeStudentName(value: string) {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function getNameMarkerPriority(value: string) {
  const text = normalizeStudentName(value);
  if (/\bBIN\b/.test(text) || /\bA\/L\b/.test(text)) return 1; // Lelaki
  if (/\bBINTI\b/.test(text) || /\bA\/P\b/.test(text)) return 2; // Perempuan
  return 3; // Lain/unknown
}

function sortStudentsByNameRule<T extends { full_name: string }>(items: T[]) {
  return [...items].sort((a, b) => {
    const markerCompare = getNameMarkerPriority(a.full_name) - getNameMarkerPriority(b.full_name);
    if (markerCompare !== 0) return markerCompare;

    const nameA = normalizeStudentName(a.full_name);
    const nameB = normalizeStudentName(b.full_name);
    const nameCompare = nameA.localeCompare(nameB, "ms");
    if (nameCompare !== 0) return nameCompare;

    return a.full_name.localeCompare(b.full_name, "ms");
  });
}

export default function ClassStudentsPage() {
  const isTestingMode = process.env.NODE_ENV !== "production";
  const router = useRouter();
  const params = useParams<{ classId: string }>();
  const classId = params.classId;

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [bulkCreating, setBulkCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [setupSubjectModalOpen, setSetupSubjectModalOpen] = useState(false);
  const [subjectSavingId, setSubjectSavingId] = useState<string | null>(null);
  const [studentAssessmentModalOpen, setStudentAssessmentModalOpen] = useState(false);
  const [studentAssessmentLoading, setStudentAssessmentLoading] = useState(false);
  const [studentAssessmentSaving, setStudentAssessmentSaving] = useState(false);
  const [deletingClass, setDeletingClass] = useState(false);
  const [updatingClass, setUpdatingClass] = useState(false);
  const [classEditModalOpen, setClassEditModalOpen] = useState(false);
  const [updatingStudentId, setUpdatingStudentId] = useState<string | null>(null);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [navigatingLabel, setNavigatingLabel] = useState("");

  const [error, setError] = useState("");
  const [classDeleteError, setClassDeleteError] = useState("");
  const [classDeleteSuccess, setClassDeleteSuccess] = useState("");
  const [classEditError, setClassEditError] = useState("");
  const [classEditSuccess, setClassEditSuccess] = useState("");
  const [setupError, setSetupError] = useState("");
  const [setupSuccess, setSetupSuccess] = useState("");
  const [subjectSetupError, setSubjectSetupError] = useState("");
  const [subjectSetupSuccess, setSubjectSetupSuccess] = useState("");
  const [studentAssessmentError, setStudentAssessmentError] = useState("");
  const [studentAssessmentSuccess, setStudentAssessmentSuccess] = useState("");

  const [bulkText, setBulkText] = useState("");
  const [bulkResult, setBulkResult] = useState("");

  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [classSubjectMaps, setClassSubjectMaps] = useState<ClassSubjectMap[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedAssessmentSubjectId, setSelectedAssessmentSubjectId] = useState("");
  const [selectedAssessmentDate, setSelectedAssessmentDate] = useState(getTodayDate());
  const [assessmentSkills, setAssessmentSkills] = useState<SkillItem[]>([]);
  const [assessmentSkillValues, setAssessmentSkillValues] = useState<Record<string, string>>({});

  const [fullName, setFullName] = useState("");
  const [studentNo, setStudentNo] = useState("");
  const [gender, setGender] = useState("");
  const [editClassName, setEditClassName] = useState("");
  const [editClassYearLabel, setEditClassYearLabel] = useState("");
  const [editClassAcademicYear, setEditClassAcademicYear] = useState("");
  const [editStudentName, setEditStudentName] = useState("");
  const [editStudentNo, setEditStudentNo] = useState("");
  const [editStudentGender, setEditStudentGender] = useState("");

  const loadStudents = async (workspaceId: string, targetClassId: string) => {
    const { data, error: studentsError } = await supabase
      .from("students")
      .select("id, full_name, student_no, gender")
      .eq("workspace_id", workspaceId)
      .eq("class_id", targetClassId);

    if (studentsError) {
      setError(studentsError.message);
      return;
    }

    const rows = (data ?? []) as Student[];
    setStudents(sortStudentsByNameRule(rows));
  };

  const loadSubjects = async (workspaceId: string) => {
    const { data, error: subjectError } = await supabase
      .from("subjects")
      .select("id, name, code, year_label")
      .eq("workspace_id", workspaceId)
      .order("name", { ascending: true });

    if (subjectError) {
      setError(subjectError.message);
      return;
    }

    setSubjects((data ?? []) as SubjectItem[]);
  };

  const loadClassSubjectMaps = async (workspaceId: string, targetClassId: string) => {
    const { data, error: classSubjectsError } = await supabase
      .from("class_subjects")
      .select("subject_id")
      .eq("workspace_id", workspaceId)
      .eq("class_id", targetClassId);

    if (classSubjectsError) {
      setError(classSubjectsError.message);
      return;
    }

    setClassSubjectMaps((data ?? []) as ClassSubjectMap[]);
  };

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
      await loadStudents(ws.id, classId);
      await loadSubjects(ws.id);
      await loadClassSubjectMaps(ws.id, classId);
      setLoading(false);
    };

    void loadPage();
  }, [classId, router]);

  const clearSetupMessage = () => {
    setSetupError("");
    setSetupSuccess("");
    setBulkResult("");
  };

  const clearSubjectSetupMessage = () => {
    setSubjectSetupError("");
    setSubjectSetupSuccess("");
  };

  const openSetupModal = () => {
    clearSetupMessage();
    setSetupModalOpen(true);
  };

  const closeSetupModal = () => {
    setSetupModalOpen(false);
    clearSetupMessage();
  };

  const openSetupSubjectModal = () => {
    clearSubjectSetupMessage();
    setSetupSubjectModalOpen(true);
  };

  const closeSetupSubjectModal = () => {
    clearSubjectSetupMessage();
    setSetupSubjectModalOpen(false);
  };

  const openClassEditModal = () => {
    if (!classInfo) return;
    setClassEditError("");
    setClassEditSuccess("");
    setEditClassName(classInfo.name);
    setEditClassYearLabel(classInfo.year_label);
    setEditClassAcademicYear(classInfo.academic_year);
    setClassEditModalOpen(true);
  };

  const closeClassEditModal = () => {
    setClassEditModalOpen(false);
    setClassEditError("");
  };

  const handleAddStudent = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!workspace || !classInfo || !user) {
      setSetupError("Data workspace/class/user belum lengkap.");
      return;
    }

    setCreating(true);
    setSetupError("");
    setSetupSuccess("");

    const { error: insertError } = await supabase.from("students").insert({
      workspace_id: workspace.id,
      class_id: classInfo.id,
      full_name: fullName.trim(),
      student_no: studentNo.trim() || null,
      gender: gender.trim() || null,
      created_by: user.id,
    });

    if (insertError) {
      setSetupError(insertError.message);
      setCreating(false);
      return;
    }

    setFullName("");
    setStudentNo("");
    setGender("");
    setSetupSuccess("Murid berjaya ditambah.");
    await loadStudents(workspace.id, classInfo.id);
    setCreating(false);
  };

  const handleBulkAddStudents = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!workspace || !classInfo || !user) {
      setSetupError("Data workspace/class/user belum lengkap.");
      return;
    }

    setBulkCreating(true);
    setSetupError("");
    setSetupSuccess("");
    setBulkResult("");

    const lines = bulkText.split(/\r?\n/);
    const validRows: Array<{
      workspace_id: string;
      class_id: string;
      full_name: string;
      student_no: string | null;
      gender: string | null;
      created_by: string;
    }> = [];

    let skipped = 0;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        skipped += 1;
        continue;
      }

      const parts = line.split(",").map((p) => p.trim());

      if (parts.length !== 1 && parts.length !== 3) {
        skipped += 1;
        continue;
      }

      const parsedName = parts[0] ?? "";
      if (!parsedName) {
        skipped += 1;
        continue;
      }

      const parsedStudentNo = parts.length === 3 ? (parts[1] || null) : null;
      const parsedGender = parts.length === 3 ? (parts[2] || null) : null;

      validRows.push({
        workspace_id: workspace.id,
        class_id: classInfo.id,
        full_name: parsedName,
        student_no: parsedStudentNo,
        gender: parsedGender,
        created_by: user.id,
      });
    }

    if (validRows.length === 0) {
      setSetupError("Tiada baris valid untuk dimasukkan.");
      setBulkCreating(false);
      return;
    }

    const sortedValidRows = sortStudentsByNameRule(validRows);
    const { error: insertError } = await supabase.from("students").insert(sortedValidRows);

    if (insertError) {
      setSetupError(insertError.message);
      setBulkResult(`Ditambah: 0 | Skipped: ${skipped} | Failed: ${sortedValidRows.length}`);
      setBulkCreating(false);
      return;
    }

    setBulkText("");
    await loadStudents(workspace.id, classInfo.id);
    setSetupSuccess("Bulk murid berjaya disimpan.");
    setBulkResult(`Ditambah: ${sortedValidRows.length} | Skipped: ${skipped} | Failed: 0`);
    setBulkCreating(false);
  };

  const startEditStudent = (student: Student) => {
    setEditingStudentId(student.id);
    setEditStudentName(student.full_name);
    setEditStudentNo(student.student_no ?? "");
    setEditStudentGender(student.gender ?? "");
    setSetupError("");
    setSetupSuccess("");
  };

  const cancelEditStudent = () => {
    setEditingStudentId(null);
    setEditStudentName("");
    setEditStudentNo("");
    setEditStudentGender("");
  };

  const handleUpdateStudent = async (studentId: string) => {
    if (!workspace || !classInfo) {
      setSetupError("Data workspace/class belum lengkap.");
      return;
    }

    if (!editStudentName.trim()) {
      setSetupError("Nama murid wajib diisi.");
      return;
    }

    setUpdatingStudentId(studentId);
    setSetupError("");
    setSetupSuccess("");

    const { error: updateError } = await supabase
      .from("students")
      .update({
        full_name: editStudentName.trim(),
        student_no: editStudentNo.trim() || null,
        gender: editStudentGender.trim() || null,
      })
      .eq("id", studentId)
      .eq("workspace_id", workspace.id)
      .eq("class_id", classInfo.id);

    if (updateError) {
      setSetupError(updateError.message);
      setUpdatingStudentId(null);
      return;
    }

    await loadStudents(workspace.id, classInfo.id);
    setSetupSuccess("Maklumat murid berjaya dikemaskini.");
    setUpdatingStudentId(null);
    cancelEditStudent();
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!workspace || !classInfo) {
      setSetupError("Data workspace/class belum lengkap.");
      return;
    }

    const targetStudent = students.find((s) => s.id === studentId);
    const confirmed = window.confirm(
      `Padam murid "${targetStudent?.full_name ?? "ini"}"? Tindakan ini tidak boleh diundur.`,
    );
    if (!confirmed) {
      return;
    }

    setDeletingId(studentId);
    setSetupError("");
    setSetupSuccess("");

    const { count: assessmentsCount, error: assessmentsCheckError } = await supabase
      .from("assessments")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .eq("class_id", classInfo.id)
      .eq("student_id", studentId);

    if (assessmentsCheckError) {
      setSetupError(assessmentsCheckError.message);
      setDeletingId(null);
      return;
    }

    const { count: sessionsCount, error: sessionsCheckError } = await supabase
      .from("assessment_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .eq("class_id", classInfo.id)
      .eq("student_id", studentId);

    if (sessionsCheckError) {
      setSetupError(sessionsCheckError.message);
      setDeletingId(null);
      return;
    }

    if ((assessmentsCount ?? 0) > 0 || (sessionsCount ?? 0) > 0) {
      setSetupError(
        `Murid tidak boleh dipadam. Masih ada rekod pentaksiran: assessment lama=${assessmentsCount ?? 0}, assessment session baru=${sessionsCount ?? 0}.${isTestingMode ? " Gunakan Force Delete (Testing) jika ini data ujian." : ""}`,
      );
      setDeletingId(null);
      return;
    }

    const { error: deleteError } = await supabase
      .from("students")
      .delete()
      .eq("id", studentId)
      .eq("workspace_id", workspace.id)
      .eq("class_id", classInfo.id);

    if (deleteError) {
      setSetupError(deleteError.message);
      setDeletingId(null);
      return;
    }

    await loadStudents(workspace.id, classInfo.id);
    setSetupSuccess("Murid berjaya dipadam.");
    setDeletingId(null);
  };

  const handleForceDeleteStudent = async (studentId: string) => {
    if (!workspace || !classInfo) {
      setSetupError("Data workspace/class belum lengkap.");
      return;
    }

    const targetStudent = students.find((s) => s.id === studentId);
    const confirmed = window.confirm(
      `Force delete murid "${targetStudent?.full_name ?? "ini"}"?\nIni akan padam data berkaitan termasuk pentaksiran.`,
    );
    if (!confirmed) return;

    setDeletingId(studentId);
    setSetupError("");
    setSetupSuccess("");

    const { error: deleteAssessmentsError } = await supabase
      .from("assessments")
      .delete()
      .eq("workspace_id", workspace.id)
      .eq("class_id", classInfo.id)
      .eq("student_id", studentId);

    if (deleteAssessmentsError) {
      setSetupError(deleteAssessmentsError.message);
      setDeletingId(null);
      return;
    }

    const { data: sessionRows, error: sessionsListError } = await supabase
      .from("assessment_sessions")
      .select("id")
      .eq("workspace_id", workspace.id)
      .eq("class_id", classInfo.id)
      .eq("student_id", studentId);

    if (sessionsListError) {
      setSetupError(sessionsListError.message);
      setDeletingId(null);
      return;
    }

    const sessionIds = (sessionRows ?? []).map((row) => String(row.id));
    if (sessionIds.length > 0) {
      const { error: deleteSessionItemsError } = await supabase
        .from("assessment_session_items")
        .delete()
        .eq("workspace_id", workspace.id)
        .in("session_id", sessionIds);

      if (deleteSessionItemsError) {
        setSetupError(deleteSessionItemsError.message);
        setDeletingId(null);
        return;
      }
    }

    const { error: deleteSessionsError } = await supabase
      .from("assessment_sessions")
      .delete()
      .eq("workspace_id", workspace.id)
      .eq("class_id", classInfo.id)
      .eq("student_id", studentId);

    if (deleteSessionsError) {
      setSetupError(deleteSessionsError.message);
      setDeletingId(null);
      return;
    }

    const { error: deleteStudentError } = await supabase
      .from("students")
      .delete()
      .eq("id", studentId)
      .eq("workspace_id", workspace.id)
      .eq("class_id", classInfo.id);

    if (deleteStudentError) {
      setSetupError(deleteStudentError.message);
      setDeletingId(null);
      return;
    }

    await loadStudents(workspace.id, classInfo.id);
    setSetupSuccess("Force delete murid berjaya.");
    setDeletingId(null);
  };

  const handleAssignSubjectToClass = async (subjectId: string) => {
    if (!workspace || !classInfo || !user) {
      setSubjectSetupError("Data workspace/class/user belum lengkap.");
      return;
    }

    setSubjectSavingId(subjectId);
    setSubjectSetupError("");
    setSubjectSetupSuccess("");

    const { error: insertError } = await supabase
      .from("class_subjects")
      .insert({
        workspace_id: workspace.id,
        class_id: classInfo.id,
        subject_id: subjectId,
        created_by: user.id,
      });

    if (insertError) {
      setSubjectSetupError(insertError.message);
      setSubjectSavingId(null);
      return;
    }

    await loadClassSubjectMaps(workspace.id, classInfo.id);
    setSubjectSetupSuccess("Subjek berjaya assign pada kelas.");
    setSubjectSavingId(null);
  };

  const handleUnassignSubjectFromClass = async (subjectId: string) => {
    if (!workspace || !classInfo) {
      setSubjectSetupError("Data workspace/class belum lengkap.");
      return;
    }

    setSubjectSavingId(subjectId);
    setSubjectSetupError("");
    setSubjectSetupSuccess("");

    const { error: deleteError } = await supabase
      .from("class_subjects")
      .delete()
      .eq("workspace_id", workspace.id)
      .eq("class_id", classInfo.id)
      .eq("subject_id", subjectId);

    if (deleteError) {
      setSubjectSetupError(deleteError.message);
      setSubjectSavingId(null);
      return;
    }

    await loadClassSubjectMaps(workspace.id, classInfo.id);
    setSubjectSetupSuccess("Subjek berjaya buang dari kelas.");
    setSubjectSavingId(null);
  };

  const classSubjectIdSet = new Set(classSubjectMaps.map((row) => row.subject_id));
  const assignedSubjects = subjects.filter((subject) => classSubjectIdSet.has(subject.id));

  const openStudentAssessmentModal = (student: Student) => {
    setSelectedStudent(student);
    setSelectedAssessmentDate(getTodayDate());
    setStudentAssessmentError("");
    setStudentAssessmentSuccess("");
    setAssessmentSkillValues({});
    setAssessmentSkills([]);

    const firstSubjectId = assignedSubjects[0]?.id ?? "";
    setSelectedAssessmentSubjectId(firstSubjectId);
    setStudentAssessmentModalOpen(true);
  };

  const closeStudentAssessmentModal = () => {
    setStudentAssessmentModalOpen(false);
    setSelectedStudent(null);
    setStudentAssessmentError("");
    setStudentAssessmentSuccess("");
    setAssessmentSkillValues({});
    setAssessmentSkills([]);
  };

  useEffect(() => {
    const loadStudentAssessmentDraft = async () => {
      if (
        !studentAssessmentModalOpen ||
        !workspace ||
        !classInfo ||
        !selectedStudent ||
        !selectedAssessmentSubjectId
      ) {
        return;
      }

      setStudentAssessmentLoading(true);
      setStudentAssessmentError("");
      setStudentAssessmentSuccess("");
      setAssessmentSkillValues({});

      const { data: skillRows, error: skillsError } = await supabase
        .from("skills")
        .select("id, name, code, description, display_order")
        .eq("workspace_id", workspace.id)
        .eq("subject_id", selectedAssessmentSubjectId)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });

      if (skillsError) {
        setStudentAssessmentError(skillsError.message);
        setAssessmentSkills([]);
        setStudentAssessmentLoading(false);
        return;
      }

      const loadedSkills = (skillRows ?? []) as SkillItem[];
      setAssessmentSkills(loadedSkills);

      if (loadedSkills.length === 0) {
        setAssessmentSkillValues({});
        setStudentAssessmentLoading(false);
        return;
      }

      const skillIds = loadedSkills.map((item) => item.id);
      const { data: assessmentRows, error: assessmentsError } = await supabase
        .from("assessments")
        .select("skill_id, mastery_level")
        .eq("workspace_id", workspace.id)
        .eq("class_id", classInfo.id)
        .eq("subject_id", selectedAssessmentSubjectId)
        .eq("student_id", selectedStudent.id)
        .eq("recorded_at", selectedAssessmentDate)
        .in("skill_id", skillIds);

      if (assessmentsError) {
        setStudentAssessmentError(assessmentsError.message);
        setStudentAssessmentLoading(false);
        return;
      }

      const initialValues: Record<string, string> = {};
      for (const row of assessmentRows ?? []) {
        initialValues[String(row.skill_id)] = String(row.mastery_level ?? "");
      }
      setAssessmentSkillValues(initialValues);
      setStudentAssessmentLoading(false);
    };

    void loadStudentAssessmentDraft();
  }, [
    studentAssessmentModalOpen,
    workspace,
    classInfo,
    selectedStudent,
    selectedAssessmentSubjectId,
    selectedAssessmentDate,
  ]);

  const handleBatchSaveStudentAssessment = async () => {
    if (
      !workspace ||
      !classInfo ||
      !selectedStudent ||
      !selectedAssessmentSubjectId ||
      !user
    ) {
      setStudentAssessmentError("Data pentaksiran belum lengkap.");
      return;
    }

    setStudentAssessmentSaving(true);
    setStudentAssessmentError("");
    setStudentAssessmentSuccess("");

    const toUpsert = assessmentSkills
      .map((skill) => {
        const level = assessmentSkillValues[skill.id] ?? "";
        if (!level) return null;
        return {
          workspace_id: workspace.id,
          class_id: classInfo.id,
          subject_id: selectedAssessmentSubjectId,
          student_id: selectedStudent.id,
          skill_id: skill.id,
          mastery_level: level as MasteryLevel,
          recorded_by: user.id,
          recorded_at: selectedAssessmentDate,
        };
      })
      .filter(
        (
          item,
        ): item is {
          workspace_id: string;
          class_id: string;
          subject_id: string;
          student_id: string;
          skill_id: string;
          mastery_level: MasteryLevel;
          recorded_by: string;
          recorded_at: string;
        } => item !== null,
      );

    const deleteSkillIds = assessmentSkills
      .filter((skill) => !assessmentSkillValues[skill.id])
      .map((skill) => skill.id);

    if (deleteSkillIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("assessments")
        .delete()
        .eq("workspace_id", workspace.id)
        .eq("class_id", classInfo.id)
        .eq("subject_id", selectedAssessmentSubjectId)
        .eq("student_id", selectedStudent.id)
        .eq("recorded_at", selectedAssessmentDate)
        .in("skill_id", deleteSkillIds);

      if (deleteError) {
        setStudentAssessmentError(deleteError.message);
        setStudentAssessmentSaving(false);
        return;
      }
    }

    if (toUpsert.length > 0) {
      const { error: upsertError } = await supabase.from("assessments").upsert(toUpsert, {
        onConflict: "class_id,subject_id,student_id,skill_id,recorded_at",
      });

      if (upsertError) {
        setStudentAssessmentError(upsertError.message);
        setStudentAssessmentSaving(false);
        return;
      }
    }

    setStudentAssessmentSuccess("Pentaksiran murid berjaya disimpan.");
    setStudentAssessmentSaving(false);
  };

  const handleUpdateClass = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!workspace || !classInfo) {
      setClassEditError("Data workspace/class belum lengkap.");
      return;
    }

    if (!editClassName.trim() || !editClassYearLabel.trim() || !editClassAcademicYear.trim()) {
      setClassEditError("Nama kelas, year label dan academic year wajib diisi.");
      return;
    }

    setUpdatingClass(true);
    setClassEditError("");
    setClassEditSuccess("");

    const { error: updateError } = await supabase
      .from("classes")
      .update({
        name: editClassName.trim(),
        year_label: editClassYearLabel.trim(),
        academic_year: editClassAcademicYear.trim(),
      })
      .eq("id", classInfo.id)
      .eq("workspace_id", workspace.id);

    if (updateError) {
      setClassEditError(updateError.message);
      setUpdatingClass(false);
      return;
    }

    const nextClassInfo: ClassInfo = {
      ...classInfo,
      name: editClassName.trim(),
      year_label: editClassYearLabel.trim(),
      academic_year: editClassAcademicYear.trim(),
    };
    setClassInfo(nextClassInfo);
    setClassEditSuccess("Maklumat kelas berjaya dikemaskini.");
    setUpdatingClass(false);
    setClassEditModalOpen(false);
  };

  const handleDeleteClass = async () => {
    if (!workspace || !classInfo) {
      setClassDeleteError("Data workspace/class belum lengkap.");
      return;
    }

    const confirmed = window.confirm(
      `Padam kelas "${classInfo.name}"?\nIni akan padam data berkaitan termasuk pentaksiran.`,
    );
    if (!confirmed) return;

    setDeletingClass(true);
    setClassDeleteError("");
    setClassDeleteSuccess("");

    const { data: logId, error: archiveError } = await supabase.rpc("archive_delete_class", {
      p_workspace_id: workspace.id,
      p_class_id: classInfo.id,
    });

    if (archiveError) {
      setClassDeleteError(archiveError.message);
      setDeletingClass(false);
      return;
    }

    setClassDeleteSuccess(
      `Kelas "${classInfo.name}" berjaya dipadam. Anda boleh restore semula di halaman Log. Ref: ${String(logId ?? "-")}`,
    );
    setDeletingClass(false);
    router.replace("/dashboard");
  };

  if (loading) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">Loading class page...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Class Students</h1>
            <p className="mt-1 text-sm text-slate-600">
              Fokus utama: senarai murid kelas semasa.
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-stretch sm:justify-end">
            <button
              type="button"
              onClick={openSetupModal}
              className="min-w-0 rounded-md bg-slate-900 px-3 py-2 text-center text-sm font-medium text-white sm:flex-none sm:whitespace-nowrap"
            >
              Setup Murid
            </button>
            <button
              type="button"
              onClick={openSetupSubjectModal}
              className="min-w-0 rounded-md border border-slate-300 px-3 py-2 text-center text-sm sm:flex-none sm:whitespace-nowrap"
            >
              Setup Subjek Kelas
            </button>
            <Link
              href={`/classes/${classId}/reports/monthly`}
              onClick={() => setNavigatingLabel("Membuka laporan bulanan...")}
              className="min-w-0 rounded-md border border-slate-300 px-3 py-2 text-center text-sm sm:flex-none sm:whitespace-nowrap"
            >
              Cetak Laporan Bulanan
            </Link>
            <Link
              href="/logs"
              onClick={() => setNavigatingLabel("Membuka log padam...")}
              className="min-w-0 rounded-md border border-slate-300 px-3 py-2 text-center text-sm sm:flex-none sm:whitespace-nowrap"
            >
              Log Padam
            </Link>
            <Link
              href="/dashboard"
              onClick={() => setNavigatingLabel("Kembali ke dashboard...")}
              className="min-w-0 rounded-md border border-slate-300 px-3 py-2 text-center text-sm sm:flex-none sm:whitespace-nowrap"
            >
              Kembali Dashboard
            </Link>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {classDeleteError ? (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {classDeleteError}
          </p>
        ) : null}
        {classDeleteSuccess ? (
          <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {classDeleteSuccess}
          </p>
        ) : null}
        {classEditSuccess ? (
          <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {classEditSuccess}
          </p>
        ) : null}

        {classInfo ? (
          <section className="mt-6 rounded-md border border-slate-200 p-3 text-sm">
            <p>
              <span className="font-medium">Class:</span> {classInfo.name}
            </p>
            <p>
              <span className="font-medium">Year label:</span> {classInfo.year_label}
            </p>
            <p>
              <span className="font-medium">Academic year:</span> {classInfo.academic_year}
            </p>
            <p>
              <span className="font-medium">Workspace:</span> {workspace?.name ?? "-"}
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
              <button
                type="button"
                onClick={openClassEditModal}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 sm:w-auto"
              >
                Edit Kelas
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteClass()}
                disabled={deletingClass}
                className="w-full rounded-md border border-red-300 px-3 py-2 text-xs font-medium text-red-700 disabled:opacity-60 sm:w-auto"
              >
                {deletingClass ? "Memadam kelas..." : "Padam Kelas"}
              </button>
            </div>
          </section>
        ) : null}

        <section className="mt-6">
          <h2 className="text-base font-semibold">Students List</h2>

          {students.length === 0 ? (
            <p className="mt-2 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">
              Tiada murid lagi untuk kelas ini.
            </p>
          ) : (
            <div className="mt-3 rounded-md border border-slate-200 p-3">
              <div className="mb-3 rounded-md bg-slate-50 px-3 py-2 text-sm">
                <span className="font-medium">Jumlah murid:</span> {students.length}
              </div>
              <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 xl:grid-cols-3">
                {students.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => openStudentAssessmentModal(student)}
                    className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-slate-300 hover:shadow"
                  >
                    <p
                      title={student.full_name}
                      className="min-h-[3.25rem] text-lg font-semibold leading-6 text-slate-900"
                    >
                      {student.full_name}
                    </p>
                    <p className="mt-2 text-sm leading-5 text-slate-600">
                      No: {student.student_no ?? "-"} | Gender: {student.gender ?? "-"}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="mt-6">
          <h2 className="text-base font-semibold">Assessment</h2>
          {assignedSubjects.length === 0 ? (
            <p className="mt-2 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">
              Tiada subject di-assign pada kelas ini. Klik `Setup Subjek Kelas`.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {assignedSubjects.map((subject) => (
                <li key={subject.id} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{subject.name}</p>
                      <p className="text-slate-600">
                        Code: {subject.code ?? "-"} | Year: {subject.year_label ?? "-"}
                      </p>
                    </div>
                    <Link
                      href={`/classes/${classId}/subjects/${subject.id}/assessments`}
                      onClick={() => setNavigatingLabel(`Membuka assessment ${subject.name}...`)}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    >
                      Buka Assessment
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      {navigatingLabel ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-lg">
            {navigatingLabel}
          </div>
        </div>
      ) : null}

      {classEditModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Edit Kelas</h2>
                <p className="mt-1 text-sm text-slate-600">Kemaskini maklumat asas kelas.</p>
              </div>
              <button
                type="button"
                onClick={closeClassEditModal}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                Tutup
              </button>
            </div>

            {classEditError ? (
              <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {classEditError}
              </p>
            ) : null}

            <form onSubmit={handleUpdateClass} className="mt-4 grid gap-2">
              <input
                type="text"
                value={editClassName}
                onChange={(e) => setEditClassName(e.target.value)}
                placeholder="Nama kelas"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <input
                type="text"
                value={editClassYearLabel}
                onChange={(e) => setEditClassYearLabel(e.target.value)}
                placeholder="Year label"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <input
                type="text"
                value={editClassAcademicYear}
                onChange={(e) => setEditClassAcademicYear(e.target.value)}
                placeholder="Academic year"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeClassEditModal}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingClass}
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {updatingClass ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {studentAssessmentModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-2 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-xl sm:p-5">
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-start sm:gap-4">
              <div>
                <h2 className="text-lg font-semibold">Pentaksiran Murid</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedStudent ? selectedStudent.full_name : "-"}
                </p>
              </div>
              <button
                type="button"
                onClick={closeStudentAssessmentModal}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                Tutup
              </button>
            </div>

            <section className="mt-4 grid gap-2 rounded-md border border-slate-200 p-3 md:grid-cols-2">
              <div className="min-w-0 space-y-1">
                <label htmlFor="student-assessment-subject" className="text-sm font-medium">
                  Subject
                </label>
                <select
                  id="student-assessment-subject"
                  value={selectedAssessmentSubjectId}
                  onChange={(e) => setSelectedAssessmentSubjectId(e.target.value)}
                  className="w-full min-w-0 rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  {assignedSubjects.length === 0 ? (
                    <option value="">Tiada subject di-assign</option>
                  ) : null}
                  {assignedSubjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0 space-y-1">
                <label htmlFor="student-assessment-date" className="text-sm font-medium">
                  Tarikh
                </label>
                <input
                  id="student-assessment-date"
                  type="date"
                  value={selectedAssessmentDate}
                  onChange={(e) => setSelectedAssessmentDate(e.target.value)}
                  className="w-full min-w-0 rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </section>

            {studentAssessmentError ? (
              <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {studentAssessmentError}
              </p>
            ) : null}
            {studentAssessmentSuccess ? (
              <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {studentAssessmentSuccess}
              </p>
            ) : null}

            {studentAssessmentLoading ? (
              <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Memuatkan kemahiran dan rekod semasa...
              </p>
            ) : null}

            <section className="mt-4">
              <h3 className="text-base font-semibold">Kemahiran</h3>
              {selectedAssessmentSubjectId === "" ? (
                <p className="mt-2 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">
                  Pilih subject dulu.
                </p>
              ) : assessmentSkills.length === 0 ? (
                <p className="mt-2 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">
                  Tiada kemahiran untuk subject ini.
                </p>
              ) : (
                <div className="mt-2 overflow-x-auto rounded-md border border-slate-200">
                  <table className="min-w-[720px] w-full border-collapse text-sm">
                    <thead>
                      <tr>
                        <th className="border border-slate-200 bg-slate-50 px-3 py-2 text-left">Bil</th>
                        <th className="border border-slate-200 bg-slate-50 px-3 py-2 text-left">Kemahiran</th>
                        <th className="border border-slate-200 bg-slate-50 px-3 py-2 text-left">Maklumat</th>
                        <th className="border border-slate-200 bg-slate-50 px-3 py-2 text-left">Tahap</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assessmentSkills.map((skill, index) => (
                        <tr key={skill.id}>
                          <td className="border border-slate-200 px-3 py-2 font-medium text-slate-700">{index + 1}</td>
                          <td className="border border-slate-200 px-3 py-2 font-medium">{skill.name}</td>
                          <td className="border border-slate-200 px-3 py-2 text-slate-600">
                            Code: {skill.code ?? "-"} | Order: {skill.display_order}
                          </td>
                          <td className="border border-slate-200 px-3 py-2">
                            <select
                              value={assessmentSkillValues[skill.id] ?? ""}
                              onChange={(e) =>
                                setAssessmentSkillValues((prev) => ({
                                  ...prev,
                                  [skill.id]: e.target.value,
                                }))
                              }
                              className="w-full min-w-36 rounded-md border border-slate-300 px-2 py-1 text-sm"
                            >
                              {TP_OPTIONS.map((opt) => (
                                <option key={opt.value || "empty"} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <div className="mt-4 flex justify-stretch sm:justify-end">
              <button
                type="button"
                onClick={() => void handleBatchSaveStudentAssessment()}
                disabled={
                  studentAssessmentSaving ||
                  selectedAssessmentSubjectId === "" ||
                  assessmentSkills.length === 0
                }
                className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 sm:w-auto"
              >
                {studentAssessmentSaving ? "Menyimpan..." : "Simpan Pentaksiran Murid"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {setupModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Setup Murid</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Tambah single, bulk paste, dan padam murid kelas ini.
                </p>
              </div>
              <button
                type="button"
                onClick={closeSetupModal}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                Tutup
              </button>
            </div>

            {setupError ? (
              <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{setupError}</p>
            ) : null}
            {setupSuccess ? (
              <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{setupSuccess}</p>
            ) : null}
            {bulkResult ? (
              <p className="mt-2 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">{bulkResult}</p>
            ) : null}

            <section className="mt-5">
              <h3 className="text-base font-semibold">Tambah Murid (Single)</h3>
              <form onSubmit={handleAddStudent} className="mt-2 grid gap-2 rounded-md border border-slate-200 p-3">
                <input
                  type="text"
                  placeholder="Nama penuh murid"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                />
                <input
                  type="text"
                  placeholder="No murid (optional)"
                  value={studentNo}
                  onChange={(e) => setStudentNo(e.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="Gender (optional)"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {creating ? "Menyimpan..." : "Tambah Murid"}
                </button>
              </form>
            </section>

            <section className="mt-5">
              <h3 className="text-base font-semibold">Bulk Paste Murid</h3>
              <p className="mt-1 text-sm text-slate-600">
                Format: `Nama Penuh` atau `Nama Penuh,NoMurid,Gender` (1 baris = 1 murid).
              </p>
              <form onSubmit={handleBulkAddStudents} className="mt-2 grid gap-2 rounded-md border border-slate-200 p-3">
                <textarea
                  placeholder={"Contoh:\nAli Bin Abu\nSiti Aisyah,12,P"}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  className="min-h-36 rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                />
                <button
                  type="submit"
                  disabled={bulkCreating}
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {bulkCreating ? "Menyimpan bulk..." : "Tambah Murid Secara Bulk"}
                </button>
              </form>
            </section>

            <section className="mt-5">
              <h3 className="text-base font-semibold">Senarai Murid (Edit / Padam)</h3>
              {students.length === 0 ? (
                <p className="mt-2 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">
                  Tiada murid untuk dipadam.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {students.map((student) => (
                    <li key={student.id} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
                      {editingStudentId === student.id ? (
                        <div className="grid gap-2">
                          <input
                            type="text"
                            value={editStudentName}
                            onChange={(e) => setEditStudentName(e.target.value)}
                            placeholder="Nama penuh"
                            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                          />
                          <input
                            type="text"
                            value={editStudentNo}
                            onChange={(e) => setEditStudentNo(e.target.value)}
                            placeholder="No murid (optional)"
                            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                          />
                          <input
                            type="text"
                            value={editStudentGender}
                            onChange={(e) => setEditStudentGender(e.target.value)}
                            placeholder="Gender (optional)"
                            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={cancelEditStudent}
                              className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleUpdateStudent(student.id)}
                              disabled={updatingStudentId === student.id}
                              className="rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
                            >
                              {updatingStudentId === student.id ? "Saving..." : "Simpan"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium">{student.full_name}</p>
                            <p className="text-slate-600">
                              No: {student.student_no ?? "-"} | Gender: {student.gender ?? "-"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => startEditStudent(student)}
                              className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteStudent(student.id)}
                              disabled={deletingId === student.id}
                              className="rounded-md border border-red-300 px-3 py-2 text-xs font-medium text-red-700 disabled:opacity-60"
                            >
                              {deletingId === student.id ? "Memadam..." : "Padam"}
                            </button>
                            {isTestingMode ? (
                              <button
                                type="button"
                                onClick={() => void handleForceDeleteStudent(student.id)}
                                disabled={deletingId === student.id}
                                className="rounded-md border border-red-500 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 disabled:opacity-60"
                              >
                                Force Delete (Testing)
                              </button>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      ) : null}

      {setupSubjectModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Setup Subjek Kelas</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Assign/unassign subjek untuk kelas ini. Assessment hanya guna subjek yang di-assign.
                </p>
              </div>
              <button
                type="button"
                onClick={closeSetupSubjectModal}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                Tutup
              </button>
            </div>

            {subjectSetupError ? (
              <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{subjectSetupError}</p>
            ) : null}
            {subjectSetupSuccess ? (
              <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{subjectSetupSuccess}</p>
            ) : null}

            <section className="mt-5">
              <h3 className="text-base font-semibold">Semua Subject Workspace</h3>
              {subjects.length === 0 ? (
                <p className="mt-2 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">
                  Tiada subject dalam workspace.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {subjects.map((subject) => {
                    const isAssigned = classSubjectIdSet.has(subject.id);
                    const isLoading = subjectSavingId === subject.id;

                    return (
                      <li key={subject.id} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium">{subject.name}</p>
                            <p className="text-slate-600">
                              Code: {subject.code ?? "-"} | Year: {subject.year_label ?? "-"}
                            </p>
                          </div>
                          {isAssigned ? (
                            <button
                              type="button"
                              onClick={() => void handleUnassignSubjectFromClass(subject.id)}
                              disabled={isLoading}
                              className="rounded-md border border-red-300 px-3 py-2 text-xs font-medium text-red-700 disabled:opacity-60"
                            >
                              {isLoading ? "Saving..." : "Unassign"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleAssignSubjectToClass(subject.id)}
                              disabled={isLoading}
                              className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 disabled:opacity-60"
                            >
                              {isLoading ? "Saving..." : "Assign"}
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>
      ) : null}
    </main>
  );
}

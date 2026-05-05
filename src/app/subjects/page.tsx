"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

type Workspace = {
  id: string;
  name: string;
};

type SubjectItem = {
  id: string;
  name: string;
  code: string | null;
  year_label: string | null;
  skill_count: number;
};

const SUBJECT_PRESETS = [
  { name: "Bahasa Melayu", code: "BM" },
  { name: "Bahasa Inggeris", code: "BI" },
  { name: "Matematik", code: "MT" },
  { name: "Sains", code: "SN" },
  { name: "Pendidikan Jasmani", code: "PJ" },
  { name: "Pendidikan Kesihatan", code: "PK" },
  { name: "Muzik", code: "MZ" },
  { name: "Bahasa Arab", code: "BA" },
  { name: "Pendidikan Islam", code: "PI" },
  { name: "Pendidikan Seni Visual", code: "PSV" },
  { name: "Sejarah", code: "SJ" },
  { name: "Reka Bentuk dan Teknologi", code: "RBT" },
] as const;

const YEAR_PRESETS = ["Tahun 1", "Tahun 2", "Tahun 3", "Tahun 4", "Tahun 5", "Tahun 6"] as const;

export default function SubjectsPage() {
  const isTestingMode = process.env.NODE_ENV !== "production";
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingSubjectId, setDeletingSubjectId] = useState<string | null>(null);
  const [updatingSubjectId, setUpdatingSubjectId] = useState<string | null>(null);
  const [subjectEditModalOpen, setSubjectEditModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState("");
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [yearLabel, setYearLabel] = useState("");
  const [editSubjectId, setEditSubjectId] = useState("");
  const [editSubjectName, setEditSubjectName] = useState("");
  const [editSubjectCode, setEditSubjectCode] = useState("");
  const [editSubjectYearLabel, setEditSubjectYearLabel] = useState("");

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

    const subjectRows = (data ?? []) as Array<Omit<SubjectItem, "skill_count">>;

    const { data: skillRows, error: skillError } = await supabase
      .from("skills")
      .select("subject_id")
      .eq("workspace_id", workspaceId);

    if (skillError) {
      setError(skillError.message);
      return;
    }

    const skillCountBySubject: Record<string, number> = {};
    for (const row of skillRows ?? []) {
      const subjectId = String(row.subject_id);
      skillCountBySubject[subjectId] = (skillCountBySubject[subjectId] ?? 0) + 1;
    }

    setSubjects(
      subjectRows.map((subject) => ({
        ...subject,
        skill_count: skillCountBySubject[subject.id] ?? 0,
      })),
    );
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
      await loadSubjects(ws.id);
      setLoading(false);
    };

    void loadPage();
  }, [router]);

  const handleCreateSubject = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!workspace || !user) {
      setCreateError("Workspace atau user tidak dijumpai.");
      return;
    }

    setCreating(true);
    setCreateError("");
    setCreateSuccess("");

    const { error: insertError } = await supabase.from("subjects").insert({
      workspace_id: workspace.id,
      name: name.trim(),
      code: code.trim() || null,
      year_label: yearLabel.trim() || null,
      created_by: user.id,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        setCreateError("Subjek untuk tahun ini sudah wujud. Guna nama subjek sama dengan tahun lain dibenarkan selepas migration terbaru.");
      } else {
        setCreateError(insertError.message);
      }
      setCreating(false);
      return;
    }

    setName("");
    setCode("");
    setYearLabel("");
    setCreateSuccess("Subjek berjaya ditambah.");
    setDeleteError("");
    setDeleteSuccess("");
    await loadSubjects(workspace.id);
    setCreating(false);
  };

  const applyCreateSubjectPreset = (preset: (typeof SUBJECT_PRESETS)[number]) => {
    setName(preset.name);
    if (!code.trim()) {
      setCode(preset.code);
    }
  };

  const applyCreateYearPreset = (value: string) => {
    setYearLabel(value);
  };

  const openEditSubjectModal = (subject: SubjectItem) => {
    setEditSubjectId(subject.id);
    setEditSubjectName(subject.name);
    setEditSubjectCode(subject.code ?? "");
    setEditSubjectYearLabel(subject.year_label ?? "");
    setEditError("");
    setEditSuccess("");
    setSubjectEditModalOpen(true);
  };

  const applyEditSubjectPreset = (preset: (typeof SUBJECT_PRESETS)[number]) => {
    setEditSubjectName(preset.name);
    if (!editSubjectCode.trim()) {
      setEditSubjectCode(preset.code);
    }
  };

  const applyEditYearPreset = (value: string) => {
    setEditSubjectYearLabel(value);
  };

  const closeEditSubjectModal = () => {
    setSubjectEditModalOpen(false);
    setEditError("");
  };

  const handleUpdateSubject = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!workspace || !editSubjectId) {
      setEditError("Workspace/subjek tidak dijumpai.");
      return;
    }

    if (!editSubjectName.trim()) {
      setEditError("Nama subjek wajib diisi.");
      return;
    }

    setUpdatingSubjectId(editSubjectId);
    setEditError("");
    setEditSuccess("");
    setDeleteError("");
    setDeleteSuccess("");

    const { error: updateError } = await supabase
      .from("subjects")
      .update({
        name: editSubjectName.trim(),
        code: editSubjectCode.trim() || null,
        year_label: editSubjectYearLabel.trim() || null,
      })
      .eq("id", editSubjectId)
      .eq("workspace_id", workspace.id);

    if (updateError) {
      if (updateError.code === "23505") {
        setEditError("Subjek untuk tahun ini sudah wujud. Sila guna kombinasi nama + tahun yang berbeza.");
      } else {
        setEditError(updateError.message);
      }
      setUpdatingSubjectId(null);
      return;
    }

    await loadSubjects(workspace.id);
    setEditSuccess("Subjek berjaya dikemaskini.");
    setUpdatingSubjectId(null);
    setSubjectEditModalOpen(false);
  };

  const handleDeleteSubject = async (subject: SubjectItem) => {
    if (!workspace) {
      setDeleteError("Workspace belum dijumpai.");
      return;
    }

    const confirmed = window.confirm(
      `Padam subjek "${subject.name}"?\n\nJika subjek sudah ada rekod pentaksiran, sistem akan block.`,
    );
    if (!confirmed) {
      return;
    }

    setDeletingSubjectId(subject.id);
    setDeleteError("");
    setDeleteSuccess("");
    setCreateError("");
    setCreateSuccess("");

    const { count: skillsCount, error: skillsCheckError } = await supabase
      .from("skills")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .eq("subject_id", subject.id);

    if (skillsCheckError) {
      setDeleteError(skillsCheckError.message);
      setDeletingSubjectId(null);
      return;
    }

    const { count: assessmentsCount, error: assessmentsCheckError } = await supabase
      .from("assessments")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .eq("subject_id", subject.id);

    if (assessmentsCheckError) {
      setDeleteError(assessmentsCheckError.message);
      setDeletingSubjectId(null);
      return;
    }

    const { count: sessionsCount, error: sessionsCheckError } = await supabase
      .from("assessment_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .eq("subject_id", subject.id);

    if (sessionsCheckError) {
      setDeleteError(sessionsCheckError.message);
      setDeletingSubjectId(null);
      return;
    }

    const { count: classSubjectCount, error: classSubjectCheckError } = await supabase
      .from("class_subjects")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .eq("subject_id", subject.id);

    if (classSubjectCheckError) {
      setDeleteError(classSubjectCheckError.message);
      setDeletingSubjectId(null);
      return;
    }

    if ((skillsCount ?? 0) > 0 || (assessmentsCount ?? 0) > 0 || (sessionsCount ?? 0) > 0 || (classSubjectCount ?? 0) > 0) {
      setDeleteError(
        `Subjek tidak boleh dipadam. Masih ada data berkaitan: skill=${skillsCount ?? 0}, assessment lama=${assessmentsCount ?? 0}, assessment session baru=${sessionsCount ?? 0}, class-subject map=${classSubjectCount ?? 0}.${isTestingMode ? " Gunakan Force Delete (Testing) jika ini data ujian." : ""}`,
      );
      setDeletingSubjectId(null);
      return;
    }

    const { error: deleteSubjectError } = await supabase
      .from("subjects")
      .delete()
      .eq("id", subject.id)
      .eq("workspace_id", workspace.id);

    if (deleteSubjectError) {
      setDeleteError(deleteSubjectError.message);
      setDeletingSubjectId(null);
      return;
    }

    setDeleteSuccess(
      `Subjek "${subject.name}" berjaya dipadam. Kemahiran berkaitan dibersihkan automatik (jika ada).`,
    );
    await loadSubjects(workspace.id);
    setDeletingSubjectId(null);
  };

  const handleForceDeleteSubject = async (subject: SubjectItem) => {
    if (!workspace) {
      setDeleteError("Workspace belum dijumpai.");
      return;
    }

    const confirmed = window.confirm(
      `Force delete subjek "${subject.name}"?\nIni akan padam data berkaitan termasuk pentaksiran.`,
    );
    if (!confirmed) return;

    setDeletingSubjectId(subject.id);
    setDeleteError("");
    setDeleteSuccess("");
    setEditError("");
    setEditSuccess("");

    const { error: deleteAssessmentsError } = await supabase
      .from("assessments")
      .delete()
      .eq("workspace_id", workspace.id)
      .eq("subject_id", subject.id);

    if (deleteAssessmentsError) {
      setDeleteError(deleteAssessmentsError.message);
      setDeletingSubjectId(null);
      return;
    }

    const { data: sessionRows, error: sessionsListError } = await supabase
      .from("assessment_sessions")
      .select("id")
      .eq("workspace_id", workspace.id)
      .eq("subject_id", subject.id);

    if (sessionsListError) {
      setDeleteError(sessionsListError.message);
      setDeletingSubjectId(null);
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
        setDeleteError(deleteSessionItemsError.message);
        setDeletingSubjectId(null);
        return;
      }
    }

    const { error: deleteSessionsError } = await supabase
      .from("assessment_sessions")
      .delete()
      .eq("workspace_id", workspace.id)
      .eq("subject_id", subject.id);

    if (deleteSessionsError) {
      setDeleteError(deleteSessionsError.message);
      setDeletingSubjectId(null);
      return;
    }

    const { error: deleteClassSubjectsError } = await supabase
      .from("class_subjects")
      .delete()
      .eq("workspace_id", workspace.id)
      .eq("subject_id", subject.id);

    if (deleteClassSubjectsError) {
      setDeleteError(deleteClassSubjectsError.message);
      setDeletingSubjectId(null);
      return;
    }

    const { error: deleteSkillsError } = await supabase
      .from("skills")
      .delete()
      .eq("workspace_id", workspace.id)
      .eq("subject_id", subject.id);

    if (deleteSkillsError) {
      setDeleteError(deleteSkillsError.message);
      setDeletingSubjectId(null);
      return;
    }

    const { error: deleteSubjectError } = await supabase
      .from("subjects")
      .delete()
      .eq("id", subject.id)
      .eq("workspace_id", workspace.id);

    if (deleteSubjectError) {
      setDeleteError(deleteSubjectError.message);
      setDeletingSubjectId(null);
      return;
    }

    setDeleteSuccess(`Force delete subjek "${subject.name}" berjaya.`);
    await loadSubjects(workspace.id);
    setDeletingSubjectId(null);
  };

  if (loading) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-8">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">Loading subjects...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-8">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Subjects</h1>
            <p className="mt-1 text-sm text-slate-600">Subject CRUD minimum ikut workspace semasa.</p>
          </div>
          <Link href="/dashboard" className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            Kembali Dashboard
          </Link>
        </div>

        {error ? (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {deleteError ? (
          <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {deleteError}
          </p>
        ) : null}
        {deleteSuccess ? (
          <p className="mt-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {deleteSuccess}
          </p>
        ) : null}
        {editSuccess ? (
          <p className="mt-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {editSuccess}
          </p>
        ) : null}

        <section className="mt-6 rounded-md border border-slate-200 p-3 text-sm">
          <p>
            <span className="font-medium">Workspace:</span> {workspace?.name ?? "-"}
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-base font-semibold">Tambah Subject</h2>
          <form onSubmit={handleCreateSubject} className="mt-3 grid gap-2 rounded-md border border-slate-200 p-3">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Pilih subjek cepat</p>
              <div className="flex flex-wrap gap-2">
                {SUBJECT_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => applyCreateSubjectPreset(preset)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      name.trim().toLowerCase() === preset.name.toLowerCase()
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              placeholder="Nama subject"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <input
              type="text"
              placeholder="Code (optional)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Pilih tahun cepat</p>
              <div className="flex flex-wrap gap-2">
                {YEAR_PRESETS.map((year) => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => applyCreateYearPreset(year)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      yearLabel.trim().toLowerCase() === year.toLowerCase()
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              placeholder="Year label (optional)"
              value={yearLabel}
              onChange={(e) => setYearLabel(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={creating}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {creating ? "Menyimpan..." : "Tambah Subject"}
            </button>
          </form>

          {createError ? (
            <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {createError}
            </p>
          ) : null}
          {createSuccess ? (
            <p className="mt-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {createSuccess}
            </p>
          ) : null}
        </section>

        <section className="mt-6">
          <h2 className="text-base font-semibold">Subjects List</h2>

          {subjects.length === 0 ? (
            <p className="mt-2 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">
              Tiada subject lagi (empty state).
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {subjects.map((subject) => (
                <li key={subject.id} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/subjects/${subject.id}`} className="font-medium text-slate-900 underline">
                        {subject.name}
                      </Link>
                      <p className="text-slate-600">
                        Code: {subject.code ?? "-"} | Year: {subject.year_label ?? "-"}
                      </p>
                      <span
                        className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          subject.skill_count > 0
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {subject.skill_count > 0
                          ? `Ada skill (${subject.skill_count})`
                          : "Belum ada skill"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditSubjectModal(subject)}
                        className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteSubject(subject)}
                        disabled={deletingSubjectId === subject.id}
                        className="rounded-md border border-red-300 px-3 py-2 text-xs font-medium text-red-700 disabled:opacity-60"
                      >
                        {deletingSubjectId === subject.id ? "Memadam..." : "Padam"}
                      </button>
                      {isTestingMode ? (
                        <button
                          type="button"
                          onClick={() => void handleForceDeleteSubject(subject)}
                          disabled={deletingSubjectId === subject.id}
                          className="rounded-md border border-red-500 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 disabled:opacity-60"
                        >
                          Force Delete (Testing)
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {subjectEditModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Edit Subjek</h2>
                <p className="mt-1 text-sm text-slate-600">Kemaskini maklumat subjek.</p>
              </div>
              <button
                type="button"
                onClick={closeEditSubjectModal}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                Tutup
              </button>
            </div>

            {editError ? (
              <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {editError}
              </p>
            ) : null}

            <form onSubmit={handleUpdateSubject} className="mt-4 grid gap-2">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Pilih subjek cepat</p>
                <div className="flex flex-wrap gap-2">
                  {SUBJECT_PRESETS.map((preset) => (
                    <button
                      key={`edit-${preset.name}`}
                      type="button"
                      onClick={() => applyEditSubjectPreset(preset)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                        editSubjectName.trim().toLowerCase() === preset.name.toLowerCase()
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                value={editSubjectName}
                onChange={(e) => setEditSubjectName(e.target.value)}
                placeholder="Nama subjek"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <input
                type="text"
                value={editSubjectCode}
                onChange={(e) => setEditSubjectCode(e.target.value)}
                placeholder="Code (optional)"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Pilih tahun cepat</p>
                <div className="flex flex-wrap gap-2">
                  {YEAR_PRESETS.map((year) => (
                    <button
                      key={`edit-${year}`}
                      type="button"
                      onClick={() => applyEditYearPreset(year)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                        editSubjectYearLabel.trim().toLowerCase() === year.toLowerCase()
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                value={editSubjectYearLabel}
                onChange={(e) => setEditSubjectYearLabel(e.target.value)}
                placeholder="Year label (optional)"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeEditSubjectModal}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingSubjectId === editSubjectId}
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {updatingSubjectId === editSubjectId ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}

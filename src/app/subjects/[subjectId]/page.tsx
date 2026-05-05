"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

type Workspace = {
  id: string;
  name: string;
};

type SubjectInfo = {
  id: string;
  name: string;
  code: string | null;
  year_label: string | null;
};

type SkillItem = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  display_order: number;
};

type TemplateItem = {
  id: string;
  title: string;
  subject_name: string;
  year_label: string | null;
  description: string | null;
  visibility: "private" | "public";
  owner_id: string;
};

function normalizeSubjectKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function canonicalSubjectKey(value: string) {
  const key = normalizeSubjectKey(value);
  const cleaned = key
    .replace(/dskp/g, "")
    .replace(/asas/g, "")
    .replace(/tahun[0-9]+/g, "");

  if (cleaned.includes("bahasamelayu") || cleaned === "bm") return "bm";
  if (cleaned.includes("bahasainggeris") || cleaned === "bi") return "bi";
  if (cleaned.includes("matematik") || cleaned === "mt") return "matematik";
  if (cleaned.includes("sains") || cleaned === "sn") return "sains";
  if (cleaned.includes("muzik") || cleaned === "mz") return "muzik";
  if (cleaned.includes("bahasaarab") || cleaned === "ba") return "bahasaarab";
  if (cleaned.includes("pendidikanislam") || cleaned === "pi") return "pendidikanislam";
  if (cleaned.includes("pendidikansenivisual") || cleaned === "psv") return "psv";
  if (cleaned.includes("sejarah") || cleaned === "sj") return "sejarah";
  if (cleaned.includes("pendidikanjasmani") || cleaned === "pj") return "pj";
  if (cleaned.includes("pendidikankesihatan") || cleaned === "pk") return "pk";

  const aliasMap: Record<string, string> = {
    psv: "psv",
    pendidikansenivisual: "psv",
    pj: "pj",
    pendidikansjasmani: "pj",
    pendidikansmani: "pj",
    pendidikankesihatan: "pk",
    pk: "pk",
    bm: "bm",
    bahasamelayu: "bm",
    bi: "bi",
    bahasainggeris: "bi",
    mt: "matematik",
    matematik: "matematik",
    sn: "sains",
    sains: "sains",
    sj: "sejarah",
    sejarah: "sejarah",
  };

  return aliasMap[cleaned] ?? cleaned;
}

function isTemplateMatchSubject(template: TemplateItem, subject: SubjectInfo) {
  const templateKey = canonicalSubjectKey(template.subject_name);
  const subjectNameKey = canonicalSubjectKey(subject.name);
  const subjectCodeKey = canonicalSubjectKey(subject.code ?? "");

  return templateKey === subjectNameKey || (subjectCodeKey !== "" && templateKey === subjectCodeKey);
}

function normalizeYearLabel(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const digitMatch = normalized.match(/[1-6]/);
  if (digitMatch) {
    return `tahun ${digitMatch[0]}`;
  }
  return normalized;
}

function isTemplateYearMatch(template: TemplateItem, subject: SubjectInfo) {
  const subjectYear = normalizeYearLabel(subject.year_label);
  const templateYear = normalizeYearLabel(template.year_label);

  if (subjectYear === "") return true;
  if (templateYear === "") return false;
  return templateYear === subjectYear;
}

function isGeneralTemplate(template: TemplateItem) {
  return normalizeYearLabel(template.year_label) === "";
}

function getTemplateMatchState(template: TemplateItem, subject: SubjectInfo) {
  const subjectMatch = isTemplateMatchSubject(template, subject);
  if (!subjectMatch) return "NON-MATCH";

  const yearMatch = isTemplateYearMatch(template, subject);
  if (yearMatch) return "MATCH";

  if (isGeneralTemplate(template)) return "GENERAL";
  return "YEAR-MISMATCH";
}

export default function SubjectSkillsPage() {
  const isTestingMode = process.env.NODE_ENV !== "production";
  const router = useRouter();
  const params = useParams<{ subjectId: string }>();
  const subjectId = params.subjectId;

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deletingSkillId, setDeletingSkillId] = useState<string | null>(null);
  const [updatingSkillId, setUpdatingSkillId] = useState<string | null>(null);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [templateError, setTemplateError] = useState("");
  const [templateSuccess, setTemplateSuccess] = useState("");
  const [templateNotice, setTemplateNotice] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState("");

  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [subjectInfo, setSubjectInfo] = useState<SubjectInfo | null>(null);
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [displayOrder, setDisplayOrder] = useState("");
  const [editSkillName, setEditSkillName] = useState("");
  const [editSkillCode, setEditSkillCode] = useState("");
  const [editSkillDescription, setEditSkillDescription] = useState("");
  const [editSkillDisplayOrder, setEditSkillDisplayOrder] = useState("");

  const loadSkills = async (workspaceId: string, targetSubjectId: string) => {
    const { data, error: skillError } = await supabase
      .from("skills")
      .select("id, name, code, description, display_order")
      .eq("workspace_id", workspaceId)
      .eq("subject_id", targetSubjectId)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    if (skillError) {
      setError(skillError.message);
      return;
    }

    setSkills((data ?? []) as SkillItem[]);
  };

  const loadTemplates = useCallback(async (currentSubject?: SubjectInfo) => {
    setTemplateNotice("");

    const { data, error: templatesError } = await supabase
      .from("skill_templates")
      .select("id, title, subject_name, year_label, description, visibility, owner_id")
      .order("title", { ascending: true });

    if (templatesError) {
      const isMissingYearLabelColumn =
        templatesError.code === "42703" ||
        templatesError.message.toLowerCase().includes("year_label");

      if (!isMissingYearLabelColumn) {
        setTemplateError(templatesError.message);
        return;
      }

      // Backward-compatible fallback if DB migration for year_label is not applied yet.
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("skill_templates")
        .select("id, title, subject_name, description, visibility, owner_id")
        .order("title", { ascending: true });

      if (fallbackError) {
        setTemplateError(fallbackError.message);
        return;
      }

      const templateRows = ((fallbackData ?? []) as Array<Omit<TemplateItem, "year_label">>).map(
        (row) => ({
          ...row,
          year_label: null,
        }),
      );
      setTemplates(templateRows);
      setTemplateNotice(
        "DB belum migrate `skill_templates.year_label`. Buat masa ini template dibaca sebagai general (year kosong).",
      );

      if (templateRows.length === 0) {
        setSelectedTemplateId("");
        return;
      }

      if (currentSubject) {
        setSelectedTemplateId("");
        return;
      }

      setSelectedTemplateId("");
      return;
    }

    const templateRows = (data ?? []) as TemplateItem[];
    setTemplates(templateRows);

    if (templateRows.length === 0) {
      setSelectedTemplateId("");
      return;
    }

    if (currentSubject) {
      setSelectedTemplateId("");
      return;
    }

    setSelectedTemplateId("");
  }, []);

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
        setError("Subject tidak dijumpai untuk workspace semasa.");
        setLoading(false);
        return;
      }

      const currentSubjectInfo = subjectRow as SubjectInfo;
      setSubjectInfo(currentSubjectInfo);
      await loadSkills(ws.id, subjectId);
      await loadTemplates(currentSubjectInfo);
      setLoading(false);
    };

    void loadPage();
  }, [loadTemplates, router, subjectId]);

  const handleGenerateFromTemplate = async () => {
    if (!workspace || !subjectInfo || !selectedTemplateId) {
      setTemplateError("Pilih template dahulu.");
      return;
    }

    setGenerating(true);
    setTemplateError("");
    setTemplateSuccess("");

    const { data, error: rpcError } = await supabase.rpc("copy_template_to_subject", {
      p_template_id: selectedTemplateId,
      p_workspace_id: workspace.id,
      p_subject_id: subjectInfo.id,
    });

    if (rpcError) {
      setTemplateError(rpcError.message);
      setGenerating(false);
      return;
    }

    await loadSkills(workspace.id, subjectInfo.id);
    setTemplateSuccess(`Kemahiran berjaya dijana. Jumlah dimasukkan: ${Number(data ?? 0)}.`);
    setGenerating(false);
  };

  const handleAddSkill = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!workspace || !subjectInfo || !user) {
      setCreateError("Data workspace/subject/user belum lengkap.");
      return;
    }

    setCreating(true);
    setCreateError("");
    setCreateSuccess("");

    const parsedDisplayOrder = displayOrder.trim() === "" ? 0 : Number(displayOrder.trim());
    if (Number.isNaN(parsedDisplayOrder)) {
      setCreateError("Display order mesti nombor.");
      setCreating(false);
      return;
    }

    const { error: insertError } = await supabase.from("skills").insert({
      workspace_id: workspace.id,
      subject_id: subjectInfo.id,
      name: name.trim(),
      code: code.trim() || null,
      description: description.trim() || null,
      display_order: parsedDisplayOrder,
      created_by: user.id,
    });

    if (insertError) {
      setCreateError(insertError.message);
      setCreating(false);
      return;
    }

    setName("");
    setCode("");
    setDescription("");
    setDisplayOrder("");
    setCreateSuccess("Kemahiran berjaya ditambah.");
    setDeleteError("");
    setDeleteSuccess("");
    await loadSkills(workspace.id, subjectInfo.id);
    setCreating(false);
  };

  const startEditSkill = (skill: SkillItem) => {
    setEditingSkillId(skill.id);
    setEditSkillName(skill.name);
    setEditSkillCode(skill.code ?? "");
    setEditSkillDescription(skill.description ?? "");
    setEditSkillDisplayOrder(String(skill.display_order));
    setDeleteError("");
    setDeleteSuccess("");
    setCreateError("");
    setCreateSuccess("");
  };

  const cancelEditSkill = () => {
    setEditingSkillId(null);
    setEditSkillName("");
    setEditSkillCode("");
    setEditSkillDescription("");
    setEditSkillDisplayOrder("");
  };

  const handleUpdateSkill = async (skillId: string) => {
    if (!workspace || !subjectInfo) {
      setDeleteError("Data workspace/subject belum lengkap.");
      return;
    }

    if (!editSkillName.trim()) {
      setDeleteError("Nama kemahiran wajib diisi.");
      return;
    }

    const parsedOrder = editSkillDisplayOrder.trim() === "" ? 0 : Number(editSkillDisplayOrder.trim());
    if (Number.isNaN(parsedOrder)) {
      setDeleteError("Display order mesti nombor.");
      return;
    }

    setUpdatingSkillId(skillId);
    setDeleteError("");
    setDeleteSuccess("");

    const { error: updateError } = await supabase
      .from("skills")
      .update({
        name: editSkillName.trim(),
        code: editSkillCode.trim() || null,
        description: editSkillDescription.trim() || null,
        display_order: parsedOrder,
      })
      .eq("id", skillId)
      .eq("workspace_id", workspace.id)
      .eq("subject_id", subjectInfo.id);

    if (updateError) {
      setDeleteError(updateError.message);
      setUpdatingSkillId(null);
      return;
    }

    await loadSkills(workspace.id, subjectInfo.id);
    setDeleteSuccess("Kemahiran berjaya dikemaskini.");
    setUpdatingSkillId(null);
    cancelEditSkill();
  };

  const handleDeleteSkill = async (skill: SkillItem) => {
    if (!workspace || !subjectInfo) {
      setDeleteError("Data workspace/subject belum lengkap.");
      return;
    }

    const confirmed = window.confirm(`Padam kemahiran "${skill.name}"? Tindakan ini tidak boleh diundur.`);
    if (!confirmed) {
      return;
    }

    setDeletingSkillId(skill.id);
    setDeleteError("");
    setDeleteSuccess("");
    setCreateError("");
    setCreateSuccess("");

    const { count, error: checkError } = await supabase
      .from("assessments")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .eq("subject_id", subjectInfo.id)
      .eq("skill_id", skill.id);

    if (checkError) {
      setDeleteError(checkError.message);
      setDeletingSkillId(null);
      return;
    }

    if ((count ?? 0) > 0) {
      setDeleteError(
        `Kemahiran "${skill.name}" tidak boleh dipadam kerana sudah ada rekod pentaksiran (${count}).${isTestingMode ? " Gunakan Force Delete (Testing) jika ini data ujian." : ""}`,
      );
      setDeletingSkillId(null);
      return;
    }

    const { error: deleteErr } = await supabase
      .from("skills")
      .delete()
      .eq("id", skill.id)
      .eq("workspace_id", workspace.id)
      .eq("subject_id", subjectInfo.id);

    if (deleteErr) {
      setDeleteError(deleteErr.message);
      setDeletingSkillId(null);
      return;
    }

    await loadSkills(workspace.id, subjectInfo.id);
    setDeleteSuccess(`Kemahiran "${skill.name}" berjaya dipadam.`);
    setDeletingSkillId(null);
  };

  const handleForceDeleteSkill = async (skill: SkillItem) => {
    if (!workspace || !subjectInfo) {
      setDeleteError("Data workspace/subject belum lengkap.");
      return;
    }

    const confirmed = window.confirm(
      `Force delete kemahiran "${skill.name}"?\nIni akan padam data berkaitan termasuk pentaksiran.`,
    );
    if (!confirmed) return;

    setDeletingSkillId(skill.id);
    setDeleteError("");
    setDeleteSuccess("");

    const { error: deleteAssessmentsError } = await supabase
      .from("assessments")
      .delete()
      .eq("workspace_id", workspace.id)
      .eq("subject_id", subjectInfo.id)
      .eq("skill_id", skill.id);

    if (deleteAssessmentsError) {
      setDeleteError(deleteAssessmentsError.message);
      setDeletingSkillId(null);
      return;
    }

    const { data: candidateItems, error: candidateItemsError } = await supabase
      .from("assessment_items")
      .select("id")
      .eq("workspace_id", workspace.id)
      .eq("subject_id", subjectInfo.id)
      .eq("name", skill.name);

    if (candidateItemsError) {
      setDeleteError(candidateItemsError.message);
      setDeletingSkillId(null);
      return;
    }

    const candidateItemIds = (candidateItems ?? []).map((row) => String(row.id));
    if (candidateItemIds.length > 0) {
      const { error: deleteSessionItemsError } = await supabase
        .from("assessment_session_items")
        .delete()
        .eq("workspace_id", workspace.id)
        .in("assessment_item_id", candidateItemIds);

      if (deleteSessionItemsError) {
        setDeleteError(deleteSessionItemsError.message);
        setDeletingSkillId(null);
        return;
      }

      const { error: deleteAssessmentItemsError } = await supabase
        .from("assessment_items")
        .delete()
        .eq("workspace_id", workspace.id)
        .eq("subject_id", subjectInfo.id)
        .in("id", candidateItemIds);

      if (deleteAssessmentItemsError) {
        setDeleteError(deleteAssessmentItemsError.message);
        setDeletingSkillId(null);
        return;
      }
    }

    const { error: deleteSkillError } = await supabase
      .from("skills")
      .delete()
      .eq("id", skill.id)
      .eq("workspace_id", workspace.id)
      .eq("subject_id", subjectInfo.id);

    if (deleteSkillError) {
      setDeleteError(deleteSkillError.message);
      setDeletingSkillId(null);
      return;
    }

    await loadSkills(workspace.id, subjectInfo.id);
    setDeleteSuccess(`Force delete kemahiran "${skill.name}" berjaya.`);
    setDeletingSkillId(null);
  };

  const recommendedTemplates = templates.filter((template) => {
    if (!subjectInfo) {
      return false;
    }
    return getTemplateMatchState(template, subjectInfo) === "MATCH";
  });
  const generalTemplates = templates.filter((template) => {
    if (!subjectInfo) {
      return false;
    }
    return getTemplateMatchState(template, subjectInfo) === "GENERAL";
  });

  const templateOptions = [...templates].sort((a, b) => {
    if (!subjectInfo) return a.title.localeCompare(b.title);

    const rank = (state: string) => {
      if (state === "MATCH") return 0;
      if (state === "GENERAL") return 1;
      if (state === "YEAR-MISMATCH") return 2;
      return 3;
    };

    const rankA = rank(getTemplateMatchState(a, subjectInfo));
    const rankB = rank(getTemplateMatchState(b, subjectInfo));

    if (rankA !== rankB) return rankA - rankB;
    return a.title.localeCompare(b.title);
  });

  if (loading) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-8">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">Loading subject page...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-8">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Subject Skills</h1>
            <p className="mt-1 text-sm text-slate-600">
              Gunakan template untuk jana kemahiran DSKP dengan cepat.
            </p>
          </div>
          <Link href="/subjects" className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            Kembali Subjects
          </Link>
        </div>

        {error ? (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {subjectInfo ? (
          <section className="mt-6 rounded-md border border-slate-200 p-3 text-sm">
            <p>
              <span className="font-medium">Subject:</span> {subjectInfo.name}
            </p>
            <p>
              <span className="font-medium">Code:</span> {subjectInfo.code ?? "-"}
            </p>
            <p>
              <span className="font-medium">Year label:</span> {subjectInfo.year_label ?? "-"}
            </p>
            <p>
              <span className="font-medium">Workspace:</span> {workspace?.name ?? "-"}
            </p>
          </section>
        ) : null}

        <section className="mt-6">
          <h2 className="text-base font-semibold">Generate Skills from Template</h2>
          <p className="mt-1 text-sm text-slate-600">
            Sistem tidak auto-generate. Anda perlu pilih template sendiri ikut subjek + tahun.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Subject semasa: {subjectInfo?.name ?? "-"} | Year label: {subjectInfo?.year_label ?? "-"}
          </p>

          {templateError ? (
            <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {templateError}
            </p>
          ) : null}
          {templateNotice ? (
            <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
              {templateNotice}
            </p>
          ) : null}
          {templateSuccess ? (
            <p className="mt-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {templateSuccess}
            </p>
          ) : null}

          <div className="mt-3 rounded-md border border-slate-200 p-3">
            {templateOptions.length === 0 ? (
              <p className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">
                Tiada template tersedia.
              </p>
            ) : (
              <div className="space-y-2">
                {recommendedTemplates.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                      Padanan Terbaik (Subject + Tahun)
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {recommendedTemplates.map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => setSelectedTemplateId(template.id)}
                          className={`rounded-md border px-3 py-2 text-left text-sm transition ${
                            selectedTemplateId === template.id
                              ? "border-emerald-300 bg-emerald-50"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <p className="font-medium">{template.title}</p>
                          <p className="text-xs text-slate-600">
                            {template.subject_name} | {template.year_label ?? "General"}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {generalTemplates.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                      Template Umum (Year Kosong)
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {generalTemplates.map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => setSelectedTemplateId(template.id)}
                          className={`rounded-md border px-3 py-2 text-left text-sm transition ${
                            selectedTemplateId === template.id
                              ? "border-amber-300 bg-amber-50"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <p className="font-medium">{template.title}</p>
                          <p className="text-xs text-slate-600">
                            {template.subject_name} | {template.year_label ?? "General"}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <details className="rounded-md border border-slate-200 p-2">
                  <summary className="cursor-pointer text-xs font-medium text-slate-700">
                    Pilih manual (semua template)
                  </summary>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">-- Pilih template --</option>
                    {templateOptions.map((template) => {
                      const templateYear = template.year_label ?? "-";
                      const matchTag = subjectInfo ? getTemplateMatchState(template, subjectInfo) : "NON-MATCH";
                      return (
                        <option key={template.id} value={template.id}>
                          {template.title} | Subject: {template.subject_name} | Year: {templateYear} |{" "}
                          Visibility: {template.visibility} | {matchTag}
                        </option>
                      );
                    })}
                  </select>
                </details>

                <button
                  type="button"
                  onClick={() => void handleGenerateFromTemplate()}
                  disabled={generating || !selectedTemplateId}
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {generating ? "Generating..." : "Generate Skills"}
                </button>
                <p className="text-xs text-slate-500">
                  Label MATCH = subjek + tahun padan, GENERAL = template umum (year kosong), YEAR-MISMATCH = subjek padan tapi tahun tak sama, NON-MATCH = subjek tak padan.
                </p>
                {recommendedTemplates.length === 0 ? (
                  <p className="text-xs text-amber-700">
                    Tiada template yang padan ikut subject semasa. Sila pilih manual template yang betul.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-base font-semibold">Skills List</h2>

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

          {skills.length === 0 ? (
            <p className="mt-2 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">
              Tiada skill lagi (empty state).
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {skills.map((skill) => (
                <li key={skill.id} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
                  {editingSkillId === skill.id ? (
                    <div className="grid gap-2">
                      <input
                        type="text"
                        value={editSkillName}
                        onChange={(e) => setEditSkillName(e.target.value)}
                        placeholder="Nama kemahiran"
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                      />
                      <input
                        type="text"
                        value={editSkillCode}
                        onChange={(e) => setEditSkillCode(e.target.value)}
                        placeholder="Code (optional)"
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                      />
                      <textarea
                        value={editSkillDescription}
                        onChange={(e) => setEditSkillDescription(e.target.value)}
                        placeholder="Description (optional)"
                        className="min-h-20 rounded-md border border-slate-300 px-3 py-2 text-sm"
                      />
                      <input
                        type="number"
                        value={editSkillDisplayOrder}
                        onChange={(e) => setEditSkillDisplayOrder(e.target.value)}
                        placeholder="Display order"
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEditSkill}
                          className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleUpdateSkill(skill.id)}
                          disabled={updatingSkillId === skill.id}
                          className="rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
                        >
                          {updatingSkillId === skill.id ? "Saving..." : "Simpan"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{skill.name}</p>
                        <p className="text-slate-600">
                          Code: {skill.code ?? "-"} | Order: {skill.display_order}
                        </p>
                        <p className="text-slate-600">Description: {skill.description ?? "-"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startEditSkill(skill)}
                          className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteSkill(skill)}
                          disabled={deletingSkillId === skill.id}
                          className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 disabled:opacity-60"
                        >
                          {deletingSkillId === skill.id ? "Deleting..." : "Delete"}
                        </button>
                        {isTestingMode ? (
                          <button
                            type="button"
                            onClick={() => void handleForceDeleteSkill(skill)}
                            disabled={deletingSkillId === skill.id}
                            className="rounded-md border border-red-500 bg-red-50 px-3 py-1 text-xs font-semibold text-red-800 disabled:opacity-60"
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

        <section className="mt-6">
          <details className="rounded-md border border-slate-200 p-3">
            <summary className="cursor-pointer text-base font-semibold">Tambah Skill Manual (Secondary)</summary>
            <p className="mt-1 text-sm text-slate-600">
              Disyorkan guna template dulu. Manual add sesuai untuk kes khas sahaja.
            </p>

            <form onSubmit={handleAddSkill} className="mt-3 grid gap-2">
              <input
                type="text"
                placeholder="Nama skill"
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
              <textarea
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                type="number"
                placeholder="Display order (optional)"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={creating}
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {creating ? "Menyimpan..." : "Tambah Skill"}
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
          </details>
        </section>
      </div>
    </main>
  );
}

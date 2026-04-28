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

type WorkspaceSettings = {
  id: string;
  workspace_id: string;
  logo_url: string | null;
  school_name: string | null;
  report_title: string;
  report_subtitle: string | null;
  header_line_1: string | null;
  header_line_2: string | null;
  footer_note: string | null;
  primary_color: string;
  accent_color: string;
};

const DEFAULT_SETTINGS = {
  logo_url: "",
  school_name: "",
  report_title: "Perkembangan Murid (Jadual Bulanan)",
  report_subtitle: "",
  header_line_1: "",
  header_line_2: "",
  footer_note: "",
  primary_color: "#0f1d3c",
  accent_color: "#ff8e2b",
};

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  const [logoUrl, setLogoUrl] = useState(DEFAULT_SETTINGS.logo_url);
  const [schoolName, setSchoolName] = useState(DEFAULT_SETTINGS.school_name);
  const [reportTitle, setReportTitle] = useState(DEFAULT_SETTINGS.report_title);
  const [reportSubtitle, setReportSubtitle] = useState(DEFAULT_SETTINGS.report_subtitle);
  const [headerLine1, setHeaderLine1] = useState(DEFAULT_SETTINGS.header_line_1);
  const [headerLine2, setHeaderLine2] = useState(DEFAULT_SETTINGS.header_line_2);
  const [footerNote, setFooterNote] = useState(DEFAULT_SETTINGS.footer_note);
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_SETTINGS.primary_color);
  const [accentColor, setAccentColor] = useState(DEFAULT_SETTINGS.accent_color);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setUser(data.user);

      const { data: ws, error: wsError } = await supabase
        .from("workspaces")
        .select("id, name")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (wsError) {
        setError(wsError.message);
        setLoading(false);
        return;
      }

      if (!ws) {
        setError("Workspace tidak dijumpai.");
        setLoading(false);
        return;
      }

      setWorkspace(ws);

      const { data: settings, error: settingsError } = await supabase
        .from("workspace_settings")
        .select(
          "id, workspace_id, logo_url, school_name, report_title, report_subtitle, header_line_1, header_line_2, footer_note, primary_color, accent_color",
        )
        .eq("workspace_id", ws.id)
        .maybeSingle();

      if (settingsError && settingsError.code !== "PGRST116") {
        setError(settingsError.message);
        setLoading(false);
        return;
      }

      if (settings) {
        const row = settings as WorkspaceSettings;
        setSettingsId(row.id);
        setLogoUrl(row.logo_url ?? "");
        setSchoolName(row.school_name ?? "");
        setReportTitle(row.report_title ?? DEFAULT_SETTINGS.report_title);
        setReportSubtitle(row.report_subtitle ?? "");
        setHeaderLine1(row.header_line_1 ?? "");
        setHeaderLine2(row.header_line_2 ?? "");
        setFooterNote(row.footer_note ?? "");
        setPrimaryColor(row.primary_color ?? DEFAULT_SETTINGS.primary_color);
        setAccentColor(row.accent_color ?? DEFAULT_SETTINGS.accent_color);
      }

      setLoading(false);
    };

    void load();
  }, [router]);

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!workspace || !user) return;

    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      workspace_id: workspace.id,
      logo_url: logoUrl.trim() || null,
      school_name: schoolName.trim() || null,
      report_title: reportTitle.trim() || DEFAULT_SETTINGS.report_title,
      report_subtitle: reportSubtitle.trim() || null,
      header_line_1: headerLine1.trim() || null,
      header_line_2: headerLine2.trim() || null,
      footer_note: footerNote.trim() || null,
      primary_color: primaryColor,
      accent_color: accentColor,
      created_by: settingsId ? undefined : user.id,
    };

    const query = supabase.from("workspace_settings").upsert(payload, { onConflict: "workspace_id" });
    const { error: saveError } = await query;

    if (saveError) {
      setError(saveError.message);
      setSaving(false);
      return;
    }

    const { data: reloaded } = await supabase
      .from("workspace_settings")
      .select("id")
      .eq("workspace_id", workspace.id)
      .maybeSingle();
    setSettingsId(reloaded?.id ? String(reloaded.id) : null);

    setSuccess("Branding berjaya disimpan.");
    setSaving(false);
  };

  if (loading) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-8">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">Loading tetapan...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-8">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Tetapan Branding</h1>
            <p className="mt-1 text-sm text-slate-600">Custom logo, header dan warna laporan.</p>
          </div>
          <Link href="/dashboard" className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            Kembali Dashboard
          </Link>
        </div>

        <section className="mt-4 rounded-md border border-slate-200 p-3 text-sm">
          <p><span className="font-medium">Workspace:</span> {workspace?.name ?? "-"}</p>
          <p><span className="font-medium">Current user:</span> {user?.email ?? "-"}</p>
        </section>

        {error ? <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {success ? <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

        <form onSubmit={handleSave} className="mt-4 grid gap-3 rounded-md border border-slate-200 p-3">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Nama Sekolah</span>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="Contoh: SK Mohd Khir Johari"
              className="rounded-md border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium">Logo URL</span>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..."
              className="rounded-md border border-slate-300 px-3 py-2"
            />
          </label>

          {logoUrl ? (
            <div className="rounded-md border border-slate-200 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt="Preview logo" className="h-16 w-16 rounded object-contain" />
            </div>
          ) : null}

          <label className="grid gap-1 text-sm">
            <span className="font-medium">Tajuk Laporan</span>
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2"
              required
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium">Subtitle</span>
            <input
              type="text"
              value={reportSubtitle}
              onChange={(e) => setReportSubtitle(e.target.value)}
              placeholder="Contoh: Pentaksiran Bilik Darjah"
              className="rounded-md border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium">Header Line 1</span>
            <input
              type="text"
              value={headerLine1}
              onChange={(e) => setHeaderLine1(e.target.value)}
              placeholder="Contoh: SK Mohd Khir Johari"
              className="rounded-md border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium">Header Line 2</span>
            <input
              type="text"
              value={headerLine2}
              onChange={(e) => setHeaderLine2(e.target.value)}
              placeholder="Contoh: Tahun Akademik 2026"
              className="rounded-md border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium">Footer Note</span>
            <input
              type="text"
              value={footerNote}
              onChange={(e) => setFooterNote(e.target.value)}
              placeholder="Contoh: Sulit - Kegunaan dalaman guru"
              className="rounded-md border border-slate-300 px-3 py-2"
            />
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Warna Primary</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-12 rounded border border-slate-300 p-1"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </div>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Warna Accent</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-10 w-12 rounded border border-slate-300 p-1"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </div>
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? "Menyimpan..." : "Simpan Branding"}
          </button>
        </form>
      </div>
    </main>
  );
}

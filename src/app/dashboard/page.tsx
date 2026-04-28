"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";

type Workspace = {
  id: string;
  name: string;
  is_demo: boolean;
};

type ClassItem = {
  id: string;
  name: string;
  year_label: string;
  academic_year: string;
};

type OnboardingStats = {
  classCount: number;
  studentCount: number;
  classSubjectCount: number;
};

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classStudentCounts, setClassStudentCounts] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [yearLabel, setYearLabel] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [navigatingClassId, setNavigatingClassId] = useState<string | null>(null);
  const [onboardingStats, setOnboardingStats] = useState<OnboardingStats>({
    classCount: 0,
    studentCount: 0,
    classSubjectCount: 0,
  });

  const loadClasses = async (workspaceId: string) => {
    const { data: classRows, error: classError } = await supabase
      .from("classes")
      .select("id, name, year_label, academic_year")
      .eq("workspace_id", workspaceId)
      .order("name", { ascending: true });

    if (classError) {
      setError(classError.message);
      return;
    }

    setClasses((classRows ?? []) as ClassItem[]);

    const { data: studentRows, error: studentsCountError } = await supabase
      .from("students")
      .select("id, class_id")
      .eq("workspace_id", workspaceId);

    if (studentsCountError) {
      setError(studentsCountError.message);
      return;
    }

    const counts: Record<string, number> = {};
    for (const row of studentRows ?? []) {
      const classId = String(row.class_id ?? "");
      if (!classId) continue;
      counts[classId] = (counts[classId] ?? 0) + 1;
    }
    setClassStudentCounts(counts);
    setOnboardingStats((prev) => ({
      ...prev,
      classCount: (classRows ?? []).length,
      studentCount: (studentRows ?? []).length,
    }));
  };

  const loadOnboardingStats = async (workspaceId: string) => {
    const [
      { count: classSubjectCount, error: classSubjectError },
    ] = await Promise.all([
      supabase
        .from("class_subjects")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId),
    ]);

    if (classSubjectError) {
      setError(classSubjectError?.message ?? "");
      return;
    }

    setOnboardingStats((prev) => ({
      ...prev,
      classSubjectCount: classSubjectCount ?? 0,
    }));
  };

  useEffect(() => {
    const loadDashboard = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        router.replace("/login");
        return;
      }

      setUser(currentUser);

      const { data: ws, error: wsError } = await supabase
        .from("workspaces")
        .select("id, name, is_demo")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (wsError) {
        setError(wsError.message);
        setLoading(false);
        return;
      }

      setWorkspace(ws);

      if (!ws) {
        setLoading(false);
        return;
      }

      const hideKey = `onboarding_hidden_${currentUser.id}_${ws.id}`;
      const hidden = window.localStorage.getItem(hideKey) === "1";
      setShowOnboarding(!hidden);

      await loadClasses(ws.id);
      await loadOnboardingStats(ws.id);
      setLoading(false);
    };

    void loadDashboard();
  }, [router]);

  const handleCreateClass = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!workspace || !user) {
      setCreateError("Workspace atau user tidak dijumpai.");
      return;
    }

    setCreating(true);
    setCreateError("");
    setCreateSuccess("");

    const { error: insertError } = await supabase.from("classes").insert({
      workspace_id: workspace.id,
      name: name.trim(),
      year_label: yearLabel.trim(),
      academic_year: academicYear.trim(),
      created_by: user.id,
    });

    if (insertError) {
      setCreateError(insertError.message);
      setCreating(false);
      return;
    }

    setName("");
    setYearLabel("");
    setAcademicYear("");
    setCreateSuccess("Kelas berjaya ditambah.");
    await loadClasses(workspace.id);
    await loadOnboardingStats(workspace.id);
    setCreating(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const academicYearOptions = Array.from(
    new Set(classes.map((item) => item.academic_year).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));

  const filteredClasses = classes.filter((item) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      item.name.toLowerCase().includes(normalizedSearch);
    const matchesYear =
      yearFilter === "all" || item.academic_year === yearFilter;
    return matchesSearch && matchesYear;
  });

  const onboardingSteps = [
    {
      id: 1,
      title: "Setup Kelas",
      done: onboardingStats.classCount > 0,
      description: "Cipta kelas dulu.",
    },
    {
      id: 2,
      title: "Setup Murid",
      done: onboardingStats.studentCount > 0,
      description: "Tambah murid untuk kelas yang dipilih.",
    },
    {
      id: 3,
      title: "Assign Subjek",
      done: onboardingStats.classSubjectCount > 0,
      description: "Pautkan subjek dengan kelas.",
    },
  ];

  const currentStep = onboardingSteps.find((step) => !step.done)?.id ?? 4;
  const onboardingDone = onboardingSteps.every((step) => step.done);
  const firstClassId = classes[0]?.id ?? "";

  const hideOnboarding = () => {
    if (!user || !workspace) return;
    const hideKey = `onboarding_hidden_${user.id}_${workspace.id}`;
    window.localStorage.setItem(hideKey, "1");
    setShowOnboarding(false);
  };

  if (loading) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">Loading dashboard...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="rounded-2xl border border-[#dce8d5] bg-[#fcfdf8] p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Kelas</h1>
            <p className="mt-1 text-sm text-slate-600">Urus kelas dan murid anda</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/subjects"
              className="rounded-lg border border-[#cfe0c6] bg-white px-3 py-2 text-sm text-slate-700 hover:bg-[#f4f8ef]"
            >
              Subjects
            </Link>
            <Link
              href="/logs"
              className="rounded-lg border border-[#cfe0c6] bg-white px-3 py-2 text-sm text-slate-700 hover:bg-[#f4f8ef]"
            >
              Log Padam
            </Link>
            <Link
              href="/settings"
              className="rounded-lg border border-[#cfe0c6] bg-white px-3 py-2 text-sm text-slate-700 hover:bg-[#f4f8ef]"
            >
              Tetapan
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-[#cfe0c6] bg-white px-3 py-2 text-sm text-slate-700 hover:bg-[#f4f8ef]"
            >
              Logout
            </button>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <section className="mt-6 grid gap-2 rounded-xl border border-[#dce8d5] bg-white p-4 text-sm md:grid-cols-2">
          <p>
            <span className="font-medium">Current user:</span>{" "}
            {user?.email ?? "-"}
          </p>
          <p>
            <span className="font-medium">Workspace:</span>{" "}
            {workspace ? workspace.name : "Belum ada workspace"}
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-base font-semibold text-slate-800">Senarai Kelas</h2>

          {!workspace ? (
            <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Workspace belum dijumpai. Semak trigger signup.
            </p>
          ) : (
            <>
              {showOnboarding ? (
                <section className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-emerald-900">Panduan Setup Cepat</h3>
                      <p className="mt-1 text-xs text-emerald-800">
                        Ikut langkah 1 sampai 5. Siap langkah semasa, terus ke langkah seterusnya.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={hideOnboarding}
                      className="rounded-md border border-emerald-300 bg-white px-2 py-1 text-xs text-emerald-900"
                    >
                      Sembunyi
                    </button>
                  </div>

                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {onboardingSteps.map((step) => (
                      <div
                        key={step.id}
                        className={`rounded-lg border px-3 py-2 text-xs ${
                          step.done
                            ? "border-emerald-300 bg-emerald-100 text-emerald-900"
                            : step.id === currentStep
                              ? "animate-pulse border-amber-300 bg-amber-50 text-amber-900"
                              : "border-slate-200 bg-white text-slate-700"
                        }`}
                      >
                        <p className="font-semibold">
                          Langkah {step.id}: {step.title} {step.done ? "✓" : ""}
                        </p>
                        <p className="mt-0.5">{step.description}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {currentStep === 1 ? (
                      <Link href="/subjects" className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-medium text-white">
                        Pergi Langkah 1
                      </Link>
                    ) : null}
                    {currentStep === 2 ? (
                      <button
                        type="button"
                        onClick={() => setIsAddClassOpen(true)}
                        className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-medium text-white"
                      >
                        Buka Langkah 2
                      </button>
                    ) : null}
                    {currentStep === 3 && firstClassId ? (
                      <Link href={`/classes/${firstClassId}`} className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-medium text-white">
                        Pergi Langkah 3
                      </Link>
                    ) : null}
                    {currentStep === 4 && firstClassId ? (
                      <Link href={`/classes/${firstClassId}`} className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-medium text-white">
                        Pergi Langkah 4
                      </Link>
                    ) : null}
                    {currentStep === 5 && firstClassId ? (
                      <Link href={`/classes/${firstClassId}`} className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-medium text-white">
                        Pergi Langkah 5
                      </Link>
                    ) : null}
                    {onboardingDone ? (
                      <p className="rounded-md bg-emerald-100 px-3 py-2 text-xs font-medium text-emerald-900">
                        Setup asas siap. Anda boleh mula guna app.
                      </p>
                    ) : null}
                  </div>
                </section>
              ) : null}

              <details
                open={isAddClassOpen}
                onToggle={(e) => setIsAddClassOpen((e.target as HTMLDetailsElement).open)}
                className="mt-3 rounded-xl border border-[#dce8d5] bg-white p-3"
              >
                <summary className="cursor-pointer list-none text-sm font-medium text-slate-800">
                  + Tambah Kelas
                </summary>
                <form
                  onSubmit={handleCreateClass}
                  className="mt-3 grid gap-2 md:grid-cols-4"
                >
                  <input
                    type="text"
                    placeholder="Nama kelas (contoh: 5 Cemerlang)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-lg border border-[#d3dfcc] bg-[#fbfdf8] px-3 py-2 text-sm md:col-span-2"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Year label (contoh: Tahun 5)"
                    value={yearLabel}
                    onChange={(e) => setYearLabel(e.target.value)}
                    className="rounded-lg border border-[#d3dfcc] bg-[#fbfdf8] px-3 py-2 text-sm"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Academic year (contoh: 2026)"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="rounded-lg border border-[#d3dfcc] bg-[#fbfdf8] px-3 py-2 text-sm"
                    required
                  />
                  <button
                    type="submit"
                    disabled={creating}
                    className="rounded-lg bg-[#3f6a45] px-3 py-2 text-sm font-medium text-white disabled:opacity-60 md:col-span-4"
                  >
                    {creating ? "Menyimpan..." : "Tambah Kelas"}
                  </button>
                </form>
              </details>

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

              <div className="mt-4 rounded-xl border border-[#dce8d5] bg-white px-3 py-2 text-sm">
                <span className="font-medium">Total classes:</span> {classes.length}
              </div>

              <details className="mt-3 rounded-xl border border-[#dce8d5] bg-white p-3">
                <summary className="cursor-pointer list-none text-sm font-medium text-slate-800">
                  Tapis Paparan
                </summary>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <input
                    type="text"
                    placeholder="Search class name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="rounded-lg border border-[#d3dfcc] bg-[#fbfdf8] px-3 py-2 text-sm"
                  />
                  <select
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value)}
                    className="rounded-lg border border-[#d3dfcc] bg-[#fbfdf8] px-3 py-2 text-sm"
                  >
                    <option value="all">All academic years</option>
                    {academicYearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </details>

              {filteredClasses.length === 0 ? (
                <p className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">
                  Tiada kelas untuk paparan semasa.
                </p>
              ) : (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {filteredClasses.map((item) => (
                    <Link
                      key={item.id}
                      href={`/classes/${item.id}`}
                      onClick={() => setNavigatingClassId(item.id)}
                      className="group rounded-2xl border border-[#d8e5d2] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#b9d2ad] hover:shadow-md"
                    >
                      <div className="space-y-2">
                        <p className="text-base font-semibold text-slate-900 group-hover:text-[#355f3b]">
                          {item.name}
                        </p>
                        <p className="text-sm text-slate-600">
                          {item.year_label} • {item.academic_year}
                        </p>
                        <p className="text-xs text-slate-500">
                          Murid: {classStudentCounts[item.id] ?? 0}
                        </p>
                        {navigatingClassId === item.id ? (
                          <p className="text-xs font-medium text-amber-700">Membuka kelas...</p>
                        ) : null}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>
      {navigatingClassId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-lg">
            Sedang buka kelas. Sila tunggu...
          </div>
        </div>
      ) : null}
      </div>
    </main>
  );
}

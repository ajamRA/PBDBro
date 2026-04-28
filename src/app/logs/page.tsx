"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Workspace = {
  id: string;
  name: string;
};

type DeletionLog = {
  id: string;
  entity_type: string;
  entity_id: string;
  entity_label: string | null;
  status: "deleted" | "restored";
  deleted_at: string;
  restored_at: string | null;
};

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ms-MY");
}

export default function DeletionLogsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [logs, setLogs] = useState<DeletionLog[]>([]);

  const loadLogs = async (workspaceId: string) => {
    const { data, error: logsError } = await supabase
      .from("deletion_logs")
      .select("id, entity_type, entity_id, entity_label, status, deleted_at, restored_at")
      .eq("workspace_id", workspaceId)
      .order("deleted_at", { ascending: false });

    if (logsError) {
      const migrationMissing =
        logsError.code === "42P01" ||
        logsError.message.toLowerCase().includes("deletion_logs");
      if (migrationMissing) {
        setError(
          "Table log belum wujud. Run migration 20260427000300_deletion_logs_and_restore.sql dulu di Supabase.",
        );
      } else {
        setError(logsError.message);
      }
      return;
    }

    setLogs((data ?? []) as DeletionLog[]);
  };

  useEffect(() => {
    const loadPage = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

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
      await loadLogs(ws.id);
      setLoading(false);
    };

    void loadPage();
  }, [router]);

  const handleRestore = async (log: DeletionLog) => {
    if (!workspace) return;
    if (log.status !== "deleted") return;

    const confirmed = window.confirm(
      `Restore "${log.entity_label ?? log.entity_type}"?\nData akan dimasukkan semula ke sistem.`,
    );
    if (!confirmed) return;

    setRestoringId(log.id);
    setError("");
    setSuccess("");

    if (log.entity_type !== "class") {
      setError("Jenis log ini belum disokong untuk restore automatik.");
      setRestoringId(null);
      return;
    }

    const { error: restoreError } = await supabase.rpc("restore_deleted_class", {
      p_workspace_id: workspace.id,
      p_log_id: log.id,
    });

    if (restoreError) {
      setError(restoreError.message);
      setRestoringId(null);
      return;
    }

    await loadLogs(workspace.id);
    setSuccess(`Restore berjaya: ${log.entity_label ?? log.entity_type}`);
    setRestoringId(null);
  };

  if (loading) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-8">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">Loading log padam...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-8">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Log Padam (Recycle Bin)</h1>
            <p className="mt-1 text-sm text-slate-600">
              Data yang dipadam disimpan di sini dan boleh di-restore.
            </p>
          </div>
          <Link href="/dashboard" className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            Kembali Dashboard
          </Link>
        </div>

        <section className="mt-4 rounded-md border border-slate-200 p-3 text-sm">
          <p>
            <span className="font-medium">Workspace:</span> {workspace?.name ?? "-"}
          </p>
          <p>
            <span className="font-medium">Total log:</span> {logs.length}
          </p>
        </section>

        {error ? (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        {success ? (
          <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
        ) : null}

        <section className="mt-4">
          {logs.length === 0 ? (
            <p className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">
              Belum ada data dipadam.
            </p>
          ) : (
            <ul className="space-y-2">
              {logs.map((log) => (
                <li key={log.id} className="rounded-md border border-slate-200 p-3 text-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{log.entity_label ?? log.entity_type}</p>
                      <p className="text-xs text-slate-600">Type: {log.entity_type}</p>
                      <p className="text-xs text-slate-600">Deleted: {formatDateTime(log.deleted_at)}</p>
                      <p className="text-xs text-slate-600">Restored: {formatDateTime(log.restored_at)}</p>
                      <p className="text-xs text-slate-600">Status: {log.status}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleRestore(log)}
                      disabled={log.status !== "deleted" || restoringId === log.id}
                      className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 disabled:opacity-50"
                    >
                      {restoringId === log.id ? "Restoring..." : "Restore"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}


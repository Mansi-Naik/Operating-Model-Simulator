import React, { useMemo } from "react";
import { useEngagement } from "../hooks/useEngagement";
import { computeReadiness } from "../lib/readinessScoring";

const TEST_ID = "e582ad1e-c52a-4256-b042-56ad9ecf5b6c";

export default function DebugEngagementPage() {
  const {
    engagement,
    tasks,
    loading,
    error,
    loadEngagement,
    updateEngagement,
    updateTask,
  } = useEngagement(TEST_ID) as any;

  const firstTaskId = useMemo(() => (tasks && tasks.length > 0 ? tasks[0]?.id : null), [tasks]);
  const readiness = useMemo(() => computeReadiness(engagement, tasks), [engagement, tasks]);

  return (
    <div style={{ padding: 16, fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
      <h1 style={{ margin: "0 0 12px 0" }}>/debug</h1>

      <section style={{ marginBottom: 16 }}>
        <div>
          <strong>Loading:</strong> {String(loading)}
        </div>
        <div>
          <strong>Error:</strong> {error ?? "null"}
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => loadEngagement(TEST_ID)}>
            Refresh
          </button>

          <button
            type="button"
            onClick={async () => {
              const { ok } = await updateEngagement({ client_name: "Updated at " + new Date().toISOString() });
              if (ok) await loadEngagement(TEST_ID);
            }}
          >
            Update client name
          </button>

          <button
            type="button"
            disabled={!firstTaskId}
            onClick={async () => {
              if (!firstTaskId) return;
              await updateTask(firstTaskId, { task_name: "Edited at " + new Date().toISOString() });
              await loadEngagement(TEST_ID);
            }}
          >
            Update first task
          </button>
        </div>
      </section>

      <section style={{ marginBottom: 16 }}>
        <h2 style={{ margin: "0 0 8px 0" }}>Engagement</h2>
        <pre style={{ background: "#f6f6f6", padding: 12, overflow: "auto" }}>
          {JSON.stringify(engagement, null, 2)}
        </pre>
      </section>

      <section style={{ marginBottom: 16 }}>
        <h2 style={{ margin: "0 0 8px 0" }}>Readiness scoring</h2>
        <pre style={{ background: "#f6f6f6", padding: 12, overflow: "auto" }}>
          {JSON.stringify(
            {
              score: readiness.score,
              band: readiness.band,
              breakdown: readiness.breakdown,
              gaps: readiness.gaps,
            },
            null,
            2,
          )}
        </pre>
      </section>

      <section>
        <h2 style={{ margin: "0 0 8px 0" }}>Tasks</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "6px 8px" }}>task_id</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "6px 8px" }}>task_name</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "6px 8px" }}>role</th>
            </tr>
          </thead>
          <tbody>
            {(tasks ?? []).map((t) => (
              <tr key={t.id ?? `${t.engagement_id}-${t.task_id}-${t.task_name}`}>
                <td style={{ borderBottom: "1px solid #eee", padding: "6px 8px" }}>{t.task_id ?? ""}</td>
                <td style={{ borderBottom: "1px solid #eee", padding: "6px 8px" }}>{t.task_name ?? ""}</td>
                <td style={{ borderBottom: "1px solid #eee", padding: "6px 8px" }}>{t.role_performing ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

function isUuid(value) {
  if (typeof value !== "string") return false;
  // UUID v1-v5 (common Postgres uuid format)
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

function normalizeError(err) {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  const msg = typeof err.message === "string" ? err.message : "";
  const parts = [msg || null, err.code ? `code=${err.code}` : null, err.details || null, err.hint || null].filter(
    Boolean,
  );
  if (parts.length) return parts.join(" — ");
  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown error";
  }
}

function sanitizeTasksForInsert(tasksArray, engagementId) {
  if (!Array.isArray(tasksArray)) return [];
  return tasksArray
    .filter((t) => t && typeof t === "object")
    .map((t) => ({
      engagement_id: engagementId,
      task_id: t.task_id ?? null,
      task_name: t.task_name ?? null,
      role_performing: t.role_performing ?? null,
      task_type: t.task_type ?? null,
      volume_per_day: t.volume_per_day ?? null,
      avg_time_minutes: t.avg_time_minutes ?? null,
      input_data_type: t.input_data_type ?? null,
      consequence_of_error: t.consequence_of_error ?? null,
      data_logged: typeof t.data_logged === "boolean" ? t.data_logged : null,
      regulatory_constraint:
        typeof t.regulatory_constraint === "boolean" ? t.regulatory_constraint : null,
      source: t.source ?? null,
    }));
}

/**
 * Custom hook to manage an engagement and its tasks via Supabase.
 *
 * @param {string | undefined | null} engagementId Optional engagement id to auto-load.
 */
export function useEngagement(engagementId) {
  const [engagement, setEngagement] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const currentEngagementId = useMemo(
    () => (engagementId ?? engagement?.id ?? null),
    [engagementId, engagement?.id],
  );

  /**
   * Loads engagement + tasks by id.
   *
   * @param {string} id Engagement UUID
   * @returns {Promise<null | { engagement: any, tasks: any[] }>} Loaded data when successful, otherwise null.
   */
  const loadEngagement = useCallback(async (id) => {
    if (!id) {
      setEngagement(null);
      setTasks([]);
      return null;
    }

    if (!isUuid(id)) {
      setEngagement(null);
      setTasks([]);
      setError(`Invalid engagementId (expected UUID): "${String(id)}"`);
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      const [{ data: engagementRow, error: engagementError }, { data: tasksRows, error: tasksError }] =
        await Promise.all([
          supabase
            .from("engagements")
            .select(
              "id, client_name, domain, status, readiness_score, readiness_band, intake_mode, values_are_illustrative, intake_data, created_at, updated_at",
            )
            .eq("id", id)
            .maybeSingle(),
          supabase
            .from("tasks")
            .select(
              "id, engagement_id, task_id, task_name, role_performing, task_type, volume_per_day, avg_time_minutes, input_data_type, consequence_of_error, data_logged, regulatory_constraint, source, user_allocation, user_override_reason, ai_allocation, ai_confidence_raw, ai_confidence_calibrated, ai_primary_capability, ai_rationale, ai_risk_factors, ai_prerequisites",
            )
            .eq("engagement_id", id),
        ]);

      if (engagementError) {
        setEngagement(null);
        setTasks([]);
        setError(normalizeError(engagementError));
        return null;
      }

      if (tasksError) {
        setEngagement(engagementRow ?? null);
        setTasks([]);
        setError(normalizeError(tasksError));
        return null;
      }

      setEngagement(engagementRow ?? null);
      setTasks(Array.isArray(tasksRows) ? tasksRows : []);
      return { engagement: engagementRow ?? null, tasks: Array.isArray(tasksRows) ? tasksRows : [] };
    } catch (e) {
      setEngagement(null);
      setTasks([]);
      setError(normalizeError(e));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Inserts a new engagement.
   *
   * @param {object} initialData Engagement fields to insert
   * @returns {Promise<string|null>} new engagement id when created, else null.
   */
  const createEngagement = useCallback(async (initialData) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: insertError } = await supabase
        .from("engagements")
        .insert([initialData ?? {}])
        .select("id")
        .single();

      if (insertError) {
        setError(normalizeError(insertError));
        return null;
      }

      const newId = data?.id ?? null;
      if (newId) {
        await loadEngagement(newId);
      }
      return newId;
    } catch (e) {
      setError(normalizeError(e));
      return null;
    } finally {
      setLoading(false);
    }
  }, [loadEngagement]);

  /**
   * Updates the currently loaded engagement.
   *
   * @param {object} updates Partial engagement fields to update
   * @returns {Promise<{ ok: boolean, error: string | null }>}
   */
  const updateEngagement = useCallback(
    async (updates) => {
      // Prefer the URL/step `engagementId` prop over cached row id so we never target the wrong row.
      const id = currentEngagementId ?? engagement?.id;
      if (!id) {
        const msg = "No engagement selected";
        setError(msg);
        return { ok: false, error: msg };
      }

      setLoading(true);
      setError(null);
      try {
        const { data, error: updateError } = await supabase
          .from("engagements")
          .update(updates ?? {})
          .eq("id", id)
          .select(
            "id, client_name, domain, status, readiness_score, readiness_band, intake_mode, values_are_illustrative, intake_data, created_at, updated_at",
          )
          .maybeSingle();

        if (updateError) {
          const msg = normalizeError(updateError);
          setError(msg);
          return { ok: false, error: msg };
        }

        if (data) setEngagement(data);
        return { ok: true, error: null };
      } catch (e) {
        const msg = normalizeError(e);
        setError(msg);
        return { ok: false, error: msg };
      } finally {
        setLoading(false);
      }
    },
    [currentEngagementId, engagement?.id],
  );

  /**
   * Bulk inserts tasks for the current engagement.
   *
   * @param {Array<object>} tasksArray List of task objects (without engagement_id).
   * @returns {Promise<boolean>} true when inserted, otherwise false.
   */
  const saveTasks = useCallback(
    async (tasksArray) => {
      const id = engagement?.id ?? currentEngagementId;
      if (!id) {
        setError("No engagement selected");
        return false;
      }

      const rows = sanitizeTasksForInsert(tasksArray, id);

      setLoading(true);
      setError(null);
      try {
        // Replace mode: clear existing tasks for this engagement before inserting the new list.
        // This avoids duplicating rows when the user re-saves step 3.
        const { error: deleteError } = await supabase.from("tasks").delete().eq("engagement_id", id);
        if (deleteError) {
          setError(normalizeError(deleteError));
          return false;
        }

        if (rows.length === 0) {
          setTasks([]);
          return true;
        }

        const { data, error: insertError } = await supabase
          .from("tasks")
          .insert(rows)
          .select(
            "id, engagement_id, task_id, task_name, role_performing, task_type, volume_per_day, avg_time_minutes, input_data_type, consequence_of_error, data_logged, regulatory_constraint, source, user_allocation, user_override_reason, ai_allocation, ai_confidence_raw, ai_confidence_calibrated, ai_primary_capability, ai_rationale, ai_risk_factors, ai_prerequisites",
          );

        if (insertError) {
          setError(normalizeError(insertError));
          return false;
        }

        setTasks(Array.isArray(data) ? data : []);
        return true;
      } catch (e) {
        setError(normalizeError(e));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [currentEngagementId, engagement?.id],
  );

  /**
   * Updates a single task row.
   *
   * @param {string} taskId Task row id
   * @param {object} updates Partial task fields to update
   * @returns {Promise<boolean>} true when updated, otherwise false.
   */
  const updateTask = useCallback(async (taskId, updates) => {
    if (!taskId) {
      setError("Missing taskId");
      return false;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: updateError } = await supabase
        .from("tasks")
        .update(updates ?? {})
        .eq("id", taskId)
        .select(
          "id, engagement_id, task_id, task_name, role_performing, task_type, volume_per_day, avg_time_minutes, input_data_type, consequence_of_error, data_logged, regulatory_constraint, source, user_allocation, user_override_reason, ai_allocation, ai_confidence_raw, ai_confidence_calibrated, ai_primary_capability, ai_rationale, ai_risk_factors, ai_prerequisites",
        )
        .maybeSingle();

      if (updateError) {
        setError(normalizeError(updateError));
        return false;
      }

      if (data) {
        setTasks((prev) => prev.map((t) => (t?.id === data.id ? data : t)));
      }
      return true;
    } catch (e) {
      setError(normalizeError(e));
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!engagementId) return;
    if (!isUuid(engagementId)) {
      setEngagement(null);
      setTasks([]);
      setError(`Invalid engagementId (expected UUID): "${String(engagementId)}"`);
      return;
    }
    loadEngagement(engagementId);
  }, [engagementId, loadEngagement]);

  return {
    engagement,
    tasks,
    loading,
    error,
    createEngagement,
    updateEngagement,
    loadEngagement,
    saveTasks,
    updateTask,
  };
}


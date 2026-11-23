"use client";

import { useEffect, useState } from "react";
import { apiList, apiSession, type SessionResponse } from "@/lib/client/api";
import { useSession } from "@/components/SessionProvider";
import {
  PageIntro, Badge, Card, EmptyState, PageHeader, Stat, StatusBadge, Table } from "@/components/ui";
import { DEPARTMENT_MAP } from "@/lib/domain/departments";

import { RecordRef, RefCell } from "@/components/EntityBrowser";
import { formatDateTime } from "@/lib/domain/dates";

/**
 * My work.
 *
 * Everything addressed to the acting user: their tasks, the escalations waiting on them and
 * the notifications raised by the workflows.
 */
export default function MyWorkPage() {
  const { session } = useSession();
  const [tasks, setTasks] = useState<Record<string, unknown>[]>([]);
  const [notifications, setNotifications] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    apiList("tasks", { limit: 500 }).then((r) => setTasks(r.items)).catch(() => setTasks([]));
    apiSession().then((s: SessionResponse) => setNotifications(s.notifications)).catch(() => setNotifications([]));
  }, [session?.actor.id]);

  const today = new Date().toISOString().slice(0, 10);
  const mine = tasks.filter((t) => t.owner_id === session?.actor.id && !["done", "cancelled"].includes(String(t.status)));
  const mineOverdue = mine.filter((t) => String(t.due_date ?? "") < today);
  const awaitingApproval = tasks.filter((t) => t.approver_id === session?.actor.id && String(t.status) !== "done");
  const escalations = tasks.filter((t) => String(t.escalation_status) === "escalated" && !["done", "cancelled"].includes(String(t.status)));

  return (
    <div className="space-y-4">
      <PageHeader
        title="My work"
        description={
          session
            ? `${session.actor.name} - ${DEPARTMENT_MAP[session.actor.department]?.label ?? session.actor.department}. Everything addressed to you: tasks, approvals waiting on you, and escalations.`
            : "Loading"
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="My open tasks" value={mine.length} tone="progress" />
        <Stat label="Overdue" value={mineOverdue.length} tone={mineOverdue.length > 0 ? "danger" : "success"} />
        <Stat label="Awaiting my approval" value={awaitingApproval.length} tone={awaitingApproval.length > 0 ? "warning" : "success"} />
        <Stat label="Escalations open" value={escalations.length} tone={escalations.length > 0 ? "danger" : "success"} />
      </div>

      <Card title="My tasks" subtitle="Owner, due date, required output, evidence, approver and next action" padded={false}>
        {mine.length === 0 ? (
          <div className="p-4">
            <EmptyState title="Nothing assigned to you right now" hint="Switch the acting user in the header to see another team's queue." />
          </div>
        ) : (
          <Table
            dense
            columns={[
              { key: "title", label: "Task", render: (r) => <RefCell entity="tasks" id={r.id} label={r.title} /> },
              { key: "department", label: "Department", render: (r) => <Badge>{DEPARTMENT_MAP[String(r.department)]?.short ?? String(r.department)}</Badge> },
              { key: "due_date", label: "Due", render: (r) => <span className={String(r.due_date) < today ? "font-semibold text-risk" : ""}>{String(r.due_date)}</span> },
              { key: "status", label: "Status", render: (r) => <StatusBadge registry="task" value={r.status} /> },
              { key: "priority", label: "Priority", render: (r) => <StatusBadge registry="task_priority" value={r.priority} /> },
              { key: "required_output", label: "Required output" },
              { key: "next_action", label: "Next action" },
              {
                key: "entity_id",
                label: "Record",
                render: (r) => <RecordRef type={r.entity_type} id={r.entity_id} />,
              },
            ]}
            rows={mine}
          />
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Awaiting my approval" padded={false}>
          {awaitingApproval.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No approvals waiting" />
            </div>
          ) : (
            <Table
              dense
              columns={[
                { key: "title", label: "Task", render: (r) => <RefCell entity="tasks" id={r.id} label={r.title} /> },
                { key: "department", label: "Department", render: (r) => <Badge>{DEPARTMENT_MAP[String(r.department)]?.short ?? String(r.department)}</Badge> },
                { key: "status", label: "Status", render: (r) => <StatusBadge registry="task" value={r.status} /> },
              ]}
              rows={awaitingApproval}
            />
          )}
        </Card>

        <Card title="Alerts for my role" padded={false}>
          {notifications.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No open alerts" />
            </div>
          ) : (
            <ul className="divide-y divide-hair">
              {notifications.map((n) => (
                <li key={String(n.id)} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-ink">{String(n.title)}</p>
                    <Badge tone="warning">{String(n.recipient_role)}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">{String(n.body)}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-faint">
                    <RecordRef type={n.entity_type} id={n.entity_id} />
                    <span>{formatDateTime(String(n.created_at))}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {escalations.length > 0 ? (
        <Card title="Open escalations" subtitle="Raised to Management with a reason" padded={false}>
          <Table
            dense
            columns={[
              { key: "title", label: "Task", render: (r) => <RefCell entity="tasks" id={r.id} label={r.title} /> },
              { key: "department", label: "Department", render: (r) => <Badge>{DEPARTMENT_MAP[String(r.department)]?.short ?? String(r.department)}</Badge> },
              { key: "escalation_reason", label: "Reason" },
              { key: "escalated_on", label: "Escalated" },
            ]}
            rows={escalations}
          />
        </Card>
      ) : null}

      <PageIntro summary="Everything addressed to you, with overdue items surfaced against the working-day calendar.">
        Deadlines are computed against the working-day calendar. Overdue items surface here, on the department dashboard
        and on the management dashboard as material exceptions.
      </PageIntro>
    </div>
  );
}

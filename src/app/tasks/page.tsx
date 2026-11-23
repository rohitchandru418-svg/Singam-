"use client";

import { EntityBrowser, RefCell, LinkCell, RecordRef } from "@/components/EntityBrowser";
import { ModuleActions } from "@/components/ModuleActions";
import {
  PageIntro, Badge, Card, Stat, StatusBadge } from "@/components/ui";
import { DEPARTMENT_MAP, DEPARTMENTS } from "@/lib/domain/departments";
import { useEffect, useState } from "react";
import { apiList } from "@/lib/client/api";

export default function TasksPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    apiList("tasks", { limit: 500 }).then((r) => setRows(r.items)).catch(() => setRows([]));
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const open = rows.filter((t) => !["done", "cancelled"].includes(String(t.status)));
  const overdue = open.filter((t) => String(t.due_date ?? "") < today);
  const escalated = rows.filter((t) => String(t.escalation_status) === "escalated");

  return (
    <div className="space-y-4">
      <PageIntro summary="Owner, due date, required output, evidence, approver and next action, with reminders and escalations.">
        Every task carries <strong>Owner &rarr; Due date &rarr; Required output &rarr; Evidence &rarr; Approver &rarr; Next
        action</strong>. Deadlines are computed against the working-day calendar, and reminders and escalations follow from
        the same records.
      </PageIntro>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Open tasks" value={open.length} tone="progress" />
        <Stat label="Overdue" value={overdue.length} tone={overdue.length > 0 ? "danger" : "success"} />
        <Stat label="Escalated to Management" value={escalated.length} tone={escalated.length > 0 ? "warning" : "success"} />
        <Stat label="Completed" value={rows.length - open.length} tone="success" />
      </div>

      <ModuleActions actions={["task.create", "task.update", "task.escalate"]} label="Task actions" />

      <Card title="Overdue by department">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {DEPARTMENTS.map((d) => {
            const deptOverdue = overdue.filter((t) => t.department === d.key).length;
            const deptOpen = open.filter((t) => t.department === d.key).length;
            return (
              <div key={d.key} className="rounded-lg border border-hair p-3">
                <p className="text-sm font-medium text-ink">{d.label}</p>
                <p className="mt-1 text-xs text-faint">
                  {deptOpen} open, <span className={deptOverdue > 0 ? "font-semibold text-risk" : ""}>{deptOverdue} overdue</span>
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      <EntityBrowser
        entity="tasks"
        module="tasks"
        title="Task register"
        description="Owner, due date, required output, evidence, approver, next action, priority and escalation."
        searchPlaceholder="Search title, required output, evidence, next action or escalation reason"
        filters={[
          {
            column: "status",
            label: "Status",
            options: [
              { value: "open", label: "Open" },
              { value: "in_progress", label: "In progress" },
              { value: "blocked", label: "Blocked" },
              { value: "done", label: "Done" },
              { value: "cancelled", label: "Cancelled" },
            ],
          },
          {
            column: "department",
            label: "Department",
            options: DEPARTMENTS.map((d) => ({ value: d.key, label: d.label })),
          },
          {
            column: "priority",
            label: "Priority",
            options: [
              { value: "high", label: "High" },
              { value: "medium", label: "Medium" },
              { value: "low", label: "Low" },
            ],
          },
          {
            column: "escalation_status",
            label: "Escalation",
            options: [
              { value: "none", label: "Not escalated" },
              { value: "escalated", label: "Escalated" },
              { value: "resolved", label: "Resolved" },
            ],
          },
        ]}
        columns={[
          { key: "title", label: "Task", render: (r) => <LinkCell entity="tasks" id={r.id} label={String(r.title)} /> },
          { key: "department", label: "Department", render: (r) => <Badge>{DEPARTMENT_MAP[String(r.department)]?.short ?? String(r.department)}</Badge> },
          { key: "owner_id", label: "Owner", render: (r) => <RefCell entity="users" id={r.owner_id} label={r.owner_id_label} /> },
          { key: "due_date", label: "Due date", render: (r) => <span className={String(r.due_date ?? "") < today && !["done", "cancelled"].includes(String(r.status)) ? "font-semibold text-risk" : ""}>{String(r.due_date)}</span> },
          { key: "status", label: "Status", render: (r) => <StatusBadge registry="task" value={r.status} /> },
          { key: "priority", label: "Priority", render: (r) => <StatusBadge registry="task_priority" value={r.priority} /> },
          { key: "required_output", label: "Required output" },
          { key: "evidence", label: "Evidence" },
          { key: "approver_id", label: "Approver", render: (r) => <RefCell entity="users" id={r.approver_id} label={r.approver_id_label} /> },
          { key: "next_action", label: "Next action" },
          {
            key: "escalation_status",
            label: "Escalation",
            render: (r) => (String(r.escalation_status) === "escalated" ? <Badge tone="danger">Escalated</Badge> : <span className="text-faint">{String(r.escalation_status ?? "none")}</span>),
          },
          { key: "escalation_reason", label: "Escalation reason" },
          { key: "entity_type", label: "Record type" },
          { key: "entity_id", label: "Record", render: (r) => <RecordRef type={r.entity_type} id={r.entity_id} /> },
        ]}
      />
    </div>
  );
}

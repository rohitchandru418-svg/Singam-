"use client";

import Link from "next/link";
import { EntityBrowser, LinkCell } from "@/components/EntityBrowser";
import { Badge } from "@/components/ui";
import { useSession } from "@/components/SessionProvider";

export default function StartupsPage() {
  const { session } = useSession();

  return (
    <EntityBrowser
      entity="startups"
      module="startups"
      title="Startups"
      description="One record per startup. A repeat application links here rather than creating a duplicate, so earlier seasons stay visible."
      searchPlaceholder="Search by name, legal entity, sector, CIN or PAN"
      filters={[
        {
          column: "stage",
          label: "Stage",
          options: [
            { value: "idea", label: "Idea" },
            { value: "pre_revenue", label: "Pre-revenue" },
            { value: "early_revenue", label: "Early revenue" },
            { value: "growth", label: "Growth" },
          ],
        },
      ]}
      columns={[
        { key: "name", label: "Startup", render: (r) => <LinkCell entity="startups" id={r.id} label={String(r.name)} /> },
        { key: "legal_entity", label: "Legal entity" },
        { key: "sector", label: "Sector" },
        { key: "stage", label: "Stage", render: (r) => <Badge>{String(r.stage).replace(/_/g, " ")}</Badge> },
        { key: "geography", label: "Geography" },
        { key: "business_model", label: "Business model" },
        { key: "pan", label: "PAN", render: (r) => <span className="font-mono text-xs">{String(r.pan)}</span> },
      ]}
      actions={
        session ? (
          <Link href="/applications" className="rounded-lg border border-hair-strong bg-canvas px-3 py-1.5 text-[13px] hover:bg-surface">
            Applications
          </Link>
        ) : null
      }
    />
  );
}

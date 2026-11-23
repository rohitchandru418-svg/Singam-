"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiBoard, type BoardRow } from "@/lib/client/api";
import { StartupBoard } from "@/components/StartupBoard";
import { Card, EmptyState, InfoNote, PageHeader, PageIntro, Skeleton } from "@/components/ui";
import { Icon } from "@/components/icons";

/**
 * Pipeline: the whole season on one screen.
 *
 * The founder's journey used to be seven separate screens — applications, screening,
 * bootcamp, analyst, MoU, IRR — which read as seven unrelated lists. They are one pipeline:
 * every startup is a single row whose stage, selection, production, investment and finance
 * status are tracked separately, so a reader answers "how far along is this startup, and is
 * anything wrong?" without hopping between screens. The row opens the startup record, where
 * the stage's own next step and its owner are shown.
 */
export default function PipelinePage() {
  const router = useRouter();
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiBoard()
      .then((data) => {
        if (!cancelled) setRows(Array.isArray(data) ? data : [data]);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load the pipeline");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const count = rows?.length ?? 0;

  return (
    <div className="space-y-4">
      <PageHeader
        icon={<Icon name="layers" className="h-[18px] w-[18px]" />}
        title="Pipeline"
        description="Every startup on one row. Selection, production, investment and finance are tracked separately, never merged into a single progress figure."
      />
      <PageIntro summary="Application to shoot to funding, one row per startup.">
        The founder&apos;s journey is one pipeline, not seven screens. Each row carries the stage the startup has
        reached and, kept apart, its selection decision, shoot and telecast status, investor commitment, verified
        deployment and fee collection. Open a row to see the stage&apos;s next step and who owns it.
      </PageIntro>

      {error ? <InfoNote tone="danger">{error}</InfoNote> : null}

      {rows === null && !error ? (
        <Card padded={false}>
          <Skeleton rows={8} />
        </Card>
      ) : rows && rows.length > 0 ? (
        <Card
          title="Season pipeline"
          subtitle={`${count} startup${count === 1 ? "" : "s"}. Open a row to see the stage's next step and its owner.`}
          padded={false}
        >
          <StartupBoard rows={rows} onOpen={(row) => router.push(`/records/startups/${row.startup_id}`)} />
        </Card>
      ) : (
        <EmptyState
          title="No startups in this season yet"
          hint="A startup appears here once an application is submitted and a relationship manager assigns it."
        />
      )}

      <p className="text-[12px] text-faint">
        Selection, shoot completion, investment commitment, deployment and fee collection are reported separately on
        purpose; an announced amount is never shown as deployed capital.
      </p>
    </div>
  );
}

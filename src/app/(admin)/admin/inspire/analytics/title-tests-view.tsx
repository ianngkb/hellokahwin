import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';
import { Panel, PanelFailed } from '@/components/admin/analytics-panels';
import { cn } from '@/lib/utils';
import {
  TITLE_TEST_MAX_DAYS,
  TITLE_TEST_MIN_DAYS,
  TITLE_TEST_MIN_IMPRESSIONS,
  type SideStats,
} from '@/lib/analytics/title-test-math';
import { loadTitleTestCandidate, loadTitleTests, type TitleTestResult } from './title-tests-data';
import { EndTitleTestButton, StartTitleTestForm } from './title-test-controls';

const int = (n: number) => n.toLocaleString('en-MY');
const pct = (n: number | null) => (n === null ? '–' : `${(n * 100).toFixed(1)}%`);
const pos = (n: number | null) => (n === null ? '–' : n.toFixed(1));

function klDateTime(d: Date): string {
  return new Intl.DateTimeFormat('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

function shortDay(day: string): string {
  return new Intl.DateTimeFormat('en-MY', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${day}T00:00:00Z`));
}

const range = (r: { from: string; to: string } | null) =>
  r ? `${shortDay(r.from)} – ${shortDay(r.to)}` : '–';

function Head({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border-hairline border-b px-4 py-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      {description && <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>}
    </div>
  );
}

const VERDICT_STYLE = {
  waiting: 'bg-muted text-muted-foreground',
  winning: 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100',
  losing: 'bg-rose-50 text-rose-900 dark:bg-rose-950 dark:text-rose-100',
  flat: 'bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100',
} as const;

function Row({ label, before, after }: { label: string; before: string; after: string }) {
  return (
    <tr className="border-hairline border-t">
      <th scope="row" className="text-muted-foreground py-2 pr-4 text-left text-xs font-medium">
        {label}
      </th>
      <td className="py-2 pr-4 text-right font-mono text-sm tabular-nums">{before}</td>
      <td className="py-2 text-right font-mono text-sm tabular-nums">{after}</td>
    </tr>
  );
}

function Numbers({
  t,
  before,
  after,
}: {
  t: TitleTestResult;
  before: SideStats;
  after: SideStats;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[320px]">
        <thead>
          <tr>
            <th className="sr-only">Measure</th>
            <th className="pr-4 pb-1 text-right text-xs font-semibold">Old title</th>
            <th className="pb-1 text-right text-xs font-semibold">New title</th>
          </tr>
        </thead>
        <tbody>
          <Row
            label="Days compared"
            before={range(t.windows.before)}
            after={range(t.windows.after)}
          />
          <Row
            label="Seen on Google"
            before={int(before.impressions)}
            after={int(after.impressions)}
          />
          <Row label="Clicks" before={int(before.clicks)} after={int(after.clicks)} />
          <Row label="Click rate" before={pct(before.ctr)} after={pct(after.ctr)} />
          <Row
            label="Average Google position"
            before={pos(before.position)}
            after={pos(after.position)}
          />
        </tbody>
      </table>
    </div>
  );
}

function TestCard({ t }: { t: TitleTestResult }) {
  const running = t.endedAt === null;
  return (
    <Panel>
      <div className="border-hairline flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Link
            href={`/admin/inspire/${t.articleId}/analytics`}
            prefetch={false}
            className="truncate text-sm font-semibold underline-offset-4 hover:underline"
          >
            {t.articleTitle}
          </Link>
          <p className="text-muted-foreground text-xs">
            {running ? 'Running' : 'Ended'} · changed {klDateTime(t.startedAt)}
            {t.endedAt ? ` · ended ${klDateTime(t.endedAt)}` : ''}
          </p>
        </div>
        {running && <EndTitleTestButton testId={t.id} />}
      </div>
      <div className="flex flex-col gap-4 p-4">
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-muted-foreground text-xs">Old title</dt>
            <dd className="break-words">{t.oldTitle}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted-foreground text-xs">New title</dt>
            <dd className="font-semibold break-words">{t.newTitle}</dd>
          </div>
        </dl>
        {t.google === null ? (
          <PanelFailed className="p-0" />
        ) : (
          <>
            <p
              className={cn('rounded-md px-3 py-2 text-sm', VERDICT_STYLE[t.google.verdict.kind])}
              role="status"
            >
              {t.google.verdict.kind === 'waiting'
                ? `Not enough data yet. ${t.google.verdict.reason}`
                : t.google.verdict.text}
            </p>
            <Numbers t={t} before={t.google.before} after={t.google.after} />
          </>
        )}
      </div>
    </Panel>
  );
}

async function StartPanel({ articleId }: { articleId: string }) {
  const a = await loadTitleTestCandidate(articleId);
  return (
    <Panel>
      <Head
        title="Start a title test"
        description="The new title goes live on Google straight away (the headline on the article page stays the same). The test then compares clicks before and after."
      />
      <div className="p-4">
        {!a ? (
          <p className="text-muted-foreground text-sm">
            That article couldn&apos;t be found or loaded. Refresh the page to try again.
          </p>
        ) : a.runningTestId ? (
          <p className="text-sm">
            <span className="font-semibold">{a.title}</span> already has a test running, below. End
            it before starting another.
          </p>
        ) : a.status !== 'published' ? (
          <p className="text-sm">
            <span className="font-semibold">{a.title}</span> isn&apos;t published, so Google
            can&apos;t see it yet.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-muted-foreground text-xs">Article</p>
              <p className="text-sm font-semibold">{a.title}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Title Google sees now</p>
              <p className="text-sm">{a.googleTitle}</p>
            </div>
            <StartTitleTestForm articleId={a.id} currentTitle={a.googleTitle} />
          </div>
        )}
      </div>
    </Panel>
  );
}

export async function TitleTestsView({ start }: { start?: string }) {
  // Awaited here rather than rendered as an async child, so the view resolves
  // in one pass (and renders under the unit tests' renderer).
  const [data, startPanel] = await Promise.all([
    loadTitleTests(),
    start ? StartPanel({ articleId: start }) : null,
  ]);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground max-w-3xl text-xs">
        Google shows one title per page, so each test compares the same article before and after its
        title changed: the days since the change (up to {TITLE_TEST_MAX_DAYS}) against the same
        number of days just before. Because a higher Google position gets more clicks whatever the
        title says, the verdict compares each click rate with what that position usually earns. It
        needs {TITLE_TEST_MIN_DAYS} days and {int(TITLE_TEST_MIN_IMPRESSIONS)} Google views on each
        side. Google reports 2–3 days late
        {data.dailyThrough ? `; its latest day is ${shortDay(data.dailyThrough)}` : ''}. Start a
        test from{' '}
        <span className="text-foreground font-semibold">Seen on Google, rarely clicked</span> on the
        Overview.
      </p>

      {startPanel}

      {data.tests === null ? (
        <Panel>
          <PanelFailed />
        </Panel>
      ) : data.tests.length === 0 ? (
        <Panel>
          <div className="p-4">
            <EmptyState
              title="No title tests yet"
              description="Open the Overview and press Start a title test on an article that is seen on Google but rarely clicked."
            />
          </div>
        </Panel>
      ) : (
        data.tests.map((t) => <TestCard key={t.id} t={t} />)
      )}
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeftIcon } from 'lucide-react';
import { requireAdminSection } from '@/lib/auth/admin';
import { PageHeader } from '@/components/layout/page-header';
import { getKLToday } from '@/lib/admin/date-range';
import { cn } from '@/lib/utils';
import { articleMonthOptions, resolveArticlePeriod } from '@/lib/analytics/article-period';
import { CompareView } from './compare-view';
import { loadOverview } from './overview-data';
import { currentParams, parseFilters } from './overview-params';
import { OverviewDashboard } from './overview-dashboard';
import { PeriodBar } from './period-bar';
import { TitleTestsView } from './title-tests-view';

export const metadata: Metadata = {
  title: 'Article Analytics - Admin',
};

// The reads are safePanel-guarded at 6 s each, batched three at a time; this is
// headroom over the broad vercel.json 30 s cap, not an expectation
// (route-segment config is the only thing that lifts it).
export const maxDuration = 60;

type Raw = string | string[] | undefined;

interface PageProps {
  searchParams: Promise<Record<string, Raw>>;
}

const TABS = [
  { key: 'overview', label: 'Overview', href: '/admin/inspire/analytics' },
  { key: 'compare', label: 'Compare articles', href: '/admin/inspire/analytics?view=compare' },
  { key: 'title-tests', label: 'Title tests', href: '/admin/inspire/analytics?view=title-tests' },
] as const;

const tab = 'border-b-2 px-1 pb-2 text-sm font-semibold transition-colors underline-offset-4';

export default async function ArticleAnalyticsPage({ searchParams }: PageProps) {
  await requireAdminSection('inspire');
  const sp = await searchParams;

  // Old comparison links (`?ids=…` with no view) still open the Compare tab.
  const view: 'overview' | 'compare' | 'title-tests' =
    sp.view === 'title-tests'
      ? 'title-tests'
      : sp.view === 'compare' || sp.ids !== undefined
        ? 'compare'
        : 'overview';
  const start = typeof sp.start === 'string' ? sp.start : undefined;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        breadcrumb={
          <Link
            href="/admin/inspire"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[11px] font-semibold tracking-[0.14em] uppercase"
          >
            <ArrowLeftIcon className="size-3" />
            Admin · Inspire
          </Link>
        }
        title="Article Analytics"
        description="How our articles are doing: who reads them, how far they get, and what Google sends."
      />

      <nav
        className="border-hairline -mt-2 flex gap-5 border-b"
        aria-label="Article Analytics views"
      >
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            prefetch={false}
            aria-current={view === t.key ? 'page' : undefined}
            className={cn(
              tab,
              view === t.key
                ? 'border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground border-transparent',
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {/* Awaited here rather than rendered as async children, so the whole page
          resolves in one pass (and renders under the unit tests' renderer). */}
      {view === 'compare'
        ? await CompareView({ ids: sp.ids })
        : view === 'title-tests'
          ? await TitleTestsView({ start })
          : await Overview({ sp })}
    </div>
  );
}

async function Overview({ sp }: { sp: Record<string, Raw> }) {
  const today = getKLToday();
  const period = resolveArticlePeriod({ period: sp.period, month: sp.month }, today);
  const filters = parseFilters(sp);
  const data = await loadOverview(period, filters);
  // The page the loader actually served (a stale ?page= past the end clamps).
  const params = currentParams(period, { ...filters, page: data.leaderboard.page });

  return (
    <>
      <div className="flex flex-col gap-2">
        <PeriodBar
          params={params}
          active={period.key}
          monthKey={period.monthKey}
          monthOptions={articleMonthOptions(today)}
          currentMonthKey={format(today, 'yyyy-MM')}
        />
        <p className="text-muted-foreground text-xs">
          Showing <span className="text-foreground font-semibold">{period.label}</span>
          {period.comparisonLabel
            ? `, compared ${period.comparisonLabel.replace(/^vs /, 'with ')}`
            : ''}
          .
        </p>
      </div>
      <OverviewDashboard data={data} period={period} filters={filters} params={params} />
    </>
  );
}

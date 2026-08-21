import { cn } from '@/lib/utils';

type ProgressProps = { className?: string } & (
  | { indeterminate: true; value?: never }
  | { indeterminate?: false; value: number }
);

export function Progress({ value, indeterminate, className }: ProgressProps) {
  const clamped = indeterminate ? 0 : Math.max(0, Math.min(100, value ?? 0));

  return (
    <div
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('bg-primary/20 h-2 w-full overflow-hidden rounded-full', className)}
    >
      <div
        className={cn(
          'bg-primary h-full rounded-full',
          indeterminate
            ? 'animate-progress-indeterminate w-[40%]'
            : 'transition-all duration-500 ease-in-out',
        )}
        style={indeterminate ? undefined : { width: `${clamped}%` }}
      />
    </div>
  );
}

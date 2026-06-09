export function ContentListSkeleton({ count = 4 }: { count?: number }) {
	return (
		<div className="flex flex-col gap-2">
			{Array.from({ length: count }).map((_, index) => (
				<div key={`row-skeleton-${index.toString()}`} className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3.5">
					<div className="size-10 animate-pulse rounded-lg bg-muted" />
					<div className="flex-1 space-y-2">
						<div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
						<div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
					</div>
				</div>
			))}
		</div>
	);
}

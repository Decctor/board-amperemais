import { Skeleton } from "@/components/ui/skeleton";

// Mirrors the real shop layout (cover, overlapping store card, search bar,
// product rows) so the first paint doesn't jump when content arrives.
export default function ShopLoadingSkeleton() {
	return (
		<div className="min-h-screen bg-background">
			<div className="relative">
				<Skeleton className="h-[14rem] w-full rounded-none sm:h-64" />
				<div className="relative z-10 -mt-12 px-3 sm:-mt-14 sm:px-4">
					<div className="relative rounded-t-[1.75rem] rounded-b-2xl border border-border/60 bg-card px-4 pt-12 pb-4 shadow-lg sm:pt-14">
						<div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
							<Skeleton className="size-18 rounded-full sm:size-20" />
						</div>
						<Skeleton className="mx-auto h-6 w-48" />
						<div className="my-4 h-px bg-border" />
						<Skeleton className="mx-auto h-6 w-32 rounded-full" />
						<div className="mt-4 flex flex-col gap-2.5">
							<Skeleton className="h-9 w-full max-w-64 rounded-full" />
							<Skeleton className="h-9 w-full max-w-80 rounded-full" />
						</div>
					</div>
				</div>
			</div>

			<div className="px-4 py-3">
				<Skeleton className="h-10 w-full rounded-full" />
			</div>

			<div className="flex gap-2 overflow-hidden px-4 pb-3">
				<Skeleton className="h-9 w-20 shrink-0 rounded-full" />
				<Skeleton className="h-9 w-24 shrink-0 rounded-full" />
				<Skeleton className="h-9 w-16 shrink-0 rounded-full" />
				<Skeleton className="h-9 w-28 shrink-0 rounded-full" />
			</div>

			<div className="py-4">
				<Skeleton className="mx-4 mb-3 h-4 w-32" />
				<div className="flex gap-3 overflow-hidden px-4 pb-2">
					{[0, 1, 2].map((index) => (
						<div key={index} className="w-[180px] shrink-0 sm:w-[240px]">
							<Skeleton className="aspect-square w-full rounded-xl" />
							<Skeleton className="mt-2 h-3.5 w-3/4" />
							<Skeleton className="mt-1.5 h-4 w-1/2" />
						</div>
					))}
				</div>
			</div>

			<div className="py-4">
				<Skeleton className="mx-4 mb-3 h-4 w-40" />
				<div className="flex flex-col gap-3 px-4">
					{[0, 1, 2].map((index) => (
						<div key={index} className="flex gap-3 rounded-xl border bg-card p-3">
							<Skeleton className="size-32 shrink-0 rounded-lg" />
							<div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
								<div className="flex flex-col gap-2">
									<Skeleton className="h-4 w-2/3" />
									<Skeleton className="h-3 w-full" />
								</div>
								<Skeleton className="h-5 w-24" />
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

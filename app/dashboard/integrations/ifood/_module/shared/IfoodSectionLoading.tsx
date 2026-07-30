import { Skeleton } from "@/components/ui/skeleton";

type IfoodSectionLoadingProps = {
	/** Quantidade de linhas do esqueleto — aproxime da densidade real da seção. */
	rows?: number;
};

/**
 * Carregamento do corpo de uma seção do iFood. `LoadingComponent` reserva meia viewport e não cabe
 * dentro de um card: com as seções empilhadas, seriam várias telas de animação simultânea.
 */
export function IfoodSectionLoading({ rows = 3 }: IfoodSectionLoadingProps) {
	return (
		<div className="flex w-full flex-col gap-2">
			{Array.from({ length: rows }).map((_, index) => (
				<Skeleton key={index} className="h-14 w-full rounded-lg" />
			))}
		</div>
	);
}

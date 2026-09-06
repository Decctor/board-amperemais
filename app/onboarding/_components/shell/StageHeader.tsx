type StageHeaderProps = {
	eyebrow: string;
	titulo: string;
	descricao: string;
};

/** Mesma anatomia do cabeçalho de seção das Configurações: eyebrow, título em sentence case, descrição, hairline. */
export function StageHeader({ eyebrow, titulo, descricao }: StageHeaderProps) {
	return (
		<div className="flex w-full flex-col gap-3">
			<div className="flex flex-col gap-0.5">
				<p className="mb-3 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">{eyebrow}</p>
				<h1 tabIndex={-1} className="outline-none text-[28px] leading-[1.12] font-bold tracking-tight sm:text-[32px] xl:text-[36px]">
					{titulo}
				</h1>
			</div>
			<p className="max-w-[52ch] text-[15px] leading-relaxed text-muted-foreground">{descricao}</p>
		</div>
	);
}

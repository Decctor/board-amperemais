"use client";

import SelectInput from "@/components/Inputs/SelectInput";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { createStockPositionImport, parseStockPositionFile, type TParseStockPositionFileOutput } from "@/lib/mutations/replenishment";
import { applyColumnMapping, type TStockPositionField } from "@/lib/replenishment/stock-position-parser";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, FileSpreadsheet, Link2, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

// Só código e quantidade são obrigatórios: são o mínimo para calcular cobertura. As demais colunas
// enriquecem a análise quando o relatório as traz, e ficam de fora sem quebrar nada quando não traz.
const FIELD_LABELS: { field: TStockPositionField; label: string; required: boolean; hint: string }[] = [
	{ field: "codigo", label: "Código do produto", required: true, hint: "Chave de conciliação com o catálogo do RecompraCRM." },
	{ field: "descricao", label: "Descrição", required: false, hint: "Usada só no relatório de linhas não conciliadas." },
	{ field: "quantidade", label: "Estoque atual", required: true, hint: "Saldo físico na data da posição." },
	{ field: "custoUnitario", label: "Custo unitário", required: false, hint: "Se vier, substitui o custo médio do cadastro." },
	{ field: "precoVenda", label: "Preço de venda", required: false, hint: "Se vier, substitui o preço do cadastro no cálculo da margem." },
	{ field: "quantidadeEmTransito", label: "Em trânsito", required: false, hint: "Já comprado e não recebido — é descontado da sugestão." },
	{ field: "fornecedorNome", label: "Fornecedor", required: false, hint: "Preenche o fornecedor quando não há histórico de compra." },
];

type StockPositionImportModalProps = {
	closeModal: () => void;
	onImported: () => void;
};

export function StockPositionImportModal({ closeModal, onImported }: StockPositionImportModalProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [parsed, setParsed] = useState<TParseStockPositionFileOutput["data"] | null>(null);
	const [mapping, setMapping] = useState<Partial<Record<TStockPositionField, string>>>({});

	const { mutate: parseFile, isPending: isParsing } = useMutation({
		mutationKey: ["parse-stock-position-file"],
		mutationFn: parseStockPositionFile,
		onSuccess: (response) => {
			setParsed(response.data);
			setMapping(response.data.mapeamentoSugerido);
			for (const aviso of response.data.avisos) toast.warning(aviso);
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const preview = useMemo(() => {
		if (!parsed) return null;
		return applyColumnMapping({ linhas: parsed.linhasCompletas, mapeamento: mapping });
	}, [parsed, mapping]);

	const { mutate: commitImport, isPending: isImporting } = useMutation({
		mutationKey: ["create-stock-position-import"],
		mutationFn: () => {
			if (!parsed || !preview) throw new Error("Nenhum arquivo lido.");
			if (preview.itens.length === 0) throw new Error("Nenhuma linha válida encontrada — confira o vínculo das colunas.");
			return createStockPositionImport({
				origem: parsed.origem,
				arquivoNome: parsed.arquivoNome,
				dataPosicao: new Date(),
				mapeamentoColunas: mapping as Record<string, string>,
				itens: preview.itens,
			});
		},
		onSuccess: (response) => {
			toast.success(response.message);
			if (response.data.linhasNaoConciliadas > 0) {
				toast.warning(
					`${response.data.linhasNaoConciliadas} códigos do arquivo não existem no catálogo (ex.: ${response.data.naoConciliados
						.slice(0, 3)
						.map((linha) => linha.codigo)
						.join(", ")}). Eles ficam de fora da análise até serem cadastrados.`,
				);
			}
			onImported();
			closeModal();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const canImport = mapping.codigo != null && mapping.quantidade != null && (preview?.itens.length ?? 0) > 0;

	return (
		<ResponsiveMenu
			menuTitle="IMPORTAR POSIÇÃO DE ESTOQUE"
			menuDescription="Use quando o saldo é mantido no ERP externo e não no RecompraCRM."
			menuActionButtonText={isImporting ? "IMPORTANDO..." : "IMPORTAR POSIÇÃO"}
			menuCancelButtonText="CANCELAR"
			menuActionButtonDisabled={!canImport}
			actionFunction={() => commitImport()}
			actionIsLoading={isImporting}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeModal}
			dialogVariant="lg"
		>
			<ResponsiveMenuSection title="ARQUIVO" icon={<FileSpreadsheet className="h-3.5 w-3.5" />}>
				<input
					ref={fileInputRef}
					type="file"
					accept=".xlsx,.xls,.xlsm,.csv,.pdf"
					className="hidden"
					onChange={(event) => {
						const file = event.target.files?.[0];
						if (file) parseFile(file);
						event.target.value = "";
					}}
				/>
				<Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isParsing} className="w-fit">
					<Upload className="h-4 w-4" />
					{isParsing ? "LENDO ARQUIVO..." : parsed ? "TROCAR ARQUIVO" : "ESCOLHER ARQUIVO"}
				</Button>
				<p className="text-muted-foreground text-[0.65rem] leading-snug">
					Aceita .xlsx, .xls, .csv e .pdf. Planilha é sempre mais confiável que PDF: no PDF as colunas são reconstruídas pela posição do texto na página, e
					um relatório digitalizado (imagem) não tem texto para ler.
				</p>
				{parsed ? (
					<div className="bg-muted/50 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg px-3 py-2 text-[0.7rem] font-medium">
						<span className="font-bold">{parsed.arquivoNome}</span>
						<span className="text-muted-foreground">{parsed.origem === "PDF" ? "PDF" : "Planilha"}</span>
						<span className="text-muted-foreground">{parsed.totalLinhas} linhas lidas</span>
					</div>
				) : null}
			</ResponsiveMenuSection>

			{parsed ? (
				<ResponsiveMenuSection title="VÍNCULO DAS COLUNAS" icon={<Link2 className="h-3.5 w-3.5" />}>
					<div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
						{FIELD_LABELS.map(({ field, label, required, hint }) => (
							<div key={field} className="flex flex-col gap-1">
								<SelectInput
									label={required ? `${label} *` : label}
									value={mapping[field] ?? null}
									options={parsed.colunas.map((coluna) => ({ id: coluna, value: coluna, label: coluna }))}
									handleChange={(value) => setMapping((previous) => ({ ...previous, [field]: value }))}
									resetOptionLabel="NÃO USAR"
									onReset={() => setMapping((previous) => ({ ...previous, [field]: undefined }))}
								/>
								<span className="text-muted-foreground text-[0.6rem] leading-snug">{hint}</span>
							</div>
						))}
					</div>
				</ResponsiveMenuSection>
			) : null}

			{preview ? (
				<ResponsiveMenuSection title="CONFERÊNCIA" icon={<AlertTriangle className="h-3.5 w-3.5" />}>
					<div className="flex flex-wrap gap-x-4 gap-y-1 text-[0.7rem] font-medium">
						<span className="text-green-600 dark:text-green-400">
							<strong className="tabular-nums">{preview.itens.length}</strong> linhas válidas
						</span>
						{preview.descartadas > 0 ? (
							<span className="text-muted-foreground" title="Cabeçalhos repetidos, subtotais e rodapés do relatório">
								<strong className="tabular-nums">{preview.descartadas}</strong> linhas ignoradas
							</span>
						) : null}
					</div>
					{preview.itens.length > 0 ? (
						<div className="overflow-x-auto rounded-lg border">
							<table className="w-full text-left text-[0.7rem]">
								<thead className="bg-muted/60 text-muted-foreground">
									<tr>
										<th className="px-2 py-1.5 font-bold">CÓDIGO</th>
										<th className="px-2 py-1.5 font-bold">DESCRIÇÃO</th>
										<th className="px-2 py-1.5 text-right font-bold">ESTOQUE</th>
										<th className="px-2 py-1.5 text-right font-bold">CUSTO</th>
									</tr>
								</thead>
								<tbody>
									{preview.itens.slice(0, 8).map((item, index) => (
										<tr key={`${item.codigo}-${index}`} className="border-t">
											<td className="px-2 py-1.5 font-bold tabular-nums">{item.codigo}</td>
											<td className="max-w-72 truncate px-2 py-1.5">{item.descricao ?? "—"}</td>
											<td className="px-2 py-1.5 text-right tabular-nums">{item.quantidade}</td>
											<td className="px-2 py-1.5 text-right tabular-nums">{item.custoUnitario ?? "—"}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : (
						<p className="text-muted-foreground text-[0.7rem]">
							Nenhuma linha válida com o vínculo atual. Confira se a coluna de código e a de estoque estão corretas.
						</p>
					)}
				</ResponsiveMenuSection>
			) : null}
		</ResponsiveMenu>
	);
}

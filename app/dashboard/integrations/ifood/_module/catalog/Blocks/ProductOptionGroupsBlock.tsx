"use client";

import SelectInput from "@/components/Inputs/SelectInput";
import DeleteRowButton from "@/components/Spreadsheet/DeleteRowButton";
import EditableNumberCell from "@/components/Spreadsheet/EditableNumberCell";
import EditableTextCell from "@/components/Spreadsheet/EditableTextCell";
import MobileEditableField from "@/components/Spreadsheet/MobileEditableField";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { formatToMoney } from "@/lib/formatting";
import { describeOptionGroupRequirement, findOptionGroupIssue, type TOptionGroupIssue } from "@/lib/integrations/ifood/option-groups";
import { SPREADSHEET_TABLE_ATTR, type SpreadsheetGridBounds } from "@/lib/spreadsheet-navigation";
import { cn } from "@/lib/utils";
import { IFOOD_OPTION_GROUP_TYPE_LABELS, IfoodOptionGroupTypeEnum, type TIfoodOptionGroupTypeEnum } from "@/schemas/enums";
import type { TIfoodOptionGroupState, TIfoodOptionState } from "@/state-hooks/use-internal-ifood-product-state";
import { Layers, Plus } from "lucide-react";

const TIPO_OPTIONS = IfoodOptionGroupTypeEnum.options.map((tipo) => ({
	id: tipo,
	value: tipo,
	label: IFOOD_OPTION_GROUP_TYPE_LABELS[tipo],
}));

const OPTION_GRID_COL = { NAME: 0, EXTERNAL_CODE: 1, PRICE: 2 } as const;
const OPTION_GRID_COL_COUNT = 3;

const OPTION_TABLE_GRID = "grid-cols-[minmax(0,34fr)_minmax(0,22fr)_minmax(0,18fr)_minmax(2.5rem,6fr)]";
const OPTION_DESKTOP_ROW = cn("hidden w-full lg:grid", OPTION_TABLE_GRID, "items-center gap-x-1 px-2");

function FieldIssue({ mensagem }: { mensagem: string | null }) {
	if (!mensagem) return null;
	return <p className="px-1 text-xs font-medium text-destructive">{mensagem}</p>;
}

type OptionRowsProps = {
	opcoes: TIfoodOptionState[];
	onUpdateOpcao: (indiceOpcao: number, opcao: Partial<TIfoodOptionState>) => void;
	onRemoveOpcao: (indiceOpcao: number) => void;
};

function OptionRows({ opcoes, onUpdateOpcao, onRemoveOpcao }: OptionRowsProps) {
	const gridBounds: SpreadsheetGridBounds = { rowCount: opcoes.length, colCount: OPTION_GRID_COL_COUNT };

	return (
		<div {...{ [SPREADSHEET_TABLE_ATTR]: "true" }} className="flex w-full flex-col">
			<div
				className={cn(
					OPTION_DESKTOP_ROW,
					"min-h-8 border-b border-border bg-background py-1.5 text-[0.68rem] font-medium uppercase text-muted-foreground",
				)}
			>
				<p className="min-w-0 px-1 text-start">Opção</p>
				<p className="min-w-0 px-1 text-center">Código (PDV)</p>
				<p className="min-w-0 px-1 text-center">Preço</p>
				<p className="min-w-0 px-1 text-center">Ações</p>
			</div>

			<div className="flex w-full flex-col bg-background">
				{opcoes.map((opcao, indiceOpcao) => (
					<div key={opcao.id ?? `nova-${indiceOpcao}`} className={cn("border-t border-border", indiceOpcao % 2 === 1 && "bg-muted/10")}>
						{/* Desktop: planilha navegável por teclado. */}
						<div className={cn(OPTION_DESKTOP_ROW, "min-h-11 py-1 text-xs transition-colors hover:bg-muted/40")}>
							<div className="min-w-0 px-1">
								<EditableTextCell
									value={opcao.nome}
									ariaLabel="Editar nome da opção"
									align="left"
									emptyDisplay="Sem nome"
									gridRow={indiceOpcao}
									gridCol={OPTION_GRID_COL.NAME}
									gridBounds={gridBounds}
									onCommit={(nome) => onUpdateOpcao(indiceOpcao, { nome })}
								/>
							</div>
							<div className="min-w-0 px-1">
								<EditableTextCell
									value={opcao.codigoExterno ?? ""}
									ariaLabel="Editar código externo da opção"
									align="center"
									gridRow={indiceOpcao}
									gridCol={OPTION_GRID_COL.EXTERNAL_CODE}
									gridBounds={gridBounds}
									onCommit={(codigoExterno) => onUpdateOpcao(indiceOpcao, { codigoExterno: codigoExterno || null })}
								/>
							</div>
							<div className="min-w-0 px-1">
								<EditableNumberCell
									value={opcao.preco}
									ariaLabel="Editar preço da opção"
									min={0}
									format={formatToMoney}
									emptyDisplay="Sem preço"
									gridRow={indiceOpcao}
									gridCol={OPTION_GRID_COL.PRICE}
									gridBounds={gridBounds}
									onCommit={(preco) => onUpdateOpcao(indiceOpcao, { preco })}
								/>
							</div>
							<div className="flex min-w-0 items-center justify-center px-1">
								<DeleteRowButton onRemove={() => onRemoveOpcao(indiceOpcao)} ariaLabel={`Remover ${opcao.nome || "opção"}`} />
							</div>
						</div>

						{/* Mobile: a planilha não cabe — os mesmos campos empilhados. */}
						<div className="flex w-full flex-col gap-2 px-2 py-2.5 lg:hidden">
							<div className="flex items-start justify-between gap-2">
								<div className="min-w-0 flex-1">
									<MobileEditableField label="Opção">
										<EditableTextCell
											value={opcao.nome}
											ariaLabel="Editar nome da opção"
											align="left"
											emptyDisplay="Sem nome"
											onCommit={(nome) => onUpdateOpcao(indiceOpcao, { nome })}
										/>
									</MobileEditableField>
								</div>
								<DeleteRowButton onRemove={() => onRemoveOpcao(indiceOpcao)} ariaLabel={`Remover ${opcao.nome || "opção"}`} />
							</div>
							<div className="grid grid-cols-2 gap-2">
								<MobileEditableField label="Código (PDV)">
									<EditableTextCell
										value={opcao.codigoExterno ?? ""}
										ariaLabel="Editar código externo da opção"
										align="left"
										onCommit={(codigoExterno) => onUpdateOpcao(indiceOpcao, { codigoExterno: codigoExterno || null })}
									/>
								</MobileEditableField>
								<MobileEditableField label="Preço">
									<EditableNumberCell
										value={opcao.preco}
										ariaLabel="Editar preço da opção"
										min={0}
										format={formatToMoney}
										emptyDisplay="Sem preço"
										align="left"
										onCommit={(preco) => onUpdateOpcao(indiceOpcao, { preco })}
									/>
								</MobileEditableField>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

type ProductOptionGroupsBlockProps = {
	grupos: TIfoodOptionGroupState[];
	issues: TOptionGroupIssue[];
	/** `true` quando o bloco já vive dentro de uma seção da página — não abre outra moldura. */
	embedded?: boolean;
	onAddGrupo: () => void;
	onUpdateGrupo: (indice: number, grupo: Partial<TIfoodOptionGroupState>) => void;
	onRemoveGrupo: (indice: number) => void;
	onAddOpcao: (indiceGrupo: number) => void;
	onUpdateOpcao: (indiceGrupo: number, indiceOpcao: number, opcao: Partial<TIfoodOptionState>) => void;
	onRemoveOpcao: (indiceGrupo: number, indiceOpcao: number) => void;
};

/**
 * Grupos de complementos de um item, em tabela editável. Serve tanto o modal de criação quanto a
 * seção da página de detalhe — a prop `embedded` decide se abre moldura própria.
 *
 * Os grupos viajam no mesmo `PUT /items` do produto: a Catalog v2.0 não tem endpoint de criação de
 * grupo, então salvar o item é o único jeito de persistir um complemento.
 */
export function ProductOptionGroupsBlock({
	grupos,
	issues,
	embedded = false,
	onAddGrupo,
	onUpdateGrupo,
	onRemoveGrupo,
	onAddOpcao,
	onUpdateOpcao,
	onRemoveOpcao,
}: ProductOptionGroupsBlockProps) {
	const content =
		grupos.length === 0 ? (
			<div className="flex w-full flex-col items-center gap-3 rounded-lg border border-dashed border-border px-4 py-8 text-center">
				<Layers className="h-6 w-6 text-muted-foreground" />
				<div className="flex flex-col gap-1">
					<p className="text-sm font-semibold text-foreground">Nenhum complemento neste item</p>
					<p className="max-w-[42ch] text-xs text-muted-foreground">
						Complementos são as escolhas que o cliente faz ao comprar: tamanho, ponto da carne, adicionais.
					</p>
				</div>
				<Button type="button" variant="outline" size="sm" onClick={onAddGrupo}>
					<Plus className="h-4 w-4" />
					ADICIONAR GRUPO
				</Button>
			</div>
		) : (
			<div className="flex w-full flex-col gap-3">
				{grupos.map((grupo, indiceGrupo) => (
					<div key={grupo.id ?? `novo-${indiceGrupo}`} className="flex w-full flex-col gap-3 rounded-lg border border-border px-3 py-3">
						<div className="flex w-full flex-col gap-2 lg:flex-row lg:items-end">
							<div className="min-w-0 flex-1">
								<MobileEditableField label="Nome do grupo">
									<EditableTextCell
										value={grupo.nome}
										ariaLabel="Editar nome do grupo de complementos"
										align="left"
										emptyDisplay="Sem nome"
										onCommit={(nome) => onUpdateGrupo(indiceGrupo, { nome })}
									/>
								</MobileEditableField>
								<FieldIssue mensagem={findOptionGroupIssue(issues, indiceGrupo, "nome")} />
							</div>
							<div className="w-full lg:w-[220px]">
								<SelectInput
									label="TIPO"
									value={grupo.tipo}
									resetOptionLabel="VENDA ADICIONAL"
									options={TIPO_OPTIONS}
									handleChange={(value) => onUpdateGrupo(indiceGrupo, { tipo: value as TIfoodOptionGroupTypeEnum })}
									onReset={() => onUpdateGrupo(indiceGrupo, { tipo: "OFFER_UNIT" })}
								/>
							</div>
							<div className="flex items-end gap-2">
								<div className="w-[92px]">
									<MobileEditableField label="Mínimo">
										<EditableNumberCell
											value={grupo.min}
											ariaLabel="Editar mínimo de escolhas"
											min={0}
											onCommit={(min) => onUpdateGrupo(indiceGrupo, { min })}
										/>
									</MobileEditableField>
								</div>
								<div className="w-[92px]">
									<MobileEditableField label="Máximo">
										<EditableNumberCell
											value={grupo.max}
											ariaLabel="Editar máximo de escolhas"
											min={1}
											onCommit={(max) => onUpdateGrupo(indiceGrupo, { max })}
										/>
									</MobileEditableField>
								</div>
								<DeleteRowButton onRemove={() => onRemoveGrupo(indiceGrupo)} ariaLabel={`Remover grupo ${grupo.nome || indiceGrupo + 1}`} />
							</div>
						</div>

						<FieldIssue mensagem={findOptionGroupIssue(issues, indiceGrupo, "min")} />
						<FieldIssue mensagem={findOptionGroupIssue(issues, indiceGrupo, "max")} />
						<p className="text-xs text-muted-foreground">{describeOptionGroupRequirement(grupo)}</p>

						<div className="flex w-full flex-col gap-2 border-t border-border pt-2">
							{grupo.opcoes.length > 0 ? (
								<OptionRows
									opcoes={grupo.opcoes}
									onUpdateOpcao={(indiceOpcao, valores) => onUpdateOpcao(indiceGrupo, indiceOpcao, valores)}
									onRemoveOpcao={(indiceOpcao) => onRemoveOpcao(indiceGrupo, indiceOpcao)}
								/>
							) : null}
							<FieldIssue mensagem={findOptionGroupIssue(issues, indiceGrupo, "opcoes")} />
							<Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => onAddOpcao(indiceGrupo)}>
								<Plus className="h-4 w-4" />
								ADICIONAR OPÇÃO
							</Button>
						</div>
					</div>
				))}

				<Button type="button" variant="outline" size="sm" className="self-start" onClick={onAddGrupo}>
					<Plus className="h-4 w-4" />
					ADICIONAR GRUPO
				</Button>
			</div>
		);

	if (embedded) return content;

	return (
		<Section.Root>
			<Section.Header>
				<Section.Icon>
					<Layers className="h-4 w-4 min-h-4 min-w-4" />
				</Section.Icon>
				<Section.Title>COMPLEMENTOS</Section.Title>
			</Section.Header>
			<Section.Body>{content}</Section.Body>
		</Section.Root>
	);
}

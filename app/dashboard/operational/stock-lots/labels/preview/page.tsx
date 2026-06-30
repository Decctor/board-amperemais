import UnauthorizedPage from "@/components/Utils/UnauthorizedPage";
import { getCurrentSession } from "@/lib/authentication/session";
import { formatDateAsLocale, formatDecimalPlaces, formatToCEP, formatToCPForCNPJ, formatToPhone } from "@/lib/formatting";
import { getProductStockLotLabels, type TProductStockLotLabel } from "@/lib/stock/product-stock-lot-labels";
import { redirect } from "next/navigation";
import LabelsPreviewActions from "./labels-preview-actions";
import styles from "./labels-preview.module.css";

type LabelsPreviewPageProps = {
	searchParams: Promise<{
		ids?: string;
		copies?: string;
	}>;
};

export default async function LabelsPreviewPage({ searchParams }: LabelsPreviewPageProps) {
	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");
	if (!sessionUser.membership) redirect("/onboarding");
	if (!sessionUser.membership.organizacao.configuracao.recursos.erp.acesso) {
		return <UnauthorizedPage message="Oops, sua organização não possui acesso a este recurso." />;
	}

	const { ids: rawIds, copies: rawCopies } = await searchParams;
	const ids = rawIds?.split(",").map((id) => id.trim()).filter(Boolean) ?? [];
	const copies = clampCopies(Number(rawCopies ?? 1));
	const labels =
		ids.length > 0
			? await getProductStockLotLabels({
					lotIds: ids,
					organizationId: sessionUser.membership.organizacao.id,
				})
			: [];
	const printableLabels = labels.flatMap((label) => Array.from({ length: copies }, () => label));

	return (
		<div className={styles.shell}>
			<div className={styles.toolbar}>
				<div className={styles.toolbarText}>
					<h1 className={styles.toolbarTitle}>Prévia de etiquetas</h1>
					<p className={styles.toolbarDescription}>
						{printableLabels.length
							? `${printableLabels.length} etiqueta(s) pronta(s) para impressão em 60mm x 80mm.`
							: "Selecione um ou mais lotes para gerar a prévia de impressão."}
					</p>
				</div>
				<LabelsPreviewActions />
			</div>

			<div className={styles.printArea}>
				{printableLabels.length > 0 ? (
					<div className={styles.sheet}>
						{printableLabels.map((label, index) => (
							<StockLotLabel key={`${label.id}-${index}`} label={label} responsibleName={sessionUser.user.nome} />
						))}
					</div>
				) : (
					<div className={styles.emptyState}>Nenhum lote informado para impressão.</div>
				)}
			</div>
		</div>
	);
}

function StockLotLabel({ label, responsibleName }: { label: TProductStockLotLabel; responsibleName: string }) {
	const address = buildOrganizationAddress(label.organizacao);
	const source = label.producao?.titulo ?? label.compra?.titulo ?? null;
	const fabricationDate = label.dataFabricacao ?? label.producao?.dataConclusao ?? null;

	const details = [
		{ label: "Fabricação:", value: formatLabelDate(fabricationDate, true) },
		{ label: "Validade:", value: formatLabelDate(label.dataValidade, false) },
		{ label: "Origem:", value: source },
		{ label: "NCM:", value: label.produto.ncm },
		{ label: "Lote:", value: label.codigoLote },
	].filter((item) => item.value);

	return (
		<section className={styles.label} aria-label={`Etiqueta do lote ${label.codigoLote ?? label.id}`}>
			<div className={styles.topStripe} />
			<div className={styles.content}>
				<header className={styles.headline}>
					<div>
						<h2 className={styles.productName}>{label.produto.nome}</h2>
						{label.produtoVariante?.nome ? <p className={styles.variantName}>{label.produtoVariante.nome}</p> : null}
					</div>
					<div className={styles.quantity}>
						{formatDecimalPlaces(label.quantidadeInicial)} {label.produto.unidade}
					</div>
				</header>

				<div className={styles.details}>
					{details.map((detail) => (
						<div key={detail.label} className={styles.detailRow}>
							<span className={styles.detailLabel}>{detail.label}</span>
							<span className={styles.detailValue}>{detail.value}</span>
						</div>
					))}
				</div>

				<footer className={styles.footer}>
					<div className={styles.orgBlock}>
						<div className={styles.orgLine}>Resp.: {responsibleName}</div>
						<div className={styles.orgLine}>{label.organizacao.nome}</div>
						<div className={styles.orgLine}>CNPJ: {formatToCPForCNPJ(label.organizacao.cnpj)}</div>
						{label.organizacao.telefone ? <div className={styles.orgLine}>Tel.: {formatToPhone(label.organizacao.telefone)}</div> : null}
						{address ? <div className={styles.orgLine}>{address}</div> : null}
						<div className={styles.codeLine}>{label.codigoExibicao}</div>
					</div>
					<div className={styles.qrBox}>
						<img src={label.qrCodeDataUrl} alt={`QR Code do lote ${label.codigoLote ?? label.id}`} />
					</div>
				</footer>
			</div>
			<div className={styles.bottomStripe} />
		</section>
	);
}

function clampCopies(value: number) {
	if (!Number.isFinite(value)) return 1;
	return Math.min(20, Math.max(1, Math.floor(value)));
}

function formatLabelDate(value: Date | string | null, showHours: boolean) {
	if (!value) return null;
	return formatDateAsLocale(value, showHours);
}

function buildOrganizationAddress(organization: TProductStockLotLabel["organizacao"]) {
	const parts = [
		organization.localizacaoLogradouro,
		organization.localizacaoNumero,
		organization.localizacaoBairro,
		organization.localizacaoCidade,
		organization.localizacaoEstado,
	]
		.map((part) => part?.trim())
		.filter(Boolean);
	const address = parts.join(", ");
	const cep = organization.localizacaoCep ? `CEP ${formatToCEP(organization.localizacaoCep)}` : null;
	return [address, cep].filter(Boolean).join(" - ");
}

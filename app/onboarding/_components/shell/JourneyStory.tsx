import Image from "next/image";
import { Cake, Coffee, Database, Gift, Heart, Monitor, Package, ReceiptText, ShoppingBag, Smartphone, Store, Users } from "lucide-react";
import type { TOnboardingStageId } from "@/lib/onboarding/journeys";
import styles from "./onboarding.module.css";

type StoryStage = TOnboardingStageId | "picker";
type Story = { titulo: string; descricao: string; cena: "loja" | "dados" | "cashback" | "campanhas" | "whatsapp" | "canais" | "produtos" | "compra" };
const stories = {
	picker: {
		titulo: "O próximo capítulo da sua loja começa aqui.",
		descricao: "Mais clientes voltando. Mais caminhos para vender. Escolha o primeiro passo e construa no seu ritmo.",
		cena: "loja",
	},
	empresa: {
		titulo: "Toda loja tem uma história. Vamos conhecer a sua.",
		descricao: "Seu segmento ajuda a preparar uma experiência que faz sentido para o seu negócio.",
		cena: "loja",
	},
	"fonte-dados": {
		titulo: "Cada venda conta uma parte da história.",
		descricao: "Reúna suas vendas para conhecer melhor quem compra e encontrar oportunidades de retorno.",
		cena: "dados",
	},
	cashback: { titulo: "Um motivo a mais para voltar.", descricao: "Transforme cada compra em um incentivo para a próxima visita.", cena: "cashback" },
	campanhas: {
		titulo: "A mensagem certa começa com um bom motivo.",
		descricao: "Boas-vindas, aniversário ou saudade. Prepare conversas para os momentos que importam.",
		cena: "campanhas",
	},
	whatsapp: {
		titulo: "Mais perto do cliente. Também na próxima compra.",
		descricao: "Prepare seu WhatsApp para continuar a conversa depois da venda.",
		cena: "whatsapp",
	},
	entrada: {
		titulo: "A próxima compra começa com o que você preparou.",
		descricao: "Acompanhe seus clientes, revise as pendências e dê continuidade ao seu programa.",
		cena: "loja",
	},
	canal: {
		titulo: "Sua loja, onde o cliente estiver.",
		descricao: "No balcão, na mesa ou no catálogo digital. Comece pelo canal que faz parte da sua rotina.",
		cena: "canais",
	},
	produtos: {
		titulo: "Seus produtos merecem uma boa vitrine.",
		descricao: "Comece com os favoritos da casa. Seu catálogo pode crescer junto com a operação.",
		cena: "produtos",
	},
	experiencia: {
		titulo: "Uma experiência com a cara da sua loja.",
		descricao: "Da apresentação à forma de comprar, cada detalhe ajuda o cliente a se sentir em casa.",
		cena: "loja",
	},
	incentivo: {
		titulo: "Uma boa compra pode render outra.",
		descricao: "Inclua um incentivo na experiência e dê ao cliente mais um motivo para voltar.",
		cena: "cashback",
	},
	simulacao: {
		titulo: "Veja a compra pelos olhos do cliente.",
		descricao: "Explore o caminho do produto ao pedido em uma simulação, sem cobranças ou movimentações reais.",
		cena: "compra",
	},
	lancamento: {
		titulo: "Abra as portas para o próximo pedido.",
		descricao: "Confira os últimos detalhes do canal escolhido e comece a receber seus clientes.",
		cena: "loja",
	},
} satisfies Record<StoryStage, Story>;

function ProductScene({ compra }: { compra: boolean }) {
	return (
		<div className={styles.sceneUi}>
			<div className={styles.paper} style={{ transform: "rotate(-3deg)" }}>
				<small>EXEMPLO ILUSTRATIVO</small>
				<strong>{compra ? "Uma compra, do início ao fim" : "Os favoritos da sua loja"}</strong>
				<div className={styles.catalog}>
					{[
						[Coffee, "Da casa"],
						[ShoppingBag, "Favoritos"],
						[Package, "Novidades"],
					].map(([Icon, label]) => {
						const ProductIcon = Icon as typeof Coffee;
						return (
							<div key={String(label)} className={styles.product}>
								<ProductIcon />
								<span>{String(label)}</span>
							</div>
						);
					})}
				</div>
			</div>
			<div className={styles.paper} style={{ width: "85%", alignSelf: "flex-end", transform: "rotate(4deg)" }}>
				<div className={styles.dataRow}>
					<ReceiptText />
					<span>{compra ? "Produto → carrinho → pedido" : "Nome, preço e apresentação"}</span>
				</div>
				<p>{compra ? "Experimente antes de abrir seu canal." : "Tudo pronto para compor sua vitrine."}</p>
			</div>
		</div>
	);
}

export function JourneyStory({
	stage,
	nome,
	produto = "CRM",
	currentIndex = 0,
	total = 6,
	officialWhatsapp = true,
}: {
	stage: StoryStage;
	nome?: string;
	produto?: "CRM" | "ERP";
	currentIndex?: number;
	total?: number;
	officialWhatsapp?: boolean;
}) {
	const story = stories[stage];
	const raster =
		story.cena === "loja"
			? "storefront.png"
			: story.cena === "whatsapp"
				? officialWhatsapp
					? "whatsapp-connection.png"
					: "whatsapp-gateway.png"
				: "cashback-reward.png";
	return (
		<div className={styles.story}>
			<p className={styles.chapter}>{produto === "CRM" ? "Cada compra pode ser o começo da próxima" : "Sua loja pronta para vender"}</p>
			<div key={stage} className={styles.artwork} aria-hidden="true">
				{["loja", "whatsapp", "cashback"].includes(story.cena) ? (
					<>
						<Image
							src={`/images/onboarding/${raster}`}
							fill
							sizes="(max-width: 1023px) 150px, (max-width: 1200px) 42vw, 500px"
							alt=""
							className={styles.raster}
						/>
						{story.cena === "loja" ? <span className={styles.storeLabel}>{nome?.trim() || "Sua loja"}</span> : null}
					</>
				) : null}
				{story.cena === "campanhas" ? (
					<div className={styles.sceneUi}>
						<div className={`${styles.paper} ${styles.message}`}>
							<Heart />
							<small>BOAS-VINDAS · EXEMPLO</small>
							<strong>Que bom ter você por aqui.</strong>
							<p>A primeira compra é só o começo.</p>
						</div>
						<div className={`${styles.paper} ${styles.message}`}>
							<Cake />
							<strong>Hoje o presente é seu.</strong>
							<p>Um carinho da loja no seu aniversário.</p>
						</div>
						<div className={`${styles.paper} ${styles.message}`}>
							<Gift />
							<strong>Vamos nos ver de novo?</strong>
						</div>
					</div>
				) : null}
				{story.cena === "dados" || story.cena === "canais" ? (
					<div className={styles.sceneUi}>
						<div className={styles.connectors}>
							<span className={styles.connector}>{story.cena === "dados" ? <Database /> : <Monitor />}</span>
							<span className={styles.connector}>
								<Store />
							</span>
							<span className={styles.connector}>{story.cena === "dados" ? <ReceiptText /> : <Smartphone />}</span>
						</div>
						<div className={styles.paper} style={{ transform: "rotate(-3deg)" }}>
							<small>{story.cena === "dados" ? "UMA VISÃO DO SEU NEGÓCIO" : "CADA CANAL, UMA POSSIBILIDADE"}</small>
							<strong>{story.cena === "dados" ? "Conexões que aproximam" : "Escolha por onde começar"}</strong>
							<div className={styles.dataRows}>
								{(story.cena === "dados"
									? [
											[ReceiptText, "Histórico de compras"],
											[Users, "Seus clientes"],
											[Heart, "Oportunidades de retorno"],
										]
									: [
											[Monitor, "Balcão"],
											[Smartphone, "Catálogo digital"],
											[Coffee, "Mesas e comandas"],
										]
								).map(([Icon, label]) => {
									const RowIcon = Icon as typeof Store;
									return (
										<div className={styles.dataRow} key={String(label)}>
											<RowIcon />
											<span>{String(label)}</span>
										</div>
									);
								})}
							</div>
						</div>
					</div>
				) : null}
				{story.cena === "produtos" || story.cena === "compra" ? <ProductScene compra={story.cena === "compra"} /> : null}
			</div>
			<div className={styles.caption}>
				<h2>{story.titulo}</h2>
				<p>{story.descricao}</p>
			</div>
			{stage !== "picker" ? (
				<div className={styles.detail} aria-hidden="true">
					{Array.from({ length: total }, (_, index) => (
						<span key={index} data-active={index === currentIndex} />
					))}
				</div>
			) : null}
		</div>
	);
}

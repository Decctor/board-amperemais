import type { TAccessScopeEnum } from "@/schemas/enums";

// A chave crua ("desktop-agent:print-jobs:update") é contrato de integração, não linguagem de loja.
// Quem abre a tela de dispositivos é o lojista: cada scope precisa dizer o que o aparelho passa a
// conseguir fazer no balcão. Este catálogo é a única fonte desses rótulos.

export type TAccessScopeGroup = "PONTO_DE_INTERACAO" | "AGENTE_DESKTOP" | "OUTROS";

export type TAccessScopeDescriptor = {
	label: string;
	description: string;
	group: TAccessScopeGroup;
};

export const ACCESS_SCOPE_GROUP_LABELS: Record<TAccessScopeGroup, string> = {
	PONTO_DE_INTERACAO: "Ponto de interação",
	AGENTE_DESKTOP: "Agente desktop",
	OUTROS: "Outras permissões",
};

// Ordem de renderização dos grupos — estável, independente da ordem que os scopes chegam da API.
export const ACCESS_SCOPE_GROUP_ORDER: TAccessScopeGroup[] = ["PONTO_DE_INTERACAO", "AGENTE_DESKTOP", "OUTROS"];

export const ACCESS_SCOPE_CATALOG: Record<TAccessScopeEnum, TAccessScopeDescriptor> = {
	"poi:configuration:read": {
		label: "Ler a configuração da loja",
		description: "Carregar as regras de cashback, os limites de desconto e os prêmios ativos.",
		group: "PONTO_DE_INTERACAO",
	},
	"poi:clients:read": {
		label: "Consultar clientes",
		description: "Buscar o cliente pelo telefone e ver o saldo de cashback disponível.",
		group: "PONTO_DE_INTERACAO",
	},
	"poi:clients:create": {
		label: "Cadastrar clientes",
		description: "Criar um cliente novo direto no balcão, sem passar pelo painel.",
		group: "PONTO_DE_INTERACAO",
	},
	"poi:transactions:create": {
		label: "Registrar compras e resgates",
		description: "Lançar a venda, gerar o cashback e dar baixa nos resgates do cliente.",
		group: "PONTO_DE_INTERACAO",
	},
	"poi:coupons:read": {
		label: "Consultar cupons",
		description: "Ver os cupons que o cliente pode usar na compra.",
		group: "PONTO_DE_INTERACAO",
	},
	"poi:prizes:read": {
		label: "Consultar prêmios",
		description: "Ver o catálogo de prêmios que o cliente pode trocar por cashback.",
		group: "PONTO_DE_INTERACAO",
	},
	"poi:sellers:read": {
		label: "Consultar vendedores",
		description: "Listar os vendedores para atribuir a venda a quem atendeu.",
		group: "PONTO_DE_INTERACAO",
	},
	"desktop-agent:configuration:read": {
		label: "Ler a configuração de impressão",
		description: "Carregar as preferências de impressão automática da organização.",
		group: "AGENTE_DESKTOP",
	},
	"desktop-agent:printers:sync": {
		label: "Sincronizar impressoras",
		description: "Reportar quais impressoras estão instaladas e disponíveis nesta máquina.",
		group: "AGENTE_DESKTOP",
	},
	"desktop-agent:print-jobs:read": {
		label: "Receber trabalhos de impressão",
		description: "Buscar a fila de cupons, etiquetas e notas que aguardam impressão.",
		group: "AGENTE_DESKTOP",
	},
	"desktop-agent:print-jobs:update": {
		label: "Confirmar impressões",
		description: "Marcar cada trabalho como impresso ou reportar o erro que ocorreu.",
		group: "AGENTE_DESKTOP",
	},
};

// Um grant pode ter sobrevivido a uma mudança de catálogo: nunca esconda o scope só porque
// não há rótulo — o lojista ainda precisa poder revogá-lo.
export function describeAccessScope(scope: string): TAccessScopeDescriptor {
	return (
		ACCESS_SCOPE_CATALOG[scope as TAccessScopeEnum] ?? {
			label: scope,
			description: "Permissão fora do catálogo padrão deste dispositivo.",
			group: "OUTROS",
		}
	);
}

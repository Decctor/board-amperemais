/** Brand background — Figma: 0% #24549C → 100% #0C1D36 (vertical canvas = top → bottom) */
export const BG_GRADIENT = "linear-gradient(180deg, #24549C 0%, #0C1D36 100%)";

export const CAMPEOES_FONT_STACK = `var(--font-raleway), ui-sans-serif, system-ui, sans-serif`;

export const TAGLINE = "Dados que viram relacionamento — e relacionamento que viram receita.";

export const DELIVERY_KPIS = [
	{ label: "Clientes Convertidos", value: "36" },
	{ label: "Mensagens Entregues", value: "140" },
	{ label: "Ticket Médio Conv.", value: "R$ 204,23" },
	{ label: "Tempo Médio Conv.", value: "111,6h" },
] as const;

/** Corpo do callout — o botão “Venha já testar” fica à direita (estilo Comece grátis). */
export const HERO_CTA_BODY = (
	<>
		Também quer <strong style={{ color: "#FAFAFA", fontWeight: 800 }}>campanhas automáticas no WhatsApp</strong>
		{" — "}com mensagens no timing certo e benefícios como <strong style={{ color: "#FFCD2E", fontWeight: 800 }}>cashback adicional</strong>? <br /> Com
		o <strong style={{ color: "#FFCD2E", fontWeight: 800 }}>RecompraCRM</strong>, você pode.
	</>
);

export const CAMPEOES_METRIC_TRIO = [
	{
		label: "Impacto no Ticket",
		value: "+51,78%",
		valueColor: "#059669",
		accent: "linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)",
	},
	{
		label: "Clientes Alcançados",
		value: "99",
		valueColor: "#1E3A5F",
		accent: "linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)",
	},
	{
		label: "Antecipação Média",
		value: "10,7 dias",
		valueColor: "#D4A012",
		accent: "linear-gradient(135deg, #FFFBF0 0%, #FFF6E0 100%)",
		borderAccent: "1px solid rgba(255, 185, 0, 0.35)",
	},
] as const;

export const BG_GRADIENT = "linear-gradient(180deg, #1F4A8A 0%, #0A1A30 100%)";

export const PIOR_DIA_FONT_STACK = `var(--font-raleway), ui-sans-serif, system-ui, sans-serif`;

// ── Topo da peça ────────────────────────────────────────────────
export const PIOR_DIA_KICKER = "AUTOMAÇÃO INTELIGENTE";

export const PIOR_DIA_HEADLINE_LINE1 = "Sua quarta fraca";
export const PIOR_DIA_HEADLINE_LINE2_PLAIN = "virou ";
export const PIOR_DIA_HEADLINE_LINE2_ACCENT = "dia campeão.";

export const PIOR_DIA_BODY = (
	<>
		Uma campanha que <strong style={{ color: "#FAFAFA", fontWeight: 800 }}>roda sozinha</strong> no
		seu pior dia da semana — feita em <strong style={{ color: "#FFCD2E", fontWeight: 800 }}>3 passos</strong>{" "}
		e ativada automaticamente pelo <strong style={{ color: "#FFCD2E", fontWeight: 800 }}>RecompraCRM</strong>.
	</>
);

// ── CTA ──────────────────────────────────────────────────────────
export const PIOR_DIA_CTA_BODY = (
	<>
		Quer uma campanha que trabalha sozinha pra <strong style={{ color: "#FAFAFA", fontWeight: 800 }}>resgatar receita</strong>{" "}
		no seu pior dia?
	</>
);

export const PIOR_DIA_CTA_BUTTON_LABEL = "QUERO TESTAR";

// ── Etapas do workflow ──────────────────────────────────────────
export const PIOR_DIA_STEP_LABELS = {
	one: { number: "01", title: "VOCÊ CONFIGURA", subtitle: "Uma única vez, em 2 minutos" },
	two: { number: "02", title: "SISTEMA DISPARA", subtitle: "1 dia antes, no automático" },
	three: { number: "03", title: "RECEITA SOBE", subtitle: "Pior dia vira o melhor" },
} as const;

// ── WhatsApp preview ────────────────────────────────────────────
export const PIOR_DIA_WHATSAPP_TEXT = (
	<>
		Olá <strong>{"{{NOME DO CLIENTE}}"}</strong>, você é muito especial pra nós e adoraríamos sua presença
		amanhã. Reservamos <strong>R$ 15,00</strong> pra que você use nas suas compras. Esperamos você aqui! 💛
	</>
);

export const PIOR_DIA_WHATSAPP_TIME = "20:30";

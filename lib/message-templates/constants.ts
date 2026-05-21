export const MESSAGE_TEMPLATE_DEFAULT_LANGUAGE = "pt_BR";

export const MESSAGE_TEMPLATE_BODY_MAX_LENGTH = 1024;
export const MESSAGE_TEMPLATE_HEADER_TEXT_MAX_LENGTH = 60;
export const MESSAGE_TEMPLATE_FOOTER_MAX_LENGTH = 60;
export const MESSAGE_TEMPLATE_BUTTON_TEXT_MAX_LENGTH = 25;
export const MESSAGE_TEMPLATE_BUTTONS_MAX_COUNT = 10;

export const MESSAGE_TEMPLATE_CATEGORY_OPTIONS = [
	{ id: "AUTENTICAÇÃO", value: "AUTENTICAÇÃO", label: "AUTENTICAÇÃO" },
	{ id: "MARKETING", value: "MARKETING", label: "MARKETING" },
	{ id: "UTILIDADE", value: "UTILIDADE", label: "UTILIDADE" },
] as const;

export const MESSAGE_TEMPLATE_LANGUAGE_OPTIONS = [
	{ id: "pt_BR", value: "pt_BR", label: "PORTUGUÊS (BRASIL)" },
	{ id: "en_US", value: "en_US", label: "INGLÊS (EUA)" },
	{ id: "es_ES", value: "es_ES", label: "ESPANHOL" },
] as const;

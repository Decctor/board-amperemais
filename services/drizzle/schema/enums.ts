import { pgEnum } from "drizzle-orm/pg-core";

export const campaignTriggerTypeEnum = pgEnum("campaign_trigger_type", [
	"NOVA-COMPRA",
	"PRIMEIRA-COMPRA",
	"PERMANÊNCIA-SEGMENTAÇÃO",
	"ENTRADA-SEGMENTAÇÃO",
	"CASHBACK-ACUMULADO",
	"CASHBACK-EXPIRANDO",
	"ANIVERSARIO_CLIENTE",
	"QUANTIDADE-TOTAL-COMPRAS",
	"VALOR-TOTAL-COMPRAS",
	"RECORRENTE",
	"PIOR-DIA-VENDAS",
	"USO-UNICO",
]);

export const campaignExecutionDelayDirectionEnum = pgEnum("campaign_execution_delay_direction", ["ANTES", "DEPOIS"]);

export const recurrenceFrequencyEnum = pgEnum("recurrence_frequency", ["DIARIO", "SEMANAL", "MENSAL"]);

export const timeDurationUnitsEnum = pgEnum("time_duration_units", ["MINUTOS", "HORAS", "DIAS", "SEMANAS", "MESES", "ANOS"]);

export const interactionTypeEnum = pgEnum("interaction_type", ["ENVIO-MENSAGEM", "ENVIO-EMAIL", "LIGAÇÃO", "ATENDIMENTO"]);
export const interactionsCronJobTimeBlocksEnum = pgEnum("interactions_cron_time_blocks", [
	"00:00",
	"01:00",
	"02:00",
	"03:00",
	"04:00",
	"05:00",
	"06:00",
	"07:00",
	"08:00",
	"09:00",
	"10:00",
	"11:00",
	"12:00",
	"13:00",
	"14:00",
	"15:00",
	"16:00",
	"17:00",
	"18:00",
	"19:00",
	"20:00",
	"21:00",
	"22:00",
	"23:00",
]);

export const whatsappTemplateCategoryEnum = pgEnum("whatsapp_template_category", ["AUTENTICAÇÃO", "MARKETING", "UTILIDADE"]);
export const whatsappTemplateParametersTypeEnum = pgEnum("whatsapp_template_parameters_type", ["NOMEADO", "POSICIONAL"]);
export const whatsappTemplateStatusEnum = pgEnum("whatsapp_template_status", [
	"RASCUNHO",
	"PENDENTE",
	"APROVADO",
	"REJEITADO",
	"PAUSADO",
	"DESABILITADO",
]);
export const whatsappTemplateQualityEnum = pgEnum("whatsapp_template_quality", ["PENDENTE", "ALTA", "MEDIA", "BAIXA"]);

export const messageTemplateStatusEnum = pgEnum("message_template_status", ["RASCUNHO", "ATIVO", "ARQUIVADO"]);

export const messageTemplateCategoryEnum = pgEnum("message_template_category", ["AUTENTICAÇÃO", "MARKETING", "UTILIDADE"]);

export const cashbackProgramAccumulationTypeEnum = pgEnum("cashback_program_accumulation_type", ["FIXO", "PERCENTUAL"]);

export const cashbackProgramTerminologyEnum = pgEnum("cashback_program_terminology", ["DINHEIRO", "PONTOS"]);

export const cashbackProgramRedemptionLimitTypeEnum = pgEnum("cashback_program_redemption_limit_type", ["FIXO", "PERCENTUAL"]);

export const cashbackProgramTransactionTypeEnum = pgEnum("cashback_program_transaction_type", ["ACÚMULO", "RESGATE", "EXPIRAÇÃO", "CANCELAMENTO"]);

export const cashbackProgramTransactionStatusEnum = pgEnum("cashback_program_transaction_status", ["ATIVO", "CONSUMIDO", "EXPIRADO"]);

export const organizationIntegrationTypeEnum = pgEnum("organization_integration_type", [
	"ONLINE-SOFTWARE",
	"CARDAPIO-WEB",
	"NUVEM-SHOP",
	"IFOOD",
	"BLING",
]);

// Fundação de integrations (marketing/parceiros — Meta Ads, CAPI, etc.). Separada do
// enum de fonte de dados/ERP acima (organizationIntegrationTypeEnum), que é inline em organizations.
export const integrationTypeEnum = pgEnum("integration_type", ["META_ADS", "META_CAPI", "TRACKING"]);
export const integrationStatusEnum = pgEnum("integration_status", ["CONECTADO", "EXPIRADO", "ERRO"]);

// Audiences (públicos) — status de sincronização de um destino (ex.: Custom Audience na Meta).
export const audienceDestinationStatusEnum = pgEnum("audience_destination_status", ["PENDENTE", "SINCRONIZADO", "ERRO"]);

export const chatStatusEnum = pgEnum("chat_status", ["ABERTA", "FECHADA"]);

export const chatMessageContentTypeEnum = pgEnum("chat_message_content_type", ["TEXTO", "IMAGEM", "VIDEO", "AUDIO", "DOCUMENTO"]);

export const chatServiceStatusEnum = pgEnum("chat_service_status", ["PENDENTE", "EM_ANDAMENTO", "CONCLUIDO"]);

export const chatServiceResponsibleTypeEnum = pgEnum("chat_service_responsible_type", ["USUÁRIO", "AI", "BUSINESS-APP", "CLIENTE"]);

export const chatMessageAuthorTypeEnum = pgEnum("chat_message_author_type", ["CLIENTE", "USUÁRIO", "AI", "BUSINESS-APP"]);

export const chatMessageStatusEnum = pgEnum("chat_message_status", ["CANCELADO", "ENVIADO", "RECEBIDO", "LIDO"]);

export const chatMessageWhatsappStatusEnum = pgEnum("chat_message_whatsapp_status", ["PENDENTE", "ENVIADO", "ENTREGUE", "LIDO", "FALHOU"]);

export const conversionTypeEnum = pgEnum("conversion_type", ["AQUISICAO", "REATIVACAO", "ACELERACAO", "REGULAR", "ATRASADA"]);

export const whatsappConnectionTypeEnum = pgEnum("whatsapp_connection_type", ["META_CLOUD_API", "INTERNAL_GATEWAY"]);

export const communityCourseAccessLevelEnum = pgEnum("community_course_access_level", ["PUBLICO", "AUTENTICADO", "ASSINATURA"]);

export const communityCourseStatusEnum = pgEnum("community_course_status", ["RASCUNHO", "PUBLICADO", "ARQUIVADO"]);

export const communityLessonContentTypeEnum = pgEnum("community_lesson_content_type", ["VIDEO", "TEXTO", "VIDEO_TEXTO"]);

export const communityMuxAssetStatusEnum = pgEnum("community_mux_asset_status", ["AGUARDANDO", "PROCESSANDO", "PRONTO", "ERRO"]);

export const communityAssetTypeEnum = pgEnum("community_asset_type", ["VIDEO", "IMAGE", "DOCUMENT", "AUDIO", "TEXT"]);

export const communityAssetPipelineStatusEnum = pgEnum("community_asset_pipeline_status", [
	"PENDENTE",
	"EXTRAINDO",
	"EM_REVISAO",
	"AGUARDANDO_AJUSTE",
	"ANALISANDO",
	"DERIVANDO",
	"CONCLUIDO",
	"REJEITADO",
	"ERRO",
]);

export const communityAssetReviewVerdictEnum = pgEnum("community_asset_review_verdict", ["APROVADO", "NECESSITA_AJUSTE", "REJEITADO"]);

export const communityAssetDerivationStatusEnum = pgEnum("community_asset_derivation_status", [
	"SUGERIDO",
	"APROVADO",
	"GERANDO",
	"GERADO",
	"DESCARTADO",
]);

export const communityAssetDerivationTypeEnum = pgEnum("community_asset_derivation_type", [
	"POST_INSTAGRAM",
	"POST_TWITTER",
	"POST_LINKEDIN",
	"VIDEO_CURTO",
	"ARTIGO_BLOG",
	"EBOOK",
	"PLAYBOOK",
	"NEWSLETTER",
	"CARROSSEL",
	"THUMBNAIL",
	"TRANSCRICAO",
]);

export const communityMaterialTypeEnum = pgEnum("community_material_type", [
	"EBOOK",
	"PLAYBOOK",
	"PLANILHA",
	"TEMPLATE",
	"GUIA",
	"CHECKLIST",
	"INFOGRAFICO",
	"DOCUMENTO",
]);

export const communityTutorialNivelEnum = pgEnum("community_tutorial_nivel", ["INICIANTE", "INTERMEDIARIO", "AVANCADO"]);

export const communityContentStatusEnum = pgEnum("community_content_status", ["RASCUNHO", "PUBLICADO", "ARQUIVADO"]);

// ============================================================================
// FINANCIAL / ERP
// ============================================================================

export const financialAccountTypeEnum = pgEnum("financial_account_type", ["CAIXA", "BANCO", "CARTEIRA_DIGITAL"]);

export const bankAccountTypeEnum = pgEnum("bank_account_type", ["CORRENTE", "POUPANCA"]);

export const financialTransactionTypeEnum = pgEnum("financial_transaction_type", ["ENTRADA", "SAIDA"]);

export const accountingEntryOriginTypeEnum = pgEnum("accounting_entry_origin_type", ["VENDA", "MANUAL", "ESTORNO", "TRANSFERENCIA"]);

export const fiscalDocumentTypeEnum = pgEnum("fiscal_document_type", ["NFCE", "NFE", "NFSE"]);

export const fiscalDocumentStatusEnum = pgEnum("fiscal_document_status", ["PENDENTE", "AUTORIZADA", "CANCELADA", "INUTILIZADA"]);

export const fiscalDocumentEnvironmentEnum = pgEnum("fiscal_document_environment", ["HOMOLOGACAO", "PRODUCAO"]);

export const fiscalDocumentLifecycleStatusEnum = pgEnum("fiscal_document_lifecycle_status", [
	"RASCUNHO",
	"PRONTO_PARA_ENVIO",
	"EM_PROCESSAMENTO",
	"AUTORIZADO",
	"REJEITADO",
	"CANCELAMENTO_PENDENTE",
	"CANCELADO",
	"INUTILIZADO",
	"ERRO",
]);

export const fiscalDocumentEventTypeEnum = pgEnum("fiscal_document_event_type", [
	"CRIADO",
	"ENVIO_SOLICITADO",
	"AUTORIZADO",
	"REJEITADO",
	"SINCRONIZADO",
	"CANCELAMENTO_SOLICITADO",
	"CANCELADO",
	"CARTA_CORRECAO",
	"INUTILIZACAO",
	"ERRO",
]);

export const fiscalOperationConsumerPresenceEnum = pgEnum("fiscal_operation_consumer_presence", [
	"NAO_SE_APLICA",
	"OPERACAO_PRESENCIAL",
	"INTERNET",
	"TELEATENDIMENTO",
	"ENTREGA_DOMICILIO",
]);

export const fiscalOperationFinalityEnum = pgEnum("fiscal_operation_finality", ["NORMAL", "COMPLEMENTAR", "AJUSTE", "DEVOLUCAO"]);

export const fiscalProductOriginEnum = pgEnum("fiscal_product_origin", [
	"NACIONAL",
	"ESTRANGEIRA_IMPORTACAO_DIRETA",
	"ESTRANGEIRA_ADQUIRIDA_BRASIL",
	"NACIONAL_CONTEUDO_IMPORTACAO_SUPERIOR_40",
	"NACIONAL_PROCESSOS_BASICOS",
	"NACIONAL_CONTEUDO_IMPORTACAO_INFERIOR_IGUAL_40",
	"ESTRANGEIRA_IMPORTACAO_DIRETA_SEM_SIMILAR",
	"ESTRANGEIRA_ADQUIRIDA_BRASIL_SEM_SIMILAR",
]);

export const fiscalClientTaxIndicatorEnum = pgEnum("fiscal_client_tax_indicator", ["CONTRIBUINTE_ICMS", "CONTRIBUINTE_ISENTO", "NAO_CONTRIBUINTE"]);

export const fiscalIcmsCsosnEnum = pgEnum("fiscal_icms_csosn", ["101", "102", "103", "201", "202", "203", "300", "400", "500", "900"]);

export const fiscalPisCofinsCstEnum = pgEnum("fiscal_pis_cofins_cst", ["01", "02", "03", "04", "05", "06", "07", "08", "09", "49", "99"]);

export const fiscalTaxRuleScopeEnum = pgEnum("fiscal_tax_rule_scope", ["INTRAESTADUAL", "INTERESTADUAL"]);

export const stockMovementTypeEnum = pgEnum("stock_movement_type", [
	"ENTRADA_AQUISICAO",
	"SAIDA",
	"AJUSTE",
	"ENTRADA_DEVOLUCAO",
	"SAIDA_PRODUCAO",
	"ENTRADA_PRODUCAO",
	"DESCARTE",
]);

export const productionStatusEnum = pgEnum("production_status", ["RASCUNHO", "PLANEJADA", "EM_PRODUCAO", "CONCLUIDA", "CANCELADA"]);

export const productionOriginEnum = pgEnum("production_origin", ["MANUAL", "PEDIDO", "AGENDADA"]);

export const stockLotStatusEnum = pgEnum("stock_lot_status", ["ATIVO", "ESGOTADO", "VENCIDO", "DESCARTADO"]);

// Tipo de eixo de variante (drive a UI: texto simples, swatch de cor, valor numerico).
export const variantOptionTypeEnum = pgEnum("variant_option_type", ["TEXTO", "COR", "NUMERO"]);

export const saleProcessingSourceEnum = pgEnum("origem_processamento_venda", ["EXTERNO", "INTERNO"]);

// Status comercial da venda. FATURADA foi removido: o faturamento e inferido dos documentos fiscais (fiscalOutboundDocuments).
export const saleStatusEnum = pgEnum("sale_status", ["ORCAMENTO", "CONDICIONAL", "CONFIRMADA", "CANCELADA"]);

// Status operacional de atendimento/fulfillment da venda, independente do status comercial.
export const saleAttendanceStatusEnum = pgEnum("sale_attendance_status", [
	"NAO_INICIADO",
	"EM_PREPARO",
	"PRONTO",
	"EM_ENTREGA",
	"ENTREGUE",
	"PARCIALMENTE_ENTREGUE",
	"CANCELADO",
]);

export const defaultDataSourceEnum = pgEnum("origem_dados_padrao", ["RECEPTOR", "ERP"]);

export const paymentMethodEnum = pgEnum("payment_method", [
	"DINHEIRO",
	"PIX",
	"CARTAO_CREDITO",
	"CARTAO_DEBITO",
	"BOLETO",
	"TRANSFERENCIA",
	"CASHBACK",
	"VALE",
	"A_DEFINIR",
	"FIADO_NOTA",
	"OUTRO",
]);

export const deliveryModeEnum = pgEnum("delivery_mode", ["PRESENCIAL", "RETIRADA", "ENTREGA", "COMANDA"]);

export const purchaseStatusEnum = pgEnum("purchase_status", ["RASCUNHO", "CONFIRMADA", "RECEBIMENTO_PARCIAL", "RECEBIDA", "CANCELADA"]);

export const fiscalProviderEnum = pgEnum("fiscal_provider", ["MANUAL", "SPEDY"]);

export const paymentProviderEnum = pgEnum("payment_provider", ["LOCAL", "MERCADO_PAGO", "STRIPE_CONNECT", "PAGARME"]);

export const poiTransactionRequestStatusEnum = pgEnum("poi_transaction_request_status", ["PENDENTE", "PROCESSANDO", "APROVADO", "REJEITADO", "ERRO"]);

export const poiTransactionRequestTypeEnum = pgEnum("poi_transaction_request_type", ["NOVA_TRANSACAO"]);

export const accountChartNatureEnum = pgEnum("account_chart_nature", ["ATIVO", "PASSIVO", "PATRIMONIO_LIQUIDO", "RECEITA", "CUSTO", "DESPESA"]);

export const productClientReferenceWindowEnum = pgEnum("product_client_reference_window", ["GERAL", "30_DIAS", "90_DIAS"]);

export const shopModeEnum = pgEnum("shop_mode", ["CARDAPIO", "CATALOGO"]);

export const shopProductsModeEnum = pgEnum("shop_products_mode", ["ATIVOS", "INCLUIR", "EXCLUIR"]);

export const shopHeaderCoverTypeEnum = pgEnum("shop_header_cover_type", ["IMAGEM", "VIDEO"]);

export const salesSessionStatusEnum = pgEnum("sales_session_status", ["ABERTA", "FECHADA", "CONFERIDA", "CANCELADA"]);

export const shopCompositionBlockTypeEnum = pgEnum("shop_composition_block_type", ["GRUPOS_PRODUTOS", "EM_DESTAQUE", "MAIS_PEDIDOS"]);

export const fiscalInboundManifestEventEnum = pgEnum("fiscal_inbound_manifest_event", ["CIENCIA", "CONFIRMACAO", "DESCONHECIMENTO", "NAO_REALIZADA"]);

export const platformPartnerStatusEnum = pgEnum("platform_partner_status", ["PENDENTE_APROVACAO", "ATIVO", "SUSPENSO", "REJEITADO"]);

export const platformPartnerReferralStatusEnum = pgEnum("platform_partner_referral_status", [
	"CAPTURADO",
	"ORGANIZACAO_CRIADA",
	"PAGAMENTO_CONFIRMADO",
	"CANCELADO",
]);

export const platformPartnerCommissionStatusEnum = pgEnum("platform_partner_commission_status", ["PENDENTE", "APROVADA", "CANCELADA", "PAGA"]);

export const platformPartnerPayoutStatusEnum = pgEnum("platform_partner_payout_status", ["RASCUNHO", "APROVADO", "PAGO", "CANCELADO"]);

// ============================================================================
// COUPONS
// ============================================================================

export const couponScopeEnum = pgEnum("coupon_scope", ["GLOBAL", "INDIVIDUAL"]);

export const couponValidationModeEnum = pgEnum("coupon_validation_mode", ["AUTOMATICA", "MANUAL"]);

export const couponBenefitTypeEnum = pgEnum("coupon_benefit_type", [
	"DESCONTO_FIXO",
	"DESCONTO_PERCENTUAL",
	"PRECO_FIXO",
	"COMPRE_X_LEVE_Y",
	"BRINDE",
]);

export const couponBenefitScopeEnum = pgEnum("coupon_benefit_scope", ["VENDA_TOTAL", "ITENS_ELEGIVEIS"]);

export const couponTargetOperatorEnum = pgEnum("coupon_target_operator", ["QUALQUER", "TODOS"]);

export const couponTargetRoleEnum = pgEnum("coupon_target_role", ["ELEGIVEL", "BENEFICIADO"]);

export const couponGrantOriginEnum = pgEnum("coupon_grant_origin", ["MANUAL", "CAMPANHA", "SISTEMA"]);

export const couponRedemptionStatusEnum = pgEnum("coupon_redemption_status", ["UTILIZADO", "CANCELADO"]);

export const couponRedemptionSourceEnum = pgEnum("coupon_redemption_source", ["POS", "PONTO_INTERACAO", "LOJA_DIGITAL"]);

// ============================================================================
// ACTION APPROVALS (aprovações de ações — desconto de venda é o primeiro caso)
// ============================================================================

// Ciclo de vida fechado e estável da solicitação. O `tipo` da ação NÃO é pgEnum de propósito:
// é varchar + z.enum no app para que novos cenários não custem migração de enum no Postgres.
export const actionApprovalStatusEnum = pgEnum("action_approval_status", ["PENDENTE", "APROVADA", "REJEITADA", "CANCELADA", "EXPIRADA", "CONSUMIDA"]);

export const actionApprovalDecisionMethodEnum = pgEnum("action_approval_decision_method", ["PAINEL", "SENHA_PDV"]);

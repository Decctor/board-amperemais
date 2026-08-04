-- Fundação de configuração tipada de contas financeiras.
-- Pré-requisito: aplicar e concluir 0064a_financial_account_enums.sql.
-- Aplicar antes do deploy do código que lê/escreve `configuracao`.

ALTER TABLE "ampmais_financial_accounts"
	ADD COLUMN IF NOT EXISTS "configuracao" jsonb;

UPDATE "ampmais_financial_accounts"
SET "configuracao" = CASE
	WHEN "tipo" = 'BANCO' THEN jsonb_build_object(
		'categoria', 'BANCO',
		'tipo', "tipo_conta",
		'codigo', COALESCE("codigo_banco", ''),
		'nome', COALESCE("nome_banco", ''),
		'agencia', COALESCE("agencia", ''),
		'contaNumero', COALESCE("numero_conta", ''),
		'contaDigito', COALESCE("digito_conta", '')
	)
	WHEN "tipo" = 'CAIXA' THEN jsonb_build_object('categoria', 'CAIXA')
	WHEN "tipo" = 'CARTEIRA_DIGITAL' THEN jsonb_build_object(
		'categoria', 'CARTEIRA_DIGITAL',
		'integracaoAtiva', false,
		'ultimaSincronizacao', NULL
	)
	WHEN "tipo" = 'CARTAO_CREDITO' THEN jsonb_build_object(
		'categoria', 'CARTAO_CREDITO',
		'limiteCredito', NULL,
		'diaFechamentoFatura', 25,
		'diaVencimentoFatura', 5,
		'contaPagamentoPadraoId', NULL,
		'taxaJurosMensal', NULL,
		'taxaMulta', NULL,
		'taxaFixa', NULL
	)
	WHEN "tipo" = 'INVESTIMENTO' THEN jsonb_build_object('categoria', 'INVESTIMENTO')
	ELSE jsonb_build_object('categoria', 'OUTRO')
END
WHERE "configuracao" IS NULL;

ALTER TABLE "ampmais_financial_accounts"
	ALTER COLUMN "configuracao" SET NOT NULL;

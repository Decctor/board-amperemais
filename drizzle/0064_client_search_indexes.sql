-- Indices de busca de cliente (menu "VINCULAR CLIENTE" e SelectClient).
-- DDL aditivo. APLICAR MANUALMENTE (nao aplicado pelo agente):
--   npx tsx ./scripts/apply-sql-migration.ts drizzle/0064_client_search_indexes.sql
--
-- Idempotente: seguro reaplicar.
--
-- Contexto: `/api/clients/search` filtra com LIKE '%termo%' em nome, telefone_base e cpf_cnpj.
-- Nenhuma dessas colunas tinha indice utilizavel para busca parcial:
--   - `idx_clients_nome` e GIN de full-text (to_tsvector), que nao atende LIKE parcial. Continua
--     existindo porque /api/sales e /api/exportation/clients usam to_tsvector — nao remover.
--   - `idx_clients_telefone` e `idx_clients_email` estavam declarados no schema Drizzle mas nunca
--     foram criados por migration alguma.
--   - `cpf_cnpj` nunca teve indice.
-- Com um dos ramos do OR sem indice, o planner nao consegue montar BitmapOr e cai em Seq Scan da
-- tabela inteira a cada busca. Os indices GIN trigram abaixo tornam os tres ramos indexaveis.
--
-- GIN (e nao GiST) porque a consulta e de busca por conteudo, e nao de vizinhanca/ordenacao por
-- similaridade: para LIKE '%x%' o GIN trigram e substancialmente mais rapido na leitura.
--
-- ATENCAO: CREATE INDEX (sem CONCURRENTLY) trava escritas em ampmais_clients enquanto constroi.
-- CONCURRENTLY nao e possivel aqui porque apply-sql-migration.ts roda o arquivo numa transacao.
-- Preferir aplicar em janela de baixo movimento.

CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint

-- `unaccent` e STABLE, entao nao serve para indice. Wrapper IMMUTABLE ja criado na 0048; recriado
-- aqui apenas se ausente, nunca substituido (CREATE OR REPLACE invalidaria indices existentes).
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'unaccent_immutable') THEN
		CREATE FUNCTION unaccent_immutable(text) RETURNS text
			LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
			AS $func$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $func$;
	END IF;
END $$;--> statement-breakpoint

-- Busca por nome. Casa exatamente com createSimplifiedSearchCondition().
CREATE INDEX IF NOT EXISTS "idx_clients_nome_trgm" ON "ampmais_clients"
	USING gin (unaccent_immutable(lower("nome")) gin_trgm_ops);--> statement-breakpoint

-- Busca por telefone. `telefone_base` ja e so digitos (formatPhoneAsBase).
CREATE INDEX IF NOT EXISTS "idx_clients_telefone_base_trgm" ON "ampmais_clients"
	USING gin ("telefone_base" gin_trgm_ops);--> statement-breakpoint

-- Busca por CPF/CNPJ. A coluna guarda o valor MASCARADO ("123.456.789-01", vindo de
-- formatToCPForCNPJ no cadastro), entao comparar o termo digitado cru contra ela nunca casava.
-- O indice normaliza os dois lados para digitos — createSimplifiedDigitsSearchCondition() emite
-- exatamente esta expressao, que e o que permite o planner usar o indice.
CREATE INDEX IF NOT EXISTS "idx_clients_cpf_cnpj_digits_trgm" ON "ampmais_clients"
	USING gin (regexp_replace(COALESCE("cpf_cnpj", ''), '[^0-9]', '', 'g') gin_trgm_ops);--> statement-breakpoint

-- Busca por email na listagem de clientes (/api/clients, createSimplifiedEmailSearchCondition).
CREATE INDEX IF NOT EXISTS "idx_clients_email_trgm" ON "ampmais_clients"
	USING gin (lower("email") gin_trgm_ops);--> statement-breakpoint

-- Ramo do BitmapAnd que aplica o recorte por tenant. `idx_clients_org_primeira_compra` serve como
-- prefixo, mas e mais largo do que o necessario para este filtro.
CREATE INDEX IF NOT EXISTS "idx_clients_organizacao_id" ON "ampmais_clients" ("organizacao_id");--> statement-breakpoint

ANALYZE "ampmais_clients";

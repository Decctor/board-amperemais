-- Busca insensível a acentos (diacríticos) para filtros de produto e afins.
-- Habilita a extensão `unaccent` do Postgres, que normaliza caracteres acentuados
-- (ç→c, á/à/ã/â→a, é/ê→e, í→i, ó/ô/õ→o, ú→u, etc.). Com isso, "acai" passa a
-- encontrar "Açaí" quando combinado com `unaccent(coluna) ILIKE unaccent(padrão)`.
--
-- Idempotente: seguro reaplicar. Não altera dados nem esquema de tabelas.
CREATE EXTENSION IF NOT EXISTS unaccent;

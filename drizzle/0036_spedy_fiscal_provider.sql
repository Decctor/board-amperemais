DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM pg_enum e
		JOIN pg_type t ON t.oid = e.enumtypid
		WHERE t.typname = 'fiscal_provider'
			AND e.enumlabel = 'NUVEM_FISCAL'
	) AND NOT EXISTS (
		SELECT 1
		FROM pg_enum e
		JOIN pg_type t ON t.oid = e.enumtypid
		WHERE t.typname = 'fiscal_provider'
			AND e.enumlabel = 'SPEDY'
	) THEN
		ALTER TYPE "fiscal_provider" RENAME VALUE 'NUVEM_FISCAL' TO 'SPEDY';
	ELSIF NOT EXISTS (
		SELECT 1
		FROM pg_enum e
		JOIN pg_type t ON t.oid = e.enumtypid
		WHERE t.typname = 'fiscal_provider'
			AND e.enumlabel = 'SPEDY'
	) THEN
		ALTER TYPE "fiscal_provider" ADD VALUE 'SPEDY';
	END IF;
END $$;

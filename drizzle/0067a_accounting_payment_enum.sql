-- Enum separado para que o PostgreSQL confirme o novo valor antes de qualquer uso.
ALTER TYPE "accounting_entry_origin_type" ADD VALUE IF NOT EXISTS 'PAGAMENTO_CARTAO';

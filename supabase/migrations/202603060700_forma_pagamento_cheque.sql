-- Inclui "cheque" em formas de pagamento (procedimentos)
-- Se o valor já existir no enum, este comando falha com segurança (migração idempotente manual).

ALTER TYPE public.forma_pagamento_tipo ADD VALUE 'cheque';

# MedSplit (Expo + Supabase)

App mobile (iOS/Android) para gestao de producao, faturamento, glosas e repasses de equipe de anestesia.

## Stack

- React Native com Expo (TypeScript)
- Supabase (Postgres + Auth + RLS)
- React Navigation
- React Hook Form + Zod
- TanStack Query com persistencia offline basica
- UI com React Native Paper

## Estrutura

```txt
src/
  components/
  features/
    auth/
    dashboard/
    procedimentos/
    repasses/
    relatorios/
    glosas/
    cadastros/
  lib/
  navigation/
supabase/
  migrations/
  seed.sql
```

## Setup local

1. Instale dependencias:

```bash
npm install
```

2. Crie `.env` na raiz:

```env
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

3. Rode as migrations e seed no Supabase (na ordem):

- Execute `supabase/migrations/202603052050_init.sql`
- Execute `supabase/migrations/202603052230_bootstrap_profiles.sql`
- Execute `supabase/migrations/202603052300_fix_repasse_enum_casts.sql`
- Execute `supabase/migrations/202603052340_fix_repasses_rls.sql`
- Execute `supabase/migrations/202603060010_procedimentos_v2.sql`
- Execute `supabase/migrations/202603060030_storage_documentos.sql`
- Execute `supabase/migrations/202603060110_pagamento_procedimento.sql`
- Execute `supabase/migrations/202603060150_forma_pagamento.sql`
- Execute `supabase/migrations/202603060200_valor_calculado_editavel.sql`
 - Execute `supabase/seed.sql`

4. Inicie o app:

```bash
npm run start
```

## Auth, roles e RLS

Roles em `users_profile.role`:

- `admin`: acesso total e cadastros
- `medico`: acesso apenas a procedimentos/repasses onde participa
- `faturamento`: acesso financeiro completo (sem gestao de usuarios)

RLS implementado nas tabelas:

- `procedimentos`: medico ve/insere/edita apenas quando principal/auxiliar vinculado ao seu `anestesistas.user_id`
- `repasses`: medico ve apenas os seus repasses
- `hospitais`, `convenios`, `tabela_honorarios`, `anestesistas`: leitura autenticada e escrita apenas admin
- `users_profile`: admin gerencia; usuario pode ler o proprio perfil

## RPCs usadas no front

- `create_procedimento(payload jsonb)`  
  Cria procedimento; trigger calcula `valor_calculado` e sincroniza repasses.
- `update_status_procedimento(id, status, datas, valores)`  
  Atualiza status com validacoes de recebimento.
- `list_procedimentos(filters)`  
  Lista com joins e filtros por mes/hospital/convenio/status/medico.
- `list_repasses(filters)`  
  Lista repasses por mes/status/medico.

## Regras criticas no banco

- Trigger `fn_valida_calculos_procedimento`:
  - calcula `valor_calculado` por `convenio + porte`
  - exige `data_recebimento` e `valor_recebido` quando status = `recebido`
  - atualiza `updated_by` automaticamente
- Trigger `fn_sync_repasses`:
  - cria/atualiza repasse principal e auxiliar
  - usa `valor_recebido` (quando existir), senao `valor_calculado`
  - remove repasses quando procedimento for `cancelado`
- `valor_glosa` e coluna gerada (`valor_calculado - valor_recebido`, minimo 0)

## Telas implementadas

- Login
- Home (KPIs do mes)
- Procedimentos (lista + filtro por mes)
- Novo Procedimento (form com valor calculado em tempo real por convenio/porte)
- Detalhe do Procedimento (status, recebimento, glosa, cancelamento)
- Repasses (filtro e acao de pagamento para admin)
- Relatorios (resumo + exportacao CSV)
- Cadastros (hospital, convenio, anestesista, honorarios + convite de usuario)
- Glosas (lista de glosas e contestacao)

## Storage de documentos

- Bucket usado: `procedimentos-documentos`
- Upload feito no app ao salvar procedimento com foto tirada na camera
- URL publica salva em `procedimentos.documento_foto_url`

## Observacoes de deploy

- Build mobile: EAS Build (`eas build -p android` / `eas build -p ios`)
- Backend: Supabase gerenciado (migrations versionadas no repo)
- Garantir que cada medico logado esteja vinculado a `anestesistas.user_id` para RLS funcionar.
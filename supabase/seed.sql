insert into public.hospitais (nome, cidade, contato_faturamento, prazo_pagamento_dias)
values
  ('Hospital Santa Maria', 'Sao Paulo', 'faturamento@santamaria.com', 30),
  ('Hospital Vida', 'Campinas', 'contas@hospitalvida.com', 45)
on conflict (nome) do nothing;

insert into public.convenios (nome)
values
  ('Unimed'),
  ('Bradesco Saude'),
  ('SulAmerica')
on conflict (nome) do nothing;

insert into public.tabela_honorarios (convenio_id, porte, valor)
select c.id, p.porte, p.valor
from public.convenios c
join (
  values
    ('Unimed', 1, 550.00),
    ('Unimed', 2, 720.00),
    ('Unimed', 3, 920.00),
    ('Bradesco Saude', 1, 600.00),
    ('Bradesco Saude', 2, 800.00),
    ('Bradesco Saude', 3, 980.00),
    ('SulAmerica', 1, 580.00),
    ('SulAmerica', 2, 760.00),
    ('SulAmerica', 3, 950.00)
) as p(convenio_nome, porte, valor)
  on p.convenio_nome = c.nome
on conflict (convenio_id, porte) do update set valor = excluded.valor;

insert into public.anestesistas (nome, percentual_padrao_principal, percentual_padrao_auxiliar)
values
  ('Dr. Wagner Abreu', 0.70, 0.30),
  ('Dra. Ana Luiza', 0.70, 0.30),
  ('Dr. Otavio Gaya', 0.70, 0.30)
on conflict do nothing;

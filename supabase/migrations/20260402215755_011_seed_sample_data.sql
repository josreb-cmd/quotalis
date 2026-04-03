/*
  # Seed Sample Data for CondoGest
  
  This migration inserts sample data for testing and demonstration:
  
  1. Configuration
    - Condominium name and NIPC
    
  2. Fractions (4 units)
    - 1ºA: João Silva, T2, €110, 250‰
    - 1ºB: Maria Santos, T3, €130, 180‰
    - 2ºA: Carlos Ferreira, T2, €110, 250‰
    - 2ºB: Ana Costa, T3, €130, 320‰
    - Total: 1000‰
    
  3. Administrator
    - Carlos Ferreira (2ºA), elected January 2026
    
  4. Monthly Quotas
    - January to March 2026
    
  5. Sample Payments (3)
  
  6. Sample Expenses (3)
    - Water, Electricity, Cleaning
    
  7. Sample Budget 2026
*/

INSERT INTO configuracoes (nome_condominio, nipc, morada, email_administrador)
VALUES (
  'Edifício Jardins da Cidade',
  '501234567',
  'Rua das Flores, 123, 1000-001 Lisboa',
  'admin@jardins-cidade.pt'
) ON CONFLICT DO NOTHING;

INSERT INTO saldos_anuais (ano, saldo_caixa, saldo_conta_ordem, saldo_fundo_reserva)
VALUES (2026, 500.00, 3500.00, 2000.00)
ON CONFLICT (ano) DO NOTHING;

DO $$
DECLARE
  fracao_1a_id uuid;
  fracao_1b_id uuid;
  fracao_2a_id uuid;
  fracao_2b_id uuid;
  admin_id uuid;
  pagamento_id uuid;
BEGIN
  INSERT INTO fracoes (nome_condomino, fracao, codigo, tipologia, quota_mensal, permilagem, email, telemovel, nif, data_entrada, ativa)
  VALUES 
    ('João Silva', '1ºA', 'A', 'T2', 110.00, 250.000, 'joao.silva@email.pt', '+351 912 345 678', '123456789', '2020-01-01', true),
    ('Maria Santos', '1ºB', 'B', 'T3', 130.00, 180.000, 'maria.santos@email.pt', '+351 923 456 789', '234567890', '2020-01-01', true),
    ('Carlos Ferreira', '2ºA', 'C', 'T2', 110.00, 250.000, 'carlos.ferreira@email.pt', '+351 934 567 890', '345678901', '2020-01-01', true),
    ('Ana Costa', '2ºB', 'D', 'T3', 130.00, 320.000, 'ana.costa@email.pt', '+351 945 678 901', '456789012', '2020-01-01', true)
  ON CONFLICT DO NOTHING;

  SELECT id INTO fracao_1a_id FROM fracoes WHERE fracao = '1ºA' LIMIT 1;
  SELECT id INTO fracao_1b_id FROM fracoes WHERE fracao = '1ºB' LIMIT 1;
  SELECT id INTO fracao_2a_id FROM fracoes WHERE fracao = '2ºA' LIMIT 1;
  SELECT id INTO fracao_2b_id FROM fracoes WHERE fracao = '2ºB' LIMIT 1;

  IF fracao_2a_id IS NOT NULL THEN
    INSERT INTO administradores (id_fracao, data_eleicao, inicio_isencao, fim_isencao)
    VALUES (fracao_2a_id, '2026-01-15', '2026-01-01', '2027-01-01')
    ON CONFLICT DO NOTHING;
  END IF;

  IF fracao_1a_id IS NOT NULL THEN
    INSERT INTO quotas_mensais (id_fracao, mes, valor_quota, total_pago, estado)
    VALUES 
      (fracao_1a_id, '2026-01-01', 110.00, 110.00, 'Pago'),
      (fracao_1a_id, '2026-02-01', 110.00, 110.00, 'Pago'),
      (fracao_1a_id, '2026-03-01', 110.00, 0.00, 'Pendente')
    ON CONFLICT (id_fracao, mes) DO NOTHING;
  END IF;

  IF fracao_1b_id IS NOT NULL THEN
    INSERT INTO quotas_mensais (id_fracao, mes, valor_quota, total_pago, estado)
    VALUES 
      (fracao_1b_id, '2026-01-01', 130.00, 130.00, 'Pago'),
      (fracao_1b_id, '2026-02-01', 130.00, 65.00, 'Parcial'),
      (fracao_1b_id, '2026-03-01', 130.00, 0.00, 'Pendente')
    ON CONFLICT (id_fracao, mes) DO NOTHING;
  END IF;

  IF fracao_2a_id IS NOT NULL THEN
    INSERT INTO quotas_mensais (id_fracao, mes, valor_quota, total_pago, estado)
    VALUES 
      (fracao_2a_id, '2026-01-01', 110.00, 0.00, 'Isento'),
      (fracao_2a_id, '2026-02-01', 110.00, 0.00, 'Isento'),
      (fracao_2a_id, '2026-03-01', 110.00, 0.00, 'Isento')
    ON CONFLICT (id_fracao, mes) DO NOTHING;
  END IF;

  IF fracao_2b_id IS NOT NULL THEN
    INSERT INTO quotas_mensais (id_fracao, mes, valor_quota, total_pago, estado)
    VALUES 
      (fracao_2b_id, '2026-01-01', 130.00, 130.00, 'Pago'),
      (fracao_2b_id, '2026-02-01', 130.00, 130.00, 'Pago'),
      (fracao_2b_id, '2026-03-01', 130.00, 130.00, 'Pago')
    ON CONFLICT (id_fracao, mes) DO NOTHING;
  END IF;

  IF fracao_1a_id IS NOT NULL THEN
    INSERT INTO pagamentos (id_fracao, data_pagamento, valor_total, n_meses, mes_inicio, tipo, metodo, nome_emissor)
    VALUES (fracao_1a_id, '2026-01-10', 220.00, 2, '2026-01-01', 'Múltiplos meses', 'Transferência', 'João Silva')
    RETURNING id INTO pagamento_id;
  END IF;

  IF fracao_1b_id IS NOT NULL THEN
    INSERT INTO pagamentos (id_fracao, data_pagamento, valor_total, n_meses, mes_inicio, tipo, metodo, nome_emissor)
    VALUES (fracao_1b_id, '2026-01-15', 195.00, 2, '2026-01-01', 'Parcial', 'MB Way', 'Maria Santos');
  END IF;

  IF fracao_2b_id IS NOT NULL THEN
    INSERT INTO pagamentos (id_fracao, data_pagamento, valor_total, n_meses, mes_inicio, tipo, metodo, nome_emissor)
    VALUES (fracao_2b_id, '2026-01-05', 390.00, 3, '2026-01-01', 'Múltiplos meses', 'Débito Direto', 'Ana Costa');
  END IF;

  INSERT INTO despesas (descricao, rubrica, valor, data_pagamento, metodo, mes, ano, tipo, fornecedor)
  VALUES 
    ('Consumo de água Janeiro', 'Água', 85.50, '2026-01-25', 'Débito Direto', '2026-01-01', 2026, 'Corrente', 'EPAL'),
    ('Eletricidade partes comuns', 'EDP', 125.30, '2026-01-20', 'Débito Direto', '2026-01-01', 2026, 'Corrente', 'EDP Comercial'),
    ('Serviço de limpeza mensal', 'Limpeza', 200.00, '2026-01-31', 'Transferência Bancária', '2026-01-01', 2026, 'Corrente', 'LimpaTudo Lda')
  ON CONFLICT DO NOTHING;

  INSERT INTO orcamento (ano, rubrica, tipo, valor_estimado, notas)
  VALUES 
    (2026, 'Água', 'Despesa Corrente', 1200.00, 'Estimativa baseada no ano anterior'),
    (2026, 'EDP', 'Despesa Corrente', 1800.00, 'Inclui iluminação exterior'),
    (2026, 'Limpeza', 'Despesa Corrente', 2400.00, 'Serviço mensal'),
    (2026, 'Elevadores', 'Despesa Corrente', 1500.00, 'Manutenção anual'),
    (2026, 'Comissões Bancárias', 'Despesa Corrente', 120.00, 'Taxas bancárias'),
    (2026, 'Reparação telhado', 'Despesa Extraordinária', 3500.00, 'Orçamento aprovado em assembleia')
  ON CONFLICT DO NOTHING;

END $$;
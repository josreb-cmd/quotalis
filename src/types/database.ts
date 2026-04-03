export interface Database {
  public: {
    Tables: {
      fracoes: {
        Row: Fracao;
        Insert: Omit<Fracao, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Fracao, 'id' | 'created_at' | 'updated_at'>>;
      };
      administradores: {
        Row: Administrador;
        Insert: Omit<Administrador, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Administrador, 'id' | 'created_at' | 'updated_at'>>;
      };
      quotas_mensais: {
        Row: QuotaMensal;
        Insert: Omit<QuotaMensal, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<QuotaMensal, 'id' | 'created_at' | 'updated_at'>>;
      };
      quotas_extraordinarias: {
        Row: QuotaExtraordinaria;
        Insert: Omit<QuotaExtraordinaria, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<QuotaExtraordinaria, 'id' | 'created_at' | 'updated_at'>>;
      };
      pagamentos: {
        Row: Pagamento;
        Insert: Omit<Pagamento, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Pagamento, 'id' | 'created_at' | 'updated_at'>>;
      };
      imputacoes: {
        Row: Imputacao;
        Insert: Omit<Imputacao, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Imputacao, 'id' | 'created_at' | 'updated_at'>>;
      };
      despesas: {
        Row: Despesa;
        Insert: Omit<Despesa, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Despesa, 'id' | 'created_at' | 'updated_at'>>;
      };
      orcamento: {
        Row: Orcamento;
        Insert: Omit<Orcamento, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Orcamento, 'id' | 'created_at' | 'updated_at'>>;
      };
      configuracoes: {
        Row: Configuracao;
        Insert: Omit<Configuracao, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Configuracao, 'id' | 'created_at' | 'updated_at'>>;
      };
      saldos_anuais: {
        Row: SaldoAnual;
        Insert: Omit<SaldoAnual, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<SaldoAnual, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}

export interface Fracao {
  id: string;
  nome_condomino: string;
  fracao: string;
  codigo: string | null;
  tipologia: string | null;
  quota_mensal: number;
  permilagem: number;
  email: string | null;
  telemovel: string | null;
  nif: string | null;
  data_entrada: string | null;
  ativa: boolean;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface Administrador {
  id: string;
  id_fracao: string;
  data_eleicao: string;
  inicio_isencao: string;
  fim_isencao: string;
  data_renuncia: string | null;
  id_substitui: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuotaMensal {
  id: string;
  id_fracao: string;
  mes: string;
  valor_quota: number;
  total_pago: number;
  estado: string;
  created_at: string;
  updated_at: string;
}

export interface QuotaExtraordinaria {
  id: string;
  descricao: string;
  valor_total: number;
  prazo: string;
  id_fracao: string;
  valor_por_fracao: number;
  total_pago: number;
  estado: string;
  created_at: string;
  updated_at: string;
}

export interface Pagamento {
  id: string;
  id_fracao: string | null;
  data_pagamento: string;
  valor_total: number;
  n_meses: number;
  mes_inicio: string | null;
  tipo: string;
  metodo: string;
  nome_emissor: string | null;
  notas: string | null;
  por_identificar: boolean;
  created_at: string;
  updated_at: string;
}

export interface Imputacao {
  id: string;
  id_pagamento: string;
  id_quota_mensal: string | null;
  id_quota_extraordinaria: string | null;
  valor_imputado: number;
  tipo_quota: string;
  credito_gerado: number;
  created_at: string;
  updated_at: string;
}

export interface Despesa {
  id: string;
  descricao: string;
  rubrica: string;
  valor: number;
  data_pagamento: string;
  metodo: string;
  mes: string;
  ano: number;
  tipo: string;
  fornecedor: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface Orcamento {
  id: string;
  ano: number;
  rubrica: string;
  tipo: string;
  valor_estimado: number;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface Configuracao {
  id: string;
  nome_condominio: string;
  nipc: string | null;
  morada: string | null;
  email_administrador: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaldoAnual {
  id: string;
  ano: number;
  saldo_caixa: number;
  saldo_conta_ordem: number;
  saldo_fundo_reserva: number;
  notas_balanco: string | null;
  created_at: string;
  updated_at: string;
}

export type EstadoQuota =
  | 'Isento'
  | 'Crédito'
  | 'Pago'
  | 'Atraso Parcial'
  | 'Atraso'
  | 'Parcial'
  | 'Pendente';

export type TipoPagamento = 'Normal' | 'Múltiplos meses' | 'Parcial' | 'Extraordinária';

export type MetodoPagamento =
  | 'Transferência'
  | 'MB Way'
  | 'Cheque'
  | 'Numerário'
  | 'Débito Direto';

export type Rubrica =
  | 'Água'
  | 'EDP'
  | 'Elevadores'
  | 'Limpeza'
  | 'Comissões Bancárias'
  | 'Correios'
  | 'Outras Correntes'
  | 'Extraordinária';

export type MetodoDespesa =
  | 'Débito Direto'
  | 'Transferência Bancária'
  | 'Dinheiro'
  | 'Cheque';

export type Tipologia =
  | 'T1'
  | 'T2'
  | 'T3'
  | 'T4'
  | 'Comercial'
  | 'Garagem'
  | 'Loja'
  | 'Escritório';

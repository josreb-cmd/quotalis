export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('pt-PT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function formatMonth(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-PT', {
    month: 'long',
    year: 'numeric',
  }).format(d);
}

export function formatMonthShort(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-PT', {
    month: 'short',
  }).format(d).replace('.', '');
}

export function getFirstDayOfMonth(date: Date = new Date()): string {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
}

export function addMonths(date: string | Date, months: number): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function parseCurrencyInput(value: string): number {
  const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function getEstadoBadgeClass(estado: string): string {
  switch (estado) {
    case 'Pago':
      return 'bg-green-100 text-green-800';
    case 'Pendente':
      return 'bg-blue-100 text-blue-800';
    case 'Atraso':
      return 'bg-red-100 text-red-800';
    case 'Parcial':
      return 'bg-yellow-100 text-yellow-800';
    case 'Atraso Parcial':
      return 'bg-orange-100 text-orange-800';
    case 'Crédito':
      return 'bg-purple-100 text-purple-800';
    case 'Isento':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function calculateEstado(
  valorQuota: number,
  totalPago: number,
  mes: string,
  isIsento: boolean
): string {
  if (isIsento) return 'Isento';
  if (totalPago > valorQuota) return 'Crédito';
  if (totalPago === valorQuota) return 'Pago';

  const today = new Date();
  const mesDate = new Date(mes);
  const day15 = new Date(mesDate.getFullYear(), mesDate.getMonth(), 15);

  if (totalPago > 0 && totalPago < valorQuota) {
    return today > day15 ? 'Atraso Parcial' : 'Parcial';
  }

  return today > day15 ? 'Atraso' : 'Pendente';
}

export function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const MONTHS_SHORT_PT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

export const RUBRICAS = [
  'Água',
  'EDP',
  'Elevadores',
  'Limpeza',
  'Comissões Bancárias',
  'Correios',
  'Outras Correntes',
  'Extraordinária'
];

export const METODOS_PAGAMENTO = [
  'Transferência',
  'MB Way',
  'Cheque',
  'Numerário',
  'Débito Direto'
];

export const METODOS_DESPESA = [
  'Débito Direto',
  'Transferência Bancária',
  'Dinheiro',
  'Cheque'
];

export const TIPOLOGIAS = [
  'T1', 'T2', 'T3', 'T4',
  'Comercial', 'Garagem', 'Loja', 'Escritório'
];

import { useEffect, useState } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatMonth, MONTHS_PT, calculateEstado } from '../lib/utils';
import Card, { CardHeader } from '../components/ui/Card';
import Loading from '../components/ui/Loading';
import Badge, { getEstadoBadgeVariant } from '../components/ui/Badge';
import { Table, TableHead, TableBody, TableRow, TableCell } from '../components/ui/Table';
import type { QuotaMensal, Fracao, Administrador } from '../types/database';

interface QuotaWithFracao extends QuotaMensal {
  fracao?: Fracao;
}

export default function QuotasMensais() {
  const [quotas, setQuotas] = useState<QuotaWithFracao[]>([]);
  const [fracoes, setFracoes] = useState<Fracao[]>([]);
  const [administradores, setAdministradores] = useState<Administrador[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  useEffect(() => {
    loadData();
  }, [selectedYear, selectedMonth]);

  async function loadData() {
    try {
      const mesDate = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0];

      const [quotasRes, fracoesRes, adminRes] = await Promise.all([
        supabase.from('quotas_mensais').select('*').eq('mes', mesDate),
        supabase.from('fracoes').select('*').eq('ativa', true),
        supabase.from('administradores').select('*').is('data_renuncia', null),
      ]);

      if (quotasRes.error) throw quotasRes.error;
      if (fracoesRes.error) throw fracoesRes.error;
      if (adminRes.error) throw adminRes.error;

      const fracoesData = fracoesRes.data || [];
      const adminData = adminRes.data || [];

      setFracoes(fracoesData);
      setAdministradores(adminData);

      const quotasWithFracao = (quotasRes.data || []).map(q => ({
        ...q,
        fracao: fracoesData.find(f => f.id === q.id_fracao),
      }));

      quotasWithFracao.forEach(q => {
        if (q.fracao) {
          const isIsento = adminData.some(a =>
            a.id_fracao === q.id_fracao &&
            new Date(a.inicio_isencao) <= new Date(q.mes) &&
            new Date(a.fim_isencao) >= new Date(q.mes)
          );
          const newEstado = calculateEstado(q.valor_quota, q.total_pago, q.mes, isIsento);
          if (newEstado !== q.estado) {
            supabase
              .from('quotas_mensais')
              .update({ estado: newEstado })
              .eq('id', q.id)
              .then();
            q.estado = newEstado;
          }
        }
      });

      setQuotas(quotasWithFracao);
    } catch (error) {
      console.error('Error loading quotas:', error);
      toast.error('Erro ao carregar quotas');
    } finally {
      setLoading(false);
    }
  }

  function goToPreviousMonth() {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  }

  function goToNextMonth() {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  }

  const filteredQuotas = quotas.filter(q => {
    const matchesSearch = !searchTerm ||
      q.fracao?.nome_condomino.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.fracao?.fracao.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstado = !estadoFilter || q.estado === estadoFilter;
    return matchesSearch && matchesEstado;
  });

  const totalValorQuota = filteredQuotas.reduce((acc, q) => acc + q.valor_quota, 0);
  const totalPago = filteredQuotas.reduce((acc, q) => acc + q.total_pago, 0);

  const estadoCounts = quotas.reduce((acc, q) => {
    acc[q.estado] = (acc[q.estado] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return <Loading message="A carregar quotas mensais..." />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quotas Mensais</h1>
          <p className="text-gray-500 mt-1">Gestão das quotas mensais por fração</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="px-4 py-2 font-medium min-w-[180px] text-center">
            {MONTHS_PT[selectedMonth]} {selectedYear}
          </span>
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        {['Pago', 'Pendente', 'Parcial', 'Atraso', 'Atraso Parcial', 'Isento', 'Crédito'].map(estado => (
          <button
            key={estado}
            onClick={() => setEstadoFilter(estadoFilter === estado ? '' : estado)}
            className={`p-3 rounded-lg border transition-colors ${
              estadoFilter === estado
                ? 'border-[#1e40af] bg-blue-50'
                : 'border-gray-200 bg-white hover:bg-gray-50'
            }`}
          >
            <div className="text-2xl font-bold text-gray-900">{estadoCounts[estado] || 0}</div>
            <div className="text-xs text-gray-500">{estado}</div>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Pesquisar fração ou condómino..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-72"
                />
              </div>
              {estadoFilter && (
                <button
                  onClick={() => setEstadoFilter('')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Limpar filtro
                </button>
              )}
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="text-gray-500">
                Por cobrar: <span className="font-semibold text-gray-900">{formatCurrency(totalValorQuota)}</span>
              </div>
              <div className="text-gray-500">
                Cobrado: <span className="font-semibold text-green-600">{formatCurrency(totalPago)}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell header>Fração</TableCell>
              <TableCell header>Condómino</TableCell>
              <TableCell header className="text-right">Valor Quota</TableCell>
              <TableCell header className="text-right">Total Pago</TableCell>
              <TableCell header className="text-right">Em Falta</TableCell>
              <TableCell header>Estado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredQuotas.map((quota) => (
              <TableRow key={quota.id}>
                <TableCell className="font-medium">{quota.fracao?.fracao || '-'}</TableCell>
                <TableCell>{quota.fracao?.nome_condomino || '-'}</TableCell>
                <TableCell className="text-right">{formatCurrency(quota.valor_quota)}</TableCell>
                <TableCell className="text-right">{formatCurrency(quota.total_pago)}</TableCell>
                <TableCell className="text-right">
                  {quota.total_pago >= quota.valor_quota
                    ? '-'
                    : formatCurrency(quota.valor_quota - quota.total_pago)}
                </TableCell>
                <TableCell>
                  <Badge variant={getEstadoBadgeVariant(quota.estado)}>{quota.estado}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {filteredQuotas.length === 0 && (
              <TableRow>
                <TableCell className="text-center text-gray-500 py-8" colSpan={6}>
                  {quotas.length === 0
                    ? 'Nenhuma quota registada para este mês. Use o botão "Gerar Quotas" no Dashboard.'
                    : 'Nenhuma quota encontrada com os filtros aplicados'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

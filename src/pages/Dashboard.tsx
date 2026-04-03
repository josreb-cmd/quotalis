import { useEffect, useState } from 'react';
import { Building2, AlertTriangle, TrendingUp, TrendingDown, Users, PieChart, Calendar, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatNumber, getFirstDayOfMonth, calculateEstado, MONTHS_PT } from '../lib/utils';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Loading from '../components/ui/Loading';
import type { Fracao, QuotaMensal, Administrador } from '../types/database';

interface DashboardStats {
  totalFracoesAtivas: number;
  quotasEmAtraso: { count: number; valor: number };
  cobradoEsteMes: number;
  porCobrarEsteMes: number;
  fracoesComCredito: number;
  permilagemTotal: number;
  mesesComQuotas: string[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    loadDashboardStats();
  }, []);

  async function loadDashboardStats() {
    try {
      const [fracoesRes, quotasRes, adminRes] = await Promise.all([
        supabase.from('fracoes').select('*').eq('ativa', true),
        supabase.from('quotas_mensais').select('*'),
        supabase.from('administradores').select('*').is('data_renuncia', null),
      ]);

      if (fracoesRes.error) throw fracoesRes.error;
      if (quotasRes.error) throw quotasRes.error;
      if (adminRes.error) throw adminRes.error;

      const fracoes = fracoesRes.data || [];
      const quotas = quotasRes.data || [];
      const administradores = adminRes.data || [];

      const currentMonth = getFirstDayOfMonth();
      const currentMonthQuotas = quotas.filter(q => q.mes === currentMonth);

      const quotasEmAtraso = quotas.filter(q =>
        q.estado === 'Atraso' || q.estado === 'Atraso Parcial'
      );

      const valorEmAtraso = quotasEmAtraso.reduce((acc, q) =>
        acc + (q.valor_quota - q.total_pago), 0
      );

      const cobradoEsteMes = currentMonthQuotas.reduce((acc, q) => acc + q.total_pago, 0);
      const porCobrarEsteMes = currentMonthQuotas.reduce((acc, q) => {
        if (q.estado === 'Isento' || q.estado === 'Pago' || q.estado === 'Crédito') return acc;
        return acc + (q.valor_quota - q.total_pago);
      }, 0);

      const fracoesComCredito = quotas.filter(q => q.estado === 'Credito').length;
      const permilagemTotal = fracoes.reduce((acc, f) => acc + Number(f.permilagem), 0);

      const mesesComQuotasSet = new Set<string>();
      quotas.forEach(q => {
        if (q.mes) {
          const dateStr = q.mes.split('T')[0];
          const [year, month] = dateStr.split('-');
          const mesKey = `${year}-${month}`;
          mesesComQuotasSet.add(mesKey);
        }
      });
      const mesesComQuotas = Array.from(mesesComQuotasSet).sort();

      setStats({
        totalFracoesAtivas: fracoes.length,
        quotasEmAtraso: { count: quotasEmAtraso.length, valor: valorEmAtraso },
        cobradoEsteMes,
        porCobrarEsteMes,
        fracoesComCredito,
        permilagemTotal,
        mesesComQuotas,
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  }

  async function handleGerarQuotas() {
    setGenerating(true);
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const mesDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const mesLabel = `${MONTHS_PT[month - 1]} ${year}`;

      const { data: fracoes, error: fracoesError } = await supabase
        .from('fracoes')
        .select('*')
        .eq('ativa', true);

      if (fracoesError) throw fracoesError;

      const { data: existingQuotas, error: quotasError } = await supabase
        .from('quotas_mensais')
        .select('id_fracao')
        .eq('mes', mesDate);

      if (quotasError) throw quotasError;

      const existingFracaoIds = new Set(existingQuotas?.map(q => q.id_fracao) || []);
      const existingCount = existingQuotas?.length || 0;

      if (existingCount > 0 && existingCount >= (fracoes?.length || 0)) {
        toast.error(`As quotas de ${mesLabel} já foram geradas para ${existingCount} fracções.`);
        return;
      }

      const { data: administradores, error: adminError } = await supabase
        .from('administradores')
        .select('*')
        .is('data_renuncia', null)
        .lte('inicio_isencao', mesDate)
        .gte('fim_isencao', mesDate);

      if (adminError) throw adminError;

      const adminFracaoIds = new Set(administradores?.map(a => a.id_fracao) || []);

      const newQuotas = fracoes
        ?.filter(f => !existingFracaoIds.has(f.id))
        .map(f => ({
          id_fracao: f.id,
          mes: mesDate,
          valor_quota: f.quota_mensal,
          total_pago: 0,
          estado: adminFracaoIds.has(f.id) ? 'Isento' : 'Pendente',
        })) || [];

      if (newQuotas.length === 0) {
        toast.error(`As quotas de ${mesLabel} já foram geradas para ${existingCount} fracções.`);
        return;
      }

      const { error: insertError } = await supabase
        .from('quotas_mensais')
        .insert(newQuotas);

      if (insertError) throw insertError;

      toast.success(`${newQuotas.length} quotas geradas com sucesso`);
      loadDashboardStats();
    } catch (error) {
      console.error('Error generating quotas:', error);
      toast.error('Erro ao gerar quotas');
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return <Loading message="A carregar dashboard..." />;
  }

  const currentYear = new Date().getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: `${currentYear}-${String(i + 1).padStart(2, '0')}`,
    label: `${MONTHS_PT[i]} ${currentYear}`,
  }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Visão geral do condomínio</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Fracções Activas</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {stats?.totalFracoesAtivas || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-[#1e40af]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Quotas em Atraso</p>
                <p className="text-3xl font-bold text-red-600 mt-1">
                  {stats?.quotasEmAtraso.count || 0}
                </p>
                <p className="text-sm text-red-500 mt-1">
                  {formatCurrency(stats?.quotasEmAtraso.valor || 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Cobrado Este Mês</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {formatCurrency(stats?.cobradoEsteMes || 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Por Cobrar Este Mês</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">
                  {formatCurrency(stats?.porCobrarEsteMes || 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Fracções com Crédito</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">
                  {stats?.fracoesComCredito || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Permilagem Total</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-3xl font-bold text-gray-900">
                    {formatNumber(stats?.permilagemTotal || 0, 3)}
                  </p>
                  {stats?.permilagemTotal !== 1000 && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                      Divergente - {formatNumber(stats?.permilagemTotal || 0, 3)}
                    </span>
                  )}
                </div>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <PieChart className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#1e40af] rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Gerar Quotas do Mês</h3>
                <p className="text-sm text-gray-500">
                  Criar quotas mensais para todas as fracções activas
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <Button onClick={handleGerarQuotas} loading={generating}>
                Gerar Quotas
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Quotas Geradas</h3>
              <p className="text-sm text-gray-500">
                Meses para os quais já foram geradas quotas
              </p>
            </div>
          </div>
          {stats?.mesesComQuotas && stats.mesesComQuotas.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {stats.mesesComQuotas.map((mesKey) => {
                const [year, month] = mesKey.split('-');
                const monthIndex = parseInt(month, 10) - 1;
                const monthName = MONTHS_PT[monthIndex];
                return (
                  <span
                    key={mesKey}
                    className="px-3 py-1.5 bg-green-50 text-green-700 text-sm font-medium rounded-lg border border-green-200"
                  >
                    {monthName} {year}
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Nenhuma quota gerada ainda.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

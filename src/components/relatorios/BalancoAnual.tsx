import { useEffect, useState } from 'react';
import { FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate } from '../../lib/utils';
import Card, { CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Loading from '../ui/Loading';
import type { Despesa, QuotaMensal, QuotaExtraordinaria, SaldoAnual, Configuracao } from '../../types/database';

interface BalancoAnualProps {
  year: number;
}

interface DespesaAgrupada {
  rubrica: string;
  valor: number;
  metodo: string;
}

export default function BalancoAnual({ year }: BalancoAnualProps) {
  const [loading, setLoading] = useState(true);
  const [quotasCobradas, setQuotasCobradas] = useState(0);
  const [quotasExtraCobradas, setQuotasExtraCobradas] = useState(0);
  const [despesasCorrentes, setDespesasCorrentes] = useState<DespesaAgrupada[]>([]);
  const [despesasExtraordinarias, setDespesasExtraordinarias] = useState<Despesa[]>([]);
  const [saldoInicial, setSaldoInicial] = useState<SaldoAnual | null>(null);
  const [config, setConfig] = useState<Configuracao | null>(null);

  useEffect(() => {
    loadData();
  }, [year]);

  async function loadData() {
    setLoading(true);
    try {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      const [quotasRes, quotasExtraRes, despesasRes, saldoRes, configRes] = await Promise.all([
        supabase.from('quotas_mensais')
          .select('total_pago')
          .gte('mes', startDate)
          .lte('mes', endDate),
        supabase.from('quotas_extraordinarias')
          .select('total_pago')
          .gte('prazo', startDate)
          .lte('prazo', endDate),
        supabase.from('despesas')
          .select('*')
          .eq('ano', year),
        supabase.from('saldos_anuais')
          .select('*')
          .eq('ano', year)
          .maybeSingle(),
        supabase.from('configuracoes')
          .select('*')
          .maybeSingle(),
      ]);

      if (quotasRes.error) throw quotasRes.error;
      if (quotasExtraRes.error) throw quotasExtraRes.error;
      if (despesasRes.error) throw despesasRes.error;

      const totalQuotas = (quotasRes.data || []).reduce((acc, q) => acc + q.total_pago, 0);
      const totalQuotasExtra = (quotasExtraRes.data || []).reduce((acc, q) => acc + q.total_pago, 0);

      setQuotasCobradas(totalQuotas);
      setQuotasExtraCobradas(totalQuotasExtra);

      const despesasData = despesasRes.data || [];
      const correntes = despesasData.filter(d => d.tipo === 'Corrente');
      const extraordinarias = despesasData.filter(d => d.tipo === 'Extraordinária');

      const agrupadas = correntes.reduce((acc, d) => {
        const existing = acc.find(a => a.rubrica === d.rubrica);
        if (existing) {
          existing.valor += d.valor;
        } else {
          acc.push({ rubrica: d.rubrica, valor: d.valor, metodo: d.metodo });
        }
        return acc;
      }, [] as DespesaAgrupada[]);

      setDespesasCorrentes(agrupadas);
      setDespesasExtraordinarias(extraordinarias);
      setSaldoInicial(saldoRes.data);
      setConfig(configRes.data);
    } catch (error) {
      console.error('Error loading balanco data:', error);
      toast.error('Erro ao carregar dados do balanço');
    } finally {
      setLoading(false);
    }
  }

  function exportPDF() {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(config?.nome_condominio || 'Condomínio', pageWidth / 2, y, { align: 'center' });
    y += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`NIPC: ${config?.nipc || '-'}`, pageWidth / 2, y, { align: 'center' });
    y += 12;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Balanço Anual ${year}`, pageWidth / 2, y, { align: 'center' });
    y += 15;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('RECEITAS', 20, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Quotas cobradas', 25, y);
    doc.text(formatCurrency(quotasCobradas), pageWidth - 25, y, { align: 'right' });
    y += 6;
    doc.text('Quota extra cobrada', 25, y);
    doc.text(formatCurrency(quotasExtraCobradas), pageWidth - 25, y, { align: 'right' });
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Total Receita', 25, y);
    doc.text(formatCurrency(quotasCobradas + quotasExtraCobradas), pageWidth - 25, y, { align: 'right' });
    y += 15;

    doc.setFontSize(11);
    doc.text('DESPESAS CORRENTES', 20, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    despesasCorrentes.forEach(d => {
      doc.text(d.rubrica, 25, y);
      doc.text(formatCurrency(d.valor), pageWidth - 25, y, { align: 'right' });
      y += 6;
    });

    const totalCorrentes = despesasCorrentes.reduce((acc, d) => acc + d.valor, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('Total Despesas Correntes', 25, y);
    doc.text(formatCurrency(totalCorrentes), pageWidth - 25, y, { align: 'right' });
    y += 15;

    if (despesasExtraordinarias.length > 0) {
      doc.setFontSize(11);
      doc.text('DESPESAS EXTRAORDINÁRIAS', 20, y);
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      despesasExtraordinarias.forEach(d => {
        doc.text(d.descricao, 25, y);
        doc.text(formatCurrency(d.valor), pageWidth - 25, y, { align: 'right' });
        y += 6;
      });

      const totalExtra = despesasExtraordinarias.reduce((acc, d) => acc + d.valor, 0);
      doc.setFont('helvetica', 'bold');
      doc.text('Total Despesas Extraordinárias', 25, y);
      doc.text(formatCurrency(totalExtra), pageWidth - 25, y, { align: 'right' });
      y += 15;
    }

    const totalReceita = quotasCobradas + quotasExtraCobradas;
    const totalDespesa = despesasCorrentes.reduce((acc, d) => acc + d.valor, 0) +
      despesasExtraordinarias.reduce((acc, d) => acc + d.valor, 0);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMO', 20, y);
    y += 8;

    doc.setFontSize(10);
    doc.text('Total Receita', 25, y);
    doc.text(formatCurrency(totalReceita), pageWidth - 25, y, { align: 'right' });
    y += 6;
    doc.text('Total Despesa', 25, y);
    doc.text(formatCurrency(totalDespesa), pageWidth - 25, y, { align: 'right' });
    y += 6;
    const resultado = totalReceita - totalDespesa;
    doc.text('Resultado do Exercício', 25, y);
    doc.text(formatCurrency(resultado), pageWidth - 25, y, { align: 'right' });
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.text('Resultado sem Quota Extra', 25, y);
    doc.text(formatCurrency(quotasCobradas - despesasCorrentes.reduce((acc, d) => acc + d.valor, 0)), pageWidth - 25, y, { align: 'right' });

    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.text(`Gerado em ${formatDate(new Date())}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
    doc.text('Página 1', pageWidth / 2, pageHeight - 10, { align: 'center' });

    doc.save(`balanco-anual-${year}.pdf`);
    toast.success('PDF exportado com sucesso');
  }

  if (loading) {
    return <Loading message="A carregar balanço..." />;
  }

  const totalReceita = quotasCobradas + quotasExtraCobradas;
  const totalDespesasCorrentes = despesasCorrentes.reduce((acc, d) => acc + d.valor, 0);
  const totalDespesasExtra = despesasExtraordinarias.reduce((acc, d) => acc + d.valor, 0);
  const totalDespesa = totalDespesasCorrentes + totalDespesasExtra;
  const resultado = totalReceita - totalDespesa;
  const saldoInicialTotal = saldoInicial
    ? saldoInicial.saldo_caixa + saldoInicial.saldo_conta_ordem + saldoInicial.saldo_fundo_reserva
    : 0;
  const saldoFinal = saldoInicialTotal + resultado;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={exportPDF}>
          <FileDown className="w-4 h-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardContent>
            <h3 className="text-lg font-semibold mb-4 text-green-700">RECEITAS</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Quotas cobradas</span>
                <span className="font-medium">{formatCurrency(quotasCobradas)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Quota extra cobrada</span>
                <span className="font-medium">{formatCurrency(quotasExtraCobradas)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-gray-200">
                <span className="font-semibold">Total Receita</span>
                <span className="font-bold text-green-600">{formatCurrency(totalReceita)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 className="text-lg font-semibold mb-4 text-red-700">DESPESAS CORRENTES</h3>
            <div className="space-y-3">
              {despesasCorrentes.map((d, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-gray-600">{d.rubrica}</span>
                  <span className="font-medium">{formatCurrency(d.valor)}</span>
                </div>
              ))}
              {despesasCorrentes.length === 0 && (
                <p className="text-gray-400 text-sm">Sem despesas registadas</p>
              )}
              <div className="flex justify-between pt-3 border-t border-gray-200">
                <span className="font-semibold">Total Despesas Correntes</span>
                <span className="font-bold text-red-600">{formatCurrency(totalDespesasCorrentes)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {despesasExtraordinarias.length > 0 && (
        <Card>
          <CardContent>
            <h3 className="text-lg font-semibold mb-4 text-orange-700">DESPESAS EXTRAORDINÁRIAS</h3>
            <div className="space-y-3">
              {despesasExtraordinarias.map((d) => (
                <div key={d.id} className="flex justify-between">
                  <span className="text-gray-600">{d.descricao}</span>
                  <span className="font-medium">{formatCurrency(d.valor)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-3 border-t border-gray-200">
                <span className="font-semibold">Total Despesas Extraordinárias</span>
                <span className="font-bold text-orange-600">{formatCurrency(totalDespesasExtra)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <h3 className="text-lg font-semibold mb-4">RESUMO DO EXERCÍCIO</h3>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Receita</span>
                <span className="font-medium text-green-600">{formatCurrency(totalReceita)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Despesa</span>
                <span className="font-medium text-red-600">{formatCurrency(totalDespesa)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-gray-200">
                <span className="font-semibold">Resultado do Exercício</span>
                <span className={`font-bold ${resultado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(resultado)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Resultado sem Quota Extra</span>
                <span className="text-gray-600">
                  {formatCurrency(quotasCobradas - totalDespesasCorrentes)}
                </span>
              </div>
            </div>

            <div className="space-y-3 border-l pl-8">
              <h4 className="font-medium text-gray-700">Saldos</h4>
              <div className="flex justify-between">
                <span className="text-gray-600">Saldo inicial (01/01/{year})</span>
                <span className="font-medium">{formatCurrency(saldoInicialTotal)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-gray-200">
                <span className="font-semibold">Saldo final (31/12/{year})</span>
                <span className={`font-bold ${saldoFinal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(saldoFinal)}
                </span>
              </div>
              {saldoInicial && (
                <div className="text-xs text-gray-500 pt-2 space-y-1">
                  <div className="flex justify-between">
                    <span>Caixa</span>
                    <span>{formatCurrency(saldoInicial.saldo_caixa)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Conta à Ordem</span>
                    <span>{formatCurrency(saldoInicial.saldo_conta_ordem)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fundo Comum de Reserva</span>
                    <span>{formatCurrency(saldoInicial.saldo_fundo_reserva)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

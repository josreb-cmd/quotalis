import { useEffect, useState } from 'react';
import { FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatNumber, MONTHS_SHORT_PT } from '../../lib/utils';
import Button from '../ui/Button';
import Loading from '../ui/Loading';
import type { Fracao, QuotaMensal, QuotaExtraordinaria, Pagamento, Configuracao, Administrador } from '../../types/database';

interface MapaCobrancasProps {
  year: number;
}

interface FracaoRow {
  fracao: Fracao;
  cotaMensal: number;
  cotaExtraAnual: number;
  saldoInicial: number;
  pagamentosMensais: number[];
  mesesIsentos: boolean[];
  saldoFinal: number;
  mesesDivida: number;
  cotaExtraPaga: number;
  cotaExtraDivida: number;
}

export default function MapaCobrancas({ year }: MapaCobrancasProps) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<FracaoRow[]>([]);
  const [unidentifiedPayments, setUnidentifiedPayments] = useState<Pagamento[]>([]);
  const [config, setConfig] = useState<Configuracao | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadData();
  }, [year]);

  function isMonthExempt(administradores: Administrador[], fracaoId: string, year: number, monthIndex: number): boolean {
    const monthYYYYMM = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

    return administradores.some(admin => {
      if (admin.id_fracao !== fracaoId) return false;

      const inicioYYYYMM = admin.inicio_isencao.substring(0, 7);
      const fimYYYYMM = admin.fim_isencao.substring(0, 7);

      if (admin.data_renuncia) {
        const renunciaYYYYMM = admin.data_renuncia.substring(0, 7);
        if (monthYYYYMM > renunciaYYYYMM) return false;
      }

      return monthYYYYMM >= inicioYYYYMM && monthYYYYMM <= fimYYYYMM;
    });
  }

  async function loadData() {
    setLoading(true);
    try {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      const [fracoesRes, quotasRes, quotasExtraRes, pagamentosRes, configRes, adminRes] = await Promise.all([
        supabase.from('fracoes').select('*').eq('ativa', true).order('fracao'),
        supabase.from('quotas_mensais').select('*').gte('mes', startDate).lte('mes', endDate),
        supabase.from('quotas_extraordinarias').select('*').gte('prazo', startDate).lte('prazo', endDate),
        supabase.from('pagamentos').select('*').gte('data_pagamento', startDate).lte('data_pagamento', endDate),
        supabase.from('configuracoes').select('*').maybeSingle(),
        supabase.from('administradores').select('*'),
      ]);

      if (fracoesRes.error) throw fracoesRes.error;
      if (quotasRes.error) throw quotasRes.error;
      if (quotasExtraRes.error) throw quotasExtraRes.error;
      if (pagamentosRes.error) throw pagamentosRes.error;

      const fracoes = fracoesRes.data || [];
      const quotas = quotasRes.data || [];
      const quotasExtra = quotasExtraRes.data || [];
      const pagamentos = pagamentosRes.data || [];
      const administradores = adminRes.data || [];

      setConfig(configRes.data);
      setUnidentifiedPayments(pagamentos.filter(p => p.por_identificar));

      const rowsData: FracaoRow[] = fracoes.map(fracao => {
        const fracaoQuotas = quotas.filter(q => q.id_fracao === fracao.id);
        const fracaoQuotasExtra = quotasExtra.filter(q => q.id_fracao === fracao.id);

        const pagamentosMensais = Array(12).fill(0);
        const mesesIsentos = Array(12).fill(false);

        for (let m = 0; m < 12; m++) {
          mesesIsentos[m] = isMonthExempt(administradores, fracao.id, year, m);
        }

        fracaoQuotas.forEach(q => {
          const dateParts = q.mes.split('-');
          const monthIndex = parseInt(dateParts[1], 10) - 1;
          pagamentosMensais[monthIndex] = q.total_pago;
        });

        let totalQuotasDevidas = 0;
        let totalPago = 0;

        for (let m = 0; m < 12; m++) {
          if (mesesIsentos[m]) continue;

          const mesStr = `${year}-${String(m + 1).padStart(2, '0')}-01`;
          const quotaDoMes = fracaoQuotas.find(q => q.mes?.split('T')[0] === mesStr);

          if (quotaDoMes) {
            totalQuotasDevidas += quotaDoMes.valor_quota;
            totalPago += quotaDoMes.total_pago;
          }
        }

        const saldoFinal = totalPago - totalQuotasDevidas;
        const mesesDivida = saldoFinal < 0 && fracao.quota_mensal > 0 ? saldoFinal / fracao.quota_mensal : 0;

        const cotaExtraPaga = fracaoQuotasExtra.reduce((acc, q) => acc + q.total_pago, 0);
        const cotaExtraDevida = fracaoQuotasExtra.reduce((acc, q) => acc + q.valor_por_fracao, 0);

        return {
          fracao,
          cotaMensal: fracao.quota_mensal,
          cotaExtraAnual: cotaExtraDevida,
          saldoInicial: 0,
          pagamentosMensais,
          mesesIsentos,
          saldoFinal,
          mesesDivida,
          cotaExtraPaga,
          cotaExtraDivida: cotaExtraDevida - cotaExtraPaga,
        };
      });

      setRows(rowsData);
    } catch (error) {
      console.error('Error loading mapa cobrancas:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }

  function getCellColor(value: number, expected: number, isIsento: boolean): string {
    if (isIsento) return 'bg-gray-200';
    if (value >= expected) return 'bg-green-100';
    if (value > 0) return 'bg-yellow-100';
    if (expected > 0) return 'bg-red-100';
    return 'bg-white';
  }

  function exportPDF() {
    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 15;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(config?.nome_condominio || 'Condomínio', pageWidth / 2, y, { align: 'center' });
    y += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`NIPC: ${config?.nipc || '-'}`, pageWidth / 2, y, { align: 'center' });
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Mapa de Cobranças por Fração - ${year}`, pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');

    const colWidths = [35, 12, 18, 18, 18, ...Array(12).fill(14), 18, 15, 18, 18];
    let x = 10;

    ['Descrição', 'Cód.', 'Quota', 'Extra', 'Saldo', ...MONTHS_SHORT_PT, 'Saldo', 'Meses', 'Extra Pg.', 'Extra Div.'].forEach((header, i) => {
      doc.text(header, x + 1, y);
      x += colWidths[i];
    });

    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);

    rows.slice(0, 15).forEach(row => {
      x = 10;
      doc.text(row.fracao.fracao.substring(0, 20), x + 1, y);
      x += colWidths[0];
      doc.text(row.fracao.codigo || '-', x + 1, y);
      x += colWidths[1];
      doc.text(formatCurrency(row.cotaMensal).replace('€', ''), x + 1, y);
      x += colWidths[2];
      doc.text(formatCurrency(row.cotaExtraAnual).replace('€', ''), x + 1, y);
      x += colWidths[3];
      doc.text(formatCurrency(row.saldoInicial).replace('€', ''), x + 1, y);
      x += colWidths[4];

      row.pagamentosMensais.forEach((val, i) => {
        doc.text(val > 0 ? formatCurrency(val).replace('€', '') : '-', x + 1, y);
        x += colWidths[5 + i];
      });

      const saldoColor = row.saldoFinal < 0 ? [255, 0, 0] : [0, 128, 0];
      doc.setTextColor(...saldoColor);
      doc.text(formatCurrency(row.saldoFinal).replace('€', ''), x + 1, y);
      doc.setTextColor(0, 0, 0);
      x += colWidths[17];

      doc.text(formatNumber(row.mesesDivida, 1), x + 1, y);
      x += colWidths[18];
      doc.text(formatCurrency(row.cotaExtraPaga).replace('€', ''), x + 1, y);
      x += colWidths[19];
      doc.text(formatCurrency(row.cotaExtraDivida).replace('€', ''), x + 1, y);

      y += 4;
    });

    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.text(`Gerado em ${new Date().toLocaleDateString('pt-PT')}`, pageWidth - 15, pageHeight - 8, { align: 'right' });
    doc.text('Página 1', pageWidth / 2, pageHeight - 8, { align: 'center' });

    doc.save(`mapa-cobrancas-${year}.pdf`);
    toast.success('PDF exportado com sucesso');
  }

  if (loading) {
    return <Loading message="A carregar mapa de cobranças..." />;
  }

  const totals = {
    cotaMensal: rows.reduce((acc, r) => acc + r.cotaMensal, 0),
    cotaExtraAnual: rows.reduce((acc, r) => acc + r.cotaExtraAnual, 0),
    saldoInicial: rows.reduce((acc, r) => acc + r.saldoInicial, 0),
    pagamentosMensais: Array(12).fill(0).map((_, i) => rows.reduce((acc, r) => acc + r.pagamentosMensais[i], 0)),
    saldoFinal: rows.reduce((acc, r) => acc + r.saldoFinal, 0),
    cotaExtraPaga: rows.reduce((acc, r) => acc + r.cotaExtraPaga, 0),
    cotaExtraDivida: rows.reduce((acc, r) => acc + r.cotaExtraDivida, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={exportPDF}>
          <FileDown className="w-4 h-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="sticky left-0 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-600 border-r z-20">Descrição</th>
                <th className="sticky left-[150px] bg-gray-50 px-2 py-2 text-left font-semibold text-gray-600 border-r z-20">Cód.</th>
                <th className="sticky left-[190px] bg-gray-50 px-2 py-2 text-right font-semibold text-gray-600 border-r z-20">Quota</th>
                <th className="px-2 py-2 text-right font-semibold text-gray-600">Extra</th>
                <th className="px-2 py-2 text-right font-semibold text-gray-600">Saldo 01/01</th>
                {MONTHS_SHORT_PT.map((m, i) => (
                  <th key={i} className="px-2 py-2 text-right font-semibold text-gray-600 min-w-[60px]">{m}</th>
                ))}
                <th className="px-2 py-2 text-right font-semibold text-gray-600">Saldo 31/12</th>
                <th className="px-2 py-2 text-right font-semibold text-gray-600">Meses</th>
                <th className="px-2 py-2 text-right font-semibold text-gray-600">Extra Pg.</th>
                <th className="px-2 py-2 text-right font-semibold text-gray-600">Extra Div.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row.fracao.id} className="hover:bg-gray-50">
                  <td className="sticky left-0 bg-white px-3 py-2 font-medium border-r whitespace-nowrap">
                    {row.fracao.fracao} - {row.fracao.nome_condomino}
                  </td>
                  <td className="sticky left-[150px] bg-white px-2 py-2 border-r">{row.fracao.codigo || '-'}</td>
                  <td className="sticky left-[190px] bg-white px-2 py-2 text-right border-r">{formatCurrency(row.cotaMensal)}</td>
                  <td className="px-2 py-2 text-right">{formatCurrency(row.cotaExtraAnual)}</td>
                  <td className="px-2 py-2 text-right">{formatCurrency(row.saldoInicial)}</td>
                  {row.pagamentosMensais.map((val, i) => (
                    <td
                      key={i}
                      className={`px-2 py-2 text-right ${getCellColor(val, row.cotaMensal, row.mesesIsentos[i])}`}
                    >
                      {row.mesesIsentos[i] ? (
                        <span className="text-gray-500 italic">Isento</span>
                      ) : (
                        val > 0 ? formatCurrency(val) : '-'
                      )}
                    </td>
                  ))}
                  <td className={`px-2 py-2 text-right font-medium ${row.saldoFinal < 0 ? 'text-red-600 font-bold' : 'text-green-600'}`}>
                    {formatCurrency(row.saldoFinal)}
                  </td>
                  <td className={`px-2 py-2 text-right ${row.mesesDivida < 0 ? 'text-red-600 font-bold' : ''}`}>
                    {formatNumber(row.mesesDivida, 1)}
                  </td>
                  <td className="px-2 py-2 text-right">{formatCurrency(row.cotaExtraPaga)}</td>
                  <td className={`px-2 py-2 text-right ${row.cotaExtraDivida > 0 ? 'text-red-600 font-bold' : ''}`}>
                    {formatCurrency(row.cotaExtraDivida)}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-100 font-semibold">
                <td className="sticky left-0 bg-gray-100 px-3 py-2 border-r">TOTAIS</td>
                <td className="sticky left-[150px] bg-gray-100 px-2 py-2 border-r"></td>
                <td className="sticky left-[190px] bg-gray-100 px-2 py-2 text-right border-r">{formatCurrency(totals.cotaMensal)}</td>
                <td className="px-2 py-2 text-right">{formatCurrency(totals.cotaExtraAnual)}</td>
                <td className="px-2 py-2 text-right">{formatCurrency(totals.saldoInicial)}</td>
                {totals.pagamentosMensais.map((val, i) => (
                  <td key={i} className="px-2 py-2 text-right">{formatCurrency(val)}</td>
                ))}
                <td className={`px-2 py-2 text-right ${totals.saldoFinal < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(totals.saldoFinal)}
                </td>
                <td className="px-2 py-2 text-right"></td>
                <td className="px-2 py-2 text-right">{formatCurrency(totals.cotaExtraPaga)}</td>
                <td className="px-2 py-2 text-right">{formatCurrency(totals.cotaExtraDivida)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {unidentifiedPayments.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-800 mb-3">Pagamentos por Identificar</h4>
          <div className="space-y-2">
            {unidentifiedPayments.map(p => (
              <div key={p.id} className="flex justify-between text-sm">
                <span className="text-yellow-700">{p.nome_emissor || 'Sem identificação'}</span>
                <span className="font-medium text-yellow-800">{formatCurrency(p.valor_total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notas do Ano {year}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Adicionar notas ou observações..."
        />
      </div>

      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
          <span>Pago</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
          <span>Parcial</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
          <span>Em atraso</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 border border-gray-400 rounded"></div>
          <span>Isento</span>
        </div>
      </div>
    </div>
  );
}

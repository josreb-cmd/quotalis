import { useEffect, useState } from 'react';
import { FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { formatCurrency, MONTHS_SHORT_PT, RUBRICAS } from '../../lib/utils';
import Button from '../ui/Button';
import Loading from '../ui/Loading';
import type { Despesa, Configuracao } from '../../types/database';

interface MapaDespesasProps {
  year: number;
}

interface DespesaRow {
  rubrica: string;
  descricao: string;
  fornecedor: string;
  valores: number[];
  total: number;
}

export default function MapaDespesas({ year }: MapaDespesasProps) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DespesaRow[]>([]);
  const [config, setConfig] = useState<Configuracao | null>(null);

  useEffect(() => {
    loadData();
  }, [year]);

  async function loadData() {
    setLoading(true);
    try {
      const [despesasRes, configRes] = await Promise.all([
        supabase.from('despesas').select('*').eq('ano', year).order('rubrica').order('data_pagamento'),
        supabase.from('configuracoes').select('*').maybeSingle(),
      ]);

      if (despesasRes.error) throw despesasRes.error;

      const despesas = despesasRes.data || [];
      setConfig(configRes.data);

      const rowsMap = new Map<string, DespesaRow>();

      despesas.forEach(d => {
        const key = `${d.rubrica}|${d.descricao}|${d.fornecedor || ''}`;
        if (!rowsMap.has(key)) {
          rowsMap.set(key, {
            rubrica: d.rubrica,
            descricao: d.descricao,
            fornecedor: d.fornecedor || '',
            valores: Array(12).fill(0),
            total: 0,
          });
        }
        const row = rowsMap.get(key)!;
        const monthIndex = new Date(d.mes).getMonth();
        row.valores[monthIndex] += d.valor;
        row.total += d.valor;
      });

      const sortedRows = Array.from(rowsMap.values()).sort((a, b) => {
        const rubricaOrder = RUBRICAS.indexOf(a.rubrica) - RUBRICAS.indexOf(b.rubrica);
        if (rubricaOrder !== 0) return rubricaOrder;
        return a.descricao.localeCompare(b.descricao);
      });

      setRows(sortedRows);
    } catch (error) {
      console.error('Error loading mapa despesas:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
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
    doc.text(`Mapa de Despesas Mensais - ${year}`, pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');

    const colWidths = [30, 50, ...Array(12).fill(15), 20];
    let x = 10;

    ['Rubrica', 'Descrição/Fornecedor', ...MONTHS_SHORT_PT, 'Total'].forEach((header, i) => {
      doc.text(header, x + 1, y);
      x += colWidths[i];
    });

    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);

    let currentRubrica = '';
    rows.slice(0, 20).forEach(row => {
      if (row.rubrica !== currentRubrica) {
        currentRubrica = row.rubrica;
        doc.setFont('helvetica', 'bold');
        doc.text(row.rubrica, 11, y);
        doc.setFont('helvetica', 'normal');
        y += 4;
      }

      x = 10;
      x += colWidths[0];
      doc.text(`${row.descricao}${row.fornecedor ? ` - ${row.fornecedor}` : ''}`.substring(0, 35), x + 1, y);
      x += colWidths[1];

      row.valores.forEach((val, i) => {
        if (val > 0) doc.text(formatCurrency(val).replace('€', ''), x + 1, y);
        x += colWidths[2 + i];
      });

      doc.text(formatCurrency(row.total).replace('€', ''), x + 1, y);
      y += 4;
    });

    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.text(`Gerado em ${new Date().toLocaleDateString('pt-PT')}`, pageWidth - 15, pageHeight - 8, { align: 'right' });

    doc.save(`mapa-despesas-${year}.pdf`);
    toast.success('PDF exportado com sucesso');
  }

  if (loading) {
    return <Loading message="A carregar mapa de despesas..." />;
  }

  const totals = Array(12).fill(0);
  rows.forEach(row => {
    row.valores.forEach((val, i) => {
      totals[i] += val;
    });
  });
  const grandTotal = totals.reduce((acc, val) => acc + val, 0);

  const groupedByRubrica = RUBRICAS.map(rubrica => ({
    rubrica,
    rows: rows.filter(r => r.rubrica === rubrica),
    subtotal: rows.filter(r => r.rubrica === rubrica).reduce((acc, r) => acc + r.total, 0),
  })).filter(g => g.rows.length > 0);

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
                <th className="sticky left-0 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-600 border-r z-20 min-w-[120px]">Rubrica</th>
                <th className="sticky left-[120px] bg-gray-50 px-3 py-2 text-left font-semibold text-gray-600 border-r z-20 min-w-[200px]">Descrição/Fornecedor</th>
                {MONTHS_SHORT_PT.map((m, i) => (
                  <th key={i} className="px-2 py-2 text-right font-semibold text-gray-600 min-w-[70px]">{m}</th>
                ))}
                <th className="px-3 py-2 text-right font-semibold text-gray-600 min-w-[90px]">Total Geral</th>
              </tr>
            </thead>
            <tbody>
              {groupedByRubrica.map((group) => (
                <>
                  <tr key={`header-${group.rubrica}`} className="bg-blue-50">
                    <td colSpan={14} className="sticky left-0 bg-blue-50 px-3 py-2 font-semibold text-[#1e40af]">
                      {group.rubrica}
                    </td>
                  </tr>
                  {group.rows.map((row, idx) => (
                    <tr key={`${group.rubrica}-${idx}`} className="hover:bg-gray-50 border-t border-gray-100">
                      <td className="sticky left-0 bg-white px-3 py-2 border-r"></td>
                      <td className="sticky left-[120px] bg-white px-3 py-2 border-r">
                        {row.descricao}
                        {row.fornecedor && <span className="text-gray-400 ml-1">({row.fornecedor})</span>}
                      </td>
                      {row.valores.map((val, i) => (
                        <td key={i} className="px-2 py-2 text-right">
                          {val > 0 ? formatCurrency(val) : '-'}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(row.total)}</td>
                    </tr>
                  ))}
                  <tr key={`subtotal-${group.rubrica}`} className="bg-gray-50 border-t">
                    <td className="sticky left-0 bg-gray-50 px-3 py-1 border-r"></td>
                    <td className="sticky left-[120px] bg-gray-50 px-3 py-1 border-r text-right text-gray-600 italic">
                      Subtotal {group.rubrica}
                    </td>
                    <td colSpan={12}></td>
                    <td className="px-3 py-1 text-right font-semibold text-gray-700">{formatCurrency(group.subtotal)}</td>
                  </tr>
                </>
              ))}
              <tr className="bg-gray-200 font-bold">
                <td className="sticky left-0 bg-gray-200 px-3 py-3 border-r">TOTAL</td>
                <td className="sticky left-[120px] bg-gray-200 px-3 py-3 border-r"></td>
                {totals.map((val, i) => (
                  <td key={i} className="px-2 py-3 text-right">{formatCurrency(val)}</td>
                ))}
                <td className="px-3 py-3 text-right text-[#1e40af]">{formatCurrency(grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {rows.length === 0 && (
        <div className="text-center text-gray-500 py-12">
          Nenhuma despesa registada para {year}
        </div>
      )}
    </div>
  );
}

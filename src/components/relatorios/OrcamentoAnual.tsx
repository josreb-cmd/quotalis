import { useEffect, useState } from 'react';
import { FileDown, Plus, Pencil, Trash2 } from 'lucide-react';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { formatCurrency, RUBRICAS } from '../../lib/utils';
import Card, { CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Loading from '../ui/Loading';
import type { Orcamento, Fracao, SaldoAnual, Configuracao, Despesa, QuotaMensal } from '../../types/database';

interface OrcamentoAnualProps {
  year: number;
}

export default function OrcamentoAnual({ year }: OrcamentoAnualProps) {
  const [loading, setLoading] = useState(true);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [fracoes, setFracoes] = useState<Fracao[]>([]);
  const [saldoInicial, setSaldoInicial] = useState<SaldoAnual | null>(null);
  const [config, setConfig] = useState<Configuracao | null>(null);
  const [realData, setRealData] = useState<{ receitas: number; despesasCorrentes: number; despesasExtra: number } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<Orcamento> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [year]);

  async function loadData() {
    setLoading(true);
    try {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      const [orcamentoRes, fracoesRes, saldoRes, configRes, despesasRes, quotasRes] = await Promise.all([
        supabase.from('orcamento').select('*').eq('ano', year).order('tipo').order('rubrica'),
        supabase.from('fracoes').select('*').eq('ativa', true),
        supabase.from('saldos_anuais').select('*').eq('ano', year).maybeSingle(),
        supabase.from('configuracoes').select('*').maybeSingle(),
        supabase.from('despesas').select('*').eq('ano', year),
        supabase.from('quotas_mensais').select('total_pago').gte('mes', startDate).lte('mes', endDate),
      ]);

      if (orcamentoRes.error) throw orcamentoRes.error;
      if (fracoesRes.error) throw fracoesRes.error;

      setOrcamentos(orcamentoRes.data || []);
      setFracoes(fracoesRes.data || []);
      setSaldoInicial(saldoRes.data);
      setConfig(configRes.data);

      const despesas = despesasRes.data || [];
      const quotas = quotasRes.data || [];

      setRealData({
        receitas: quotas.reduce((acc, q) => acc + q.total_pago, 0),
        despesasCorrentes: despesas.filter(d => d.tipo === 'Corrente').reduce((acc, d) => acc + d.valor, 0),
        despesasExtra: despesas.filter(d => d.tipo === 'Extraordinária').reduce((acc, d) => acc + d.valor, 0),
      });
    } catch (error) {
      console.error('Error loading orcamento:', error);
      toast.error('Erro ao carregar orçamento');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal(tipo: string) {
    setEditingItem({
      ano: year,
      tipo,
      rubrica: '',
      valor_estimado: 0,
      notas: '',
    });
    setIsModalOpen(true);
  }

  function openEditModal(item: Orcamento) {
    setEditingItem({ ...item });
    setIsModalOpen(true);
  }

  async function handleSave() {
    if (!editingItem?.rubrica || !editingItem.valor_estimado) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setSaving(true);
    try {
      if (editingItem.id) {
        const { error } = await supabase
          .from('orcamento')
          .update({
            rubrica: editingItem.rubrica,
            valor_estimado: editingItem.valor_estimado,
            notas: editingItem.notas,
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        toast.success('Item atualizado');
      } else {
        const { error } = await supabase.from('orcamento').insert({
          ano: year,
          tipo: editingItem.tipo,
          rubrica: editingItem.rubrica,
          valor_estimado: editingItem.valor_estimado,
          notas: editingItem.notas,
        });

        if (error) throw error;
        toast.success('Item adicionado');
      }

      setIsModalOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Erro ao guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: Orcamento) {
    if (!confirm('Eliminar este item?')) return;

    try {
      const { error } = await supabase.from('orcamento').delete().eq('id', item.id);
      if (error) throw error;
      toast.success('Item eliminado');
      loadData();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Erro ao eliminar');
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
    doc.text(`Orçamento Anual ${year}`, pageWidth / 2, y, { align: 'center' });
    y += 15;

    doc.setFontSize(10);
    doc.text('RECEITAS ESTIMADAS', 20, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    receitas.forEach(item => {
      doc.text(item.rubrica, 25, y);
      doc.text(formatCurrency(item.valor_estimado), pageWidth - 25, y, { align: 'right' });
      y += 6;
    });

    doc.setFont('helvetica', 'bold');
    doc.text('Total Receitas', 25, y);
    doc.text(formatCurrency(totalReceitas), pageWidth - 25, y, { align: 'right' });
    y += 12;

    doc.text('DESPESAS CORRENTES ESTIMADAS', 20, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    despesasCorrentes.forEach(item => {
      doc.text(item.rubrica, 25, y);
      doc.text(formatCurrency(item.valor_estimado), pageWidth - 25, y, { align: 'right' });
      y += 6;
    });

    doc.setFont('helvetica', 'bold');
    doc.text('Total Despesas Correntes', 25, y);
    doc.text(formatCurrency(totalDespesasCorrentes), pageWidth - 25, y, { align: 'right' });
    y += 12;

    if (despesasExtra.length > 0) {
      doc.text('DESPESAS EXTRAORDINÁRIAS ESTIMADAS', 20, y);
      y += 8;

      doc.setFont('helvetica', 'normal');
      despesasExtra.forEach(item => {
        doc.text(item.rubrica, 25, y);
        doc.text(formatCurrency(item.valor_estimado), pageWidth - 25, y, { align: 'right' });
        y += 6;
      });

      doc.setFont('helvetica', 'bold');
      doc.text('Total Despesas Extraordinárias', 25, y);
      doc.text(formatCurrency(totalDespesasExtra), pageWidth - 25, y, { align: 'right' });
      y += 12;
    }

    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.text(`Gerado em ${new Date().toLocaleDateString('pt-PT')}`, pageWidth - 20, pageHeight - 10, { align: 'right' });

    doc.save(`orcamento-${year}.pdf`);
    toast.success('PDF exportado');
  }

  if (loading) {
    return <Loading message="A carregar orçamento..." />;
  }

  const receitas = orcamentos.filter(o => o.tipo === 'Receita');
  const despesasCorrentes = orcamentos.filter(o => o.tipo === 'Despesa Corrente');
  const despesasExtra = orcamentos.filter(o => o.tipo === 'Despesa Extraordinária');

  const quotasAnuaisEstimadas = fracoes.reduce((acc, f) => acc + f.quota_mensal * 12, 0);
  const quotasAdminDesconto = fracoes.length > 0 ? (fracoes[0].quota_mensal * 12 * 2) : 0;

  const totalReceitas = receitas.reduce((acc, o) => acc + o.valor_estimado, 0) || quotasAnuaisEstimadas;
  const totalDespesasCorrentes = despesasCorrentes.reduce((acc, o) => acc + o.valor_estimado, 0);
  const totalDespesasExtra = despesasExtra.reduce((acc, o) => acc + o.valor_estimado, 0);

  const saldoInicialTotal = saldoInicial
    ? saldoInicial.saldo_caixa + saldoInicial.saldo_conta_ordem + saldoInicial.saldo_fundo_reserva
    : 0;

  const resultadoEstimado = totalReceitas - totalDespesasCorrentes - totalDespesasExtra;
  const saldoFinalEstimado = saldoInicialTotal + resultadoEstimado;

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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-green-700">RECEITAS ESTIMADAS</h3>
              <button
                onClick={() => openCreateModal('Receita')}
                className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Quotas ({fracoes.length} frações x 12 meses)</span>
                <span>{formatCurrency(quotasAnuaisEstimadas)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Desconto Administração (2 isentos)</span>
                <span className="text-red-500">-{formatCurrency(quotasAdminDesconto)}</span>
              </div>
              {receitas.map(item => (
                <div key={item.id} className="flex justify-between items-center group">
                  <span className="text-gray-600">{item.rubrica}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatCurrency(item.valor_estimado)}</span>
                    <button
                      onClick={() => openEditModal(item)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-600"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex justify-between pt-3 border-t border-gray-200">
                <span className="font-semibold">Total Receitas</span>
                <span className="font-bold text-green-600">{formatCurrency(quotasAnuaisEstimadas - quotasAdminDesconto)}</span>
              </div>
              {realData && (
                <div className="flex justify-between text-sm pt-2">
                  <span className="text-gray-500">Real até à data</span>
                  <span className="text-blue-600">{formatCurrency(realData.receitas)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-red-700">DESPESAS ESTIMADAS</h3>
              <button
                onClick={() => openCreateModal('Despesa Corrente')}
                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-500 uppercase">Despesas Correntes</p>
              {despesasCorrentes.map(item => (
                <div key={item.id} className="flex justify-between items-center group">
                  <span className="text-gray-600">{item.rubrica}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatCurrency(item.valor_estimado)}</span>
                    <button
                      onClick={() => openEditModal(item)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-600"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
              {despesasCorrentes.length === 0 && (
                <p className="text-gray-400 text-sm">Nenhuma despesa corrente estimada</p>
              )}
              <div className="flex justify-between pt-2 border-t border-gray-100">
                <span className="text-sm font-medium">Subtotal Correntes</span>
                <span className="font-semibold text-red-600">{formatCurrency(totalDespesasCorrentes)}</span>
              </div>

              <div className="flex items-center justify-between pt-4 mt-4 border-t">
                <p className="text-xs font-medium text-gray-500 uppercase">Despesas Extraordinárias</p>
                <button
                  onClick={() => openCreateModal('Despesa Extraordinária')}
                  className="p-1 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {despesasExtra.map(item => (
                <div key={item.id} className="flex justify-between items-center group">
                  <span className="text-gray-600">{item.rubrica}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatCurrency(item.valor_estimado)}</span>
                    <button
                      onClick={() => openEditModal(item)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-600"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
              {despesasExtra.length === 0 && (
                <p className="text-gray-400 text-sm">Nenhuma despesa extraordinária estimada</p>
              )}
              <div className="flex justify-between pt-2 border-t border-gray-100">
                <span className="text-sm font-medium">Subtotal Extraordinárias</span>
                <span className="font-semibold text-orange-600">{formatCurrency(totalDespesasExtra)}</span>
              </div>

              {realData && (
                <div className="flex justify-between text-sm pt-4 border-t">
                  <span className="text-gray-500">Real até à data (correntes)</span>
                  <span className="text-blue-600">{formatCurrency(realData.despesasCorrentes)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent>
          <h3 className="text-lg font-semibold mb-4">RESUMO DO ORÇAMENTO</h3>
          <div className="grid grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Saldo Inicial (01/01/{year})</span>
                <span className="font-medium">{formatCurrency(saldoInicialTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Receita Estimada</span>
                <span className="font-medium text-green-600">{formatCurrency(quotasAnuaisEstimadas - quotasAdminDesconto)}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Despesa Corrente</span>
                <span className="font-medium text-red-600">{formatCurrency(totalDespesasCorrentes)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Despesa Extraordinária</span>
                <span className="font-medium text-orange-600">{formatCurrency(totalDespesasExtra)}</span>
              </div>
            </div>
            <div className="space-y-3 border-l pl-8">
              <div className="flex justify-between">
                <span className="font-semibold">Resultado Estimado</span>
                <span className={`font-bold ${resultadoEstimado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency((quotasAnuaisEstimadas - quotasAdminDesconto) - totalDespesasCorrentes - totalDespesasExtra)}
                </span>
              </div>
              <div className="flex justify-between pt-3 border-t">
                <span className="font-semibold">Saldo Final Estimado</span>
                <span className={`font-bold ${saldoFinalEstimado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(saldoInicialTotal + (quotasAnuaisEstimadas - quotasAdminDesconto) - totalDespesasCorrentes - totalDespesasExtra)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem?.id ? 'Editar Item' : 'Novo Item'}
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Descrição/Rubrica"
            value={editingItem?.rubrica || ''}
            onChange={(e) => setEditingItem({ ...editingItem, rubrica: e.target.value })}
            placeholder="Ex: Água, EDP, Elevadores..."
          />
          <Input
            label="Valor Estimado"
            type="number"
            step="0.01"
            value={editingItem?.valor_estimado || ''}
            onChange={(e) => setEditingItem({ ...editingItem, valor_estimado: parseFloat(e.target.value) || 0 })}
            placeholder="0,00"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              value={editingItem?.notas || ''}
              onChange={(e) => setEditingItem({ ...editingItem, notas: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={saving}>
              Guardar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

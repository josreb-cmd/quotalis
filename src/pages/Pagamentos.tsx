import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate, METODOS_PAGAMENTO, addMonths, calculateEstado, getFirstDayOfMonth } from '../lib/utils';
import Card, { CardHeader, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Loading from '../components/ui/Loading';
import Badge from '../components/ui/Badge';
import { Table, TableHead, TableBody, TableRow, TableCell } from '../components/ui/Table';
import type { Pagamento, Fracao, QuotaMensal } from '../types/database';

interface PagamentoWithFracao extends Pagamento {
  fracao?: Fracao;
}

const emptyPagamento: Partial<Pagamento> = {
  data_pagamento: new Date().toISOString().split('T')[0],
  valor_total: 0,
  n_meses: 1,
  mes_inicio: getFirstDayOfMonth(),
  tipo: 'Normal',
  metodo: 'Transferência',
  nome_emissor: '',
  notas: '',
  por_identificar: false,
};

export default function Pagamentos() {
  const [pagamentos, setPagamentos] = useState<PagamentoWithFracao[]>([]);
  const [fracoes, setFracoes] = useState<Fracao[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [editingPagamento, setEditingPagamento] = useState<Partial<Pagamento> | null>(null);
  const [assigningPagamento, setAssigningPagamento] = useState<Pagamento | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUnidentified, setShowUnidentified] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedFracaoId, setSelectedFracaoId] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [pagamentosRes, fracoesRes] = await Promise.all([
        supabase.from('pagamentos').select('*').order('data_pagamento', { ascending: false }),
        supabase.from('fracoes').select('*').eq('ativa', true).order('fracao'),
      ]);

      if (pagamentosRes.error) throw pagamentosRes.error;
      if (fracoesRes.error) throw fracoesRes.error;

      const fracoesData = fracoesRes.data || [];
      setFracoes(fracoesData);

      const pagamentosWithFracao = (pagamentosRes.data || []).map(p => ({
        ...p,
        fracao: fracoesData.find(f => f.id === p.id_fracao),
      }));

      setPagamentos(pagamentosWithFracao);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingPagamento({ ...emptyPagamento });
    setSelectedFracaoId('');
    setErrors({});
    setIsModalOpen(true);
  }

  function openEditModal(pagamento: Pagamento) {
    setEditingPagamento({ ...pagamento });
    setSelectedFracaoId(pagamento.id_fracao || '');
    setErrors({});
    setIsModalOpen(true);
  }

  function openAssignModal(pagamento: Pagamento) {
    setAssigningPagamento(pagamento);
    setSelectedFracaoId('');
    setIsAssignModalOpen(true);
  }

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    if (!editingPagamento?.valor_total || editingPagamento.valor_total <= 0) {
      newErrors.valor_total = 'Valor deve ser maior que zero';
    }
    if (!editingPagamento?.data_pagamento) {
      newErrors.data_pagamento = 'Data de pagamento é obrigatória';
    }
    if (!editingPagamento?.por_identificar && !selectedFracaoId) {
      newErrors.id_fracao = 'Selecione uma fração ou marque como "Por identificar"';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function distributePayment(pagamentoId: string, fracaoId: string, valorTotal: number, nMeses: number, mesInicio: string) {
    let remainingAmount = valorTotal;
    let currentMonth = new Date(mesInicio);

    for (let i = 0; i < nMeses && remainingAmount > 0; i++) {
      const mesDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString().split('T')[0];

      let { data: quota, error: quotaError } = await supabase
        .from('quotas_mensais')
        .select('*')
        .eq('id_fracao', fracaoId)
        .eq('mes', mesDate)
        .maybeSingle();

      if (quotaError) throw quotaError;

      if (!quota) {
        const { data: fracao } = await supabase
          .from('fracoes')
          .select('quota_mensal')
          .eq('id', fracaoId)
          .maybeSingle();

        const { data: newQuota, error: insertError } = await supabase
          .from('quotas_mensais')
          .insert({
            id_fracao: fracaoId,
            mes: mesDate,
            valor_quota: fracao?.quota_mensal || 0,
            total_pago: 0,
            estado: 'Pendente',
          })
          .select()
          .single();

        if (insertError) throw insertError;
        quota = newQuota;
      }

      const amountNeeded = quota.valor_quota - quota.total_pago;
      const amountToApply = Math.min(remainingAmount, amountNeeded > 0 ? amountNeeded : remainingAmount);
      const creditGenerated = amountToApply > amountNeeded && amountNeeded > 0 ? amountToApply - amountNeeded : 0;

      const { error: imputacaoError } = await supabase.from('imputacoes').insert({
        id_pagamento: pagamentoId,
        id_quota_mensal: quota.id,
        valor_imputado: amountToApply,
        tipo_quota: 'Mensal',
        credito_gerado: creditGenerated,
      });

      if (imputacaoError) throw imputacaoError;

      const newTotalPago = quota.total_pago + amountToApply;
      const newEstado = calculateEstado(quota.valor_quota, newTotalPago, mesDate, false);

      const { error: updateError } = await supabase
        .from('quotas_mensais')
        .update({ total_pago: newTotalPago, estado: newEstado })
        .eq('id', quota.id);

      if (updateError) throw updateError;

      remainingAmount -= amountToApply;
      currentMonth = addMonths(currentMonth, 1);
    }

    if (remainingAmount > 0) {
      const lastMonth = addMonths(new Date(mesInicio), nMeses - 1);
      const mesDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1).toISOString().split('T')[0];

      const { data: lastQuota } = await supabase
        .from('quotas_mensais')
        .select('*')
        .eq('id_fracao', fracaoId)
        .eq('mes', mesDate)
        .maybeSingle();

      if (lastQuota) {
        await supabase
          .from('imputacoes')
          .update({ credito_gerado: remainingAmount })
          .eq('id_pagamento', pagamentoId)
          .eq('id_quota_mensal', lastQuota.id);

        await supabase
          .from('quotas_mensais')
          .update({ estado: 'Crédito', total_pago: lastQuota.total_pago + remainingAmount })
          .eq('id', lastQuota.id);
      }
    }
  }

  async function handleSave() {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const pagamentoData = {
        id_fracao: editingPagamento?.por_identificar ? null : selectedFracaoId || null,
        data_pagamento: editingPagamento?.data_pagamento,
        valor_total: editingPagamento?.valor_total,
        n_meses: editingPagamento?.n_meses || 1,
        mes_inicio: editingPagamento?.mes_inicio,
        tipo: editingPagamento?.tipo || 'Normal',
        metodo: editingPagamento?.metodo || 'Transferência',
        nome_emissor: editingPagamento?.nome_emissor,
        notas: editingPagamento?.notas,
        por_identificar: editingPagamento?.por_identificar || false,
      };

      if (editingPagamento?.id) {
        const { error } = await supabase
          .from('pagamentos')
          .update(pagamentoData)
          .eq('id', editingPagamento.id);

        if (error) throw error;
        toast.success('Pagamento atualizado com sucesso');
      } else {
        const { data: newPagamento, error } = await supabase
          .from('pagamentos')
          .insert(pagamentoData)
          .select()
          .single();

        if (error) throw error;

        if (!pagamentoData.por_identificar && selectedFracaoId && pagamentoData.mes_inicio) {
          await distributePayment(
            newPagamento.id,
            selectedFracaoId,
            pagamentoData.valor_total || 0,
            pagamentoData.n_meses || 1,
            pagamentoData.mes_inicio
          );
        }

        toast.success('Pagamento registado com sucesso');
      }

      setIsModalOpen(false);
      setEditingPagamento(null);
      loadData();
    } catch (error) {
      console.error('Error saving pagamento:', error);
      toast.error('Erro ao guardar pagamento');
    } finally {
      setSaving(false);
    }
  }

  async function handleAssign() {
    if (!assigningPagamento || !selectedFracaoId) {
      toast.error('Selecione uma fração');
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('pagamentos')
        .update({
          id_fracao: selectedFracaoId,
          por_identificar: false,
        })
        .eq('id', assigningPagamento.id);

      if (updateError) throw updateError;

      if (assigningPagamento.mes_inicio) {
        await distributePayment(
          assigningPagamento.id,
          selectedFracaoId,
          assigningPagamento.valor_total,
          assigningPagamento.n_meses,
          assigningPagamento.mes_inicio
        );
      }

      toast.success('Pagamento atribuído com sucesso');
      setIsAssignModalOpen(false);
      setAssigningPagamento(null);
      loadData();
    } catch (error) {
      console.error('Error assigning pagamento:', error);
      toast.error('Erro ao atribuir pagamento');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(pagamento: Pagamento) {
    if (!confirm('Tem a certeza que deseja eliminar este pagamento?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('pagamentos')
        .delete()
        .eq('id', pagamento.id);

      if (error) throw error;
      toast.success('Pagamento eliminado com sucesso');
      loadData();
    } catch (error) {
      console.error('Error deleting pagamento:', error);
      toast.error('Erro ao eliminar pagamento');
    }
  }

  const identifiedPagamentos = pagamentos.filter(p => !p.por_identificar);
  const unidentifiedPagamentos = pagamentos.filter(p => p.por_identificar);

  const filteredPagamentos = (showUnidentified ? unidentifiedPagamentos : identifiedPagamentos).filter(
    p =>
      !searchTerm ||
      p.fracao?.nome_condomino.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.fracao?.fracao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nome_emissor?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <Loading message="A carregar pagamentos..." />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pagamentos</h1>
          <p className="text-gray-500 mt-1">Registo e gestão de pagamentos</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Pagamento
        </Button>
      </div>

      {unidentifiedPagamentos.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <span className="text-yellow-800">
              Existem <strong>{unidentifiedPagamentos.length}</strong> pagamento(s) por identificar
            </span>
          </div>
          <button
            onClick={() => setShowUnidentified(!showUnidentified)}
            className="text-sm font-medium text-yellow-700 hover:text-yellow-800"
          >
            {showUnidentified ? 'Ver pagamentos identificados' : 'Ver pagamentos por identificar'}
          </button>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Pesquisar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                />
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Total: <span className="font-semibold text-gray-900">{filteredPagamentos.length}</span> pagamentos
            </div>
          </div>
        </CardHeader>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell header>Data</TableCell>
              <TableCell header>Fração</TableCell>
              <TableCell header>Condómino / Emissor</TableCell>
              <TableCell header className="text-right">Valor</TableCell>
              <TableCell header>Tipo</TableCell>
              <TableCell header>Método</TableCell>
              <TableCell header className="text-right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPagamentos.map((pagamento) => (
              <TableRow key={pagamento.id}>
                <TableCell>{formatDate(pagamento.data_pagamento)}</TableCell>
                <TableCell className="font-medium">
                  {pagamento.por_identificar ? (
                    <Badge variant="warning">Por identificar</Badge>
                  ) : (
                    pagamento.fracao?.fracao || '-'
                  )}
                </TableCell>
                <TableCell>
                  {pagamento.fracao?.nome_condomino || pagamento.nome_emissor || '-'}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(pagamento.valor_total)}
                </TableCell>
                <TableCell>{pagamento.tipo}</TableCell>
                <TableCell>{pagamento.metodo}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    {pagamento.por_identificar && (
                      <button
                        onClick={() => openAssignModal(pagamento)}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Atribuir a fração"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(pagamento)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(pagamento)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredPagamentos.length === 0 && (
              <TableRow>
                <TableCell className="text-center text-gray-500 py-8" colSpan={7}>
                  Nenhum pagamento encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPagamento?.id ? 'Editar Pagamento' : 'Novo Pagamento'}
        size="lg"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="por_identificar"
              checked={editingPagamento?.por_identificar || false}
              onChange={(e) => setEditingPagamento({ ...editingPagamento, por_identificar: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="por_identificar" className="text-sm text-gray-700">
              Pagamento por identificar
            </label>
          </div>

          {!editingPagamento?.por_identificar && (
            <Select
              label="Fração"
              value={selectedFracaoId}
              onChange={(e) => setSelectedFracaoId(e.target.value)}
              options={fracoes.map(f => ({
                value: f.id,
                label: `${f.fracao} - ${f.nome_condomino}`,
              }))}
              placeholder="Selecionar fração..."
              error={errors.id_fracao}
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Data de Pagamento"
              type="date"
              value={editingPagamento?.data_pagamento || ''}
              onChange={(e) => setEditingPagamento({ ...editingPagamento, data_pagamento: e.target.value })}
              error={errors.data_pagamento}
            />
            <Input
              label="Valor Total"
              type="number"
              step="0.01"
              value={editingPagamento?.valor_total || ''}
              onChange={(e) => setEditingPagamento({ ...editingPagamento, valor_total: parseFloat(e.target.value) || 0 })}
              placeholder="0,00"
              error={errors.valor_total}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Mês Início"
              type="date"
              value={editingPagamento?.mes_inicio || ''}
              onChange={(e) => setEditingPagamento({ ...editingPagamento, mes_inicio: e.target.value })}
            />
            <Input
              label="Número de Meses"
              type="number"
              min="1"
              value={editingPagamento?.n_meses || 1}
              onChange={(e) => setEditingPagamento({ ...editingPagamento, n_meses: parseInt(e.target.value) || 1 })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Tipo"
              value={editingPagamento?.tipo || 'Normal'}
              onChange={(e) => setEditingPagamento({ ...editingPagamento, tipo: e.target.value })}
              options={[
                { value: 'Normal', label: 'Normal' },
                { value: 'Múltiplos meses', label: 'Múltiplos meses' },
                { value: 'Parcial', label: 'Parcial' },
                { value: 'Extraordinária', label: 'Extraordinária' },
              ]}
            />
            <Select
              label="Método"
              value={editingPagamento?.metodo || 'Transferência'}
              onChange={(e) => setEditingPagamento({ ...editingPagamento, metodo: e.target.value })}
              options={METODOS_PAGAMENTO.map(m => ({ value: m, label: m }))}
            />
          </div>

          <Input
            label="Nome do Emissor"
            value={editingPagamento?.nome_emissor || ''}
            onChange={(e) => setEditingPagamento({ ...editingPagamento, nome_emissor: e.target.value })}
            placeholder="Nome de quem efetuou o pagamento"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              value={editingPagamento?.notas || ''}
              onChange={(e) => setEditingPagamento({ ...editingPagamento, notas: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Observações..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editingPagamento?.id ? 'Guardar Alterações' : 'Registar Pagamento'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Atribuir Pagamento a Fração"
        size="md"
      >
        <div className="space-y-6">
          <p className="text-gray-600">
            Selecione a fração a que este pagamento de{' '}
            <strong>{formatCurrency(assigningPagamento?.valor_total || 0)}</strong> deve ser atribuído.
          </p>

          <Select
            label="Fração"
            value={selectedFracaoId}
            onChange={(e) => setSelectedFracaoId(e.target.value)}
            options={fracoes.map(f => ({
              value: f.id,
              label: `${f.fracao} - ${f.nome_condomino}`,
            }))}
            placeholder="Selecionar fração..."
          />

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setIsAssignModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAssign} loading={saving}>
              Atribuir Pagamento
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate, RUBRICAS, METODOS_DESPESA, MONTHS_PT } from '../lib/utils';
import Card, { CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Loading from '../components/ui/Loading';
import Badge from '../components/ui/Badge';
import { Table, TableHead, TableBody, TableRow, TableCell } from '../components/ui/Table';
import type { Despesa } from '../types/database';

const emptyDespesa: Partial<Despesa> = {
  descricao: '',
  rubrica: '',
  valor: 0,
  data_pagamento: new Date().toISOString().split('T')[0],
  metodo: 'Transferência Bancária',
  mes: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
  ano: new Date().getFullYear(),
  tipo: 'Corrente',
  fornecedor: '',
  notas: '',
};

export default function Despesas() {
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDespesa, setEditingDespesa] = useState<Partial<Despesa> | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [rubricaFilter, setRubricaFilter] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadDespesas();
  }, [selectedYear]);

  async function loadDespesas() {
    try {
      const { data, error } = await supabase
        .from('despesas')
        .select('*')
        .eq('ano', selectedYear)
        .order('data_pagamento', { ascending: false });

      if (error) throw error;
      setDespesas(data || []);
    } catch (error) {
      console.error('Error loading despesas:', error);
      toast.error('Erro ao carregar despesas');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingDespesa({ ...emptyDespesa, ano: selectedYear });
    setErrors({});
    setIsModalOpen(true);
  }

  function openEditModal(despesa: Despesa) {
    setEditingDespesa({ ...despesa });
    setErrors({});
    setIsModalOpen(true);
  }

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    if (!editingDespesa?.descricao?.trim()) {
      newErrors.descricao = 'Descrição é obrigatória';
    }
    if (!editingDespesa?.rubrica) {
      newErrors.rubrica = 'Rubrica é obrigatória';
    }
    if (!editingDespesa?.valor || editingDespesa.valor <= 0) {
      newErrors.valor = 'Valor deve ser maior que zero';
    }
    if (!editingDespesa?.data_pagamento) {
      newErrors.data_pagamento = 'Data de pagamento é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const despesaData = {
        descricao: editingDespesa?.descricao,
        rubrica: editingDespesa?.rubrica,
        valor: editingDespesa?.valor,
        data_pagamento: editingDespesa?.data_pagamento,
        metodo: editingDespesa?.metodo,
        mes: editingDespesa?.mes,
        ano: editingDespesa?.ano || selectedYear,
        tipo: editingDespesa?.rubrica === 'Extraordinária' ? 'Extraordinária' : 'Corrente',
        fornecedor: editingDespesa?.fornecedor,
        notas: editingDespesa?.notas,
      };

      if (editingDespesa?.id) {
        const { error } = await supabase
          .from('despesas')
          .update(despesaData)
          .eq('id', editingDespesa.id);

        if (error) throw error;
        toast.success('Despesa atualizada com sucesso');
      } else {
        const { error } = await supabase.from('despesas').insert(despesaData);

        if (error) throw error;
        toast.success('Despesa registada com sucesso');
      }

      setIsModalOpen(false);
      setEditingDespesa(null);
      loadDespesas();
    } catch (error) {
      console.error('Error saving despesa:', error);
      toast.error('Erro ao guardar despesa');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(despesa: Despesa) {
    if (!confirm('Tem a certeza que deseja eliminar esta despesa?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('despesas')
        .delete()
        .eq('id', despesa.id);

      if (error) throw error;
      toast.success('Despesa eliminada com sucesso');
      loadDespesas();
    } catch (error) {
      console.error('Error deleting despesa:', error);
      toast.error('Erro ao eliminar despesa');
    }
  }

  const filteredDespesas = despesas.filter(d => {
    const matchesSearch = !searchTerm ||
      d.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.fornecedor?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRubrica = !rubricaFilter || d.rubrica === rubricaFilter;
    return matchesSearch && matchesRubrica;
  });

  const totalDespesas = filteredDespesas.reduce((acc, d) => acc + d.valor, 0);
  const despesasCorrentes = filteredDespesas.filter(d => d.tipo === 'Corrente').reduce((acc, d) => acc + d.valor, 0);
  const despesasExtraordinarias = filteredDespesas.filter(d => d.tipo === 'Extraordinária').reduce((acc, d) => acc + d.valor, 0);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  if (loading) {
    return <Loading message="A carregar despesas..." />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Despesas</h1>
          <p className="text-gray-500 mt-1">Registo e gestão de despesas</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <Button onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Despesa
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Total Despesas</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalDespesas)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Despesas Correntes</p>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(despesasCorrentes)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Despesas Extraordinárias</p>
          <p className="text-2xl font-bold text-orange-600">{formatCurrency(despesasExtraordinarias)}</p>
        </div>
      </div>

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
              <select
                value={rubricaFilter}
                onChange={(e) => setRubricaFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas as rubricas</option>
                {RUBRICAS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="text-sm text-gray-500">
              Total: <span className="font-semibold text-gray-900">{filteredDespesas.length}</span> despesas
            </div>
          </div>
        </CardHeader>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell header>Data</TableCell>
              <TableCell header>Descrição</TableCell>
              <TableCell header>Rubrica</TableCell>
              <TableCell header>Fornecedor</TableCell>
              <TableCell header className="text-right">Valor</TableCell>
              <TableCell header>Método</TableCell>
              <TableCell header className="text-right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredDespesas.map((despesa) => (
              <TableRow key={despesa.id}>
                <TableCell>{formatDate(despesa.data_pagamento)}</TableCell>
                <TableCell className="font-medium">{despesa.descricao}</TableCell>
                <TableCell>
                  <Badge variant={despesa.tipo === 'Extraordinária' ? 'orange' : 'info'}>
                    {despesa.rubrica}
                  </Badge>
                </TableCell>
                <TableCell>{despesa.fornecedor || '-'}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(despesa.valor)}</TableCell>
                <TableCell>{despesa.metodo}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEditModal(despesa)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(despesa)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredDespesas.length === 0 && (
              <TableRow>
                <TableCell className="text-center text-gray-500 py-8" colSpan={7}>
                  Nenhuma despesa encontrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDespesa?.id ? 'Editar Despesa' : 'Nova Despesa'}
        size="lg"
      >
        <div className="space-y-6">
          <Input
            label="Descrição"
            value={editingDespesa?.descricao || ''}
            onChange={(e) => setEditingDespesa({ ...editingDespesa, descricao: e.target.value })}
            placeholder="Descrição da despesa"
            error={errors.descricao}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Rubrica"
              value={editingDespesa?.rubrica || ''}
              onChange={(e) => setEditingDespesa({ ...editingDespesa, rubrica: e.target.value })}
              options={RUBRICAS.map(r => ({ value: r, label: r }))}
              placeholder="Selecionar rubrica..."
              error={errors.rubrica}
            />
            <Input
              label="Fornecedor"
              value={editingDespesa?.fornecedor || ''}
              onChange={(e) => setEditingDespesa({ ...editingDespesa, fornecedor: e.target.value })}
              placeholder="Nome do fornecedor"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Valor"
              type="number"
              step="0.01"
              value={editingDespesa?.valor || ''}
              onChange={(e) => setEditingDespesa({ ...editingDespesa, valor: parseFloat(e.target.value) || 0 })}
              placeholder="0,00"
              error={errors.valor}
            />
            <Input
              label="Data de Pagamento"
              type="date"
              value={editingDespesa?.data_pagamento || ''}
              onChange={(e) => setEditingDespesa({ ...editingDespesa, data_pagamento: e.target.value })}
              error={errors.data_pagamento}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Método de Pagamento"
              value={editingDespesa?.metodo || 'Transferência Bancária'}
              onChange={(e) => setEditingDespesa({ ...editingDespesa, metodo: e.target.value })}
              options={METODOS_DESPESA.map(m => ({ value: m, label: m }))}
            />
            <Input
              label="Mês de Referência"
              type="date"
              value={editingDespesa?.mes || ''}
              onChange={(e) => setEditingDespesa({ ...editingDespesa, mes: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              value={editingDespesa?.notas || ''}
              onChange={(e) => setEditingDespesa({ ...editingDespesa, notas: e.target.value })}
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
              {editingDespesa?.id ? 'Guardar Alterações' : 'Registar Despesa'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

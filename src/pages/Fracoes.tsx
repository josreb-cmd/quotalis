import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search, Eye, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatNumber, formatDate, TIPOLOGIAS, MONTHS_PT } from '../lib/utils';
import Card, { CardHeader, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Loading from '../components/ui/Loading';
import Badge, { getEstadoBadgeVariant } from '../components/ui/Badge';
import { Table, TableHead, TableBody, TableRow, TableCell } from '../components/ui/Table';
import type { Fracao, QuotaMensal } from '../types/database';

const emptyFracao: Partial<Fracao> = {
  nome_condomino: '',
  fracao: '',
  codigo: '',
  tipologia: '',
  quota_mensal: 0,
  permilagem: 0,
  email: '',
  telemovel: '',
  nif: '',
  data_entrada: new Date().toISOString().split('T')[0],
  ativa: true,
  notas: '',
};

export default function Fracoes() {
  const [fracoes, setFracoes] = useState<Fracao[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFichaOpen, setIsFichaOpen] = useState(false);
  const [selectedFracao, setSelectedFracao] = useState<Fracao | null>(null);
  const [fracaoQuotas, setFracaoQuotas] = useState<QuotaMensal[]>([]);
  const [loadingFicha, setLoadingFicha] = useState(false);
  const [editingFracao, setEditingFracao] = useState<Partial<Fracao> | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadFracoes();
  }, []);

  async function loadFracoes() {
    try {
      const { data, error } = await supabase
        .from('fracoes')
        .select('*')
        .order('fracao', { ascending: true });

      if (error) throw error;
      setFracoes(data || []);
    } catch (error) {
      console.error('Error loading fracoes:', error);
      toast.error('Erro ao carregar fraccoes');
    } finally {
      setLoading(false);
    }
  }

  function getNextCodigo(): string {
    if (fracoes.length === 0) return '1';
    const numericCodes = fracoes
      .map(f => parseInt(f.codigo || '0', 10))
      .filter(n => !isNaN(n));
    const maxCode = numericCodes.length > 0 ? Math.max(...numericCodes) : 0;
    return String(maxCode + 1);
  }

  function openCreateModal() {
    setEditingFracao({ ...emptyFracao, codigo: getNextCodigo() });
    setErrors({});
    setIsModalOpen(true);
  }

  function openEditModal(fracao: Fracao) {
    setEditingFracao({ ...fracao });
    setErrors({});
    setIsModalOpen(true);
  }

  async function openFicha(fracao: Fracao) {
    setSelectedFracao(fracao);
    setIsFichaOpen(true);
    setLoadingFicha(true);

    try {
      const { data, error } = await supabase
        .from('quotas_mensais')
        .select('*')
        .eq('id_fracao', fracao.id)
        .order('mes', { ascending: false });

      if (error) throw error;
      setFracaoQuotas(data || []);
    } catch (error) {
      console.error('Error loading fracao quotas:', error);
      toast.error('Erro ao carregar historico de quotas');
    } finally {
      setLoadingFicha(false);
    }
  }

  function closeFicha() {
    setIsFichaOpen(false);
    setSelectedFracao(null);
    setFracaoQuotas([]);
  }

  function calculateSaldo(): number {
    return fracaoQuotas.reduce((acc, q) => {
      return acc + (q.total_pago - q.valor_quota);
    }, 0);
  }

  function formatMesLabel(mes: string): string {
    const date = new Date(mes);
    return `${MONTHS_PT[date.getMonth()]} ${date.getFullYear()}`;
  }

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    if (!editingFracao?.nome_condomino?.trim()) {
      newErrors.nome_condomino = 'Nome do condomino e obrigatorio';
    }
    if (!editingFracao?.fracao?.trim()) {
      newErrors.fracao = 'Fracao e obrigatoria';
    }
    if (!editingFracao?.quota_mensal || editingFracao.quota_mensal <= 0) {
      newErrors.quota_mensal = 'Quota mensal deve ser maior que zero';
    }
    if (!editingFracao?.permilagem || editingFracao.permilagem <= 0) {
      newErrors.permilagem = 'Permilagem deve ser maior que zero';
    }

    const currentPermilagem = editingFracao?.permilagem || 0;
    const otherFracoesPermilagem = fracoes
      .filter(f => f.ativa && f.id !== editingFracao?.id)
      .reduce((acc, f) => acc + Number(f.permilagem), 0);
    const newTotalPermilagem = otherFracoesPermilagem + currentPermilagem;

    if (editingFracao?.ativa !== false && newTotalPermilagem > 1000) {
      newErrors.permilagem = `Nao e possivel guardar - a permilagem total ficaria em ${formatNumber(newTotalPermilagem, 3)}, superior ao maximo de 1.000,000`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!validateForm()) return;

    setSaving(true);
    try {
      if (editingFracao?.id) {
        const { error } = await supabase
          .from('fracoes')
          .update({
            nome_condomino: editingFracao.nome_condomino,
            fracao: editingFracao.fracao,
            codigo: editingFracao.codigo,
            tipologia: editingFracao.tipologia,
            quota_mensal: editingFracao.quota_mensal,
            permilagem: editingFracao.permilagem,
            email: editingFracao.email,
            telemovel: editingFracao.telemovel,
            nif: editingFracao.nif,
            data_entrada: editingFracao.data_entrada,
            ativa: editingFracao.ativa,
            notas: editingFracao.notas,
          })
          .eq('id', editingFracao.id);

        if (error) throw error;
        toast.success('Fraccao actualizada com sucesso');
      } else {
        const { error } = await supabase.from('fracoes').insert({
          nome_condomino: editingFracao?.nome_condomino,
          fracao: editingFracao?.fracao,
          codigo: editingFracao?.codigo,
          tipologia: editingFracao?.tipologia,
          quota_mensal: editingFracao?.quota_mensal,
          permilagem: editingFracao?.permilagem,
          email: editingFracao?.email,
          telemovel: editingFracao?.telemovel,
          nif: editingFracao?.nif,
          data_entrada: editingFracao?.data_entrada,
          ativa: editingFracao?.ativa ?? true,
          notas: editingFracao?.notas,
        });

        if (error) throw error;
        toast.success('Fraccao criada com sucesso');
      }

      setIsModalOpen(false);
      setEditingFracao(null);
      loadFracoes();
    } catch (error) {
      console.error('Error saving fracao:', error);
      toast.error('Erro ao guardar fraccao');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(fracao: Fracao) {
    if (!confirm(`Tem a certeza que deseja eliminar a fraccao "${fracao.fracao}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('fracoes')
        .delete()
        .eq('id', fracao.id);

      if (error) throw error;
      toast.success('Fraccao eliminada com sucesso');
      loadFracoes();
    } catch (error) {
      console.error('Error deleting fracao:', error);
      toast.error('Erro ao eliminar fraccao');
    }
  }

  const filteredFracoes = fracoes.filter(
    (f) =>
      f.nome_condomino.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.fracao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.codigo && f.codigo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPermilagem = fracoes
    .filter(f => f.ativa)
    .reduce((acc, f) => acc + Number(f.permilagem), 0);

  if (loading) {
    return <Loading message="A carregar fraccoes..." />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fraccoes</h1>
          <p className="text-gray-500 mt-1">Gestao das fraccoes do condominio</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Fraccao
        </Button>
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
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-500">
                Total: <span className="font-semibold text-gray-900">{fracoes.length}</span> fraccoes
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-gray-500">
                Permilagem:{' '}
                <span className={`font-semibold ${totalPermilagem === 1000 ? 'text-green-600' : 'text-orange-600'}`}>
                  {formatNumber(totalPermilagem, 0)}
                </span>
              </span>
            </div>
          </div>
        </CardHeader>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell header>Fraccao</TableCell>
              <TableCell header>Codigo</TableCell>
              <TableCell header>Condomino</TableCell>
              <TableCell header>Tipologia</TableCell>
              <TableCell header className="text-right">Quota Mensal</TableCell>
              <TableCell header className="text-right">Permilagem</TableCell>
              <TableCell header>Estado</TableCell>
              <TableCell header className="text-right">Accoes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredFracoes.map((fracao) => (
              <TableRow key={fracao.id}>
                <TableCell className="font-medium">{fracao.fracao}</TableCell>
                <TableCell>{fracao.codigo || '-'}</TableCell>
                <TableCell>{fracao.nome_condomino}</TableCell>
                <TableCell>{fracao.tipologia || '-'}</TableCell>
                <TableCell className="text-right">{formatCurrency(fracao.quota_mensal)}</TableCell>
                <TableCell className="text-right">{formatNumber(fracao.permilagem, 3)}</TableCell>
                <TableCell>
                  <Badge variant={fracao.ativa ? 'success' : 'gray'}>
                    {fracao.ativa ? 'Activa' : 'Inactiva'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openFicha(fracao)}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Ver ficha"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(fracao)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(fracao)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredFracoes.length === 0 && (
              <TableRow>
                <TableCell className="text-center text-gray-500 py-8" colSpan={8}>
                  {searchTerm ? 'Nenhuma fraccao encontrada' : 'Nenhuma fraccao registada'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingFracao?.id ? 'Editar Fraccao' : 'Nova Fraccao'}
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Input
                label="Fraccao"
                value={editingFracao?.fracao || ''}
                onChange={(e) => setEditingFracao({ ...editingFracao, fracao: e.target.value })}
                placeholder="Ex: 1.A, Gar 1 P-3"
                error={errors.fracao}
              />
            </div>
            <Input
              label="Codigo"
              value={editingFracao?.codigo || ''}
              onChange={(e) => setEditingFracao({ ...editingFracao, codigo: e.target.value })}
              hint="Atribuido automaticamente"
              disabled={!editingFracao?.id}
            />
          </div>

          <Input
            label="Nome do Condomino"
            value={editingFracao?.nome_condomino || ''}
            onChange={(e) => setEditingFracao({ ...editingFracao, nome_condomino: e.target.value })}
            placeholder="Nome completo"
            error={errors.nome_condomino}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Tipologia"
              value={editingFracao?.tipologia || ''}
              onChange={(e) => setEditingFracao({ ...editingFracao, tipologia: e.target.value })}
              options={TIPOLOGIAS.map(t => ({ value: t, label: t }))}
              placeholder="Seleccionar..."
            />
            <Input
              label="Data de Entrada"
              type="date"
              value={editingFracao?.data_entrada || ''}
              onChange={(e) => setEditingFracao({ ...editingFracao, data_entrada: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quota Mensal"
              type="number"
              step="0.01"
              value={editingFracao?.quota_mensal || ''}
              onChange={(e) => setEditingFracao({ ...editingFracao, quota_mensal: parseFloat(e.target.value) || 0 })}
              placeholder="0,00"
              error={errors.quota_mensal}
            />
            <Input
              label="Permilagem"
              type="number"
              step="0.001"
              value={editingFracao?.permilagem || ''}
              onChange={(e) => setEditingFracao({ ...editingFracao, permilagem: parseFloat(e.target.value) || 0 })}
              placeholder="0,000"
              error={errors.permilagem}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={editingFracao?.email || ''}
              onChange={(e) => setEditingFracao({ ...editingFracao, email: e.target.value })}
              placeholder="email@exemplo.com"
            />
            <Input
              label="Telemovel"
              value={editingFracao?.telemovel || ''}
              onChange={(e) => setEditingFracao({ ...editingFracao, telemovel: e.target.value })}
              placeholder="+351 912 345 678"
            />
          </div>

          <Input
            label="NIF"
            value={editingFracao?.nif || ''}
            onChange={(e) => setEditingFracao({ ...editingFracao, nif: e.target.value })}
            placeholder="123456789"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              value={editingFracao?.notas || ''}
              onChange={(e) => setEditingFracao({ ...editingFracao, notas: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Observacoes..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ativa"
              checked={editingFracao?.ativa ?? true}
              onChange={(e) => setEditingFracao({ ...editingFracao, ativa: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="ativa" className="text-sm text-gray-700">
              Fraccao activa
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editingFracao?.id ? 'Guardar Alteracoes' : 'Criar Fraccao'}
            </Button>
          </div>
        </div>
      </Modal>

      {isFichaOpen && selectedFracao && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Ficha da Fraccao {selectedFracao.fracao}
                </h2>
                <p className="text-gray-500 text-sm mt-1">{selectedFracao.nome_condomino}</p>
              </div>
              <button
                onClick={closeFicha}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Tipologia</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {selectedFracao.tipologia || '-'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Quota Mensal</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {formatCurrency(selectedFracao.quota_mensal)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Permilagem</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {formatNumber(selectedFracao.permilagem, 3)}
                  </p>
                </div>
                <div className={`rounded-lg p-4 ${calculateSaldo() >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Saldo Actual</p>
                  <p className={`text-lg font-semibold mt-1 ${calculateSaldo() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {calculateSaldo() >= 0 ? '+' : ''}{formatCurrency(calculateSaldo())}
                  </p>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-4">Historico de Quotas Mensais</h3>

              {loadingFicha ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : fracaoQuotas.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Nenhuma quota registada para esta fraccao.
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Mes
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Valor Quota
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Total Pago
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Diferenca
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {fracaoQuotas.map((quota) => {
                        const diferenca = quota.total_pago - quota.valor_quota;
                        return (
                          <tr key={quota.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {formatMesLabel(quota.mes)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900">
                              {formatCurrency(quota.valor_quota)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900">
                              {formatCurrency(quota.total_pago)}
                            </td>
                            <td className={`px-4 py-3 text-sm text-right font-medium ${diferenca >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {diferenca >= 0 ? '+' : ''}{formatCurrency(diferenca)}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <Badge variant={getEstadoBadgeVariant(quota.estado)}>{quota.estado}</Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50">
              <div className="flex justify-end">
                <Button variant="secondary" onClick={closeFicha}>
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

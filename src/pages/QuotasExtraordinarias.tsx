import { useEffect, useState } from 'react';
import { Plus, Trash2, Search, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate, formatNumber, calculateEstado } from '../lib/utils';
import Card, { CardHeader, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Loading from '../components/ui/Loading';
import Badge, { getEstadoBadgeVariant } from '../components/ui/Badge';
import { Table, TableHead, TableBody, TableRow, TableCell } from '../components/ui/Table';
import type { QuotaExtraordinaria, Fracao } from '../types/database';

interface QuotaWithFracao extends QuotaExtraordinaria {
  fracao?: Fracao;
}

interface ExtraordinariaEvent {
  descricao: string;
  valorTotal: number;
  prazo: string;
  quotas: QuotaWithFracao[];
}

export default function QuotasExtraordinarias() {
  const [events, setEvents] = useState<ExtraordinariaEvent[]>([]);
  const [fracoes, setFracoes] = useState<Fracao[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    descricao: '',
    valor_total: 0,
    prazo: new Date().toISOString().split('T')[0],
  });
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [permilagemTotal, setPermilagemTotal] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [quotasRes, fracoesRes] = await Promise.all([
        supabase.from('quotas_extraordinarias').select('*').order('prazo', { ascending: false }),
        supabase.from('fracoes').select('*').eq('ativa', true).order('fracao'),
      ]);

      if (quotasRes.error) throw quotasRes.error;
      if (fracoesRes.error) throw fracoesRes.error;

      const fracoesData = fracoesRes.data || [];
      setFracoes(fracoesData);

      const totalPermilagem = fracoesData.reduce((acc, f) => acc + Number(f.permilagem), 0);
      setPermilagemTotal(totalPermilagem);

      const quotasData = quotasRes.data || [];
      const quotasWithFracao = quotasData.map(q => ({
        ...q,
        fracao: fracoesData.find(f => f.id === q.id_fracao),
      }));

      const eventMap = new Map<string, QuotaWithFracao[]>();
      quotasWithFracao.forEach(q => {
        const key = `${q.descricao}|${q.valor_total}|${q.prazo}`;
        if (!eventMap.has(key)) {
          eventMap.set(key, []);
        }
        eventMap.get(key)!.push(q);
      });

      const eventsData: ExtraordinariaEvent[] = [];
      eventMap.forEach((quotas, key) => {
        const [descricao, valorTotal, prazo] = key.split('|');
        eventsData.push({
          descricao,
          valorTotal: parseFloat(valorTotal),
          prazo,
          quotas,
        });
      });

      setEvents(eventsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setNewEvent({
      descricao: '',
      valor_total: 0,
      prazo: new Date().toISOString().split('T')[0],
    });
    setErrors({});
    setIsModalOpen(true);
  }

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    if (!newEvent.descricao.trim()) {
      newErrors.descricao = 'Descrição é obrigatória';
    }
    if (!newEvent.valor_total || newEvent.valor_total <= 0) {
      newErrors.valor_total = 'Valor total deve ser maior que zero';
    }
    if (!newEvent.prazo) {
      newErrors.prazo = 'Prazo é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const quotasToInsert = fracoes.map(f => {
        const valorPorFracao = (newEvent.valor_total * Number(f.permilagem)) / 1000;
        return {
          descricao: newEvent.descricao,
          valor_total: newEvent.valor_total,
          prazo: newEvent.prazo,
          id_fracao: f.id,
          valor_por_fracao: Math.round(valorPorFracao * 100) / 100,
          total_pago: 0,
          estado: 'Pendente',
        };
      });

      const { error } = await supabase.from('quotas_extraordinarias').insert(quotasToInsert);

      if (error) throw error;
      toast.success('Quota extraordinária criada com sucesso');
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      console.error('Error creating quota extraordinaria:', error);
      toast.error('Erro ao criar quota extraordinária');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteEvent(event: ExtraordinariaEvent) {
    if (!confirm(`Tem a certeza que deseja eliminar a quota extraordinária "${event.descricao}"?`)) {
      return;
    }

    try {
      const quotaIds = event.quotas.map(q => q.id);
      const { error } = await supabase
        .from('quotas_extraordinarias')
        .delete()
        .in('id', quotaIds);

      if (error) throw error;
      toast.success('Quota extraordinária eliminada com sucesso');
      loadData();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Erro ao eliminar quota extraordinária');
    }
  }

  const filteredEvents = events.filter(e =>
    !searchTerm || e.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <Loading message="A carregar quotas extraordinárias..." />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quotas Extraordinárias</h1>
          <p className="text-gray-500 mt-1">Gestão de despesas extraordinárias por fração</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Quota Extraordinária
        </Button>
      </div>

      {permilagemTotal !== 1000 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          <span className="text-yellow-800">
            A permilagem total das frações ativas é <strong>{formatNumber(permilagemTotal, 0)}</strong> (deveria ser 1000).
            Os valores por fração podem não totalizar o valor da quota.
          </span>
        </div>
      )}

      <div className="mb-6">
        <div className="relative w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-center text-gray-500 py-8">
              Nenhuma quota extraordinária registada
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredEvents.map((event, index) => {
            const totalCobrado = event.quotas.reduce((acc, q) => acc + q.total_pago, 0);
            const totalPorCobrar = event.quotas.reduce((acc, q) => acc + (q.valor_por_fracao - q.total_pago), 0);
            const isPastDue = new Date(event.prazo) < new Date();

            return (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{event.descricao}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>Valor total: <strong className="text-gray-900">{formatCurrency(event.valorTotal)}</strong></span>
                        <span>Prazo: <strong className={isPastDue ? 'text-red-600' : 'text-gray-900'}>{formatDate(event.prazo)}</strong></span>
                        <span>Cobrado: <strong className="text-green-600">{formatCurrency(totalCobrado)}</strong></span>
                        <span>Por cobrar: <strong className="text-orange-600">{formatCurrency(totalPorCobrar)}</strong></span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteEvent(event)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </CardHeader>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell header>Fração</TableCell>
                      <TableCell header>Condómino</TableCell>
                      <TableCell header className="text-right">Permilagem</TableCell>
                      <TableCell header className="text-right">Valor</TableCell>
                      <TableCell header className="text-right">Pago</TableCell>
                      <TableCell header className="text-right">Em Falta</TableCell>
                      <TableCell header>Estado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {event.quotas.map((quota) => {
                      const emFalta = quota.valor_por_fracao - quota.total_pago;
                      const estado = quota.total_pago >= quota.valor_por_fracao
                        ? 'Pago'
                        : quota.total_pago > 0
                        ? (isPastDue ? 'Atraso Parcial' : 'Parcial')
                        : (isPastDue ? 'Atraso' : 'Pendente');

                      return (
                        <TableRow key={quota.id}>
                          <TableCell className="font-medium">{quota.fracao?.fracao || '-'}</TableCell>
                          <TableCell>{quota.fracao?.nome_condomino || '-'}</TableCell>
                          <TableCell className="text-right">{formatNumber(quota.fracao?.permilagem || 0, 3)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(quota.valor_por_fracao)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(quota.total_pago)}</TableCell>
                          <TableCell className="text-right">
                            {emFalta > 0 ? formatCurrency(emFalta) : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getEstadoBadgeVariant(estado)}>{estado}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nova Quota Extraordinária"
        size="md"
      >
        <div className="space-y-6">
          <Input
            label="Descrição"
            value={newEvent.descricao}
            onChange={(e) => setNewEvent({ ...newEvent, descricao: e.target.value })}
            placeholder="Ex: Reparação do telhado"
            error={errors.descricao}
          />

          <Input
            label="Valor Total"
            type="number"
            step="0.01"
            value={newEvent.valor_total || ''}
            onChange={(e) => setNewEvent({ ...newEvent, valor_total: parseFloat(e.target.value) || 0 })}
            placeholder="0,00"
            error={errors.valor_total}
          />

          <Input
            label="Prazo de Pagamento"
            type="date"
            value={newEvent.prazo}
            onChange={(e) => setNewEvent({ ...newEvent, prazo: e.target.value })}
            error={errors.prazo}
          />

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Distribuição por Fração</h4>
            <p className="text-xs text-gray-500 mb-3">
              O valor será distribuído proporcionalmente à permilagem de cada fração.
            </p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {fracoes.map(f => {
                const valor = (newEvent.valor_total * Number(f.permilagem)) / 1000;
                return (
                  <div key={f.id} className="flex justify-between text-sm">
                    <span className="text-gray-600">{f.fracao} - {f.nome_condomino}</span>
                    <span className="font-medium">{formatCurrency(valor)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={saving}>
              Criar Quota Extraordinária
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

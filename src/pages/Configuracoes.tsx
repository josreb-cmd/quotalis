import { useEffect, useState } from 'react';
import { Save, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/utils';
import Card, { CardHeader, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Loading from '../components/ui/Loading';
import type { Configuracao, SaldoAnual } from '../types/database';

export default function Configuracoes() {
  const [config, setConfig] = useState<Partial<Configuracao>>({
    nome_condominio: '',
    nipc: '',
    morada: '',
    email_administrador: '',
  });
  const [saldos, setSaldos] = useState<SaldoAnual[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingSaldos, setSavingSaldos] = useState(false);
  const [newSaldoYear, setNewSaldoYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [configRes, saldosRes] = await Promise.all([
        supabase.from('configuracoes').select('*').maybeSingle(),
        supabase.from('saldos_anuais').select('*').order('ano', { ascending: false }),
      ]);

      if (configRes.error) throw configRes.error;
      if (saldosRes.error) throw saldosRes.error;

      if (configRes.data) {
        setConfig(configRes.data);
      }

      setSaldos(saldosRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveConfig() {
    setSavingConfig(true);
    try {
      if (config.id) {
        const { error } = await supabase
          .from('configuracoes')
          .update({
            nome_condominio: config.nome_condominio,
            nipc: config.nipc,
            morada: config.morada,
            email_administrador: config.email_administrador,
          })
          .eq('id', config.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('configuracoes')
          .insert({
            nome_condominio: config.nome_condominio,
            nipc: config.nipc,
            morada: config.morada,
            email_administrador: config.email_administrador,
          })
          .select()
          .single();

        if (error) throw error;
        setConfig(data);
      }

      toast.success('Configurações guardadas com sucesso');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Erro ao guardar configurações');
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleAddSaldoYear() {
    if (saldos.some(s => s.ano === newSaldoYear)) {
      toast.error(`Já existe um saldo para o ano ${newSaldoYear}`);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('saldos_anuais')
        .insert({
          ano: newSaldoYear,
          saldo_caixa: 0,
          saldo_conta_ordem: 0,
          saldo_fundo_reserva: 0,
        })
        .select()
        .single();

      if (error) throw error;

      setSaldos([data, ...saldos]);
      toast.success(`Saldo para ${newSaldoYear} criado`);
    } catch (error) {
      console.error('Error adding saldo year:', error);
      toast.error('Erro ao adicionar ano');
    }
  }

  async function handleSaveSaldo(saldo: SaldoAnual) {
    setSavingSaldos(true);
    try {
      const { error } = await supabase
        .from('saldos_anuais')
        .update({
          saldo_caixa: saldo.saldo_caixa,
          saldo_conta_ordem: saldo.saldo_conta_ordem,
          saldo_fundo_reserva: saldo.saldo_fundo_reserva,
          notas_balanco: saldo.notas_balanco,
        })
        .eq('id', saldo.id);

      if (error) throw error;
      toast.success(`Saldo ${saldo.ano} guardado`);
    } catch (error) {
      console.error('Error saving saldo:', error);
      toast.error('Erro ao guardar saldo');
    } finally {
      setSavingSaldos(false);
    }
  }

  function updateSaldo(id: string, field: keyof SaldoAnual, value: number | string) {
    setSaldos(saldos.map(s =>
      s.id === id ? { ...s, [field]: value } : s
    ));
  }

  if (loading) {
    return <Loading message="A carregar configurações..." />;
  }

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-500 mt-1">Configurações do condomínio e saldos anuais</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Dados do Condomínio</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <Input
                  label="Nome do Condomínio"
                  value={config.nome_condominio || ''}
                  onChange={(e) => setConfig({ ...config, nome_condominio: e.target.value })}
                  placeholder="Ex: Edifício Jardins da Cidade"
                />
                <Input
                  label="NIPC"
                  value={config.nipc || ''}
                  onChange={(e) => setConfig({ ...config, nipc: e.target.value })}
                  placeholder="Ex: 501234567"
                />
              </div>

              <Input
                label="Morada"
                value={config.morada || ''}
                onChange={(e) => setConfig({ ...config, morada: e.target.value })}
                placeholder="Rua, Número, Código Postal, Localidade"
              />

              <Input
                label="Email do Administrador"
                type="email"
                value={config.email_administrador || ''}
                onChange={(e) => setConfig({ ...config, email_administrador: e.target.value })}
                placeholder="email@exemplo.com"
              />

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleSaveConfig} loading={savingConfig}>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Configurações
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Saldos Iniciais por Ano</h2>
              <div className="flex items-center gap-3">
                <select
                  value={newSaldoYear}
                  onChange={(e) => setNewSaldoYear(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <Button size="sm" onClick={handleAddSaldoYear}>
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar Ano
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {saldos.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                Nenhum saldo anual registado. Adicione um ano para começar.
              </p>
            ) : (
              <div className="space-y-6">
                {saldos.map((saldo) => (
                  <div key={saldo.id} className="border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Saldo Inicial {saldo.ano} (01/01/{saldo.ano})</h3>
                    <div className="grid grid-cols-3 gap-6 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Caixa</label>
                        <input
                          type="number"
                          step="0.01"
                          value={saldo.saldo_caixa}
                          onChange={(e) => updateSaldo(saldo.id, 'saldo_caixa', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Conta à Ordem</label>
                        <input
                          type="number"
                          step="0.01"
                          value={saldo.saldo_conta_ordem}
                          onChange={(e) => updateSaldo(saldo.id, 'saldo_conta_ordem', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fundo Comum de Reserva</label>
                        <input
                          type="number"
                          step="0.01"
                          value={saldo.saldo_fundo_reserva}
                          onChange={(e) => updateSaldo(saldo.id, 'saldo_fundo_reserva', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Total: <span className="font-semibold text-gray-900">
                          {formatCurrency(saldo.saldo_caixa + saldo.saldo_conta_ordem + saldo.saldo_fundo_reserva)}
                        </span>
                      </div>
                      <Button size="sm" onClick={() => handleSaveSaldo(saldo)} loading={savingSaldos}>
                        Guardar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

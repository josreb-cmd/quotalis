import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, UserMinus, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { formatDate, addMonths } from '../lib/utils';
import Card, { CardHeader, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Loading from '../components/ui/Loading';
import Badge from '../components/ui/Badge';
import { Table, TableHead, TableBody, TableRow, TableCell } from '../components/ui/Table';
import type { Administrador, Fracao } from '../types/database';

interface AdministradorWithFracao extends Administrador {
  fracao?: Fracao;
}

export default function Administradores() {
  const [administradores, setAdministradores] = useState<AdministradorWithFracao[]>([]);
  const [fracoes, setFracoes] = useState<Fracao[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRenunciaModalOpen, setIsRenunciaModalOpen] = useState(false);
  const [isSubstituicaoModalOpen, setIsSubstituicaoModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Partial<Administrador> | null>(null);
  const [renunciandoAdmin, setRenunciandoAdmin] = useState<Administrador | null>(null);
  const [substituindoAdmin, setSubstituindoAdmin] = useState<Administrador | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedFracaoId, setSelectedFracaoId] = useState('');
  const [dataRenuncia, setDataRenuncia] = useState('');
  const [novaFracaoId, setNovaFracaoId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [adminRes, fracoesRes] = await Promise.all([
        supabase.from('administradores').select('*').order('data_eleicao', { ascending: false }),
        supabase.from('fracoes').select('*').eq('ativa', true).order('fracao'),
      ]);

      if (adminRes.error) throw adminRes.error;
      if (fracoesRes.error) throw fracoesRes.error;

      const fracoesData = fracoesRes.data || [];
      setFracoes(fracoesData);

      const adminWithFracao = (adminRes.data || []).map(a => ({
        ...a,
        fracao: fracoesData.find(f => f.id === a.id_fracao),
      }));

      setAdministradores(adminWithFracao);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endIsencao = addMonths(firstOfMonth, 12);

    setEditingAdmin({
      data_eleicao: today.toISOString().split('T')[0],
      inicio_isencao: firstOfMonth.toISOString().split('T')[0],
      fim_isencao: endIsencao.toISOString().split('T')[0],
    });
    setSelectedFracaoId('');
    setErrors({});
    setIsModalOpen(true);
  }

  function openRenunciaModal(admin: Administrador) {
    setRenunciandoAdmin(admin);
    setDataRenuncia(new Date().toISOString().split('T')[0]);
    setIsRenunciaModalOpen(true);
  }

  function openSubstituicaoModal(admin: Administrador) {
    setSubstituindoAdmin(admin);
    setNovaFracaoId('');
    setIsSubstituicaoModalOpen(true);
  }

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    if (!selectedFracaoId) {
      newErrors.id_fracao = 'Selecione uma fração';
    }
    if (!editingAdmin?.data_eleicao) {
      newErrors.data_eleicao = 'Data de eleição é obrigatória';
    }

    const activeAdmins = administradores.filter(a => !a.data_renuncia);
    if (activeAdmins.length >= 2 && !editingAdmin?.id) {
      newErrors.limite = 'Já existem 2 administradores ativos. Registe uma renúncia primeiro.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const adminData = {
        id_fracao: selectedFracaoId,
        data_eleicao: editingAdmin?.data_eleicao,
        inicio_isencao: editingAdmin?.inicio_isencao,
        fim_isencao: editingAdmin?.fim_isencao,
        data_renuncia: null,
        id_substitui: null,
      };

      if (editingAdmin?.id) {
        const { error } = await supabase
          .from('administradores')
          .update(adminData)
          .eq('id', editingAdmin.id);

        if (error) throw error;
        toast.success('Administrador atualizado com sucesso');
      } else {
        const { error } = await supabase.from('administradores').insert(adminData);

        if (error) throw error;
        toast.success('Administrador registado com sucesso');
      }

      setIsModalOpen(false);
      setEditingAdmin(null);
      loadData();
    } catch (error) {
      console.error('Error saving administrador:', error);
      toast.error('Erro ao guardar administrador');
    } finally {
      setSaving(false);
    }
  }

  async function handleRenuncia() {
    if (!renunciandoAdmin || !dataRenuncia) {
      toast.error('Selecione uma data de renúncia');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('administradores')
        .update({
          data_renuncia: dataRenuncia,
          fim_isencao: dataRenuncia,
        })
        .eq('id', renunciandoAdmin.id);

      if (error) throw error;
      toast.success('Renúncia registada com sucesso');
      setIsRenunciaModalOpen(false);
      setRenunciandoAdmin(null);
      loadData();
    } catch (error) {
      console.error('Error registering renuncia:', error);
      toast.error('Erro ao registar renúncia');
    } finally {
      setSaving(false);
    }
  }

  async function handleSubstituicao() {
    if (!substituindoAdmin || !novaFracaoId) {
      toast.error('Selecione uma fração para o substituto');
      return;
    }

    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      const { error: renunciaError } = await supabase
        .from('administradores')
        .update({
          data_renuncia: today,
          fim_isencao: today,
        })
        .eq('id', substituindoAdmin.id);

      if (renunciaError) throw renunciaError;

      const { error: insertError } = await supabase
        .from('administradores')
        .insert({
          id_fracao: novaFracaoId,
          data_eleicao: today,
          inicio_isencao: today,
          fim_isencao: substituindoAdmin.fim_isencao,
          id_substitui: substituindoAdmin.id,
        });

      if (insertError) throw insertError;

      toast.success('Substituição registada com sucesso');
      setIsSubstituicaoModalOpen(false);
      setSubstituindoAdmin(null);
      loadData();
    } catch (error) {
      console.error('Error registering substituicao:', error);
      toast.error('Erro ao registar substituição');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(admin: Administrador) {
    if (!confirm('Tem a certeza que deseja eliminar este registo?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('administradores')
        .delete()
        .eq('id', admin.id);

      if (error) throw error;
      toast.success('Registo eliminado com sucesso');
      loadData();
    } catch (error) {
      console.error('Error deleting administrador:', error);
      toast.error('Erro ao eliminar registo');
    }
  }

  const activeAdmins = administradores.filter(a => !a.data_renuncia);
  const formerAdmins = administradores.filter(a => a.data_renuncia);

  const availableFracoes = fracoes.filter(f =>
    !activeAdmins.some(a => a.id_fracao === f.id)
  );

  if (loading) {
    return <Loading message="A carregar administradores..." />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Administradores</h1>
          <p className="text-gray-500 mt-1">Gestão de administradores e isenções</p>
        </div>
        <Button onClick={openCreateModal} disabled={activeAdmins.length >= 2}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Administrador
        </Button>
      </div>

      {activeAdmins.length >= 2 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800">
            Já existem 2 administradores ativos. Para adicionar um novo, registe primeiro uma renúncia ou substituição.
          </p>
        </div>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Administradores Ativos</h2>
          </CardHeader>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell header>Fração</TableCell>
                <TableCell header>Condómino</TableCell>
                <TableCell header>Data de Eleição</TableCell>
                <TableCell header>Início Isenção</TableCell>
                <TableCell header>Fim Isenção</TableCell>
                <TableCell header>Estado</TableCell>
                <TableCell header className="text-right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {activeAdmins.map((admin) => {
                const isIsento = new Date() >= new Date(admin.inicio_isencao) &&
                  new Date() <= new Date(admin.fim_isencao);
                return (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.fracao?.fracao || '-'}</TableCell>
                    <TableCell>{admin.fracao?.nome_condomino || '-'}</TableCell>
                    <TableCell>{formatDate(admin.data_eleicao)}</TableCell>
                    <TableCell>{formatDate(admin.inicio_isencao)}</TableCell>
                    <TableCell>{formatDate(admin.fim_isencao)}</TableCell>
                    <TableCell>
                      <Badge variant={isIsento ? 'success' : 'gray'}>
                        {isIsento ? 'Isento' : 'Isenção terminada'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openSubstituicaoModal(admin)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Substituir"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openRenunciaModal(admin)}
                          className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Registar renúncia"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(admin)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {activeAdmins.length === 0 && (
                <TableRow>
                  <TableCell className="text-center text-gray-500 py-8" colSpan={7}>
                    Nenhum administrador ativo
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        {formerAdmins.length > 0 && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Histórico de Administradores</h2>
            </CardHeader>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell header>Fração</TableCell>
                  <TableCell header>Condómino</TableCell>
                  <TableCell header>Data de Eleição</TableCell>
                  <TableCell header>Data de Renúncia</TableCell>
                  <TableCell header>Substituído</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {formerAdmins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.fracao?.fracao || '-'}</TableCell>
                    <TableCell>{admin.fracao?.nome_condomino || '-'}</TableCell>
                    <TableCell>{formatDate(admin.data_eleicao)}</TableCell>
                    <TableCell>{formatDate(admin.data_renuncia!)}</TableCell>
                    <TableCell>
                      {admin.id_substitui ? (
                        <Badge variant="info">Sim</Badge>
                      ) : (
                        <Badge variant="gray">Não</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Administrador"
        size="md"
      >
        <div className="space-y-6">
          {errors.limite && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {errors.limite}
            </div>
          )}

          <Select
            label="Fração"
            value={selectedFracaoId}
            onChange={(e) => setSelectedFracaoId(e.target.value)}
            options={availableFracoes.map(f => ({
              value: f.id,
              label: `${f.fracao} - ${f.nome_condomino}`,
            }))}
            placeholder="Selecionar fração..."
            error={errors.id_fracao}
          />

          <Input
            label="Data de Eleição"
            type="date"
            value={editingAdmin?.data_eleicao || ''}
            onChange={(e) => {
              const newDate = e.target.value;
              const d = new Date(newDate);
              const firstOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
              const endIsencao = addMonths(firstOfMonth, 12);
              setEditingAdmin({
                ...editingAdmin,
                data_eleicao: newDate,
                inicio_isencao: firstOfMonth.toISOString().split('T')[0],
                fim_isencao: endIsencao.toISOString().split('T')[0],
              });
            }}
            error={errors.data_eleicao}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Início Isenção"
              type="date"
              value={editingAdmin?.inicio_isencao || ''}
              onChange={(e) => setEditingAdmin({ ...editingAdmin, inicio_isencao: e.target.value })}
              disabled
            />
            <Input
              label="Fim Isenção"
              type="date"
              value={editingAdmin?.fim_isencao || ''}
              onChange={(e) => setEditingAdmin({ ...editingAdmin, fim_isencao: e.target.value })}
            />
          </div>

          <p className="text-sm text-gray-500">
            A isenção inicia no primeiro dia do mês de eleição e termina 12 meses depois.
          </p>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={saving}>
              Registar Administrador
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isRenunciaModalOpen}
        onClose={() => setIsRenunciaModalOpen(false)}
        title="Registar Renúncia"
        size="sm"
      >
        <div className="space-y-6">
          <p className="text-gray-600">
            Registar renúncia de <strong>{renunciandoAdmin?.fracao?.nome_condomino}</strong> ({renunciandoAdmin?.fracao?.fracao}).
          </p>
          <p className="text-sm text-gray-500">
            A isenção terminará na data de renúncia.
          </p>

          <Input
            label="Data de Renúncia"
            type="date"
            value={dataRenuncia}
            onChange={(e) => setDataRenuncia(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setIsRenunciaModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleRenuncia} loading={saving}>
              Registar Renúncia
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isSubstituicaoModalOpen}
        onClose={() => setIsSubstituicaoModalOpen(false)}
        title="Substituir Administrador"
        size="md"
      >
        <div className="space-y-6">
          <p className="text-gray-600">
            Substituir <strong>{substituindoAdmin?.fracao?.nome_condomino}</strong> ({substituindoAdmin?.fracao?.fracao}).
          </p>
          <p className="text-sm text-gray-500">
            O novo administrador herdará o período de isenção restante (até {substituindoAdmin?.fim_isencao ? formatDate(substituindoAdmin.fim_isencao) : '-'}).
          </p>

          <Select
            label="Nova Fração (Substituto)"
            value={novaFracaoId}
            onChange={(e) => setNovaFracaoId(e.target.value)}
            options={availableFracoes.map(f => ({
              value: f.id,
              label: `${f.fracao} - ${f.nome_condomino}`,
            }))}
            placeholder="Selecionar fração..."
          />

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setIsSubstituicaoModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubstituicao} loading={saving}>
              Confirmar Substituição
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

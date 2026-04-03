import { useEffect, useState } from 'react';
import { FileDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatNumber, MONTHS_SHORT_PT } from '../lib/utils';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Loading from '../components/ui/Loading';
import BalancoAnual from '../components/relatorios/BalancoAnual';
import MapaCobrancas from '../components/relatorios/MapaCobrancas';
import MapaDespesas from '../components/relatorios/MapaDespesas';
import OrcamentoAnual from '../components/relatorios/OrcamentoAnual';

const tabs = [
  { id: 'balanco', label: 'Balanço Anual' },
  { id: 'cobrancas', label: 'Mapa de Cobranças' },
  { id: 'despesas', label: 'Mapa de Despesas' },
  { id: 'orcamento', label: 'Orçamento Anual' },
];

export default function Relatorios() {
  const [activeTab, setActiveTab] = useState('balanco');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-gray-500 mt-1">Relatórios financeiros e mapas de gestão</p>
        </div>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {years.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#1e40af] text-[#1e40af]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'balanco' && <BalancoAnual year={selectedYear} />}
      {activeTab === 'cobrancas' && <MapaCobrancas year={selectedYear} />}
      {activeTab === 'despesas' && <MapaDespesas year={selectedYear} />}
      {activeTab === 'orcamento' && <OrcamentoAnual year={selectedYear} />}
    </div>
  );
}

import { NavLink } from 'react-router-dom';
import {
  Home,
  Building2,
  Wallet,
  Zap,
  CreditCard,
  Receipt,
  UserCog,
  BarChart3,
  Settings,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: Home, label: 'Painel' },
  { to: '/fracoes', icon: Building2, label: 'Frações' },
  { to: '/quotas-mensais', icon: Wallet, label: 'Quotas Mensais' },
  { to: '/quotas-extraordinarias', icon: Zap, label: 'Quotas Extraordinárias' },
  { to: '/pagamentos', icon: CreditCard, label: 'Pagamentos' },
  { to: '/despesas', icon: Receipt, label: 'Despesas' },
  { to: '/administradores', icon: UserCog, label: 'Administradores' },
  { to: '/relatorios', icon: BarChart3, label: 'Relatórios' },
  { to: '/configuracoes', icon: Settings, label: 'Configurações' },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[#1e40af] text-white flex flex-col z-50">
      <div className="p-6 border-b border-blue-700">
        <h1 className="text-2xl font-bold tracking-tight">Quotalis</h1>
        <p className="text-blue-200 text-sm mt-1">Gestão de Condomínios</p>
      </div>
      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-700 text-white border-r-4 border-white'
                  : 'text-blue-100 hover:bg-blue-700/50 hover:text-white'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-blue-700">
        <p className="text-xs text-blue-200 text-center">v1.0.0</p>
      </div>
    </aside>
  );
}

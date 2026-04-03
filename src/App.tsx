import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import Fracoes from './pages/Fracoes';
import QuotasMensais from './pages/QuotasMensais';
import QuotasExtraordinarias from './pages/QuotasExtraordinarias';
import Pagamentos from './pages/Pagamentos';
import Despesas from './pages/Despesas';
import Administradores from './pages/Administradores';
import Relatorios from './pages/Relatorios';
import Configuracoes from './pages/Configuracoes';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '8px',
            background: '#333',
            color: '#fff',
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="fracoes" element={<Fracoes />} />
          <Route path="quotas-mensais" element={<QuotasMensais />} />
          <Route path="quotas-extraordinarias" element={<QuotasExtraordinarias />} />
          <Route path="pagamentos" element={<Pagamentos />} />
          <Route path="despesas" element={<Despesas />} />
          <Route path="administradores" element={<Administradores />} />
          <Route path="relatorios" element={<Relatorios />} />
          <Route path="configuracoes" element={<Configuracoes />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

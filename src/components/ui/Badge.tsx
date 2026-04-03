import { cn } from '../../lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple' | 'gray' | 'orange';
}

const variantClasses = {
  default: 'bg-gray-100 text-gray-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  purple: 'bg-purple-100 text-purple-800',
  gray: 'bg-gray-100 text-gray-800',
  orange: 'bg-orange-100 text-orange-800',
};

export default function Badge({ children, className, variant = 'default' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function getEstadoBadgeVariant(estado: string): BadgeProps['variant'] {
  switch (estado) {
    case 'Pago':
      return 'success';
    case 'Pendente':
      return 'info';
    case 'Atraso':
      return 'error';
    case 'Parcial':
      return 'warning';
    case 'Atraso Parcial':
      return 'orange';
    case 'Crédito':
      return 'purple';
    case 'Isento':
      return 'gray';
    default:
      return 'default';
  }
}

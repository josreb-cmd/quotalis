import { Loader2 } from 'lucide-react';

interface LoadingProps {
  message?: string;
}

export default function Loading({ message = 'A carregar...' }: LoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="w-8 h-8 text-[#1e40af] animate-spin" />
      <p className="mt-4 text-sm text-gray-500">{message}</p>
    </div>
  );
}

export function LoadingOverlay({ message = 'A carregar...' }: LoadingProps) {
  return (
    <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-50">
      <div className="flex flex-col items-center">
        <Loader2 className="w-10 h-10 text-[#1e40af] animate-spin" />
        <p className="mt-4 text-gray-600">{message}</p>
      </div>
    </div>
  );
}

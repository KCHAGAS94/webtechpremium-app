import { MacExistsStatus } from '@/lib/use-mac-exists';

export function MacStatus({ status }: { status: MacExistsStatus }) {
  if (status === 'checking') {
    return <p className="text-xs text-gray-500 mt-1">Verificando…</p>;
  }
  if (status === 'valid') {
    return <p className="text-xs text-green-600 mt-1">✅ MAC válido</p>;
  }
  if (status === 'invalid') {
    return <p className="text-xs text-red-600 mt-1">Adicione um MAC válido</p>;
  }
  return null;
}

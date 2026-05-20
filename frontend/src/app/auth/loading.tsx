import { SpinnerCarga } from '@/components/ui/SpinnerCarga';

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <SpinnerCarga />
    </div>
  );
}
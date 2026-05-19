'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { useAuthStore } from '@/stores/auth.store';

export default function Dashboard() {
	const router = useRouter();
	const { usuario, estaCargando } = useAuthStore();

	useEffect(() => {
		if (!estaCargando && usuario) {
			if (usuario.rol === 'SECRETARIA') {
				router.replace('/dashboard/secretaria/ambientes');
			} else if (usuario.rol === 'DOCENTE') {
				router.replace('/dashboard/docente');
			} else {
				router.replace('/dashboard/admin');
			}
		}
	}, [estaCargando, router, usuario]);

	return <SpinnerCarga />;
}

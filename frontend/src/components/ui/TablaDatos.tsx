'use client';

import React from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { Edit2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utilidades';

interface Columna {
  clave: string;
  titulo: string;
  render?: (item: any) => React.ReactNode;
}

interface TablaDatosProps {
  columnas: Columna[];
  datos: any[];
  alHacerClick?: (item: any) => void;
  alEditar?: (item: any) => void;
  alEliminar?: (item: any) => void;
  loading?: boolean;
}

export function TablaDatos({ 
  columnas, 
  datos, 
  alHacerClick, 
  alEditar, 
  alEliminar,
  loading 
}: TablaDatosProps) {
  const usuario = useAuthStore(state => state.usuario);
  const esAdmin = usuario?.rol === 'ADMINISTRADOR';

  if (loading) {
    return (
      <div className="w-full space-y-4 p-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 w-full bg-slate-100 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (!datos || datos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <p className="text-lg font-medium">No se encontraron resultados</p>
        <p className="text-sm">Intenta ajustar tu búsqueda o agregar nuevos elementos.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-gray-100">
              {columnas.map((col) => (
                <th key={col.clave} className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {col.titulo}
                </th>
              ))}
              {(esAdmin && (alEditar || alEliminar)) && (
                <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {datos.map((item, index) => (
              <tr
                key={item.id || index}
                className={cn(
                  "group transition-all duration-200 hover:bg-slate-50/50",
                  alHacerClick ? "cursor-pointer" : ""
                )}
                onClick={() => alHacerClick?.(item)}
              >
                {columnas.map((col) => (
                  <td key={col.clave} className="px-8 py-5 text-sm text-slate-700">
                    {col.render ? col.render(item) : item[col.clave]}
                  </td>
                ))}
                {(esAdmin && (alEditar || alEliminar)) && (
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      {alEditar && (
                        <button
                          onClick={() => alEditar(item)}
                          className="p-2 text-slate-400 hover:text-unt-primary hover:bg-white rounded-xl transition-all shadow-sm hover:shadow border border-transparent hover:border-gray-100"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {alEliminar && (
                        <button
                          onClick={() => alEliminar(item)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-xl transition-all shadow-sm hover:shadow border border-transparent hover:border-gray-100"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

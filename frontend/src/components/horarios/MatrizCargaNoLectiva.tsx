'use client';

import React from 'react';
import { cn } from '@/lib/utilidades';

interface MatrizCargaNoLectivaProps {
  matriz: {
    filas: Array<{
      horaInicio: string;
      celdas: Array<{
        diaSemana: string;
        horaInicio: string;
        estado: 'LIBRE' | 'LECTIVO' | 'NO_LECTIVO' | 'BLOQUEO_ALMUERZO';
        info?: {
          origen?: string;
          seccion?: string;
        };
      }>;
    }>;
  };
  alHacerClickCelda: (dia: string, hora: string) => void;
  bloqueado?: boolean;
}

const DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

export function MatrizCargaNoLectiva({ matriz, alHacerClickCelda, bloqueado = false }: MatrizCargaNoLectivaProps) {
  const getLabelSeccion = (clave: string) => {
    return clave.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full border-collapse text-left text-xs">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="border-r border-slate-200 px-4 py-3 font-bold text-slate-500 text-center w-24">Hora</th>
            {DIAS.map((dia) => (
              <th key={dia} className="border-r border-slate-200 px-4 py-3 font-bold text-slate-600 text-center uppercase tracking-wider">
                {dia}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {matriz.filas.map((fila, idx) => (
            <tr key={idx} className="group hover:bg-slate-50/30 transition-colors">
              <td className="border-r border-slate-200 px-3 py-2 font-bold text-slate-400 text-center bg-slate-50/50">
                {fila.horaInicio}
              </td>
              {fila.celdas.map((celda, cIdx) => {
                const isClickable = celda.estado === 'LIBRE' || celda.estado === 'NO_LECTIVO';
                
                return (
                  <td
                    key={cIdx}
                    onClick={() => !bloqueado && isClickable && alHacerClickCelda(celda.diaSemana, celda.horaInicio)}
                    className={cn(
                      "border-r border-slate-100 p-0.5 transition-all duration-200 relative",
                      isClickable && !bloqueado ? "cursor-pointer group/celda" : "cursor-default",
                      celda.estado === 'LIBRE' && "bg-white hover:bg-indigo-50/50",
                      celda.estado === 'LECTIVO' && "bg-slate-100 text-slate-400",
                      celda.estado === 'NO_LECTIVO' && "bg-indigo-50 border-indigo-200",
                      celda.estado === 'BLOQUEO_ALMUERZO' && "bg-amber-50/30 text-amber-400"
                    )}
                  >
                    <div className="min-h-[42px] flex flex-col items-center justify-center p-1 text-center">
                      {celda.estado === 'LECTIVO' && (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Lectivo</span>
                          <span className="text-[8px] font-medium leading-none opacity-70 line-clamp-2">{celda.info?.origen}</span>
                        </div>
                      )}
                      
                      {celda.estado === 'NO_LECTIVO' && (
                        <div className="flex flex-col gap-0.5 animate-in zoom-in-95 duration-200">
                          <span className="text-[9px] font-black text-indigo-600 uppercase tracking-tighter">No Lectivo</span>
                          <span className="text-[8px] font-bold text-indigo-900 leading-none line-clamp-2">
                            {celda.info?.seccion ? getLabelSeccion(celda.info.seccion) : ''}
                          </span>
                        </div>
                      )}

                      {celda.estado === 'BLOQUEO_ALMUERZO' && (
                        <span className="text-[9px] font-bold opacity-40">Almuerzo</span>
                      )}

                      {celda.estado === 'LIBRE' && !bloqueado && (
                        <span className="text-indigo-300 font-bold text-lg opacity-0 group-hover/celda:opacity-100 transition-opacity">+</span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

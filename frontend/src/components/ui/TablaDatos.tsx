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
}

export function TablaDatos({ columnas, datos, alHacerClick, alEditar, alEliminar }: TablaDatosProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead>
          <tr className="bg-gray-100">
            {columnas.map((col) => (
              <th key={col.clave} className="px-4 py-2 text-left text-sm font-medium text-gray-600">
                {col.titulo}
              </th>
            ))}
            {(alEditar || alEliminar) && (
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">
                Acciones
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {datos.map((item, index) => (
            <tr
              key={item.id || index}
              className="border-t hover:bg-gray-50"
              onClick={() => alHacerClick?.(item)}
            >
              {columnas.map((col) => (
                <td key={col.clave} className="px-4 py-2 text-sm">
                  {col.render ? col.render(item) : item[col.clave]}
                </td>
              ))}
              {(alEditar || alEliminar) && (
                <td className="px-4 py-2 text-sm">
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {alEditar && (
                      <button
                        onClick={() => alEditar(item)}
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                      >
                        Editar
                      </button>
                    )}
                    {alEliminar && (
                      <button
                        onClick={() => alEliminar(item)}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
                      >
                        Eliminar
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
  );
}
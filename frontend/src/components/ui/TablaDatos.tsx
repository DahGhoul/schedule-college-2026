interface Columna {
  clave: string;
  titulo: string;
  render?: (item: any) => React.ReactNode;
}

interface TablaDatosProps {
  columnas: Columna[];
  datos: any[];
  alHacerClick?: (item: any) => void;
}

export function TablaDatos({ columnas, datos, alHacerClick }: TablaDatosProps) {
  return (
    <table className="min-w-full bg-white border border-gray-200">
      <thead>
        <tr className="bg-gray-100">
          {columnas.map((col) => (
            <th key={col.clave} className="px-4 py-2 text-left text-sm font-medium text-gray-600">
              {col.titulo}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {datos.map((item, index) => (
          <tr
            key={item.id || index}
            className="border-t hover:bg-gray-50 cursor-pointer"
            onClick={() => alHacerClick?.(item)}
          >
            {columnas.map((col) => (
              <td key={col.clave} className="px-4 py-2 text-sm">
                {col.render ? col.render(item) : item[col.clave]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
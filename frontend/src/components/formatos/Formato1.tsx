import React from 'react';

type Props = {
  data: any;
  isSedeCentral: boolean;
};

export const Formato1: React.FC<Props> = ({ data, isSedeCentral }) => {
  const { docente, declaracion, carga_lectiva } = data;
  const secciones = declaracion?.secciones || [];
  
  const getHoras = (clave: string) => {
    const sec = secciones.find((s: any) => s.seccion === clave);
    return sec ? Number(sec.horas_declaradas) : 0;
  };
  
  const getDescripcion = (clave: string) => {
    const sec = secciones.find((s: any) => s.seccion === clave);
    return sec?.descripcion || '';
  };
  
  const horasTotales = Number(declaracion?.total_horas ?? 0);
  
  const dateObj = new Date();
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const fechaHoy = `Trujillo, ${dateObj.getDate()} de ${meses[dateObj.getMonth()]} del ${dateObj.getFullYear()}`;

  return (
    <div className="bg-white font-serif text-black min-h-[29.7cm] max-w-[21cm] mx-auto p-[2cm_2.5cm] relative box-border print:p-[2cm_2.5cm] print:m-0 print:w-[21cm] print:h-[29.7cm]">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Tinos:ital,wght@0,400;0,700;1,400;1,700&display=swap');
        * { font-family: 'Tinos', 'Times New Roman', serif; }
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { -webkit-print-color-adjust: exact; background: white; margin: 0; padding: 0; }
        }
        table { border-collapse: collapse; width: 100%; margin-bottom: 8px; }
        .border-tbl td, .border-tbl th { border: 1px solid #000; padding: 3px 5px; vertical-align: top; }
        .header-gray { background: #f0f0f0 !important; }
      `}} />

      <div className="text-center font-bold uppercase leading-tight mb-4 text-[13px]">
        FORMATO N° 1<br />
        DECLARACIÓN DE CARGA HORARIA ASIGNADA {isSedeCentral ? '' : '(SEDES DESCONCENTRADAS)'}
      </div>

      <div className="font-bold mb-1 text-[11px]">I. DATOS SOBRE LA SITUACIÓN DEL PROFESOR:</div>

      <table className="border-tbl text-[11px]">
        <tbody>
          <tr className="header-gray">
            <td className="font-bold w-[25%]">FACULTAD:</td>
            <td>Ingeniería</td>
          </tr>
          <tr className="header-gray">
            <td className="font-bold">DPTO. ACADÉMICO:</td>
            <td>Dpto. de Ingeniería de Sistemas</td>
          </tr>
        </tbody>
      </table>

      <table className="border-tbl text-[11px] text-center">
        <thead>
          <tr className="header-gray font-bold">
            <th className="w-[45%]">NOMBRE COMPLETO</th>
            <th>CONDICIÓN</th>
            <th>CATEGORÍA</th>
            <th>MODALIDAD</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="uppercase text-left">{docente?.nombres} {docente?.apellidos}</td>
            <td className="uppercase">Nombrado</td>
            <td className="uppercase">Asociado</td>
            <td className="uppercase">{docente?.dedicacion?.replace(/_/g, ' ')}</td>
          </tr>
        </tbody>
      </table>

      <table className="border-tbl text-[11px] text-center mt-2 mb-2">
        <tbody>
          <tr className="header-gray">
            <td><b>AÑO ACADÉMICO:</b> 2026</td>
            <td><b>CICLO (SEM):</b> I</td>
            <td><b>INICIO:</b> Pendiente</td>
            <td><b>FINAL:</b> Pendiente</td>
          </tr>
        </tbody>
      </table>

      <table className="border-tbl text-[10.5px]">
        <thead>
          <tr>
            <td colSpan={9} className="bg-gray-100 font-bold">
              1. TRABAJO LECTIVO.- Datos completos y con claridad
            </td>
          </tr>
          <tr className="header-gray text-center font-bold">
            <th className="w-[8%]">CODIGO</th>
            <th className="w-[30%]">NOMBRE DEL CURSO</th>
            <th>CUR.</th>
            <th>ESCUELA PROF.</th>
            <th>CIC.</th>
            <th>COMP.</th>
            <th>N° AL.</th>
            <th>HORAS</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {carga_lectiva?.length > 0 ? (
            carga_lectiva.map((curso: any, index: number) => (
              <tr key={index} className="text-center">
                <td>{curso.curso_codigo}</td>
                <td className="text-left text-[9.5px] uppercase">{curso.curso_nombre}</td>
                <td>OB</td>
                <td>Ing. Sistemas</td>
                <td>{curso.ciclo}</td>
                <td className="uppercase">{curso.componente?.substring(0, 3)}</td>
                <td>50</td>
                <td className="font-bold">{curso.horas}</td>
                <td className="font-bold">{curso.horas}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={9} className="text-center py-2 italic text-gray-500">No hay carga lectiva registrada en este periodo.</td>
            </tr>
          )}
          
          {/* Secciones no lectivas - 3 columnas */}
          <tr className="text-[10px]">
            <td colSpan={4}><b>2. PREPARACIÓN Y EVALUACIÓN</b> (Max 50% de Trabajo Lectivo)</td>
            <td colSpan={4} className="text-[#333] whitespace-pre-wrap font-mono text-[9px]">{getDescripcion('PREPARACION_EVALUACION')}</td>
            <td className="text-center font-bold text-[12px]">{getHoras('PREPARACION_EVALUACION')}</td>
          </tr>
          <tr className="text-[10px]">
            <td colSpan={4}><b>3. CONSEJERÍA:</b> Señalar número de alumnos y el ciclo académico con los que se desarrolla.</td>
            <td colSpan={4} className="text-[#333] whitespace-pre-wrap font-mono text-[9px]">{getDescripcion('CONSEJERIA_TUTORIA')}</td>
            <td className="text-center font-bold text-[12px]">{getHoras('CONSEJERIA_TUTORIA')}</td>
          </tr>
          <tr className="text-[10px]">
            <td colSpan={4}><b>4. INVESTIGACIÓN:</b> Consignar el N° de inscripción, código, nombre y duración del proyecto.</td>
            <td colSpan={4} className="text-[#333] whitespace-pre-wrap font-mono text-[9px]">{getDescripcion('INVESTIGACION')}</td>
            <td className="text-center font-bold text-[12px]">{getHoras('INVESTIGACION')}</td>
          </tr>
          <tr className="text-[10px]">
            <td colSpan={4}><b>5. CAPACITACIÓN:</b> Señale lo referente a este rubro en el marco de los planes de cada Facultad.</td>
            <td colSpan={4} className="text-[#333] whitespace-pre-wrap font-mono text-[9px]">{getDescripcion('CAPACITACION')}</td>
            <td className="text-center font-bold text-[12px]">{getHoras('CAPACITACION')}</td>
          </tr>
          <tr className="text-[10px]">
            <td colSpan={4}><b>6. ACTIVIDADES DE GOBIERNO:</b> Si desempeña cargo indique.</td>
            <td colSpan={4} className="text-[#333] whitespace-pre-wrap font-mono text-[9px]">{getDescripcion('ACTIVIDADES_GOBIERNO')}</td>
            <td className="text-center font-bold text-[12px]">{getHoras('ACTIVIDADES_GOBIERNO')}</td>
          </tr>
          <tr className="text-[10px]">
            <td colSpan={4}><b>7. ACTIVIDADES DE ADMINISTRACIÓN:</b> Si desempeña cargo indique.</td>
            <td colSpan={4} className="text-[#333] whitespace-pre-wrap font-mono text-[9px]">{getDescripcion('ACTIVIDADES_ADMINISTRACION')}</td>
            <td className="text-center font-bold text-[12px]">{getHoras('ACTIVIDADES_ADMINISTRACION')}</td>
          </tr>
          <tr className="text-[10px]">
            <td colSpan={4}><b>8. ASESORÍA DE TESIS, EXÁMENES PROF. Y EXP. PROF.:</b> Indicar el número de Resolución Decanal.</td>
            <td colSpan={4} className="text-[#333] whitespace-pre-wrap font-mono text-[9px]">{getDescripcion('ASESORIA_TESIS')}</td>
            <td className="text-center font-bold text-[12px]">{getHoras('ASESORIA_TESIS')}</td>
          </tr>
          <tr className="text-[10px]">
            <td colSpan={4}><b>9. RESPONSABILIDAD SOCIAL UNIVERSITARIA:</b> Señalar actividad, proyecto o programa a ejecutarse.</td>
            <td colSpan={4} className="text-[#333] whitespace-pre-wrap font-mono text-[9px]">{getDescripcion('RESPONSABILIDAD_SOCIAL')}</td>
            <td className="text-center font-bold text-[12px]">{getHoras('RESPONSABILIDAD_SOCIAL')}</td>
          </tr>
          <tr className="text-[10px]">
            <td colSpan={4}><b>10. COMITÉS TÉCNICOS Y COMISIONES:</b> Consignar el número de Resolución autoritativa.</td>
            <td colSpan={4} className="text-[#333] whitespace-pre-wrap font-mono text-[9px]">{getDescripcion('COMITES_COMISIONES')}</td>
            <td className="text-center font-bold text-[12px]">{getHoras('COMITES_COMISIONES')}</td>
          </tr>
          <tr>
            <td colSpan={8} className="text-right font-bold pr-4">TOTAL</td>
            <td className="text-center font-bold text-[14px]">{horasTotales}</td>
          </tr>
        </tbody>
      </table>

      <div className="text-right mt-6 mb-16 text-[12px]">
        {fechaHoy}
      </div>

      <table className="w-full text-center text-[12px]">
        <tbody>
          <tr>
            <td className="w-1/3 px-4">
              <div className="border-t border-black mb-1 mx-auto w-40"></div>
              Firma del Profesor
            </td>
            <td className="w-1/3 px-4">
              <div className="border-t border-black mb-1 mx-auto w-40"></div>
              Firma del Director de Dpto.
            </td>
            <td className="w-1/3 px-4">
              <div className="border-t border-black mb-1 mx-auto w-40"></div>
              V° B° DECANO FAC.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

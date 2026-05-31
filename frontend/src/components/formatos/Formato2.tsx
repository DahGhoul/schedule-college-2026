import React from 'react';

type Props = {
  data: any;
  isSedeCentral: boolean;
};

export const Formato2: React.FC<Props> = ({ data, isSedeCentral }) => {
  const { docente } = data;
  
  const dateObj = new Date();
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const fechaHoy = `Trujillo, ${dateObj.getDate()} de ${meses[dateObj.getMonth()]} del ${dateObj.getFullYear()}`;

  const renderSedeCentral = () => (
    <>
      <div className="text-center mb-8">
        <div className="text-[15px] uppercase">FORMATO N° 2</div>
        <div className="mt-1 text-[15px] uppercase leading-snug">
          DECLARACION JURADA DE NO ESTAR INCURSO EN CAUSALES<br />
          DE INCOMPATIBILIDAD O IMPEDIMENTO LABORAL
        </div>
      </div>

      <div className="text-justify text-[13px] leading-relaxed space-y-5">
        <p style={{textIndent: '3rem'}}>
          Yo, <strong>{docente?.nombres} {docente?.apellidos}</strong> identificado con DNI.
          Nro _________________ con Código IBM Nro {docente?.codigo_ibm} del Departamento Académico
          Dpto. de Ingeniería de Sistemas Facultad de Ingeniería; en el marco del programa de
          Homologación de la remuneración de los docentes universitarios, dispuesto por el D.U. Nro 033-2006 y D.S. Nro 019-2006-EF, DECLARO BAJO JURAMENTO Y EN HONOR A LA VERDAD, que:
        </p>

        <p style={{textIndent: '3rem'}}>
          NO ESTOY INCURSO en causales de incompatibilidad laboral y NO TENGO impedimento para ejercer la docencia en la Universidad Nacional de Trujillo, de conformidad con lo previsto en el capítulo VII de las Incompatibilidades e Impedimentos, del Título VI: Los Profesores, del Estatuto Institucional vigente.
        </p>

        <p style={{textIndent: '3rem'}}>
          Soy docente {docente?.modalidad}, a {docente?.dedicacion?.replace(/_/g, ' ')} y NO desempeño cargo público
          o privado en horas que coincidan con el horario establecido en la Universidad
          Nacional de Trujillo (De conformidad con los artículos 270ro y 277ro del
          Estatuto Institucional vigente).
        </p>

        <p style={{textIndent: '3rem'}} className="uppercase mt-8">
          EN CASO DE FALTAR A LA VERDAD ME SOMETO A LAS SANCIONES QUE SEAN
          APLICABLES DE ACUERDO A LEY; ASIMISMO, DE ENCONTRARME INCURSO EN
          SITUACION DE INCOMPATIBILIDAD O IMPEDIMENTO PARA EJERCER LA DOCENCIA
          EN LA U.N.T., ME SOMETO A LAS SANCIONES PREVISTAS POR SU ESTATUTO,
          <strong> Y AUTORIZO AL FUNCIONARIO COMPETENTE DISPONGA EL DESCUENTO DE MI
          PLANILLA DE HABERES, DEL MONTO QUE LA UNIDAD DE REMUNERACIONES
          LIQUIDE COMO PAGOS INDEBIDOS POR EL LAPSO DE TIEMPO LABORADO
          ILEGALMENTE.</strong>
        </p>
      </div>

      <div className="text-right mt-16 mb-20 text-[13px]">
        {fechaHoy}
      </div>

      <div className="w-[300px] mx-auto text-center mt-20">
        <div className="border-t border-black mb-1"></div>
        <div className="uppercase text-[13px]">FIRMA DEL DECLARANTE</div>
        <div className="text-[13px]">DNI: _________________</div>
      </div>

      <div className="absolute left-[3cm] right-[3cm] bottom-[2cm] text-[11px] text-left">
        Nota: Los docentes deben suscribir de forma obligatoria el presente formato en cada Semestre Académico, en el reverso de la Declaración de Carga Horaria Asignada
      </div>
    </>
  );

  const renderSedesDesconcentradas = () => (
    <>
      <div className="text-center mb-8 mt-4 text-[14px] uppercase leading-snug">
        DECLARACION JURADA DE LOS DOCENTES QUE PRESTAN SERVICIOS EN SEDES<br />
        DESCENTRALIZADAS
      </div>

      <div className="text-justify text-[12px] leading-relaxed space-y-4">
        <p>
          Yo, <strong>{docente?.nombres} {docente?.apellidos}</strong> identificado con DNI.
          Nro _________________ con Código IBM Nro {docente?.codigo_ibm} del Departamento Académico
          Dpto. de Ingeniería de Sistemas Facultad de Ingeniería; en el marco del
          reglamento de funcionamiento de Sedes Descentralizadas
          (RCU Nro 072 CU-COG-2005/UNT) y la Directiva Nro 01-2007-VAC/UNT sobre
          Racionalización Académica del Personal Docente que labora en las Sedes
          Descentralizadas (R.C.U. Nro 576-2007/UNT) DECLARO BAJO JURAMENTO Y EN HONOR A LA VERDAD QUE:
        </p>

        <p className="uppercase">
          EN MI PRESTACION DE SERVICIOS EN SEDES DESCENTRALIZADAS NO ESTOY INCURSO
          EN INCOMPATIBILIDAD HORARIA NI CONTRAVENGO LA SIGUIENTE NORMATIVIDAD
          INSTITUCIONAL:
        </p>

        <p>
          Los docentes ordinarios a Dedicación Exclusiva y Tiempo Completo solo
          pueden tener carga horaria máxima de diez (10) horas semanales
          (num. 1 de la Directiva).
        </p>

        <p>
          Los docentes que ejercen cargos académicos y administrativos de:
          Jefe de Departamento Académico, Director de Escuela Académico Profesional,
          Director de Sección de Postgrado, Profesor Secretario de Facultad,
          Jefe de Oficina General, o cargos Directivos en Centros de Producción
          o líneas de Rentabilidad pueden asumir carga máxima de 05 horas
          semanales, siempre que sea en forma excepcional y por no contar con
          docente de la especialidad habilitada para asumir dicha carga.
          (num. 2 y 3 de la Directiva RCU Nro 005-2009/UNT y art. 23 del Reglamento).
        </p>

        <p>
          Los docentes que ejercen cargo de Decano o Director de Postgrado y aquellos
          que prestan servicios en Centros de Producción y línea de Rentabilidad no
          pueden asumir carga horaria en Sedes Descentralizadas.
          (num. 3 de la Directiva y art 23 del Reglamento).
        </p>

        <p>
          Los docentes beneficiados con becas de estudio de maestría o doctorado o
          Segunda especialidad solo pueden tener carga horaria máxima de tres (03)
          horas semanales. (num. 4 de la Directiva).
        </p>

        <p>
          El desarrollo de la carga en sede descentralizada no puede interferir con
          la carga lectiva y no lectiva asignada en la Sede Central; salvo el caso
          de las Sedes de Cascas, Huamachuco, Tayabamba y Santiago de Chuco en que
          se debe contar con Licencia por comisión de servicios y carta de compromiso
          del docente que asumiría la carga horaria en la Sede Central
          (num. 5 y 7 de la Directiva y art. 23 del Reglamento).
        </p>

        <p>
          Los docentes que asumen carga horaria en las Sedes de Huamachuco,
          Cascas, Santiago de Chuco y Tayabamba no pueden asumir labores
          durante el mismo periodo en otra Sede (num. 6 de la Directiva).
        </p>

        <p>
          En caso de faltar a la verdad así como de incurrir en incompatibilidad
          horaria contraviniendo los dispositivos pre-citados me avengo a las
          sanciones que correspondan,<br/>
          <strong><em>y autorizo al funcionario competente disponga el descuento del pago por
          mis servicios en Sedes Descentralizadas, conforme al monto que la unidad
          de remuneraciones liquide como pago indebido por el período ilegalmente laborado.</em></strong>
        </p>
      </div>

      <div className="text-right mt-6 mb-12 text-[12px]">
        {fechaHoy}
      </div>

      <div className="w-[300px] mx-auto text-center mt-12">
        <div className="border-t border-black mb-1"></div>
        <div className="uppercase text-[13px]">FIRMA DEL DECLARANTE</div>
        <div className="text-[13px]">DNI: _________________</div>
      </div>

      <div className="absolute left-[3cm] right-[3cm] bottom-[2cm] text-[10px] text-left">
        Nota: Los docentes deben suscribir de forma obligatoria el presente formato para prestar servicios en cada Sede Descentralizada, al reverso de la Declaración de la Carga Horaria
      </div>
    </>
  );

  return (
    <div className="bg-white font-serif text-black min-h-[29.7cm] max-w-[21cm] mx-auto p-[2cm_3cm_2cm_3cm] relative box-border print:p-[2cm_3cm_2cm_3cm] print:m-0 print:w-[21cm] print:h-[29.7cm] print:overflow-hidden">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Tinos:ital,wght@0,400;0,700;1,400;1,700&display=swap');
        * { font-family: 'Tinos', 'Times New Roman', serif; }
        @media print {
          @page { size: A4; margin: 0; }
          body { -webkit-print-color-adjust: exact; background: white; margin: 0; padding: 0; }
        }
      `}} />
      {isSedeCentral ? renderSedeCentral() : renderSedesDesconcentradas()}
    </div>
  );
};

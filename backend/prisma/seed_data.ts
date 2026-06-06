import { TipoCurso } from '@prisma/client';

interface OfertaSeed {
  ciclo: number;
  codigo: string;
  nombre: string;
  creditos: number;
  tipo: TipoCurso;
  T: number;
  P: number;
  L: number;
  gruposLab?: number;
  profesor?: string;
  asignaciones?: Array<{ profesor: string; T: number; P: number; L: number; G: number }>;
}

export const ambientesSeed = [
  "Audiovisuales",
  "Pabellón Ing. Industrial",
  "Pabellón Ing. Industrial (I I - 2)",
  "Pabellón Ing. Industrial (I-4)",
  "Posgrado A-303",
  "Posgrado A-307",
  "Posgrado A-311",
  "Taller de Confecciones - Ing. Industrial"
];


export const labsSeed = [
  "Lab 1",
  "Lab 2",
  "Lab 3",
  "Lab 4"
];


export const docentesSeed = [

      // Ciclo I
      { nombres: 'Marcelino', apellidos: 'Torres Villanueva', email: 'mtorres@unitru.edu.pe', modalidad: 'NOMBRADO', categoria: 'PRINCIPAL', antiguedad: 10 },
      { nombres: 'Alberto Carlos', apellidos: 'Mendoza de los Santos', email: 'amendozad@unitru.edu.pe', modalidad: 'NOMBRADO', categoria: 'PRINCIPAL', antiguedad: 12 },
      { nombres: 'Jorge Paul', apellidos: 'Cotrina Castellanos', email: 'jcotrinac@unitru.edu.pe', modalidad: 'NOMBRADO', categoria: 'ASOCIADO', antiguedad: 8 },
      { nombres: 'Bertha Edelmira', apellidos: 'Urtecho Zavaleta', email: 'burtecho@unitru.edu.pe', modalidad: 'NOMBRADO', categoria: 'ASOCIADO', antiguedad: 7 },
      { nombres: 'José Luis', apellidos: 'Ponte Bejarano', email: 'jponteb@unitru.edu.pe', modalidad: 'NOMBRADO', categoria: 'PRINCIPAL', antiguedad: 15 },
      { nombres: 'Jorge Luis', apellidos: 'Ríos Gonzales', email: 'jrios@unitru.edu.pe', modalidad: 'NOMBRADO', categoria: 'ASOCIADO', antiguedad: 9 },
      { nombres: 'Segundo Valentín', apellidos: 'Guibar Obeso', email: 'sguibar@unitru.edu.pe', modalidad: 'NOMBRADO', categoria: 'PRINCIPAL', antiguedad: 20 },
      { nombres: 'Miguel Angel', apellidos: 'Ipanaque Zapata', email: 'mipanaque@unitru.edu.pe', modalidad: 'NOMBRADO', categoria: 'ASOCIADO', antiguedad: 6 },
      { nombres: 'Martha Renee', apellidos: 'Cardoso Vigil', email: 'mcardoso@unitru.edu.pe', modalidad: 'NOMBRADO', categoria: 'ASOCIADO', antiguedad: 5 },
      // Ciclo III
      { nombres: 'Zoraida Yanet', apellidos: 'Vidal Melgarejo', email: 'zvidal@unitru.edu.pe', modalidad: 'NOMBRADO', categoria: 'PRINCIPAL', antiguedad: 18 },
      { nombres: 'Everson David', apellidos: 'Agreda Gamboa', email: 'eagreda@unitru.edu.pe', modalidad: 'NOMBRADO', categoria: 'ASOCIADO', antiguedad: 10 },
      { nombres: 'Juan Carlos', apellidos: 'Obando Roldán', email: 'jobando@unitru.edu.pe', modalidad: 'NOMBRADO', categoria: 'ASOCIADO', antiguedad: 11 },
      { nombres: 'Marcos Enrique', apellidos: 'Ferrer Reyna', email: 'mferrer@unitru.edu.pe', modalidad: 'NOMBRADO', categoria: 'PRINCIPAL', antiguedad: 14 },
      { nombres: 'María Teresita del niño Jesús', apellidos: 'Rojas García', email: 'mrojasg@unitru.edu.pe', modalidad: 'NOMBRADO', categoria: 'PRINCIPAL', antiguedad: 16 },
      { nombres: 'Juan Carlos', apellidos: 'Carrascal Cabanillas', email: 'jcarrascal@unitru.edu.pe', modalidad: 'NOMBRADO', categoria: 'ASOCIADO', antiguedad: 7 },
      { nombres: 'Vilma Julia', apellidos: 'Mendez Gil', email: 'vmendez@unitru.edu.pe', modalidad: 'NOMBRADO', categoria: 'ASOCIADO', antiguedad: 9 },
      { nombres: 'Sheyla Laura', apellidos: 'Escobedo Rodriguez', email: 'sescobedo@unitru.edu.pe', modalidad: 'CONTRATADO', categoria: 'AUXILIAR', antiguedad: 3 },
      // Ciclo V
      { nombres: 'Luis Enrique', apellidos: 'Boy Chavil', email: 'lboy@unitru.edu.pe', modalidad: 'NOMBRADO', categoria: 'PRINCIPAL', antiguedad: 20 },
      { nombres: 'Robert Jerry', apellidos: 'Sánchez Ticona', email: 'rsanchezt@unitru.edu.pe', modalidad: 'NOMBRADO', categoria: 'ASOCIADO', antiguedad: 8 },
      { nombres: 'César', apellidos: 'Arellano Salazar', email: 'carellano@unitru.edu.pe', modalidad: 'NOMBRADO', categoria: 'ASOCIADO', antiguedad: 9 },
      { nombres: 'Camilo Ernesto', apellidos: 'Suárez Rebaza', email: 'csuarez@unitru.edu.pe', modalidad: 'NOMBRADO', categoria: 'ASOCIADO', antiguedad: 12 },
      { nombres: 'Marcos Gregorio', apellidos: 'Baca Lopez', email: 'mbaca@unitru.edu.pe', modalidad: 'NOMBRADO', categoria: 'PRINCIPAL', antiguedad: 15 },
      { nombres: 'Ana Maria', apellidos: 'Cuadra Mitzugaray', email: 'acuadra@unitru.edu.pe', modalidad: 'NOMBRADO', categoria: 'ASOCIADO', antiguedad: 7 },
      // Ciclo VII
      { nombres: 'Juan Pedro', apellidos: 'Santos Fernández', email: 'jsantos@unitru.edu.pe', modalidad: 'NOMBRADO', categoria: 'PRINCIPAL', antiguedad: 18 },
      { nombres: 'Ricardo Dario', apellidos: 'Mendoza Rivera', email: 'rmendoza@unitru.edu.pe', modalidad: 'NOMBRADO', categoria: 'PRINCIPAL', antiguedad: 14 },
      { nombres: 'Oscar Romel', apellidos: 'Alcántara Moreno', email: 'oalcantara@unitru.edu.pe', modalidad: 'NOMBRADO', categoria: 'ASOCIADO', antiguedad: 10 },
      { nombres: 'Joe Alexis', apellidos: 'Gonzales Vasquez', email: 'jgonzalesv@unitru.edu.pe', modalidad: 'NOMBRADO', categoria: 'ASOCIADO', antiguedad: 6 },
      // Ciclo IX
      { nombres: 'José Alberto', apellidos: 'Gómez Ávila', email: 'jgomez@unitru.edu.pe', modalidad: 'NOMBRADO', categoria: 'PRINCIPAL', antiguedad: 11 },

];


export const ofertasSeed: OfertaSeed[] = [
  {
    "ciclo": 1,
    "codigo": "1939",
    "nombre": "INTRODUCCION A LA INGENIERIA DE SISTEMAS",
    "creditos": 4,
    "tipo": "REGULAR",
    "T": 1,
    "P": 2,
    "L": 0,
    "gruposLab": 1,
    "profesor": "Alberto Mendoza de los Santos",
    "asignaciones": [
      {
        "profesor": "Alberto Mendoza de los Santos",
        "T": 1,
        "P": 2,
        "L": 0,
        "G": 1
      }
    ]
  },
  {
    "ciclo": 1,
    "codigo": "2347",
    "nombre": "INTRODUCCION A LA PROGRAMACION",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 2,
    "P": 0,
    "L": 2,
    "gruposLab": 4,
    "profesor": "Marcelino Torres Villanueva, Paul Cotrina Castellanos",
    "asignaciones": [
      {
        "profesor": "Marcelino Torres Villanueva",
        "T": 2,
        "P": 0,
        "L": 2,
        "G": 2
      },
      {
        "profesor": "Paul Cotrina Castellanos",
        "T": 0,
        "P": 0,
        "L": 2,
        "G": 2
      }
    ]
  },
  {
    "ciclo": 1,
    "codigo": "1854",
    "nombre": "DESARROLLO PERSONAL",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 2,
    "P": 2,
    "L": 0,
    "gruposLab": 1,
    "profesor": "Bertha Urtecho Zavaleta",
    "asignaciones": [
      {
        "profesor": "Bertha Urtecho Zavaleta",
        "T": 2,
        "P": 2,
        "L": 0,
        "G": 1
      }
    ]
  },
  {
    "ciclo": 1,
    "codigo": "1855",
    "nombre": "DESARROLLO DEL PENSAMIENTO LOGICO MATEMATICO",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 1,
    "P": 4,
    "L": 0,
    "gruposLab": 1,
    "profesor": "Jose Luis Ponte Bejarano",
    "asignaciones": [
      {
        "profesor": "Jose Luis Ponte Bejarano",
        "T": 1,
        "P": 4,
        "L": 0,
        "G": 1
      }
    ]
  },
  {
    "ciclo": 1,
    "codigo": "1857",
    "nombre": "LECTURA CRITICA Y REDACCION DE TEXTOS ACADEMICOS",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 2,
    "P": 2,
    "L": 0,
    "gruposLab": 1,
    "profesor": "Jorge Luis Rios Gonzales",
    "asignaciones": [
      {
        "profesor": "Jorge Luis Rios Gonzales",
        "T": 2,
        "P": 2,
        "L": 0,
        "G": 1
      }
    ]
  },
  {
    "ciclo": 1,
    "codigo": "1863",
    "nombre": "INTRODUCCION AL ANALISIS MATEMATICO",
    "creditos": 4,
    "tipo": "REGULAR",
    "T": 2,
    "P": 4,
    "L": 0,
    "gruposLab": 1,
    "profesor": "Segundo Guibar Obeso",
    "asignaciones": [
      {
        "profesor": "Segundo Guibar Obeso",
        "T": 2,
        "P": 4,
        "L": 0,
        "G": 1
      }
    ]
  },
  {
    "ciclo": 1,
    "codigo": "1867",
    "nombre": "ESTADISTICA GENERAL",
    "creditos": 4,
    "tipo": "REGULAR",
    "T": 2,
    "P": 2,
    "L": 0,
    "gruposLab": 1,
    "profesor": "Miguel Ipanaque Zapata, Martha Cardoso",
    "asignaciones": [
      {
        "profesor": "Miguel Ipanaque Zapata",
        "T": 0,
        "P": 2,
        "L": 0,
        "G": 1
      },
      {
        "profesor": "Martha Cardoso",
        "T": 2,
        "P": 2,
        "L": 0,
        "G": 1
      }
    ]
  },
  {
    "ciclo": 1,
    "codigo": "1883",
    "nombre": "TALLER DE TECNICAS DE COMUNICACION EFICAZ",
    "creditos": 1,
    "tipo": "REGULAR",
    "T": 0,
    "P": 2,
    "L": 0,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 1,
    "codigo": "1884",
    "nombre": "TALLER DE MUSICA",
    "creditos": 1,
    "tipo": "REGULAR",
    "T": 2,
    "P": 0,
    "L": 0,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 1,
    "codigo": "1908",
    "nombre": "TALLER DE LIDERAZGO Y TRABAJO EN EQUIPO",
    "creditos": 1,
    "tipo": "REGULAR",
    "T": 0,
    "P": 2,
    "L": 0,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 1,
    "codigo": "2055",
    "nombre": "TALLER DE DEPORTE",
    "creditos": 1,
    "tipo": "REGULAR",
    "T": 0,
    "P": 2,
    "L": 0,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 1,
    "codigo": "2056",
    "nombre": "TALLER DE TEATRO",
    "creditos": 1,
    "tipo": "REGULAR",
    "T": 0,
    "P": 2,
    "L": 0,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 2,
    "codigo": "2051",
    "nombre": "PROGRAMACION ORIENTADO A OBJETOS I",
    "creditos": 4,
    "tipo": "REGULAR",
    "T": 0,
    "P": 2,
    "L": 4,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 2,
    "codigo": "1858",
    "nombre": "SOCIEDAD CULTURA Y ECOLOGIA",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 4,
    "P": 1,
    "L": 0,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 2,
    "codigo": "1859",
    "nombre": "CULTURA INVESTIGATIVA Y PENSAMIENTO CRITICO",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 2,
    "P": 2,
    "L": 0,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 2,
    "codigo": "1860",
    "nombre": "ETICA CONVIVENCIA HUMANA Y CIUDADANΙΑ",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 2,
    "P": 2,
    "L": 0,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 2,
    "codigo": "1861",
    "nombre": "ANALISIS MATEMATICO",
    "creditos": 4,
    "tipo": "REGULAR",
    "T": 2,
    "P": 4,
    "L": 0,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 2,
    "codigo": "1875",
    "nombre": "FISICA GENERAL",
    "creditos": 4,
    "tipo": "REGULAR",
    "T": 4,
    "P": 2,
    "L": 0,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 2,
    "codigo": "1888",
    "nombre": "TALLER DE MANEJO DE TIC",
    "creditos": 1,
    "tipo": "REGULAR",
    "T": 0,
    "P": 0,
    "L": 2,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 2,
    "codigo": "1889",
    "nombre": "TALLER DE DANZAS FOLCLORICAS",
    "creditos": 1,
    "tipo": "REGULAR",
    "T": 0,
    "P": 0,
    "L": 2,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 2,
    "codigo": "1890",
    "nombre": "TALLER DE DEPORTE",
    "creditos": 1,
    "tipo": "REGULAR",
    "T": 0,
    "P": 2,
    "L": 0,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 2,
    "codigo": "2057",
    "nombre": "TALLER DE MUSICA",
    "creditos": 1,
    "tipo": "REGULAR",
    "T": 0,
    "P": 0,
    "L": 2,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 3,
    "codigo": "2140",
    "nombre": "ADMINISTRACION GENERAL",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 2,
    "P": 2,
    "L": 0,
    "gruposLab": 1,
    "profesor": "Juan Carrascal Cabanillas",
    "asignaciones": [
      {
        "profesor": "Juan Carrascal Cabanillas",
        "T": 2,
        "P": 2,
        "L": 0,
        "G": 1
      }
    ]
  },
  {
    "ciclo": 3,
    "codigo": "2141",
    "nombre": "SISTEMICA",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 2,
    "P": 1,
    "L": 2,
    "gruposLab": 3,
    "profesor": "Everson David Agreda Gamboa",
    "asignaciones": [
      {
        "profesor": "Everson David Agreda Gamboa",
        "T": 2,
        "P": 1,
        "L": 2,
        "G": 3
      }
    ]
  },
  {
    "ciclo": 3,
    "codigo": "2142",
    "nombre": "ESTADISTICA APLICADA",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 1,
    "P": 2,
    "L": 2,
    "gruposLab": 3,
    "profesor": "Teresita Rojas Garcia",
    "asignaciones": [
      {
        "profesor": "Teresita Rojas Garcia",
        "T": 1,
        "P": 2,
        "L": 2,
        "G": 3
      }
    ]
  },
  {
    "ciclo": 3,
    "codigo": "2143",
    "nombre": "MATEMATICA APLICADA",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 1,
    "P": 2,
    "L": 2,
    "gruposLab": 1,
    "profesor": "Marcos Ferrer Reyna",
    "asignaciones": [
      {
        "profesor": "Marcos Ferrer Reyna",
        "T": 1,
        "P": 2,
        "L": 2,
        "G": 1
      }
    ]
  },
  {
    "ciclo": 3,
    "codigo": "2144",
    "nombre": "FISICA ELECTRONICA",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 1,
    "P": 2,
    "L": 2,
    "gruposLab": 1,
    "profesor": "Vilma Mendez Gil",
    "asignaciones": [
      {
        "profesor": "Vilma Mendez Gil",
        "T": 1,
        "P": 2,
        "L": 2,
        "G": 1
      }
    ]
  },
  {
    "ciclo": 3,
    "codigo": "2145",
    "nombre": "PROGRAMACION ORIENTADA A OBJETOS II",
    "creditos": 4,
    "tipo": "REGULAR",
    "T": 2,
    "P": 0,
    "L": 4,
    "gruposLab": 3,
    "profesor": "Zoraida Vidal Melgarejo",
    "asignaciones": [
      {
        "profesor": "Zoraida Vidal Melgarejo",
        "T": 2,
        "P": 0,
        "L": 4,
        "G": 3
      }
    ]
  },
  {
    "ciclo": 3,
    "codigo": "2146",
    "nombre": "INGENIERIA GRAFICA",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 1,
    "P": 1,
    "L": 2,
    "gruposLab": 3,
    "profesor": "Juan Carlos obando Roldán",
    "asignaciones": [
      {
        "profesor": "Juan Carlos obando Roldán",
        "T": 1,
        "P": 1,
        "L": 2,
        "G": 3
      }
    ]
  },
  {
    "ciclo": 3,
    "codigo": "2147",
    "nombre": "SICOLOGIA ORGANIZACIONAL",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 2,
    "P": 2,
    "L": 0,
    "gruposLab": 1,
    "profesor": "Sheyla Laura Escobedo Rodriguez",
    "asignaciones": [
      {
        "profesor": "Sheyla Laura Escobedo Rodriguez",
        "T": 2,
        "P": 2,
        "L": 0,
        "G": 1
      }
    ]
  },
  {
    "ciclo": 4,
    "codigo": "2650",
    "nombre": "ECONOMIA GENERAL",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 2,
    "P": 2,
    "L": 0,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 4,
    "codigo": "2651",
    "nombre": "DISEÑO WEB",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 1,
    "P": 1,
    "L": 3,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 4,
    "codigo": "2652",
    "nombre": "PENSAMIENTO DE DISEÑO",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 1,
    "P": 2,
    "L": 2,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 4,
    "codigo": "2653",
    "nombre": "GESTIÓN DE PROCESOS",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 2,
    "P": 1,
    "L": 2,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 4,
    "codigo": "2654",
    "nombre": "SISTEMAS DIGITALES",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 1,
    "P": 2,
    "L": 2,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 4,
    "codigo": "2655",
    "nombre": "ESTRUCTURA DE DATOS ORIENTADO A OBJETOS",
    "creditos": 4,
    "tipo": "REGULAR",
    "T": 2,
    "P": 1,
    "L": 3,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 4,
    "codigo": "2656",
    "nombre": "COMPUTACIÓN GRÁFICA Y VISUAL",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 1,
    "P": 1,
    "L": 3,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 4,
    "codigo": "2657",
    "nombre": "PLATAFORMAS TECNOLÓGICAS",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 2,
    "P": 0,
    "L": 2,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 5,
    "codigo": "2689",
    "nombre": "CONTABILIDAD GERENCIAL",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 1,
    "P": 2,
    "L": 2,
    "gruposLab": 1,
    "profesor": "Ana Cuadra Mitzugaray",
    "asignaciones": [
      {
        "profesor": "Ana Cuadra Mitzugaray",
        "T": 1,
        "P": 2,
        "L": 2,
        "G": 1
      }
    ]
  },
  {
    "ciclo": 5,
    "codigo": "2690",
    "nombre": "TECNOLOGIAS WEB",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 1,
    "P": 1,
    "L": 2,
    "gruposLab": 3,
    "profesor": "Robert Jerry Sánchez Ticona",
    "asignaciones": [
      {
        "profesor": "Robert Jerry Sánchez Ticona",
        "T": 1,
        "P": 1,
        "L": 2,
        "G": 3
      }
    ]
  },
  {
    "ciclo": 5,
    "codigo": "2691",
    "nombre": "INVESTIGACIÓN DE OPERACIONES",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 1,
    "P": 2,
    "L": 2,
    "gruposLab": 1,
    "profesor": "Marcos Baca Lopez",
    "asignaciones": [
      {
        "profesor": "Marcos Baca Lopez",
        "T": 1,
        "P": 2,
        "L": 2,
        "G": 1
      }
    ]
  },
  {
    "ciclo": 5,
    "codigo": "2692",
    "nombre": "INGENIERIA DE DATOS I",
    "creditos": 4,
    "tipo": "REGULAR",
    "T": 2,
    "P": 1,
    "L": 3,
    "gruposLab": 7,
    "profesor": "Luis Boy Chavil",
    "asignaciones": [
      {
        "profesor": "Luis Boy Chavil",
        "T": 2,
        "P": 1,
        "L": 3,
        "G": 3
      },
      {
        "profesor": "Juan Pedro Santos Fernández",
        "T": 2,
        "P": 1,
        "L": 3,
        "G": 1
      },
      {
        "profesor": "Robert Jerry Sánchez Ticona",
        "T": 0,
        "P": 0,
        "L": 2,
        "G": 3
      }
    ]
  },
  {
    "ciclo": 5,
    "codigo": "2693",
    "nombre": "ARQUITECTURA Y ORGANIZACIÓN DE COMPUTADORAS",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 1,
    "P": 2,
    "L": 2,
    "gruposLab": 3,
    "profesor": "Cesar Arellano Salazar"
  },
  {
    "ciclo": 5,
    "codigo": "2694",
    "nombre": "SISTEMAS DE INFORMACIÓN",
    "creditos": 4,
    "tipo": "REGULAR",
    "T": 2,
    "P": 2,
    "L": 2,
    "gruposLab": 3,
    "profesor": "Juan Carlos Obando Roldan",
    "asignaciones": [
      {
        "profesor": "Juan Carlos Obando Roldan",
        "T": 2,
        "P": 2,
        "L": 2,
        "G": 3
      }
    ]
  },
  {
    "ciclo": 5,
    "codigo": "2695",
    "nombre": "TELEINFORMÁTICA",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 1,
    "P": 2,
    "L": 2,
    "gruposLab": 2,
    "profesor": "Camilo Suárez Rebaza",
    "asignaciones": [
      {
        "profesor": "Camilo Suárez Rebaza",
        "T": 1,
        "P": 2,
        "L": 2,
        "G": 2
      }
    ]
  },
  {
    "ciclo": 5,
    "codigo": "2696",
    "nombre": "TRANSFORMACIÓN DIGITAL",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 2,
    "P": 0,
    "L": 2,
    "gruposLab": 2,
    "profesor": "Everson David Agreda Gamboa",
    "asignaciones": [
      {
        "profesor": "Everson David Agreda Gamboa",
        "T": 2,
        "P": 0,
        "L": 2,
        "G": 2
      }
    ]
  },
  {
    "ciclo": 6,
    "codigo": "3125",
    "nombre": "FINANZAS CORPORATIVAS",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 1,
    "P": 2,
    "L": 2,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 6,
    "codigo": "3126",
    "nombre": "SISTEMAS INTELIGENTES",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 2,
    "P": 2,
    "L": 1,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 6,
    "codigo": "3127",
    "nombre": "INGENIERÍA ECONÓMICA",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 2,
    "P": 1,
    "L": 2,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 6,
    "codigo": "3128",
    "nombre": "INGENIERÍA DE DATOS II",
    "creditos": 4,
    "tipo": "REGULAR",
    "T": 2,
    "P": 3,
    "L": 1,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 6,
    "codigo": "3129",
    "nombre": "SISTEMAS OPERATIVOS",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 2,
    "P": 2,
    "L": 1,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 6,
    "codigo": "3130",
    "nombre": "INGENIERÍA DE REQUERIMIENTOS",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 2,
    "P": 1,
    "L": 2,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 6,
    "codigo": "3131",
    "nombre": "INGENIERÍA AMBIENTAL",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 0,
    "P": 2,
    "L": 2,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 6,
    "codigo": "3132",
    "nombre": "GESTIÓN DEL TALENTO HUMANO",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 0,
    "P": 2,
    "L": 2,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 7,
    "codigo": "3444",
    "nombre": "CADENA DE SUMINISTRO",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 0,
    "P": 0,
    "L": 2,
    "gruposLab": 2,
    "profesor": "Jhoe Gonzalez Vasquez",
    "asignaciones": [
      {
        "profesor": "Jhoe Gonzalez Vasquez",
        "T": 0,
        "P": 0,
        "L": 2,
        "G": 2
      }
    ]
  },
  {
    "ciclo": 7,
    "codigo": "3445",
    "nombre": "GESTIÓN DE SERVICIOS DE TIC",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 1,
    "P": 2,
    "L": 2,
    "gruposLab": 2,
    "profesor": "Alberto Mendoza de los Santos",
    "asignaciones": [
      {
        "profesor": "Alberto Mendoza de los Santos",
        "T": 1,
        "P": 2,
        "L": 2,
        "G": 2
      }
    ]
  },
  {
    "ciclo": 7,
    "codigo": "3446",
    "nombre": "METODOLOGÍA DE LA INVESTIGACIÓN CIENTÍFICA",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 2,
    "P": 2,
    "L": 0,
    "gruposLab": 1,
    "profesor": "Paul Cotrina Catellanos",
    "asignaciones": [
      {
        "profesor": "Paul Cotrina Catellanos",
        "T": 2,
        "P": 2,
        "L": 0,
        "G": 1
      }
    ]
  },
  {
    "ciclo": 7,
    "codigo": "3447",
    "nombre": "PLANEAMIENTO ESTRATÉGICO DE LA INFORMACIÓN",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 1,
    "P": 2,
    "L": 2,
    "gruposLab": 4,
    "profesor": "Oscar Romel Alcántara Moreno",
    "asignaciones": [
      {
        "profesor": "Oscar Romel Alcántara Moreno",
        "T": 1,
        "P": 2,
        "L": 2,
        "G": 4
      }
    ]
  },
  {
    "ciclo": 7,
    "codigo": "3448",
    "nombre": "REDES Y COMUNICACIONES I",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 1,
    "P": 1,
    "L": 3,
    "gruposLab": 3,
    "profesor": "César Arellano Salazar",
    "asignaciones": [
      {
        "profesor": "César Arellano Salazar",
        "T": 1,
        "P": 1,
        "L": 3,
        "G": 3
      }
    ]
  },
  {
    "ciclo": 7,
    "codigo": "3449",
    "nombre": "INGENIERÍA DEL SOFTWARE I",
    "creditos": 4,
    "tipo": "REGULAR",
    "T": 2,
    "P": 1,
    "L": 3,
    "gruposLab": 1,
    "profesor": "Juan Pedro Santos Fernández, Robert Jerry Sánchez Ticona"
  },
  {
    "ciclo": 7,
    "codigo": "3450",
    "nombre": "ADMINISTRACIÓN DE BASE DE DATOS",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 1,
    "P": 1,
    "L": 3,
    "gruposLab": 2,
    "profesor": "Ricardo Mendoza Rivera",
    "asignaciones": [
      {
        "profesor": "Ricardo Mendoza Rivera",
        "T": 1,
        "P": 1,
        "L": 3,
        "G": 2
      }
    ]
  },
  {
    "ciclo": 7,
    "codigo": "3451",
    "nombre": "NEGOCIOS ELECTRÓNICOS",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 2,
    "P": 0,
    "L": 2,
    "gruposLab": 2,
    "profesor": "Everson David Agreda Gamboa, Paul Cotrina Castellanos",
    "asignaciones": [
      {
        "profesor": "Everson David Agreda Gamboa",
        "T": 2,
        "P": 0,
        "L": 0,
        "G": 1
      },
      {
        "profesor": "Paul Cotrina Castellanos",
        "T": 0,
        "P": 0,
        "L": 2,
        "G": 2
      }
    ]
  },
  {
    "ciclo": 8,
    "codigo": "4482",
    "nombre": "MARKETING Y MEDIOS SOCIALES",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 1,
    "P": 2,
    "L": 2,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 8,
    "codigo": "4483",
    "nombre": "SEGURIDAD DE LA INFORMACIÓN",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 2,
    "P": 1,
    "L": 2,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 8,
    "codigo": "4484",
    "nombre": "INTERNET DE LAS COSAS",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 1,
    "P": 1,
    "L": 3,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 8,
    "codigo": "4485",
    "nombre": "INTELIGENCIA DE NEGOCIOS",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 2,
    "P": 1,
    "L": 2,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 8,
    "codigo": "4486",
    "nombre": "REDES Y COMUNICACIONES II",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 1,
    "P": 1,
    "L": 3,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 8,
    "codigo": "4487",
    "nombre": "INGENIERÍA DEL SOFTWARE II",
    "creditos": 4,
    "tipo": "REGULAR",
    "T": 2,
    "P": 1,
    "L": 3,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 8,
    "codigo": "4488",
    "nombre": "DEONTOLOGÍA Y DERECHO INFORMÁTICO",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 2,
    "P": 2,
    "L": 0,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 8,
    "codigo": "4489",
    "nombre": "ARQUITECTURA BASADA EN MICROSERVICIOS",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 0,
    "P": 2,
    "L": 2,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 9,
    "codigo": "4490",
    "nombre": "GESTIÓN DE PROYECTOS DE TIC",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 1,
    "P": 2,
    "L": 2,
    "gruposLab": 3,
    "profesor": "José Gómez Avila",
    "asignaciones": [
      {
        "profesor": "José Gómez Avila",
        "T": 1,
        "P": 2,
        "L": 2,
        "G": 3
      }
    ]
  },
  {
    "ciclo": 9,
    "codigo": "4491",
    "nombre": "AUDITORÍA INFORMÁTICA",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 1,
    "P": 2,
    "L": 2,
    "gruposLab": 2,
    "profesor": "Alberto Mendoza de los Santos",
    "asignaciones": [
      {
        "profesor": "Alberto Mendoza de los Santos",
        "T": 1,
        "P": 2,
        "L": 2,
        "G": 2
      }
    ]
  },
  {
    "ciclo": 9,
    "codigo": "4492",
    "nombre": "TESIS I",
    "creditos": 4,
    "tipo": "REGULAR",
    "T": 2,
    "P": 2,
    "L": 2,
    "gruposLab": 2,
    "profesor": "Juan Pedro Santos Fernández, Ricardo Mendoza Rivera",
    "asignaciones": [
      {
        "profesor": "Juan Pedro Santos Fernández",
        "T": 2,
        "P": 2,
        "L": 2,
        "G": 1
      },
      {
        "profesor": "Ricardo Mendoza Rivera",
        "T": 2,
        "P": 2,
        "L": 2,
        "G": 1
      }
    ]
  },
  {
    "ciclo": 9,
    "codigo": "4493",
    "nombre": "ANALÍTICA DE NEGOCIOS",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 1,
    "P": 2,
    "L": 2,
    "gruposLab": 1,
    "profesor": "Ricardo Mendoza Rivera",
    "asignaciones": [
      {
        "profesor": "Ricardo Mendoza Rivera",
        "T": 1,
        "P": 2,
        "L": 2,
        "G": 1
      }
    ]
  },
  {
    "ciclo": 9,
    "codigo": "4494",
    "nombre": "COMPUTACIÓN EN LA NUBE",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 1,
    "P": 1,
    "L": 3,
    "gruposLab": 3,
    "profesor": "José Gómez Avila",
    "asignaciones": [
      {
        "profesor": "José Gómez Avila",
        "T": 1,
        "P": 1,
        "L": 3,
        "G": 3
      }
    ]
  },
  {
    "ciclo": 9,
    "codigo": "4495",
    "nombre": "INGENIERÍA WEB",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 1,
    "P": 1,
    "L": 3,
    "gruposLab": 3,
    "profesor": "Marcelino Torres Villanueva",
    "asignaciones": [
      {
        "profesor": "Marcelino Torres Villanueva",
        "T": 1,
        "P": 1,
        "L": 3,
        "G": 3
      }
    ]
  },
  {
    "ciclo": 9,
    "codigo": "4496",
    "nombre": "EMPRENDEDURISMO TECNOLÓGICO",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 2,
    "P": 0,
    "L": 2,
    "gruposLab": 2,
    "profesor": "Oscar Romel Alcántara Moreno"
  },
  {
    "ciclo": 9,
    "codigo": "4497",
    "nombre": "HACKEO ÉTICO",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 2,
    "P": 0,
    "L": 2,
    "gruposLab": 2,
    "profesor": "Camilo Suarez Rebaza",
    "asignaciones": [
      {
        "profesor": "Camilo Suarez Rebaza",
        "T": 2,
        "P": 0,
        "L": 2,
        "G": 2
      }
    ]
  },
  {
    "ciclo": 10,
    "codigo": "4498",
    "nombre": "SISTEMAS DE INFORMACIÓN EMPRESARIAL",
    "creditos": 4,
    "tipo": "REGULAR",
    "T": 2,
    "P": 1,
    "L": 3,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 10,
    "codigo": "4499",
    "nombre": "GOBIERNO DE TIC",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 1,
    "P": 2,
    "L": 2,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 10,
    "codigo": "4500",
    "nombre": "TESIS II",
    "creditos": 4,
    "tipo": "REGULAR",
    "T": 2,
    "P": 2,
    "L": 2,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 10,
    "codigo": "4501",
    "nombre": "ARQUITECTURA EMPRESARIAL",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 1,
    "P": 2,
    "L": 2,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 10,
    "codigo": "4502",
    "nombre": "RESPONSABILIDAD SOCIAL CORPORATIVA",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 2,
    "P": 2,
    "L": 0,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 10,
    "codigo": "4503",
    "nombre": "APLICACIONES MÓVILES",
    "creditos": 3,
    "tipo": "REGULAR",
    "T": 1,
    "P": 1,
    "L": 3,
    "gruposLab": 1,
    "profesor": ""
  },
  {
    "ciclo": 10,
    "codigo": "4504",
    "nombre": "PRÁCTICAS PRE PROFESIONALES",
    "creditos": 4,
    "tipo": "REGULAR",
    "T": 2,
    "P": 1,
    "L": 3,
    "gruposLab": 1,
    "profesor": ""
  }
];

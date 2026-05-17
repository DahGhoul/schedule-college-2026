export interface Credenciales {
  email: string;
  password: string;
}

export interface DatosUsuario {
  id: number;
  email: string;
  rol: string;
  nombre?: string;
  idDocente?: number;
}

export interface TokenPayload {
  id: number;
  email: string;
  rol: string;
}

export interface TokenPair {
  token: string;
  refreshToken: string;
}
import { SignOptions } from 'jsonwebtoken';

export const configuracionJWT: {
  secreto: string;
  expiracion: SignOptions['expiresIn'];
  expiracionRefresh: SignOptions['expiresIn'];
} = {
  secreto: process.env.JWT_SECRET || 'supersecret',
  expiracion: '1h',
  expiracionRefresh: '7d',
};
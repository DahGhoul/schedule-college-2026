import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export class ServicioCorreo {
  static async enviar(destinatario: string, asunto: string, contenido: string): Promise<boolean> {
    try {
      await transporter.sendMail({
        from: `"Horarios UNT" <${process.env.SMTP_USER}>`,
        to: destinatario,
        subject: asunto,
        html: contenido,
      });
      return true;
    } catch (error) {
      console.error('Error enviando correo:', error);
      return false;
    }
  }
}
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);

export class ServicioCorreo {
  static async enviar(destinatario: string, asunto: string, contenido: string): Promise<boolean> {
    try {
      const msg = {
        to: destinatario,
        from: process.env.FROM_EMAIL as string, // Ej: 'noreply@tudominio.com' (verificado en SendGrid)
        subject: asunto,
        html: contenido,
      };

      await sgMail.send(msg);
      return true;
    } catch (error) {
      console.error('Error enviando correo con SendGrid:', error);
      return false;
    }
  }
}
import axios from 'axios';

const WHATSAPP_API = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v17.0';
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

export class ServicioWhatsApp {
  static async enviar(telefono: string, mensaje: string): Promise<boolean> {
    if (!PHONE_ID || !TOKEN) {
      console.warn('WhatsApp no configurado');
      return false;
    }
    try {
      await axios.post(
        `${WHATSAPP_API}/${PHONE_ID}/messages`,
        {
          messaging_product: 'whatsapp',
          to: telefono,
          type: 'text',
          text: { body: mensaje },
        },
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      );
      return true;
    } catch (error: any) {
      console.error('Error enviando WhatsApp:', error.response?.data || error.message);
      return false;
    }
  }

  static async enviarPlantilla(telefono: string, nombrePlantilla: string, parametros: string[]): Promise<boolean> {
    if (!PHONE_ID || !TOKEN) return false;
    try {
      await axios.post(
        `${WHATSAPP_API}/${PHONE_ID}/messages`,
        {
          messaging_product: 'whatsapp',
          to: telefono,
          type: 'template',
          template: {
            name: nombrePlantilla,
            language: { code: 'es' },
            components: [
              {
                type: 'body',
                parameters: parametros.map((texto) => ({ type: 'text', text: texto })),
              },
            ],
          },
        },
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      );
      return true;
    } catch (error) {
      console.error('Error enviando plantilla WhatsApp:', error);
      return false;
    }
  }
}
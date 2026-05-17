import axios from 'axios';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

export class ServicioTelegram {
  static async enviar(chatId: string, mensaje: string): Promise<boolean> {
    if (!TELEGRAM_TOKEN) {
      console.warn('Telegram no configurado');
      return false;
    }
    try {
      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: mensaje,
        parse_mode: 'HTML',
      });
      return true;
    } catch (error) {
      console.error('Error enviando Telegram:', error);
      return false;
    }
  }

  static async verificarWebhook(): Promise<boolean> {
    if (!TELEGRAM_TOKEN) return false;
    try {
      const res = await axios.get(`${TELEGRAM_API}/getWebhookInfo`);
      return res.data.ok;
    } catch {
      return false;
    }
  }
}
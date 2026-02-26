
'use server';

/**
 * @fileOverview Telegram Bot Server Actions
 * Handles sending documents and managing bot webhooks.
 */

export async function sendTelegramDocument(chatId: string, base64Data: string, fileName: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('Telegram Bot Token is not configured.');
  }

  try {
    const base64 = base64Data.split(',')[1] || base64Data;
    const buffer = Buffer.from(base64, 'base64');

    const formData = new FormData();
    formData.append('chat_id', chatId);
    
    const blob = new Blob([buffer], { type: 'application/pdf' });
    formData.append('document', blob, fileName);

    const response = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    if (!result.ok) throw new Error(result.description);

    return { success: true };
  } catch (error: any) {
    console.error('Telegram Send Error:', error);
    throw new Error(error.message || 'Failed to send document.');
  }
}

/**
 * Connects the Telegram Bot to our server using Webhooks.
 */
export async function setupTelegramWebhook(baseUrl: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('Token missing.');

  const webhookUrl = `${baseUrl}/api/telegram/webhook`;
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`);
    const result = await response.json();
    
    if (!result.ok) throw new Error(result.description);
    return { success: true, description: result.description };
  } catch (error: any) {
    console.error('Webhook Setup Error:', error);
    throw new Error(error.message || 'Failed to set webhook.');
  }
}

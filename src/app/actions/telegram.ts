
'use server';

/**
 * @fileOverview Telegram Bot Server Actions
 * Handles sending documents to employees via Telegram Bot API.
 */

export async function sendTelegramDocument(chatId: string, base64Data: string, fileName: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('Telegram Bot Token is not configured in environment variables.');
  }

  try {
    // Remove data URI prefix if present
    const base64 = base64Data.split(',')[1] || base64Data;
    const buffer = Buffer.from(base64, 'base64');

    const formData = new FormData();
    formData.append('chat_id', chatId);
    
    // Create a Blob from the buffer for the formData
    const blob = new Blob([buffer], { type: 'application/pdf' });
    formData.append('document', blob, fileName);

    const response = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!result.ok) {
      throw new Error(result.description || 'Failed to send document via Telegram Bot.');
    }

    return { success: true, messageId: result.result.message_id };
  } catch (error: any) {
    console.error('Telegram Bot Error:', error);
    throw new Error(error.message || 'An error occurred while communicating with Telegram.');
  }
}

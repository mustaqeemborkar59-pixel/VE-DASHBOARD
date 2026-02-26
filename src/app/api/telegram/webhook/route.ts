
import { NextResponse } from 'next/server';

/**
 * @fileOverview Telegram Webhook Handler
 * Processes incoming messages from Telegram.
 */

export async function POST(req: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  try {
    const data = await req.json();

    // Check if it's a message and specifically /start command
    if (data.message && (data.message.text === '/start' || data.message.text === '/id')) {
      const chatId = data.message.chat.id;
      const firstName = data.message.from.first_name || 'Technician';
      
      const responseText = `Hello ${firstName}! 👋\n\nWelcome to *VE Enterprises Dashboard Bot*.\n\nYour Unique Chat ID is:\n\`${chatId}\`\n\n*What to do next?*\nCopy this ID and send it to your Manager. They will save it in your profile so you can receive your Salary Slips here directly.`;

      // Reply back to the user
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: responseText,
          parse_mode: 'Markdown',
        }),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

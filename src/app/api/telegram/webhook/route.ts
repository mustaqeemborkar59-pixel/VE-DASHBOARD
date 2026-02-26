
import { NextResponse } from 'next/server';

/**
 * @fileOverview Telegram Webhook Handler
 * Processes incoming messages from Telegram.
 */

export async function POST(req: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN is not set in environment variables.');
    return NextResponse.json({ ok: false, error: 'Bot token missing' }, { status: 500 });
  }

  try {
    const data = await req.json();
    
    // Check if it's a message and specifically /start, /id, or /chatid command
    const message = data.message;
    if (message && message.text) {
      const text = message.text.toLowerCase().trim();
      
      if (text === '/start' || text === '/id' || text === '/chatid') {
        const chatId = message.chat.id;
        const firstName = message.from?.first_name || 'Technician';
        
        const responseText = `Hello ${firstName}! 👋\n\nWelcome to *VE Enterprises Dashboard Bot*.\n\nYour Unique Chat ID is:\n\`${chatId}\`\n\n*What to do next?*\n1. Copy the ID above.\n2. Go to the workshop dashboard.\n3. Edit your Employee Profile.\n4. Paste this ID in the "Telegram Chat ID" field.\n\nOnce saved, you will receive your salary slips here automatically! 📄`;

        // Reply back to the user
        const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: responseText,
            parse_mode: 'Markdown',
          }),
        });

        const result = await response.json();
        if (!result.ok) {
          console.error('Telegram SendMessage Error:', result);
        }
      }
    }

    // Always return 200 to Telegram so it doesn't keep retrying the same update
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ ok: true }); 
  }
}

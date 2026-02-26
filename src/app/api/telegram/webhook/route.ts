
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';

/**
 * @fileOverview Telegram Webhook Handler
 * Processes incoming messages and allows technicians to request their own slips.
 */

export async function POST(req: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN is not set in environment variables.');
    return NextResponse.json({ ok: false, error: 'Bot token missing' }, { status: 500 });
  }

  try {
    const data = await req.json();
    console.log('Incoming Telegram Update:', JSON.stringify(data));

    const message = data.message || data.edited_message;

    if (message && message.text && message.chat) {
      const text = message.text.toLowerCase().trim();
      const chatId = message.chat.id.toString();
      const firstName = message.from?.first_name || 'Technician';
      
      const { firestore } = initializeFirebase();

      // Handle Registration / ID Command
      if (text.includes('/start') || text.includes('/id') || text === 'id') {
        const responseText = `Hello ${firstName}! 👋\n\nWelcome to *VE Enterprises Dashboard Bot*.\n\nYour Unique Chat ID is:\n\`${chatId}\`\n\n*What to do next?*\n1. Copy the ID above.\n2. Go to the workshop dashboard.\n3. Edit your Employee Profile.\n4. Paste this ID in the "Telegram Chat ID" field.\n\nOnce saved, you can type */slip* here to get your latest salary details! 📄`;

        await sendTelegramMessage(token, chatId, responseText);
      } 
      
      // Handle Salary Slip Request Command
      else if (text.includes('/slip') || text.includes('slip') || text.includes('salary')) {
        // 1. Find the employee by Chat ID
        const empQuery = query(collection(firestore, 'employees'), where('telegramChatId', '==', chatId));
        const empSnap = await getDocs(empQuery);

        if (empSnap.empty) {
          await sendTelegramMessage(token, chatId, "❌ *Record Not Found*\n\nYour Chat ID is not linked to any employee profile. Please contact the administrator and provide your ID: `" + chatId + "`");
        } else {
          const employee = empSnap.docs[0].data();
          const employeeId = empSnap.docs[0].id;

          // 2. Find the latest salary record
          const salaryQuery = query(
            collection(firestore, 'salaries'), 
            where('employeeId', '==', employeeId),
            orderBy('month', 'desc'),
            limit(1)
          );
          const salarySnap = await getDocs(salaryQuery);

          if (salarySnap.empty) {
            await sendTelegramMessage(token, chatId, `Hello ${employee.fullName},\n\nNo salary records found for your account yet. 🔍`);
          } else {
            const salary = salarySnap.docs[0].data();
            const monthDate = new Date(salary.month + "-01");
            const monthName = monthDate.toLocaleString('en-us', { month: 'long', year: 'numeric' });

            const summary = `📄 *Latest Salary Summary*\n` +
              `━━━━━━━━━━━━━━━━━━\n` +
              `👤 *Name:* ${employee.fullName}\n` +
              `📅 *Month:* ${monthName}\n` +
              `🏢 *Firm:* ${salary.enterprise} Enterprises\n\n` +
              `✅ *Attendance:* ${salary.presentDays} / ${salary.workingDays} Days\n` +
              `🕒 *Overtime:* ₹${salary.ot || 0}\n` +
              `💰 *NET PAYABLE:* ₹${salary.netSalary.toLocaleString('en-IN')}\n` +
              `━━━━━━━━━━━━━━━━━━\n` +
              `🏁 *Status:* ${salary.status === 'Paid' ? '✅ PAID' : '⏳ PENDING'}\n\n` +
              `_Note: Contact HR for the full PDF copy._`;

            await sendTelegramMessage(token, chatId, summary);
          }
        }
      }
    }

    // Always return 200 OK to Telegram
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook processing failed:', error);
    return NextResponse.json({ ok: true }); 
  }
}

async function sendTelegramMessage(token: string, chatId: string, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
      }),
    });
  } catch (e) {
    console.error('Failed to send reply to Telegram:', e);
  }
}

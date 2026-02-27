
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { collection, query, where, getDocs, limit, orderBy, doc, getDoc } from 'firebase/firestore';
import { generateSalaryPdfData } from '@/lib/salary-pdf-generator';

/**
 * @fileOverview Telegram Webhook Handler
 * Processes incoming messages and allows technicians to request specific month PDF slips.
 */

const monthMap: Record<string, string> = {
  'jan': '01', 'january': '01',
  'feb': '02', 'february': '02',
  'mar': '03', 'march': '03',
  'apr': '04', 'april': '04',
  'may': '05',
  'jun': '06', 'june': '06',
  'jul': '07', 'july': '07',
  'aug': '08', 'august': '08',
  'sep': '09', 'september': '09',
  'oct': '10', 'october': '10',
  'nov': '11', 'november': '11',
  'dec': '12', 'december': '12'
};

export async function POST(req: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Bot token missing' }, { status: 500 });
  }

  try {
    const data = await req.json();
    const message = data.message || data.edited_message;

    if (message && message.text && message.chat) {
      const rawText = message.text.toLowerCase().trim();
      const chatId = message.chat.id.toString();
      const firstName = message.from?.first_name || 'Technician';
      
      const { firestore } = initializeFirebase();

      // COMMAND: /start or ID
      if (rawText.startsWith('/start') || rawText === 'id' || rawText === '/id') {
        const responseText = `Hello ${firstName}! 👋\n\nWelcome to *VE Enterprises Dashboard Bot*.\n\nYour Unique Chat ID is:\n\`${chatId}\`\n\n*Commands:*\n1. Type */slip* - Get latest salary summary.\n2. Type */slips* - List available months.\n3. Type */slip Jan* - Get PDF for January.\n\n_Make sure this ID is saved in your Employee Profile on the dashboard._`;
        await sendTelegramMessage(token, chatId, responseText);
      } 
      
      // COMMAND: /slips (List available months)
      else if (rawText === '/slips' || rawText === 'list' || rawText === 'slips') {
        const empQuery = query(collection(firestore, 'employees'), where('telegramChatId', '==', chatId));
        const empSnap = await getDocs(empQuery);

        if (empSnap.empty) {
          await sendTelegramMessage(token, chatId, "❌ *Chat ID not linked.*\nPlease contact HR with your ID: `" + chatId + "`");
        } else {
          const employeeId = empSnap.docs[0].id;
          const salaryQuery = query(
            collection(firestore, 'salaries'), 
            where('employeeId', '==', employeeId),
            orderBy('month', 'desc'),
            limit(12)
          );
          const salarySnap = await getDocs(salaryQuery);

          if (salarySnap.empty) {
            await sendTelegramMessage(token, chatId, "🔍 No salary records found for your account.");
          } else {
            let list = `📄 *Available Salary Slips:*\n━━━━━━━━━━━━━━━━━━\n`;
            salarySnap.docs.forEach(doc => {
              const s = doc.data();
              const date = new Date(s.month + "-01");
              const label = date.toLocaleString('en-us', { month: 'long', year: 'numeric' });
              list += `• ${label} (Type \`/slip ${date.toLocaleString('en-us', { month: 'short' })}\`)\n`;
            });
            list += `━━━━━━━━━━━━━━━━━━\n_Type the command to get the full PDF._`;
            await sendTelegramMessage(token, chatId, list);
          }
        }
      }

      // COMMAND: /slip [Month]
      else if (rawText.includes('slip') || rawText.includes('salary')) {
        const empQuery = query(collection(firestore, 'employees'), where('telegramChatId', '==', chatId));
        const empSnap = await getDocs(empQuery);

        if (empSnap.empty) {
          await sendTelegramMessage(token, chatId, "❌ *Unauthorized.*\nLink your Chat ID: `" + chatId + "`");
        } else {
          const employee = empSnap.docs[0].data();
          const employeeId = empSnap.docs[0].id;

          // Detect month from text (e.g., "slip jan" or "salary 03")
          let targetMonth = "";
          const parts = rawText.split(/\s+/);
          const monthArg = parts.length > 1 ? parts[1] : "";

          if (monthMap[monthArg]) {
            targetMonth = monthMap[monthArg];
          } else if (/^\d{1,2}$/.test(monthArg)) {
            targetMonth = monthArg.padStart(2, '0');
          }

          let salaryQuery;
          if (targetMonth) {
            // Find by specific month in the last 2 years
            salaryQuery = query(
              collection(firestore, 'salaries'), 
              where('employeeId', '==', employeeId),
              where('month', '>=', formatYearMonth(new Date().getFullYear() - 1)),
              orderBy('month', 'desc')
            );
          } else {
            // Get latest
            salaryQuery = query(
              collection(firestore, 'salaries'), 
              where('employeeId', '==', employeeId),
              orderBy('month', 'desc'),
              limit(1)
            );
          }

          const salarySnap = await getDocs(salaryQuery);
          let salaryDoc = null;

          if (targetMonth) {
            salaryDoc = salarySnap.docs.find(d => d.data().month.endsWith("-" + targetMonth));
          } else {
            salaryDoc = salarySnap.docs[0];
          }

          if (!salaryDoc) {
            await sendTelegramMessage(token, chatId, `❌ Sorry, no slip found for the requested period. Type */slips* to see available records.`);
          } else {
            const salary = salaryDoc.data();
            const monthDate = new Date(salary.month + "-01");
            const monthName = monthDate.toLocaleString('en-us', { month: 'long', year: 'numeric' });

            // Send summary text first
            const summary = `📄 *Salary Summary: ${monthName}*\n` +
              `━━━━━━━━━━━━━━━━━━\n` +
              `👤 *Name:* ${employee.fullName}\n` +
              `💰 *NET PAYABLE:* ₹${salary.netSalary.toLocaleString('en-IN')}\n` +
              `🏁 *Status:* ${salary.status === 'Paid' ? '✅ PAID' : '⏳ PENDING'}\n\n` +
              `_Generating your official PDF slip..._ ⏳`;

            await sendTelegramMessage(token, chatId, summary);

            // Fetch company settings for PDF
            const settingsId = salary.enterprise.toLowerCase();
            const settingsSnap = await getDoc(doc(firestore, 'companySettings', settingsId));
            const settings = settingsSnap.data();

            if (settings) {
              try {
                // Generate PDF on server
                const pdfDoc = await generateSalaryPdfData(salary as any, employee as any, settings as any);
                const pdfBase64 = pdfDoc.output('datauristring');
                const fileName = `Salary_Slip_${salary.month}_${employee.fullName.replace(/\s+/g, '_')}.pdf`;
                
                // Send PDF via Action
                await sendTelegramPDF(token, chatId, pdfBase64, fileName);
              } catch (pdfErr) {
                console.error("PDF Bot Error:", pdfErr);
                await sendTelegramMessage(token, chatId, "_Error generating PDF. Please contact HR._");
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook processing failed:', error);
    return NextResponse.json({ ok: true }); 
  }
}

function formatYearMonth(year: number) {
    return `${year}-01`;
}

async function sendTelegramMessage(token: string, chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
    }),
  });
}

async function sendTelegramPDF(token: string, chatId: string, base64Data: string, fileName: string) {
  const base64 = base64Data.split(',')[1] || base64Data;
  const buffer = Buffer.from(base64, 'base64');
  const formData = new FormData();
  formData.append('chat_id', chatId);
  const blob = new Blob([buffer], { type: 'application/pdf' });
  formData.append('document', blob, fileName);

  await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
    method: 'POST',
    body: formData,
  });
}

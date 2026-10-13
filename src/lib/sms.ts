// The only file that talks to the SMS gateway. Swap providers by editing this file.
// Env: SMS_API_URL, SMS_API_KEY, SMS_SENDER_ID (e.g. "GARWAN LAW")
//
// Every Pakistani gateway (SendPK, Robo SMS, Zong, ...) has its own request format.
// The request below is a generic placeholder: replace the URL, field names and
// auth header with the ones from the chosen provider's API documentation.

export function normalizePk(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.startsWith('92')) return d; // 923001234567
  if (d.startsWith('0')) return '92' + d.slice(1); // 03001234567 -> 923001234567
  return d;
}

export async function sendSms(phone: string, text: string): Promise<string> {
  const res = await fetch(process.env.SMS_API_URL as string, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.SMS_API_KEY}`,
    },
    body: JSON.stringify({
      sender: process.env.SMS_SENDER_ID,
      to: normalizePk(phone),
      message: text,
    }),
  });
  return `${res.status} ${await res.text()}`.slice(0, 500);
}

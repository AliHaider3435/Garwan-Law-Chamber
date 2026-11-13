// The only file that talks to the SMS gateway. Swap providers by editing this file.
// Env: SMS_API_URL, SMS_API_KEY, SMS_SENDER_ID (e.g. "GARWAN LAW")
//
// Every Pakistani gateway (SendPK, Robo SMS, Zong, ...) has its own request format.
// The request below is a generic placeholder: replace the URL, field names and
// auth header with the ones from the chosen provider's API documentation.

export class SmsGatewayError extends Error {
  readonly rejected: boolean;

  constructor(message: string, rejected = false) {
    super(message);
    this.rejected = rejected;
  }
}

export function isSmsConfigured(): boolean {
  return !!(process.env.SMS_API_URL && process.env.SMS_API_KEY && process.env.SMS_SENDER_ID);
}

export function normalizePk(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.startsWith('92')) return d; // 923001234567
  if (d.startsWith('0')) return '92' + d.slice(1); // 03001234567 -> 923001234567
  return d;
}

export async function sendSms(phone: string, text: string): Promise<string> {
  if (!isSmsConfigured()) throw new SmsGatewayError('SMS provider is not configured.');
  const res = await fetch(process.env.SMS_API_URL!, {
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
  const response = `${res.status} ${await res.text()}`.slice(0, 500);
  if (!res.ok) throw new SmsGatewayError(`SMS provider returned HTTP ${res.status}.`, true);
  return response;
}

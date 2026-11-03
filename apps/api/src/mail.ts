/** Sends sign-in emails. Swappable so tests and local runs send nothing. */
export interface Mailer {
  sendSignInCode(to: string, code: string, link: string): Promise<void>;
}

export class MailNotConfiguredError extends Error {}

/** The words of the sign-in email, shared by every mailer. */
export function signInEmail(code: string, link: string) {
  const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
  return {
    subject: `${spaced} is your AndThen sign-in code`,
    text: [
      `Your AndThen sign-in code is ${spaced}.`,
      '',
      `Type it into the app, or open this link on the same device:`,
      link,
      '',
      'It works for 10 minutes. If you didn’t ask for it, you can ignore this email.',
    ].join('\n'),
    html: `<div style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.5;color:#1d2420">
<p>Your AndThen sign-in code is</p>
<p style="font-size:32px;font-weight:700;letter-spacing:4px;margin:8px 0 16px">${spaced}</p>
<p>Type it into the app, or <a href="${link}" style="color:#1E6B5C">sign in with one tap</a> on the same device.</p>
<p style="color:#5b625e;font-size:14px">It works for 10 minutes. If you didn’t ask for it, you can ignore this email.</p>
</div>`,
  };
}

/** Sends through Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email). */
export class ResendMailer implements Mailer {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async sendSignInCode(to: string, code: string, link: string): Promise<void> {
    const res = await this.fetchFn('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: this.from, to: [to], ...signInEmail(code, link) }),
    });
    if (!res.ok) throw new Error(`Resend answered ${res.status}: ${await res.text()}`);
  }
}

/** For local development: prints the code instead of emailing it. */
export class ConsoleMailer implements Mailer {
  async sendSignInCode(to: string, code: string, link: string): Promise<void> {
    console.log(`[mail] Sign-in code for ${to}: ${code}  (${link})`);
  }
}

/** Used in production until RESEND_API_KEY is set: sign-in answers "not available yet". */
export class NoMailer implements Mailer {
  async sendSignInCode(): Promise<void> {
    throw new MailNotConfiguredError('Email sending is not set up (RESEND_API_KEY is missing).');
  }
}

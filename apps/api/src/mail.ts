/** Sends the API's emails. Swappable so tests and local runs send nothing. */
export interface Mailer {
  sendSignInCode(to: string, code: string, link: string): Promise<void>;
  /** Warns that an unused account will be deleted on `deleteOn`. */
  sendInactiveWarning(to: string, deleteOn: Date, appLink: string): Promise<void>;
}

export interface Email {
  subject: string;
  text: string;
  html: string;
}

export class MailNotConfiguredError extends Error {}

/** The words of the sign-in email, shared by every mailer. */
export function signInEmail(code: string, link: string): Email {
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

/** The words of the email sent 30 days before an unused account is deleted. */
export function inactiveWarningEmail(deleteOn: Date, appLink: string): Email {
  const day = deleteOn.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return {
    subject: 'Your AndThen sync account will be deleted soon',
    text: [
      `Your AndThen sync account hasn't been used in nearly two years, so we'll delete it, and the copy of your habits on our server, on ${day}.`,
      '',
      'Anything still on your devices stays there. To keep the account, just open AndThen on a device where sync is on:',
      appLink,
      '',
      'If you no longer use it, there is nothing to do.',
    ].join('\n'),
    html: `<div style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.5;color:#1d2420">
<p>Your AndThen sync account hasn’t been used in nearly two years, so we’ll delete it, and the copy of your habits on our server, on <strong>${day}</strong>.</p>
<p>Anything still on your devices stays there. To keep the account, just <a href="${appLink}" style="color:#1E6B5C">open AndThen</a> on a device where sync is on.</p>
<p style="color:#5b625e;font-size:14px">If you no longer use it, there is nothing to do.</p>
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

  sendSignInCode(to: string, code: string, link: string): Promise<void> {
    return this.send(to, signInEmail(code, link));
  }

  sendInactiveWarning(to: string, deleteOn: Date, appLink: string): Promise<void> {
    return this.send(to, inactiveWarningEmail(deleteOn, appLink));
  }

  private async send(to: string, email: Email): Promise<void> {
    const res = await this.fetchFn('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: this.from, to: [to], ...email }),
    });
    if (!res.ok) throw new Error(`Resend answered ${res.status}: ${await res.text()}`);
  }
}

/** For local development: prints the code instead of emailing it. */
export class ConsoleMailer implements Mailer {
  async sendSignInCode(to: string, code: string, link: string): Promise<void> {
    console.log(`[mail] Sign-in code for ${to}: ${code}  (${link})`);
  }

  async sendInactiveWarning(to: string, deleteOn: Date): Promise<void> {
    console.log(`[mail] Inactive warning for ${to}: deletion on ${deleteOn.toISOString()}`);
  }
}

/** Used in production until RESEND_API_KEY is set: sign-in answers "not available yet". */
export class NoMailer implements Mailer {
  async sendSignInCode(): Promise<void> {
    throw new MailNotConfiguredError('Email sending is not set up (RESEND_API_KEY is missing).');
  }

  async sendInactiveWarning(): Promise<void> {
    throw new MailNotConfiguredError('Email sending is not set up (RESEND_API_KEY is missing).');
  }
}

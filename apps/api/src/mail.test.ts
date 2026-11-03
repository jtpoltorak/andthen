import { describe, expect, it } from 'vitest';
import { ResendMailer, signInEmail } from './mail';

describe('ResendMailer', () => {
  it('posts the sign-in email to Resend with the API key', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fakeFetch = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response('{"id":"x"}', { status: 200 });
    }) as unknown as typeof fetch;
    const mailer = new ResendMailer('re_test', 'AndThen <hello@andthenhabits.com>', fakeFetch);

    await mailer.sendSignInCode('sam@example.com', '482913', 'https://andthenhabits.com/sign-in?x');

    expect(calls[0].url).toBe('https://api.resend.com/emails');
    expect((calls[0].init.headers as Record<string, string>)['Authorization']).toBe(
      'Bearer re_test',
    );
    const body = JSON.parse(calls[0].init.body as string);
    expect(body).toMatchObject({
      from: 'AndThen <hello@andthenhabits.com>',
      to: ['sam@example.com'],
      subject: '482 913 is your AndThen sign-in code',
    });
    expect(body.text).toContain('https://andthenhabits.com/sign-in?x');
  });

  it('fails loudly when Resend refuses', async () => {
    const fakeFetch = (async () =>
      new Response('bad key', { status: 401 })) as unknown as typeof fetch;
    const mailer = new ResendMailer('re_bad', 'x@y.z', fakeFetch);
    await expect(mailer.sendSignInCode('a@b.co', '000001', 'l')).rejects.toThrow('401');
  });

  it('shows the code split in two, like 000 001', () => {
    expect(signInEmail('000001', 'l').subject).toBe('000 001 is your AndThen sign-in code');
  });
});

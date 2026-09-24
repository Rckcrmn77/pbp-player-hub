import { expect } from "@playwright/test";

/**
 * Reads emails caught by the local Supabase stack's test mail server (Mailpit).
 * Only used against a local stack; no real email is sent.
 */
const mailpitUrl = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

type MailpitSummary = { ID: string; Subject: string; Created: string };

export async function latestEmailLink(to: string, subject: RegExp, after: Date): Promise<string> {
  let link: string | undefined;
  await expect
    .poll(
      async () => {
        const search = await fetch(`${mailpitUrl}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
        if (!search.ok) return undefined;
        const { messages } = (await search.json()) as { messages: MailpitSummary[] };
        const message = messages
          .filter((m) => subject.test(m.Subject) && new Date(m.Created) >= new Date(after.getTime() - 1000))
          .sort((a, b) => b.Created.localeCompare(a.Created))[0];
        if (!message) return undefined;
        const detail = await fetch(`${mailpitUrl}/api/v1/message/${message.ID}`);
        const { HTML } = (await detail.json()) as { HTML: string };
        const href = HTML.match(/href="([^"]*\/auth\/confirm[^"]*)"/)?.[1];
        link = href?.replace(/&amp;/g, "&");
        return link;
      },
      { message: `waiting for "${subject}" email to ${to}`, timeout: 20_000 },
    )
    .toBeTruthy();
  return link!;
}

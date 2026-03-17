import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function getGraphToken(): Promise<string> {
  const res = await fetch(
    `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.AZURE_CLIENT_ID!,
        client_secret: process.env.AZURE_CLIENT_SECRET!,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    }
  );
  const data = await res.json();
  if (!data.access_token) throw new Error(`Failed to get Graph token: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function getFolderId(token: string, userEmail: string, folderName: string): Promise<string> {
  if (folderName.toLowerCase() === "inbox") return "Inbox";

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${userEmail}/mailFolders?$filter=displayName eq '${folderName}'`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  if (!data.value?.length) throw new Error(`Folder not found: ${folderName}`);
  return data.value[0].id;
}

interface GraphMessage {
  subject: string;
  body: { content: string };
  from: { emailAddress: { name: string; address: string } };
  receivedDateTime: string;
}

async function getEmails(token: string, folderName: string): Promise<string[]> {
  const userEmail = process.env.OUTLOOK_USER_EMAIL!;
  const folderId = await getFolderId(token, userEmail, folderName);

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${userEmail}/mailFolders/${encodeURIComponent(folderId)}/messages` +
      `?$filter=receivedDateTime ge ${since}` +
      `&$select=subject,body,from,receivedDateTime` +
      `&$top=50`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Prefer: 'outlook.body-content-type="text"',
      },
    }
  );
  const data = await res.json();

  return (data.value || []).map((msg: GraphMessage) => {
    const body = (msg.body?.content || "").replace(/\s+/g, " ").trim().slice(0, 1500);
    const from = msg.from?.emailAddress?.name || msg.from?.emailAddress?.address || "Unknown";
    return `From: ${from}\nSubject: ${msg.subject}\nReceived: ${msg.receivedDateTime}\n\n${body}`;
  });
}

async function getPortfolioTickers(): Promise<string[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data } = await supabase
    .from("portfolio")
    .select("tickers")
    .limit(1)
    .single();

  if (!data?.tickers) return [];

  return data.tickers
    .split(/[\s,;|\n]+/)
    .map((t: string) => t.replace(/^\$/, "").toUpperCase().trim())
    .filter((t: string) => t.length > 0);
}

async function sendEmail(token: string, subject: string, body: string) {
  const userEmail = process.env.OUTLOOK_USER_EMAIL!;
  const htmlBody = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");

  await fetch(`https://graph.microsoft.com/v1.0/users/${userEmail}/sendMail`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: "HTML", content: `<p>${htmlBody}</p>` },
        toRecipients: [{ emailAddress: { address: userEmail } }],
      },
    }),
  });
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const token = await getGraphToken();

    const [inboxEmails, streetAccountEmails, tickers] = await Promise.all([
      getEmails(token, "Inbox"),
      getEmails(token, "a_Streetaccount"),
      getPortfolioTickers(),
    ]);

    if (tickers.length === 0) {
      return NextResponse.json({ message: "No portfolio tickers configured" });
    }

    const allEmails = [
      ...inboxEmails.map((e) => `[INBOX]\n${e}`),
      ...streetAccountEmails.map((e) => `[STREETACCOUNT]\n${e}`),
    ];

    if (allEmails.length === 0) {
      return NextResponse.json({ message: "No emails in the last 24 hours" });
    }

    const portfolio = tickers.join(", ");
    const emailContent = allEmails.join("\n\n---\n\n");

    const message = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `You are a financial research assistant. Review the emails below and write a concise morning brief focused on what is relevant to this portfolio: ${portfolio}.

For each relevant item include:
- The ticker(s) affected
- A 1-2 sentence summary of what happened
- Why it matters

Group findings by ticker. Skip anything not relevant to the portfolio. If nothing is relevant, say so briefly. Be direct and factual.

EMAILS:
${emailContent}`,
        },
      ],
    });

    const summary =
      message.content[0].type === "text" ? message.content[0].text : "No summary generated.";

    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "America/New_York",
    });

    await sendEmail(token, `Morning Brief — ${today}`, summary);

    return NextResponse.json({
      success: true,
      emailsProcessed: allEmails.length,
      tickers,
    });
  } catch (error) {
    console.error("Morning brief error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

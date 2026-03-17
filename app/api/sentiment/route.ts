import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function getCompanyName(ticker: string): Promise<string> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    const data = await res.json();
    return data?.chart?.result?.[0]?.meta?.longName || ticker;
  } catch {
    return ticker;
  }
}

async function fetchRedditPosts(company: string, ticker: string): Promise<{ title: string; url: string; text: string }[]> {
  try {
    const query = encodeURIComponent(`"${company}" (employees OR "work at" OR "working at" OR layoffs OR "company culture") -stocks -investing`);
    const res = await fetch(
      `https://www.reddit.com/search.json?q=${query}&sort=new&t=month&limit=15`,
      { headers: { "User-Agent": "earnings-prep-bot/1.0" } }
    );
    const data = await res.json();
    const posts = data?.data?.children || [];

    return posts
      .filter((p: { data: { title: string; selftext: string } }) => p.data?.title)
      .map((p: { data: { title: string; selftext: string; permalink: string } }) => ({
        title: p.data.title,
        url: `https://reddit.com${p.data.permalink}`,
        text: p.data.selftext?.slice(0, 300) || "",
      }));
  } catch {
    return [];
  }
}

async function fetchNewsPosts(company: string, ticker: string): Promise<{ title: string; url: string }[]> {
  try {
    const query = encodeURIComponent(`"${company}" employees layoffs culture`);
    const res = await fetch(
      `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    const xml = await res.text();

    const items: { title: string; url: string }[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null && items.length < 10) {
      const itemXml = match[1];
      const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
                         itemXml.match(/<title>(.*?)<\/title>/);
      const linkMatch = itemXml.match(/<link>(.*?)<\/link>/);

      if (titleMatch && linkMatch) {
        items.push({ title: titleMatch[1], url: linkMatch[1] });
      }
    }

    return items;
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get("ticker");

  if (!ticker) {
    return NextResponse.json({ error: "ticker is required" }, { status: 400 });
  }

  const companyName = await getCompanyName(ticker);
  const [redditPosts, newsPosts] = await Promise.all([
    fetchRedditPosts(companyName, ticker),
    fetchNewsPosts(companyName, ticker),
  ]);

  // Build context for Claude
  let context = `Company: ${companyName} (${ticker})\n\n`;

  if (redditPosts.length > 0) {
    context += "=== Reddit Posts ===\n";
    redditPosts.forEach((p) => {
      context += `- ${p.title}\n`;
      if (p.text) context += `  ${p.text}\n`;
    });
    context += "\n";
  }

  if (newsPosts.length > 0) {
    context += "=== News Headlines ===\n";
    newsPosts.forEach((p) => {
      context += `- ${p.title}\n`;
    });
  }

  if (redditPosts.length === 0 && newsPosts.length === 0) {
    return NextResponse.json({
      companyName,
      summary: "No recent employee sentiment data found for this company.",
      sources: [],
    });
  }

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `You are an analyst summarizing employee sentiment for ${companyName} (${ticker}) based on recent online sources. Respond with valid JSON only, no markdown, in this exact format:
{
  "sentiment": "positive" | "neutral" | "negative",
  "summary": "3-5 sentence summary here"
}

The sentiment field must be one of those three values. The summary should cover workplace culture, morale, compensation, management, or any notable recent events affecting employees. Use whatever signal is available — even indirect signals like layoff news or leadership changes are relevant. Do not disclaim data quality. Always provide a substantive best-effort summary.\n\n${context}`,
      },
    ],
  });

  const rawText = message.content[0].type === "text" ? message.content[0].text : "{}";
  let summary = "";
  let sentiment: "positive" | "neutral" | "negative" = "neutral";
  try {
    // Strip markdown code fences if present
    const cleaned = rawText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(cleaned);
    summary = parsed.summary || "";
    if (["positive", "neutral", "negative"].includes(parsed.sentiment)) {
      sentiment = parsed.sentiment;
    }
  } catch {
    summary = rawText;
  }

  const sources = [
    ...redditPosts.slice(0, 10).map((p) => ({ title: p.title, url: p.url, source: "Reddit" })),
    ...newsPosts.slice(0, 10).map((p) => ({ title: p.title, url: p.url, source: "News" })),
  ];

  return NextResponse.json({ companyName, summary, sentiment, sources });
}

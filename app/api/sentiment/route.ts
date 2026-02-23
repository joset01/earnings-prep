import { NextRequest, NextResponse } from "next/server";

export interface TweetResult {
  id: string;
  text: string;
  username: string;
  sentiment: "bullish" | "neutral" | "bearish";
}

export interface SentimentResponse {
  ticker: string;
  tweetCount: number;
  bullish: number;
  neutral: number;
  bearish: number;
  label: "bullish" | "neutral" | "bearish";
  messages: TweetResult[];
}

interface StocktwitsSentiment {
  basic: "Bullish" | "Bearish";
}

interface StocktwitsMessage {
  id: number;
  body: string;
  user: { username: string };
  entities?: { sentiment?: StocktwitsSentiment | null };
}

interface StocktwitsResponse {
  messages?: StocktwitsMessage[];
  errors?: { message: string }[];
  response?: { status: number };
}

function toLabel(s: string | undefined): "bullish" | "neutral" | "bearish" {
  if (s === "Bullish") return "bullish";
  if (s === "Bearish") return "bearish";
  return "neutral";
}

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");

  if (!ticker) {
    return NextResponse.json({ error: "ticker is required" }, { status: 400 });
  }

  const clean = ticker.replace(/^\$/, "").toUpperCase();

  try {
    const res = await fetch(
      `https://api.stocktwits.com/api/2/streams/symbol/${clean}.json`,
      { next: { revalidate: 0 } }
    );

    const data: StocktwitsResponse = await res.json();

    if (data.response?.status === 404 || !data.messages) {
      return NextResponse.json(
        { error: `No Stocktwits data found for $${clean}` },
        { status: 404 }
      );
    }

    if (data.errors?.length) {
      return NextResponse.json({ error: data.errors[0].message }, { status: 400 });
    }

    const messages: TweetResult[] = data.messages.map((m) => ({
      id: String(m.id),
      text: m.body,
      username: m.user.username,
      sentiment: toLabel(m.entities?.sentiment?.basic),
    }));

    const bullish = messages.filter((m) => m.sentiment === "bullish").length;
    const bearish = messages.filter((m) => m.sentiment === "bearish").length;
    const neutral = messages.filter((m) => m.sentiment === "neutral").length;

    let label: "bullish" | "neutral" | "bearish" = "neutral";
    if (bullish > bearish && bullish > neutral) label = "bullish";
    else if (bearish > bullish && bearish > neutral) label = "bearish";

    const response: SentimentResponse = {
      ticker: clean,
      tweetCount: messages.length,
      bullish,
      neutral,
      bearish,
      label,
      messages,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("Sentiment API error:", err);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

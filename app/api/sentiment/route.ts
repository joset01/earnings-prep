import { NextRequest, NextResponse } from "next/server";
import { Scraper, SearchMode } from "agent-twitter-client";
import Sentiment from "sentiment";

const analyzer = new Sentiment();

// Financial-specific word overrides to improve accuracy
const financialExtras = {
  extras: {
    beat: 3,
    beats: 3,
    crush: 3,
    crushes: 3,
    blowout: 4,
    outperform: 3,
    upgrade: 3,
    upgraded: 3,
    bullish: 4,
    rally: 3,
    soars: 3,
    surges: 3,
    breakout: 3,
    miss: -3,
    misses: -3,
    missed: -3,
    disappoint: -3,
    disappoints: -3,
    disappointing: -3,
    downgrade: -3,
    downgraded: -3,
    bearish: -4,
    selloff: -3,
    plunge: -3,
    plunges: -3,
    crashes: -4,
    warning: -2,
    cautious: -2,
    concern: -2,
    concerns: -2,
    weak: -2,
    weakness: -2,
    strong: 2,
    strength: 2,
    guidance: 1,
  },
};

export interface TweetResult {
  id: string;
  text: string;
  username: string;
  score: number;
  label: "bullish" | "neutral" | "bearish";
}

export interface SentimentResponse {
  ticker: string;
  tweetCount: number;
  bullish: number;
  neutral: number;
  bearish: number;
  overallScore: number;
  label: "bullish" | "neutral" | "bearish";
  tweets: TweetResult[];
}

function scoreToLabel(score: number): "bullish" | "neutral" | "bearish" {
  if (score > 0.5) return "bullish";
  if (score < -0.5) return "bearish";
  return "neutral";
}

export async function POST(req: NextRequest) {
  const { ticker } = await req.json();

  if (!ticker || typeof ticker !== "string") {
    return NextResponse.json({ error: "ticker is required" }, { status: 400 });
  }

  const username = process.env.TWITTER_USERNAME;
  const password = process.env.TWITTER_PASSWORD;
  const email = process.env.TWITTER_EMAIL;

  if (!username || !password || !email) {
    return NextResponse.json(
      { error: "Twitter credentials not configured. Set TWITTER_USERNAME, TWITTER_PASSWORD, and TWITTER_EMAIL in .env.local" },
      { status: 500 }
    );
  }

  const clean = ticker.replace(/^\$/, "").toUpperCase();
  const query = `$${clean} lang:en -is:retweet`;

  try {
    const scraper = new Scraper();
    await scraper.login(username, password, email);

    const tweets: TweetResult[] = [];

    for await (const tweet of scraper.searchTweets(query, 40, SearchMode.Latest)) {
      if (!tweet.text) continue;

      const result = analyzer.analyze(tweet.text, financialExtras);
      const label = scoreToLabel(result.comparative);

      tweets.push({
        id: tweet.id ?? String(Math.random()),
        text: tweet.text,
        username: tweet.username ?? "unknown",
        score: result.comparative,
        label,
      });
    }

    if (tweets.length === 0) {
      return NextResponse.json({ error: "No tweets found for this ticker" }, { status: 404 });
    }

    const bullish = tweets.filter((t) => t.label === "bullish").length;
    const bearish = tweets.filter((t) => t.label === "bearish").length;
    const neutral = tweets.filter((t) => t.label === "neutral").length;
    const overallScore =
      tweets.reduce((sum, t) => sum + t.score, 0) / tweets.length;

    const response: SentimentResponse = {
      ticker: clean,
      tweetCount: tweets.length,
      bullish,
      neutral,
      bearish,
      overallScore,
      label: scoreToLabel(overallScore),
      tweets: tweets.slice(0, 20),
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("Sentiment API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch tweets. Check your Twitter credentials." },
      { status: 500 }
    );
  }
}

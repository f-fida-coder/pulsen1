/**
 * News & AI Insights Engine v2
 * - 13 RSS feeds: SE, NORDICS, EU, GLOBAL with region priority
 * - AI processing with Swedish/Nordic focus, personalization per elområde
 * - Action layer: optimize_battery, schedule_charging, view_forecast, monitor_risk
 * - 30-minute cron, in-memory cache 15 min
 */

import RSSParser from "rss-parser";
import { invokeLLM } from "./_core/llm";
import {
  insertNewsArticle,
  getArticleByUrl,
  markArticleProcessed,
  getUnprocessedArticles,
  insertAIInsight,
  autoTriggerActions,
} from "./db";

// ─── RSS Feed Sources (Region-tagged) ─────────────────────────────────────

interface FeedSource {
  url: string;
  source: string;
  region: "SE" | "NORDICS" | "EU" | "GLOBAL";
}

const RSS_FEEDS: FeedSource[] = [
  // SWEDEN (highest priority)
  { url: "https://www.svensksolenergi.se/feed/", source: "Svensk Solenergi", region: "SE" },
  { url: "https://www.energinyheter.se/rss.xml", source: "Energinyheter.se", region: "SE" },
  { url: "https://secondopinion.se/feed/", source: "Second Opinion", region: "SE" },
  { url: "https://www.svt.se/nyheter/ekonomi/rss.xml", source: "SVT Näringsliv", region: "SE" },
  { url: "https://www.di.se/rss", source: "Dagens Industri", region: "SE" },

  // NORDICS
  { url: "https://www.montelnews.com/rss", source: "Montel News", region: "NORDICS" },
  { url: "https://www.nordicenergy.org/feed/", source: "Nordic Energy Research", region: "NORDICS" },

  // EU
  { url: "https://www.euractiv.com/sections/energy-environment/feed/", source: "Euractiv Energy", region: "EU" },
  { url: "https://www.pv-europe.eu/feed/", source: "PV Europe", region: "EU" },

  // GLOBAL (secondary)
  { url: "https://www.pv-magazine.com/feed/", source: "PV Magazine", region: "GLOBAL" },
  { url: "https://cleantechnica.com/feed/", source: "CleanTechnica", region: "GLOBAL" },
  { url: "https://www.energy-storage.news/feed/", source: "Energy Storage News", region: "GLOBAL" },
  { url: "https://renewablesnow.com/news/rss/", source: "Renewables Now", region: "GLOBAL" },
];

const ENERGY_KEYWORDS = [
  "solar", "battery", "electricity", "energy", "power", "ev", "charging",
  "grid", "wind", "inverter", "heat pump", "storage", "renewable",
  "sol", "batteri", "el", "energi", "laddning", "nät", "vind", "värmepump",
  "elpris", "solcell", "elområde", "spotpris", "effekttariff",
];

// Swedish/Nordic keywords for region detection
const SE_KEYWORDS = [
  "sweden", "swedish", "sverige", "svensk", "vattenfall", "fortum",
  "elområde", "se1", "se2", "se3", "se4", "energimyndigheten",
  "svk", "svenska kraftnät", "eon", "tibber", "nordpool",
];

const NORDICS_KEYWORDS = [
  "nordic", "nordics", "scandinavia", "norway", "denmark", "finland",
  "norden", "nordisk", "norge", "danmark", "statkraft", "equinor",
  "ørsted", "vestas", "fingrid", "statnett",
];

const EU_KEYWORDS = [
  "european", "eu ", "europe", "brussels", "commission", "directive",
  "regulation", "fit for 55", "repowereu", "green deal",
];

const parser = new RSSParser({
  timeout: 10000,
  headers: { "User-Agent": "SolpulsenCARE-NewsEngine/2.0" },
});

// ─── HTML Cleaner ──────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Relevance Filter ──────────────────────────────────────────────────────

function isEnergyRelated(title: string, content: string): boolean {
  const text = `${title} ${content}`.toLowerCase();
  return ENERGY_KEYWORDS.some((kw) => text.includes(kw));
}

// ─── Region Detection (pre-AI, based on keywords + source) ────────────────

function detectRegion(title: string, content: string, feedRegion: "SE" | "NORDICS" | "EU" | "GLOBAL"): "SE" | "NORDICS" | "EU" | "GLOBAL" {
  const text = `${title} ${content}`.toLowerCase();

  // Check content keywords (override feed region if more specific)
  const seScore = SE_KEYWORDS.filter((kw) => text.includes(kw)).length;
  const nordicsScore = NORDICS_KEYWORDS.filter((kw) => text.includes(kw)).length;
  const euScore = EU_KEYWORDS.filter((kw) => text.includes(kw)).length;

  if (seScore >= 2) return "SE";
  if (seScore >= 1 && feedRegion === "SE") return "SE";
  if (nordicsScore >= 2) return "NORDICS";
  if (nordicsScore >= 1 && (feedRegion === "SE" || feedRegion === "NORDICS")) return "NORDICS";
  if (euScore >= 2) return "EU";

  // Fall back to feed's own region
  return feedRegion;
}

// ─── Fetch All RSS Feeds ───────────────────────────────────────────────────

interface RawArticle {
  title: string;
  url: string;
  source: string;
  feedRegion: "SE" | "NORDICS" | "EU" | "GLOBAL";
  imageUrl: string | null;
  publishedAt: Date | null;
  rawContent: string;
  cleanContent: string;
}

async function fetchAllFeeds(): Promise<RawArticle[]> {
  const articles: RawArticle[] = [];

  for (const feed of RSS_FEEDS) {
    try {
      const result = await parser.parseURL(feed.url);
      const maxItems = feed.region === "SE" || feed.region === "NORDICS" ? 20 : 10;

      for (const item of (result.items ?? []).slice(0, maxItems)) {
        if (!item.title || !item.link) continue;

        const rawContent = item["content:encoded"] || item.content || item.contentSnippet || "";
        const cleanContent = stripHtml(rawContent);
        const title = stripHtml(item.title);

        if (!isEnergyRelated(title, cleanContent)) continue;

        let imageUrl: string | null = null;
        const imgMatch = (item["content:encoded"] || item.content || "").match(
          /<img[^>]+src=["']([^"']+)["']/i
        );
        if (imgMatch) imageUrl = imgMatch[1];
        if (!imageUrl && (item as any).enclosure?.url) {
          imageUrl = (item as any).enclosure.url;
        }

        articles.push({
          title,
          url: item.link,
          source: feed.source,
          feedRegion: feed.region,
          imageUrl,
          publishedAt: item.pubDate ? new Date(item.pubDate) : null,
          rawContent: rawContent.slice(0, 10000),
          cleanContent: cleanContent.slice(0, 5000),
        });
      }
    } catch (err) {
      console.warn(`[NewsEngine] Failed to fetch ${feed.source}:`, (err as Error).message);
    }
  }

  return articles;
}

// ─── Deduplicate & Store ───────────────────────────────────────────────────

async function deduplicateAndStore(articles: RawArticle[]): Promise<number> {
  let newCount = 0;

  for (const article of articles) {
    try {
      const existing = await getArticleByUrl(article.url);
      if (existing) continue;

      const detectedRegion = detectRegion(article.title, article.cleanContent, article.feedRegion);

      // SE/NORDICS get higher base relevance
      const baseRelevance = detectedRegion === "SE" ? 70 : detectedRegion === "NORDICS" ? 60 : detectedRegion === "EU" ? 50 : 40;

      await insertNewsArticle({
        title: article.title,
        source: article.source,
        url: article.url,
        imageUrl: article.imageUrl,
        publishedAt: article.publishedAt,
        rawContent: article.rawContent,
        cleanContent: article.cleanContent,
        tags: [],
        region: detectedRegion,
        relevanceScore: baseRelevance,
        actionType: "none",
        actionText: null,
        personalizedInsight: null,
        processed: false,
      });
      newCount++;
    } catch (err) {
      if ((err as any)?.code === "ER_DUP_ENTRY") continue;
      console.warn(`[NewsEngine] Failed to store article: ${article.title}`, (err as Error).message);
    }
  }

  return newCount;
}

// ─── AI Processing (Swedish-focused) ──────────────────────────────────────

async function processArticleWithAI(article: {
  id: number;
  title: string;
  cleanContent: string | null;
  source: string;
  region: "SE" | "NORDICS" | "EU" | "GLOBAL";
}, userZone: string = "SE3"): Promise<void> {
  const content = article.cleanContent || article.title;

  try {
    // Step 1: Classify + summarize + action (Swedish focus)
    const classifyResult = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `Du är en senior energianalytiker specialiserad på den svenska och nordiska energimarknaden.
Du analyserar artiklar ENBART ur ett svenskt/nordiskt perspektiv.

Fokusera på:
- Elpriset i Sverige (SE1-SE4)
- Solproduktion och batterioptimering
- Regelverk som påverkar Sverige/EU
- Besparingsmöjligheter för svenska husägare

Undvik generiska globala förklaringar. Allt ska vara relevant för en svensk energianvändare.
Returnera ENBART JSON.`,
        },
        {
          role: "user",
          content: `Analysera denna artikel från ${article.source} (region: ${article.region}):

Titel: ${article.title}
Innehåll: ${content.slice(0, 3000)}

Användaren befinner sig i elområde ${userZone}.

Returnera JSON:
{
  "summary": "Sammanfattning på svenska, max 3 meningar. Fokusera på svensk relevans.",
  "tags": ["array av: solar, battery, grid, electricity, ev, pricing, regulation, wind, heatpump, sverige, nordics, eu, global"],
  "relevance_score": 0-100 (högre om det direkt påverkar Sverige/Norden),
  "region": "SE eller NORDICS eller EU eller GLOBAL",
  "action_type": "optimize_battery eller schedule_charging eller view_forecast eller monitor_risk eller none",
  "action_text": "Kort instruktion på svenska, t.ex. 'Ladda batteri kl 02:00 för att minska kostnad' eller null om ingen åtgärd",
  "personalized_insight": "Förklara hur detta påverkar en svensk användare i ${userZone}. Var specifik om elpris, besparingar eller risk. Max 2 meningar."
}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "article_analysis_v2",
          strict: true,
          schema: {
            type: "object",
            properties: {
              summary: { type: "string" },
              tags: { type: "array", items: { type: "string" } },
              relevance_score: { type: "integer" },
              region: { type: "string", enum: ["SE", "NORDICS", "EU", "GLOBAL"] },
              action_type: { type: "string", enum: ["optimize_battery", "schedule_charging", "view_forecast", "monitor_risk", "none"] },
              action_text: { type: ["string", "null"] },
              personalized_insight: { type: "string" },
            },
            required: ["summary", "tags", "relevance_score", "region", "action_type", "action_text", "personalized_insight"],
            additionalProperties: false,
          },
        },
      },
    });

    const classifyText = typeof classifyResult.choices[0]?.message?.content === "string"
      ? classifyResult.choices[0].message.content
      : "";
    const classify = JSON.parse(classifyText);

    // Boost relevance for SE/NORDICS
    let finalRelevance = Math.min(100, Math.max(0, classify.relevance_score));
    if (classify.region === "SE") finalRelevance = Math.min(100, finalRelevance + 10);
    else if (classify.region === "NORDICS") finalRelevance = Math.min(100, finalRelevance + 5);

    // Update article
    await markArticleProcessed(article.id, {
      summary: classify.summary,
      tags: classify.tags,
      region: classify.region as "SE" | "NORDICS" | "EU" | "GLOBAL",
      relevanceScore: finalRelevance,
      actionType: classify.action_type as any,
      actionText: classify.action_text,
      personalizedInsight: classify.personalized_insight,
    });

    // Step 2: Generate insight for ai_insights table
    const insightResult = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `Du genererar korta, handlingsbara insikter för svenska energianvändare i ${userZone}. Var specifik om svensk marknad. Returnera ENBART JSON.`,
        },
        {
          role: "user",
          content: `Baserat på denna artikel, generera en insikt:

Titel: ${article.title}
Sammanfattning: ${classify.summary}
Region: ${classify.region}
Personaliserad insikt: ${classify.personalized_insight}

Returnera JSON:
{
  "insight_text": "Vad händer + varför det spelar roll för ${userZone}, max 2 meningar",
  "impact_type": "price eller savings eller risk eller opportunity",
  "recommendation": "Konkret rekommendation, 1 mening",
  "confidence_score": 0-100,
  "action_type": "optimize_battery eller schedule_charging eller view_forecast eller monitor_risk eller none",
  "action_text": "Kort åtgärdstext eller null"
}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "article_insight_v2",
          strict: true,
          schema: {
            type: "object",
            properties: {
              insight_text: { type: "string" },
              impact_type: { type: "string", enum: ["price", "savings", "risk", "opportunity"] },
              recommendation: { type: "string" },
              confidence_score: { type: "integer" },
              action_type: { type: "string", enum: ["optimize_battery", "schedule_charging", "view_forecast", "monitor_risk", "none"] },
              action_text: { type: ["string", "null"] },
            },
            required: ["insight_text", "impact_type", "recommendation", "confidence_score", "action_type", "action_text"],
            additionalProperties: false,
          },
        },
      },
    });

    const insightText = typeof insightResult.choices[0]?.message?.content === "string"
      ? insightResult.choices[0].message.content
      : "";
    const insight = JSON.parse(insightText);

    await insertAIInsight({
      articleId: article.id,
      insightText: insight.insight_text,
      impactType: insight.impact_type as "price" | "savings" | "risk" | "opportunity",
      recommendation: insight.recommendation,
      confidenceScore: Math.min(100, Math.max(0, insight.confidence_score)),
      actionType: insight.action_type as any,
      actionText: insight.action_text,
      personalizedInsight: classify.personalized_insight,
      userRegion: userZone,
    });
  } catch (err) {
    console.warn(`[NewsEngine] AI processing failed for article ${article.id}:`, (err as Error).message);
    await markArticleProcessed(article.id, {
      summary: null,
      tags: [],
      region: article.region || "GLOBAL",
      relevanceScore: 30,
      actionType: "none",
      actionText: null,
      personalizedInsight: null,
    });
  }
}

// ─── Main Pipeline ─────────────────────────────────────────────────────────

export async function runNewsPipeline(userZone: string = "SE3"): Promise<{ fetched: number; newArticles: number; processed: number }> {
  console.log("[NewsEngine] Starting pipeline v2...");

  // Step 1: Fetch RSS
  const rawArticles = await fetchAllFeeds();
  console.log(`[NewsEngine] Fetched ${rawArticles.length} articles from ${RSS_FEEDS.length} feeds`);

  // Step 2: Deduplicate & store
  const newArticles = await deduplicateAndStore(rawArticles);
  console.log(`[NewsEngine] ${newArticles} new articles stored`);

  // Step 3: AI process unprocessed articles (max 8 per run for more throughput)
  const unprocessed = await getUnprocessedArticles(8);
  let processed = 0;
  for (const article of unprocessed) {
    await processArticleWithAI(article, userZone);
    processed++;
  }
  console.log(`[NewsEngine] ${processed} articles AI-processed`);

  // Step 4: Auto-trigger actions for high-relevance insights
  // Note: In production, this would iterate over all active users.
  // For now, trigger for a default user (userId=1) as a demonstration.
  try {
    const triggered = await autoTriggerActions(1, userZone);
    if (triggered.length > 0) {
      console.log(`[NewsEngine] Auto-triggered ${triggered.length} actions`);
    }
  } catch (err) {
    console.warn(`[NewsEngine] Auto-trigger failed:`, (err as Error).message);
  }

  return { fetched: rawArticles.length, newArticles, processed };
}

// ─── Cron Scheduler ────────────────────────────────────────────────────────

let cronInterval: ReturnType<typeof setInterval> | null = null;

export function startNewsCron(intervalMs = 30 * 60 * 1000): void {
  if (cronInterval) return;
  console.log(`[NewsEngine] Cron v2 started: every ${intervalMs / 60000} min`);

  // Run immediately on start
  runNewsPipeline().catch((err) =>
    console.error("[NewsEngine] Initial pipeline failed:", err)
  );

  cronInterval = setInterval(() => {
    runNewsPipeline().catch((err) =>
      console.error("[NewsEngine] Cron pipeline failed:", err)
    );
  }, intervalMs);
}

export function stopNewsCron(): void {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
    console.log("[NewsEngine] Cron stopped");
  }
}

// ─── In-Memory Cache ───────────────────────────────────────────────────────

const cache = new Map<string, { data: unknown; expiresAt: number }>();

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCache(key: string, data: unknown, ttlMs = 15 * 60 * 1000): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// ─── Region Priority Sorting ──────────────────────────────────────────────

const REGION_PRIORITY: Record<string, number> = { SE: 0, NORDICS: 1, EU: 2, GLOBAL: 3 };

export function sortByRegionPriority<T extends { region: string; relevanceScore: number }>(articles: T[]): T[] {
  return [...articles].sort((a, b) => {
    const regionDiff = (REGION_PRIORITY[a.region] ?? 3) - (REGION_PRIORITY[b.region] ?? 3);
    if (regionDiff !== 0) return regionDiff;
    return b.relevanceScore - a.relevanceScore;
  });
}

// ─── 70/20/10 Distribution Filter ─────────────────────────────────────────

export function applyRegionDistribution<T extends { region: string; relevanceScore: number }>(
  articles: T[],
  totalCount: number = 30
): T[] {
  const se = articles.filter((a) => a.region === "SE" || a.region === "NORDICS");
  const eu = articles.filter((a) => a.region === "EU");
  const global = articles.filter((a) => a.region === "GLOBAL");

  const seCount = Math.ceil(totalCount * 0.7);
  const euCount = Math.ceil(totalCount * 0.2);
  const globalCount = totalCount - seCount - euCount;

  // Only include GLOBAL if high relevance (>80) or major impact
  const filteredGlobal = global.filter((a) => a.relevanceScore > 80);

  const result = [
    ...se.slice(0, seCount),
    ...eu.slice(0, euCount),
    ...filteredGlobal.slice(0, globalCount),
  ];

  return sortByRegionPriority(result);
}

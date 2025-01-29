import { TwitterApi } from 'twitter-api-v2';
import { z } from 'zod';
import { tool } from "@langchain/core/tools";
import { executablePath } from 'puppeteer';
import * as puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import puppeteerCore from 'puppeteer-core';

const twitterApiKey = process.env.TWITTER_API_KEY;
const twitterApiSecret = process.env.TWITTER_API_SECRET;
const twitterAccessToken = process.env.TWITTER_ACCESS_TOKEN;
const twitterAccessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;

export const TwitterApiReadWrite = new TwitterApi({
  appKey: twitterApiKey!,
  appSecret: twitterApiSecret!,
  accessToken: twitterAccessToken!,
  accessSecret: twitterAccessTokenSecret!,
});

const rw = TwitterApiReadWrite.readWrite;

async function handleRateLimit<T>(fn: () => Promise<T>, retries = 3, delay = 15000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (error.code === 429 && retries > 0) {
      const retryAfter = error.rateLimit?.reset || delay;
      console.warn(`Rate limited. Retrying in ${retryAfter}ms...`);
      await new Promise((res) => setTimeout(res, retryAfter));
      return handleRateLimit(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export const postTool = tool(async (text) => {
  return await handleRateLimit(() => rw.v2.tweet(text));
}, {
  name: 'post_tool',
  description: 'Post a tweet on Twitter',
  schema: z.object({
    text: z.string().describe("the text to post"),
  })
});

export const replyTool = tool(async ({ reply, tweetId }) => {
  return await handleRateLimit(() => rw.v2.reply(reply, tweetId));
}, {
  name: 'reply_tool',
  description: 'Create replies',
  schema: z.object({
    reply: z.string().describe("Your reply"),
    tweetId: z.string().describe("ID of the tweet you are replying to."),
  })
});

export const mentionTool = tool(async () => {
  return await handleRateLimit(() => rw.v1.mentionTimeline());
}, {
  name: "mention_tool",
  description: 'get all mentions',
  schema: z.void(),
});

export const accountDetailsTools = tool(async () => {
  const details = await rw.v2.me();
  return details?.data;
}, {
  name: "account_details_tools",
  description: 'get the details of my account',
  schema: z.void(),
});

export const trendingTopicsTool = tool(async () => {
  const trends = await rw.v1.trendsAvailable();
  return trends;
}, {
  name: "trendingTopics_tool",
  description: "fetch the current trendings",
  schema: z.void()
});

export const searchTweetsTool = tool(async ({ topic }: { topic: string }) => {
  const response = await rw.v2.search(topic, {
    max_results: 10,
  });
  return response;
}, {
  name: "search_tweets_tool",
  description: "Search for tweets on a specific topic",
  schema: z.object({
    topic: z.string().describe("The topic to search for on Twitter, e.g., 'DAO', 'AI agents', 'robotics' etc"),
  }),
});

export const likeTweet = tool(async ({ userId, tweetId }) => {
  const like = await rw.v2.like(userId, tweetId);
  return like.data;
}, {
  name: "like_tweet",
  description: "like a tweet",
  schema: z.object({
    tweetId: z.string().describe("tweet id to like"),
    userId: z.string().describe("user Id of the tweet")
  })
});
export const scrapDataOnlineTool = tool(async ({ url }) => {
  let browser: puppeteer.Browser | null = null;
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('Development browser: ');
      browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true,
        executablePath: executablePath()
      });
    } else {
      console.log('Production browser: ');
      browser = await puppeteerCore.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });
    }

    if (!browser) throw new Error("Failed to launch browser");

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    const headlines = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('h2, .post-card__title, .article-card__title'))
        .map(el => el.textContent?.trim() || '')
        .filter(Boolean);
    });

    return headlines;
  } catch (error) {
    console.error(error);
    return { message: "Scraping failed", error: error.toString() };
  } finally {
    if (browser) await browser.close();
  }
}, {
  name: "scrapeDataOnline_tool",
  description: "Scrape data online",
  schema: z.object({
    url: z.string().describe("The URL of the website to scrape data from."),
  }),
});

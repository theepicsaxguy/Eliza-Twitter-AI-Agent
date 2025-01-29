// src/app/api/dashboard/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { TwitterApiReadWrite } from '@/lib/twitterApi';
import { getRecentMentions, fetchTrendingTopics } from '@/lib/TwitterBot';
import * as Redis from "ioredis";

const redis = new Redis(); 

export async function GET(request: NextRequest) {
  try {
    // Fetch account details
    const me = await TwitterApiReadWrite.v2.me();
    const userId = me?.data?.id;

    // Fetch last 10 posted tweets
    const timeline = userId
      ? await TwitterApiReadWrite.v2.userTimeline(userId, { max_results: 10 })
      : null;
    const postedTweets = timeline?.data?.data || [];

    // Fetch recent mentions
    const mentions = await getRecentMentions();

    // Fetch trending topics
    const trending = await fetchTrendingTopics();

    // Fetch tweet count from Redis
    const tweetCountRaw = await redis.get('tweetcount');
    let tweetCountData: { count: number; lastreset: string } | null = null;
    if (tweetCountRaw) {
      tweetCountData = JSON.parse(tweetCountRaw);
    } else {
      tweetCountData = { count: 0, lastreset: new Date().toISOString() };
      await redis.set('tweetcount', JSON.stringify(tweetCountData));
    }

    return NextResponse.json({
      success: true,
      data: {
        account: me?.data || {},
        postedTweets,
        mentions,
        trending,
        tweetCountData,
      },
    });
  } catch (error: any) {
    console.error('GET /api/dashboard error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
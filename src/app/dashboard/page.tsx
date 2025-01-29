// src/app/dashboard/page.tsx

'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SubmitTweet from '@/components/SubmitTweet';

const CRON_JOBS = [
  'tweetevery3hours',
  'replytomentionsevery10minutes',
  'monitortrendsevery4hours',
  'dailyfolloweranalysis',
  'postpollat9am',
  'searchtweetsusingtrendsevery6hours',
  'scrapeandposteverytwohours',
];

interface DashboardData {
  account: {
    username: string;
    name: string;
    id: string;
    [key: string]: any;
  };
  postedTweets: Array<{
    id: string;
    text: string;
    created_at: string;
    [key: string]: any;
  }>;
  mentions: Array<{
    id_str: string;
    text: string;
    user: {
      screen_name: string;
      [key: string]: any;
    };
    created_at: string;
    [key: string]: any;
  }>;
  trending: Array<any>;
  tweetCountData: {
    count: number;
    lastreset: string;
  };
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const [cronResult, setCronResult] = useState<string>('');
  const [cronLoading, setCronLoading] = useState<boolean>(false);

  const [scrapeURL, setScrapeURL] = useState<string>('');
  const [scrapeResult, setScrapeResult] = useState<string[] | null>(null);
  const [scrapeStatus, setScrapeStatus] = useState<string>('');

  // Fetch dashboard data on mount
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch('/api/dashboard', { method: 'GET' });
        const result = await res.json();
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error || 'Failed to fetch dashboard data.');
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred while fetching dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  // Handle Cron job trigger
  const handleCronTrigger = async (jobName: string) => {
    try {
      setCronLoading(true);
      setCronResult('');
      const res = await fetch('/api/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job: jobName }),
      });
      const result = await res.json();
      setCronResult(JSON.stringify(result, null, 2));
      // Refresh dashboard data after triggering a cron job
      const dashboardRes = await fetch('/api/dashboard', { method: 'GET' });
      const dashboardData = await dashboardRes.json();
      if (dashboardData.success) {
        setData(dashboardData.data);
      }
    } catch (err: any) {
      setCronResult('Error triggering cron job.');
      console.error(err);
    } finally {
      setCronLoading(false);
    }
  };

  // Handle Scrape
  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scrapeURL) return;
    try {
      setScrapeStatus('Scraping...');
      setScrapeResult(null);
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scrapeURL }),
      });
      const result = await res.json();
      if (result.headlines) {
        setScrapeResult(result.headlines);
        setScrapeStatus('Scraping successful.');
      } else if (result.error) {
        setScrapeStatus(`Error: ${result.error}`);
      } else {
        setScrapeStatus('Unexpected response from scrape.');
      }
    } catch (err: any) {
      setScrapeStatus('Error during scraping.');
      console.error(err);
    }
  };

  if (loading) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="min-h-screen p-6 md:p-12 space-y-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/* Account Details */}
      <section className="border border-neutral-200 rounded-md p-4">
        <h2 className="text-2xl font-semibold">Account Details</h2>
        <div className="mt-2">
          <p><strong>Username:</strong> {data?.account.username || 'N/A'}</p>
          <p><strong>Name:</strong> {data?.account.name || 'N/A'}</p>
          <p><strong>ID:</strong> {data?.account.id || 'N/A'}</p>
        </div>
        <div className="mt-2">
          <strong>Tweet Count:</strong> {data?.tweetCountData.count ?? 0} (
          <strong>Last reset:</strong>{' '}
          {data?.tweetCountData.lastreset
            ? new Date(data.tweetCountData.lastreset).toLocaleString()
            : 'N/A'}
          )
        </div>
      </section>

      {/* Recently Posted Tweets */}
      <section className="border border-neutral-200 rounded-md p-4">
        <h2 className="text-2xl font-semibold">Recently Posted Tweets</h2>
        {data?.postedTweets.length ? (
          <ul className="mt-2 space-y-4">
            {data.postedTweets.map((tweet) => (
              <li key={tweet.id} className="bg-neutral-50 p-4 rounded-md shadow">
                <p>{tweet.text}</p>
                <p className="text-sm text-neutral-500 mt-2">ID: {tweet.id}</p>
                <p className="text-sm text-neutral-500">Posted at: {new Date(tweet.created_at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-neutral-600">No tweets posted recently.</p>
        )}
      </section>

      {/* Recent Mentions */}
      <section className="border border-neutral-200 rounded-md p-4">
        <h2 className="text-2xl font-semibold">Recent Mentions</h2>
        {data?.mentions.length ? (
          <ul className="mt-2 space-y-4">
            {data.mentions.map((mention) => (
              <li key={mention.id_str} className="bg-neutral-50 p-4 rounded-md shadow">
                <p>{mention.text}</p>
                <p className="text-sm text-neutral-500 mt-2">From: @{mention.user.screen_name}</p>
                <p className="text-sm text-neutral-500">Mentioned at: {new Date(mention.created_at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-neutral-600">No recent mentions.</p>
        )}
      </section>

      {/* Trending Topics */}
      <section className="border border-neutral-200 rounded-md p-4">
        <h2 className="text-2xl font-semibold">Trending Topics</h2>
        {data?.trending.length ? (
          <ul className="mt-2 space-y-2">
            {data.trending.map((trend, index) => (
              <li key={index} className="bg-neutral-50 p-2 rounded-md shadow">
                {trend.name || trend}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-neutral-600">No trending topics available.</p>
        )}
      </section>

      {/* Recently Generated Tweets */}
      <section className="border border-neutral-200 rounded-md p-4">
        <h2 className="text-2xl font-semibold">Recently Generated Tweets</h2>
        {data?.postedTweets.length ? (
          <ul className="mt-2 space-y-4">
            {data.postedTweets.map((tweet) => (
              <li key={tweet.id} className="bg-neutral-50 p-4 rounded-md shadow">
                <p>{tweet.text}</p>
                <p className="text-sm text-neutral-500 mt-2">Generated at: {new Date(tweet.created_at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-neutral-600">No generated tweets available.</p>
        )}
      </section>

      {/* Manual Cron Triggers */}
      <section className="border border-neutral-200 rounded-md p-4">
        <h2 className="text-2xl font-semibold">Manual Cron Triggers</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {CRON_JOBS.map((job) => (
            <Button
              key={job}
              onClick={() => handleCronTrigger(job)}
              disabled={cronLoading}
              className="capitalize"
            >
              {job.replace(/([A-Z])/g, ' $1').trim()}
            </Button>
          ))}
        </div>
        {cronLoading && <p className="mt-2 text-neutral-600">Executing cron job...</p>}
        {cronResult && (
          <pre className="mt-4 p-4 bg-neutral-50 rounded-md shadow overflow-auto">
            {cronResult}
          </pre>
        )}
      </section>

      {/* Scrape a URL */}
      <section className="border border-neutral-200 rounded-md p-4">
        <h2 className="text-2xl font-semibold">Scrape a URL for Headlines</h2>
        <form onSubmit={handleScrape} className="mt-4 flex flex-col gap-2">
          <Input
            type="url"
            value={scrapeURL}
            onChange={(e) => setScrapeURL(e.target.value)}
            placeholder="https://www.example.com"
            required
          />
          <Button type="submit">Scrape</Button>
        </form>
        {scrapeStatus && <p className="mt-2 text-sm text-neutral-600">{scrapeStatus}</p>}
        {scrapeResult && (
          <ul className="mt-4 space-y-2">
            {scrapeResult.map((headline, index) => (
              <li key={index} className="bg-neutral-50 p-2 rounded-md shadow">
                {headline}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

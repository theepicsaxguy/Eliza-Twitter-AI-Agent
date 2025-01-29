// src/lib/TwitterBot.ts

import { HumanMessage, BaseMessage  } from '@langchain/core/messages';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { 
  postTool, 
  replyTool, 
  mentionTool, 
  accountDetailsTools, 
  trendingTopicsTool, 
  searchTweetsTool, 
  likeTweet, 
  scrapDataOnlineTool 
} from './twitterApi';

// Define interfaces
interface Props {
  id_str: string;
  user: {
    screen_name: string;
  };
}

interface MsgProps {
  name: string;
  content?: string;
}

interface TweetLikeProps {
  id_str: string;
  text: string;
  user: {
    screen_name: string;
    id_str: string;
  };
}

interface AgentInvokeResponse {
  content?: string;
  messages?: MsgProps[];
}

// Initialize tools and LLM agent
const tools = [
  postTool, 
  replyTool, 
  mentionTool, 
  accountDetailsTools,
  trendingTopicsTool, 
  searchTweetsTool, 
  likeTweet, 
  scrapDataOnlineTool
];

const chat = new ChatGoogleGenerativeAI({
  model: 'gemini-1.5-flash',
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY!, // Use env variable for API key
  maxOutputTokens: 200,
  temperature: 0.8,
});

if (!process.env.NEXT_PUBLIC_GOOGLE_API_KEY) {
  throw new Error('API Key not found. Please set the NEXT_PUBLIC_GOOGLE_API_KEY environment variable.');
}

const agent = createReactAgent({
  llm: chat,
  tools,
});

// Function to generate and post tweets about a topic
export async function generateTweet(topic: string): Promise<string | undefined> {
  try {
    const response = (await agent.invoke({
      messages: new HumanMessage(`Post a creative tweet about ${topic} & add emoji to express your sentiments, possibly add image if you can.`),
    })) as AgentInvokeResponse;
    return response?.content;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error generating tweet:', error.message);
    } else {
      console.error('Error generating tweet:', error);
    }
    throw error;
  }
}

// Function to post the tweet using postTool
export async function postTweet(content: string): Promise<void> {
  try {
    await agent.invoke({
      messages: new HumanMessage(`Post a creative tweet: "${content}"`),
    });
    console.log(`Successfully posted tweet: ${content}`);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error posting tweet:', error.message);
    } else {
      console.error('Error posting tweet:', error);
    }
    throw error;
  }
}

// Function to get recent mentions
export async function getRecentMentions(): Promise<string | undefined> {
  try {
    const mentions = (await agent.invoke({
      messages: new HumanMessage('Please get all mentions.'),
    })) as AgentInvokeResponse;
    return mentions?.content;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error fetching mentions:', error.message);
    } else {
      console.error('Error fetching mentions:', error);
    }
    throw error;
  }
}

// Function to reply to mentions with sentiment analysis
export async function replyToMention(mention: Props): Promise<void> {
  try {
    const username = mention.user.screen_name;
    const tweetId = mention.id_str;

    await agent.invoke({
      messages: new HumanMessage(`Please reply to the tweet with ID '${tweetId}'.`),
    });
    console.log(`Replied to mention from @${username}.`);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error replying to mention:', error.message);
    } else {
      console.error('Error replying to mention:', error);
    }
    throw error;
  }
}

// Function to fetch trending topics
export async function fetchTrendingTopics(): Promise<string[] | undefined> {
  try {
    const trendsResponse = (await agent.invoke({
      messages: [new HumanMessage('Get trending hashtags relevant to technology, AI, DAO, Blockchain, and Crypto.')],
      // Removed 'tools' from agent.invoke
    })) as AgentInvokeResponse;

    if (trendsResponse?.content) {
      try {
        const trends: string[] = JSON.parse(trendsResponse.content);
        return trends;
      } catch (parseError: unknown) {
        if (parseError instanceof Error) {
          console.error('Error parsing trending topics:', parseError.message);
        } else {
          console.error('Error parsing trending topics:', parseError);
        }
        return undefined;
      }
    } else {
      console.log("No content received for trending topics.");
      return undefined;
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error fetching trending topics:', error.message);
    } else {
      console.error('Error fetching trending topics:', error);
    }
    throw error;
  }
}

// Function to post tweets using trending topics
export async function postTweetUsingTrend(trend: string, topic: string): Promise<void> {
  try {
    const tweet = (await agent.invoke({
      messages: [new HumanMessage(`Post a tweet using the trending hashtag '${trend}' about the topic '${topic}'.`)],
    })) as AgentInvokeResponse;
    if (tweet?.content) {
      await postTweet(tweet.content);
      console.log(`Posted tweet using trend '${trend}' about topic '${topic}'.`);
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`Error posting tweet using trend '${trend}' about topic '${topic}':`, error.message);
    } else {
      console.error(`Error posting tweet using trend '${trend}' about topic '${topic}':`, error);
    }
  }
}

// Function to monitor and post relevant trends
export async function monitorAndPostRelevantTrends(): Promise<void> {
  try {
    // Fetch trending topics
    const trendingTopics = await fetchTrendingTopics();
    if (!trendingTopics || trendingTopics.length === 0) {
      console.log('No relevant trends found.');
      return;
    }

    // Define the bot's focus topics
    const botTopics = ['DAO', 'AI agents', 'Blockchain', 'Crypto', 'Machine Learning'];

    // Filter trending topics based on relevance to the bot's focus
    const relevantTrends = trendingTopics.filter((trend: string) => 
      botTopics.some(topic => trend.toLowerCase().includes(topic.toLowerCase()))
    );

    // Post tweets about the relevant trends
    for (const trend of relevantTrends) {
      const relevantTopic = botTopics.find(topic => trend.toLowerCase().includes(topic.toLowerCase()));
      if (relevantTopic) {
        await postTweetUsingTrend(trend, relevantTopic); // Post tweet using the relevant trend and topic
      }
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error monitoring and posting relevant trends:', error.message);
    } else {
      console.error('Error monitoring and posting relevant trends:', error);
    }
  }
}

// Function to analyze followers growth and engagement
export async function analyzeFollowers(): Promise<void> {
  try {
    const followerStats = (await agent.invoke({
      messages: [new HumanMessage('Analyze my follower growth and engagement.')],
    })) as AgentInvokeResponse;
    console.log("Follower Growth Analysis:", followerStats?.content);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error analyzing followers:', error.message);
    } else {
      console.error('Error analyzing followers:', error);
    }
    throw error;
  }
}

// Function to post polls at a scheduled time
let lastPollDate: Date | null = null;
export async function postPollIfNeeded(): Promise<void> {
  const now = new Date();
  if (lastPollDate && lastPollDate.toDateString() === now.toDateString()) {
    console.log('Poll already posted today, skipping...');
    return;
  }
  const pollQuestion = 'What is your favorite cryptocurrency?';
  const pollOptions = ['Bitcoin', 'Ethereum', 'Dogecoin', 'Other'];
  await postPoll(pollQuestion, pollOptions);
  lastPollDate = new Date();
}

export async function postPoll(question: string, options: string[]): Promise<void> {
  try {
    const response = (await agent.invoke({
      messages: [new HumanMessage(`Generate a poll: "${question}" with options ${options.join(', ')} and post it.`)],
    })) as AgentInvokeResponse;
    console.log(`Posted poll: "${question}"`, response);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error posting poll:', error.message);
    } else {
      console.error('Error posting poll:', error);
    }
  }
}

// Function to search for tweets based on a keyword
export async function searchTweetsByKeyword(keyword: string): Promise<string | undefined> {
  try {
    const tweets = (await agent.invoke({
      messages: [new HumanMessage(`Search for tweets about "${keyword}".`)],
      // Removed 'tools' from agent.invoke
    })) as AgentInvokeResponse;
    return tweets?.content; // Returns the searched tweets content
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`Error searching tweets for keyword '${keyword}':`, error.message);
    } else {
      console.error(`Error searching tweets for keyword '${keyword}':`, error);
    }
    throw error;
  }
}

// Function to like a tweet
export async function likeATweet(tweetId: string, userId: string): Promise<void> {
  try {
    await agent.invoke({
      messages: [new HumanMessage(`Like the tweet with ID '${tweetId}' and user ID '${userId}'.`)],
    });
    console.log(`Liked tweet with ID: ${tweetId}`);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error liking tweet:', error.message);
    } else {
      console.error('Error liking tweet:', error);
    }
    throw error;
  }
}

// Function to reply to a tweet
export async function replyToTweet(tweetId: string, username: string): Promise<void> {
  try {
    await agent.invoke({
      messages: [new HumanMessage(`Reply to the tweet with ID '${tweetId}'.`)],
    });
    console.log(`Replied to tweet from @${username}.`);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error replying to tweet:', error.message);
    } else {
      console.error('Error replying to tweet:', error);
    }
    throw error;
  }
}

// Function to process tweets: like and reply
export async function processTweets(tweets: TweetLikeProps[]): Promise<void> {
  for (const tweet of tweets) {
    const tweetId = tweet.id_str;
    const username = tweet.user.screen_name;
    const userId = tweet.user.id_str;

    // Like the tweet
    await likeATweet(tweetId, userId);

    // Reply to the tweet based on sentiment
    await replyToTweet(tweetId, username);
  }
}

// Function to search tweets using trends and process them
export async function searchTweetsUsingTrends(): Promise<void> {
  try {
    const trendingTopics = await fetchTrendingTopics(); // Fetch trending topics

    if (trendingTopics) {
      for (const trend of trendingTopics) {
        const foundTweets = await searchTweetsByKeyword(trend);
        if (foundTweets && foundTweets.length > 0) {
          // Assuming foundTweets is a JSON stringified array of TweetLikeProps
          try {
            const tweets: TweetLikeProps[] = JSON.parse(foundTweets);
            await processTweets(tweets);
          } catch (parseError: unknown) {
            if (parseError instanceof Error) {
              console.error('Error parsing found tweets:', parseError.message);
            } else {
              console.error('Error parsing found tweets:', parseError);
            }
          }
        }
      }
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error searching tweets using trends:', error.message);
    } else {
      console.error('Error searching tweets using trends:', error);
    }
    throw error;
  }
}

// Function to scrape Cointelegraph headlines
export async function scrapeCointelegraphHeadlines(url: string): Promise<string[] | undefined> {
  console.log('Scraping Cointelegraph headlines...');
  try {
    const jsonData = (await agent.invoke({
      messages: [new HumanMessage(`Scrape data from ${url} using the scrapDataOnlineTool.`)],
    })) as AgentInvokeResponse;

    if (jsonData?.content) {
      try {
        const headlines: string[] = JSON.parse(jsonData.content);
        return headlines;
      } catch (parseError: unknown) {
        if (parseError instanceof Error) {
          console.error('Error parsing scraped headlines:', parseError.message);
        } else {
          console.error('Error parsing scraped headlines:', parseError);
        }
        return undefined;
      }
    } else {
      console.log("Invalid response structure for scraped data.");
      return undefined;
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error scraping data:', error.message);
    } else {
      console.error('Error scraping data:', error);
    }
    throw error;
  }
}

// Function to create a relevant post based on sentiment
async function createRelevantPostBasedOnSentiment(headlines: string[]): Promise<string | undefined> {
  try {
    console.log("Creating post from headlines...");
    const response = (await agent.invoke({
      messages: [new HumanMessage(`Using the headlines "${headlines.join('", "')}", create an engaging post. Ensure you don't repeat any headlines you have previously used.`)],
    })) as AgentInvokeResponse;

    if (response && response.content) {
      return response.content;
    } else {
      console.log("Cannot create a post or invalid data structure.");
      return undefined;
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error creating relevant post based on sentiment:', error.message);
    } else {
      console.error('Error creating relevant post based on sentiment:', error);
    }
    return undefined;
  }
}

// Function to scrape and post every two hours
export async function scrapeAndPostEveryTwoHours(): Promise<string | undefined> {
  try {
    console.log('Running Cointelegraph scrape and post cycle...');

    const headlines = await scrapeCointelegraphHeadlines("https://www.cointelegraph.com"); // Scrape Cointelegraph for headlines

    if (headlines && headlines.length > 0) {
      // Create and post based on the scraped headlines
      const postContent = await createRelevantPostBasedOnSentiment(headlines);
      if (postContent) {
        await postTweet(postContent);
        return postContent;
      }
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error during scrape and post cycle:', error.message);
    } else {
      console.error('Error during scrape and post cycle:', error);
    }
  }
}

// Function to make the agent autonomous
export async function autonomousAgentGoal(goal: string): Promise<void> {
  try {
    const response = (await agent.invoke({
      messages: [new HumanMessage(`This is your goal: "${goal}". Think of every possible way to achieve it using the available tools or ask for a tool if needed.`)],
    })) as AgentInvokeResponse;

    if (response?.content) {
      console.log('Agent response:', response.content);
      // Process the response and take necessary actions
    } else {
      console.error('No output from the agent.');
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error achieving goal:', error.message);
    } else {
      console.error('Error achieving goal:', error);
    }
  }
}

// Function to initialize and start the bot
(async function startBot() {
  console.log('Starting Twitter Bot...');
  try {
    const details = (await agent.invoke({
      messages: [new HumanMessage('Please get my account details.')],
    })) as AgentInvokeResponse;

    // Find the message with the name "account_details_tools"
    const accountDetailsMessage = details.messages?.find(
      (message) => message.name === "account_details_tools"
    ) as MsgProps | undefined;
    

    if (accountDetailsMessage && typeof accountDetailsMessage.content === 'string') {
      try {
        const accountDetails = JSON.parse(accountDetailsMessage.content);
        const name = accountDetails.name;
        console.log(`Account Name: ${name}`);
      } catch (parseError: unknown) {
        if (parseError instanceof Error) {
          console.error('Failed to parse account details:', parseError.message);
        } else {
          console.error('Failed to parse account details:', parseError);
        }
        // Handle the error appropriately, e.g., retry fetching details, alert, etc.
      }
    } else {
      console.error("Account details message not found or content is not a string.");
    }

    console.log('Twitter Bot is running!');
    console.log('Cointelegraph Bot is running!');

    const goal = `
Your goal is to increase engagements on our Twitter account and build followers up to 100,000 followers using your capabilities. 
You are aware of other agents in your environment and should interact with them if needed to achieve your goal. 
Utilize every means available to you, including posting tweets, replying to followers, engaging with trending topics, and following influential accounts. 
Tweet at influential accounts to achieve your purpose. Believe in yourself to reach your goal.
    `;

    // Start the autonomous goal
    await autonomousAgentGoal(goal);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error starting bot:', error.message);
    } else {
      console.error('Error starting bot:', error);
    }
  }
})();

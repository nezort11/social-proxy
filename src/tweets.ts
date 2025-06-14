import axios from "axios";
import { ActorRunListItem, ApifyClient } from "apify-client";
import { setTimeout } from "timers/promises";
import { APIFY_API_TOKEN } from "./env";

const client = new ApifyClient({ token: APIFY_API_TOKEN });

type TweetExtendedEntities = {
  media: Array<{
    allow_download_status: {
      allow_download: boolean;
    };
    display_url: string;
    expanded_url: string;
    ext_media_availability: {
      status: string;
    };
    features: {
      large?: object;
      orig?: object;
    };
    id_str: string;
    indices: [number, number];
    media_key: string;
    media_results: {
      id: string;
      result: {
        __typename: string;
        id: string;
        media_key: string;
      };
    };
    media_url_https: string;
    original_info: {
      focus_rects: Array<{
        h: number;
        w: number;
        x: number;
        y: number;
      }>;
      height: number;
      width: number;
    };
    sizes: {
      large: {
        h: number;
        w: number;
      };
    };
    type: string;
    url: string;
  }>;
};

export type Tweet = {
  author: {
    affiliatesHighlightedLabel: Record<string, unknown>;
    automatedBy: string | null;
    canDm: boolean;
    canMediaTag: boolean;
    coverPicture: string;
    createdAt: string;
    description: string;
    entities: {
      description: {
        urls: any[];
      };
      url: Record<string, unknown>;
    };
    fastFollowersCount: number;
    favouritesCount: number;
    followers: number;
    following: number;
    hasCustomTimelines: boolean;
    id: string;
    isAutomated: boolean;
    isBlueVerified: boolean;
    isTranslator: boolean;
    isVerified: boolean;
    location: string;
    mediaCount: number;
    name: string;
    pinnedTweetIds: string[];
    possiblySensitive: boolean;
    profilePicture: string;
    profile_bio: {
      description: string;
      entities: {
        description: Record<string, unknown>;
      };
    };
    status: string;
    statusesCount: number;
    twitterUrl: string;
    type: string;
    url: string;
    userName: string;
    withheldInCountries: string[];
  };
  bookmarkCount: number;
  card: unknown | null;
  conversationId: string;
  createdAt: string; // 'Dy Mon DD HH24:MI:SS TZ YYYY' to ISO
  entities: Record<string, unknown>;
  extendedEntities: TweetExtendedEntities | {};
  id: string;
  inReplyToId: string | null;
  inReplyToUserId: string | null;
  inReplyToUsername: string | null;
  isConversationControlled: boolean;
  isPinned: boolean;
  isReply: boolean;
  lang: string;
  likeCount: number;
  place: Record<string, unknown>;
  quoteCount: number;
  quoted_tweet: unknown | null;
  quoted_tweet_results: unknown | null;
  replyCount: number;
  reply_to_user_results: unknown | null;
  retweetCount: number;
  retweeted_tweet: unknown | null;
  source: string;
  text: string;
  twitterUrl: string;
  type: string;
  url: string;
  viewCount: number;
};

const callActorUi = async (actorId: string, input: unknown) => {
  const actorCallConfig = {
    method: "post",
    maxBodyLength: Infinity,
    url: `https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_API_TOKEN}`,
    headers: {
      accept: "*/*",
      "accept-language": "en-US,en;q=0.9,ru;q=0.8",
      "cache-control": "no-cache",
      "content-type": "application/json; charset=UTF-8",
      origin: "https://console.apify.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://console.apify.com/",
      "sec-ch-ua":
        '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"macOS"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
      "x-apify-request-origin": "WEB",
    },
    data: input,
  };

  const runResponse = await axios.request(actorCallConfig);
  const runData = runResponse.data;
  const run = runData.data as ActorRunListItem;
  return run;
};

// https://apify.com/kaitoeasyapi/twitter-x-data-tweet-scraper-pay-per-result-cheapest
const ACTOR_ID = "CJdippxWmn9uRfooo";

export const getLatestTweets = async (author: string) => {
  console.log("Requesting run to fetch latest tweets...");
  const run = await callActorUi(ACTOR_ID, {
    "filter:blue_verified": false,
    "filter:consumer_video": false,
    "filter:has_engagement": false,
    "filter:hashtags": false,
    "filter:images": false,
    "filter:links": false,
    "filter:media": false,
    "filter:mentions": false,
    "filter:native_video": false,
    "filter:nativeretweets": false,
    "filter:news": false,
    "filter:pro_video": false,
    "filter:quote": false,
    "filter:replies": false,
    "filter:safe": false,
    "filter:spaces": false,
    "filter:twimg": false,
    "filter:verified": false,
    "filter:videos": false,
    "filter:vine": false,
    from: author,
    "include:nativeretweets": false,
    lang: "en",
    maxItems: 3, // does not work, always 20
    queryType: "Latest",
    min_retweets: 0,
    min_faves: 0,
    min_replies: 0,
    "-min_retweets": 0,
    "-min_faves": 0,
    "-min_replies": 0,
  });

  console.log("Waiting until tweets fetch run completes...");
  // wait until run completes
  await setTimeout(15 * 1000);

  const datasetId = run.defaultDatasetId;
  // const datasetId = "bLEHCQxmBnYWy2IWc";

  console.log("Fetching output dateset items of successful run...");
  const { items } = await client.dataset<Tweet>(datasetId).listItems();
  console.log(`Fetched ${items.length} items for run output dataset`);

  return items;
};

const main = async () => {
  // await getLatestTweets();

  process.exit(0);
};
if (require.main === module) {
  main();
}

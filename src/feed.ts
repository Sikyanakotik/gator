import { XMLParser } from 'fast-xml-parser';
import { getNextFeedToFetch, markFeedFetched, createPost } from './lib/db/queries/users';

export type RSSFeed = {
  channel: {
    title: string;
    link: string;
    description: string;
    item: RSSItem[];
  };
};

export type RSSItem = {
  title?: string;
  link: string;
  description: string;
  pubDate: Date;
};

export async function fetchFeed(feedURL : string): Promise<RSSFeed> {
    const response = await fetch(feedURL, {
        headers: {
            'User-Agent': "gator"
        },
        method: 'GET',
        mode: 'cors'
    });
    const feedText = await response.text();
    const parser = new XMLParser();
    const rawFeed = parser.parse(feedText);

    if (!("rss" in rawFeed) || !("channel" in rawFeed.rss)) {
        throw new Error("Invalid RSS feed format.");
    }
    const feed = rawFeed.rss;

    if (!(
        ("channel" in feed)
        && ("link" in feed.channel) && typeof feed.channel.link === "string"
        && ("title" in feed.channel) && typeof feed.channel.title === "string"
        && ("description" in feed.channel) && typeof feed.channel.description === "string"
    )) {
        throw new Error("Invalid RSS feed format.");
    }
    
    let channel = feed.channel;
    let title = channel.title;
    let link = channel.link;
    let description = channel.description;

    let feedItems: any[];
    if (("item" in feed.channel) && Array.isArray(feed.channel.item) && feed.channel.item.length > 0) {
        feedItems = feed.channel.item;
    } else if (("item" in feed.channel) && typeof feed.channel.item === "object") {
        feedItems = [feed.channel.item];
    } else {
        feedItems = [];
    }

    let items: RSSItem[] = [];
    for (let item of feedItems) {
        if (
            ("title" in item) && typeof item.title === "string"
            && ("link" in item) && typeof item.link === "string"
            && ("description" in item) && typeof item.description === "string"
            && ("pubDate" in item) && typeof item.pubDate === "string"
        ) {
            items.push({
                title: item.title,
                link: item.link,
                description: item.description,
                pubDate: new Date(item.pubDate)
            });
        }
    }

    return {
        channel: {
            title,
            link,
            description,
            item: items
        }
    };
}

export async function scrapeNextFeed(): Promise<void> {
    let nextFeed = await getNextFeedToFetch();
    if (!nextFeed) {
        console.log("No feeds to fetch.");
        return;
    }
    try {
        console.log(`Fetching feed: ${nextFeed.url}`);
        const feedData = await fetchFeed(nextFeed.url);
        console.log(`Fetched feed: ${feedData.channel.title} with ${feedData.channel.item.length} items.`);
        
        // Process and store the feed data.
        for (const item of feedData.channel.item) {
            await createPost(item, nextFeed.id);
        }
    } catch (error) {
        console.error(`Error fetching feed ${nextFeed.url}:`, (error as Error).message);
    }
    console.log("");
    await markFeedFetched(nextFeed.id);
}
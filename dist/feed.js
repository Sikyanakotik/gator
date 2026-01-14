import { XMLParser } from 'fast-xml-parser';
export async function fetchFeed(feedURL) {
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
    if (!(("channel" in feed)
        && ("link" in feed.channel) && typeof feed.channel.link === "string"
        && ("title" in feed.channel) && typeof feed.channel.title === "string"
        && ("description" in feed.channel) && typeof feed.channel.description === "string")) {
        throw new Error("Invalid RSS feed format.");
    }
    let channel = feed.channel;
    let title = channel.title;
    let link = channel.link;
    let description = channel.description;
    let feedItems;
    if (("item" in feed.channel) && Array.isArray(feed.channel.item) && feed.channel.item.length > 0) {
        feedItems = feed.channel.item;
    }
    else if (("item" in feed.channel) && typeof feed.channel.item === "object") {
        feedItems = [feed.channel.item];
    }
    else {
        feedItems = [];
    }
    let items = [];
    for (let item of feedItems) {
        if (("title" in item) && typeof item.title === "string"
            && ("link" in item) && typeof item.link === "string"
            && ("description" in item) && typeof item.description === "string"
            && ("pubDate" in item) && typeof item.pubDate === "string") {
            items.push({
                title: item.title,
                link: item.link,
                description: item.description,
                pubDate: item.pubDate
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

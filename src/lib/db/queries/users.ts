import { UUID } from "node:crypto";
import { db } from "..";
import { users, feeds, feed_follows, posts } from "../../../schema";
import { and, eq, sql } from 'drizzle-orm';
import { RSSItem } from "../../../feed"

export type User = {
    id: UUID;
    name: string;
    createdAt: Date;
    updatedAt: Date;
};

export type FeedFollow = {
    userId: UUID;
    userName: string;
    feedId: UUID;
    feedName: string;
    feedURL: string;
    feedFollowId: UUID;
    createdAt: Date;
    updatedAt: Date;
};

export async function createUser(name: string): Promise<User> {
  const [result] = await db.insert(users).values({ name: name }).returning();
  return {
    id: result.id as UUID,
    name: result.name,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  };
}

export async function isUserInDatabase(name: string): Promise<boolean> {
  const result = await db.select().from(users).where(eq(users.name, name));
  return result.length > 0;
}

export async function getUserByName(name: string): Promise<User> {
  const result = await db.select().from(users).where(eq(users.name,name));
  if (!result[0]) {
    throw new Error(`User "${name}" does not exist.`);
  }
  return {
    id: result[0].id as UUID,
    name: result[0].name,
    createdAt: result[0].createdAt,
    updatedAt: result[0].updatedAt,
  };
}

export async function getUserById(id: UUID) {
  const result = await db.select().from(users).where(eq(users.id,id));
  if (!result[0]) {
    throw new Error(`User with ID "${id}" does not exist.`);
  }
  return result[0];
}

export async function getFeedByURL(url: string) {
  const result = await db.select().from(feeds).where(eq(feeds.url,url));
  if (!result[0]) {
    throw new Error(`Feed with URL "${url}" does not exist.`);
  }
  return result[0];
}

export async function getFeedById(id: UUID) {
  const result = await db.select().from(feeds).where(eq(feeds.id,id));
  if (!result[0]) {
    throw new Error(`Feed with ID "${id}" does not exist.`);
  }
  return result[0];
}

export async function getFeedFollowByIds(userId: UUID, feedId: UUID): Promise<FeedFollow | null> {
    const result = await db.select().from(feed_follows).where(and(eq(feed_follows.userId, userId), eq(feed_follows.feedId, feedId)));
    if (!result[0]) {
        return null;
    }

    const user = await getUserById(userId);
    const feed = await getFeedById(feedId);
    return {
        userId: userId as UUID,
        userName: user.name,
        feedId: feedId as UUID,
        feedName: feed.name,
        feedURL: feed.url,
        feedFollowId: result[0].id as UUID,
        createdAt: result[0].createdAt,
        updatedAt: result[0].updatedAt
    };
}

export async function resetDatabase() {
    const result = await db.delete(users);
    return result;
}

export async function getUsers(): Promise<{name: string}[]> {
    const result = await db.select({name: users.name}).from(users);
    return result;
}

export async function addFeed(feedName: string, feedURL: string, user: User): Promise<void> {
    await db.insert(feeds).values({
        name: feedName,
        url: feedURL,
        userId: user.id
    });
}

export async function getFeeds(): Promise<{name: string, url: string, userName: string | null}[]> {
    const result = await db.select({name: feeds.name, url: feeds.url, userName: users.name}).from(feeds).leftJoin(users, eq(feeds.userId, users.id));
    return result;
}

export async function createFeedFollow(user: User, feedURL: string): Promise<FeedFollow> {
    const userID = user.id as UUID;

    const feed = await getFeedByURL(feedURL);
    const feedID = feed.id as UUID;
    const feedName = feed.name;

    const existingFollow = await getFeedFollowByIds(userID, feedID);
    if (existingFollow) {
        throw new Error(`User "${user.name}" is already following feed with URL "${feedURL}".`);
    }

    await db.insert(feed_follows).values({
        userId: userID,
        feedId: feedID
    });

    const result = await db.select().from(feed_follows).where(and(eq(feed_follows.userId, userID), eq(feed_follows.feedId, feedID)));
    return {
        userId: userID,
        userName: user.name,
        feedId: feedID,
        feedName: feedName,
        feedURL: feedURL,
        feedFollowId: result[0].id as UUID,
        createdAt: result[0].createdAt,
        updatedAt: result[0].updatedAt
    };
}

export async function getFeedFollowsForUser(user: User): Promise<FeedFollow[]> {
    const userID = user.id as UUID;

    const results = await db.select().from(feed_follows).innerJoin(feeds, eq(feed_follows.feedId, feeds.id)).where(eq(feed_follows.userId, userID));
    const feedFollows: FeedFollow[] = [];
    for (let result of results) {
        feedFollows.push({
            userId: userID,
            userName: user.name,
            feedId: result.feeds.id as UUID,
            feedName: result.feeds.name,
            feedURL: result.feeds.url,
            feedFollowId: result.feed_follows.id as UUID,
            createdAt: result.feed_follows.createdAt,
            updatedAt: result.feed_follows.updatedAt
        });
    }
    return feedFollows;
}

export async function unfollowFeed(user: User, feedURL: string): Promise<void> {
    const userID = user.id as UUID;
    const feed = await getFeedByURL(feedURL);
    const feedID = feed.id as UUID;

    await db.delete(feed_follows).where(and(eq(feed_follows.userId, userID), eq(feed_follows.feedId, feedID)));
}

export async function markFeedFetched(feedID: UUID): Promise<void> {
    await db.update(feeds).set({ lastFetchedAt: new Date(), updatedAt: new Date() }).where(eq(feeds.id, feedID));
}

export async function getNextFeedToFetch(): Promise<{id: UUID, url: string} | null> {
    const result = await db.select({id: feeds.id, url: feeds.url}).from(feeds).orderBy(sql`${feeds.lastFetchedAt} ASC NULLS FIRST`).limit(1);
    if (result.length === 0) {
        return null;
    }
    return {
        id: result[0].id as UUID,
        url: result[0].url
    };
}

export async function createPost(item: RSSItem, feedID: UUID): Promise<void> {
    let values = {
        title: item.title,
        url: item.link,
        description: item.description,
        publishedAt: item.pubDate,
        feedId: feedID
    }

    await db.insert(posts).values(values).onConflictDoUpdate({ target: posts.url, set: values });
}

export async function getPostsForUser(user: User, maxPosts: number): Promise<RSSItem[]> {
    const userID = user.id as UUID;

    const results = await db.select({title: posts.title, url: posts.url, description: posts.description, publishedAt: posts.publishedAt})
        .from(posts)
        .innerJoin(feeds, eq(posts.feedId, feeds.id))
        .innerJoin(feed_follows, and(eq(feed_follows.feedId, feeds.id), eq(feed_follows.userId, userID)))
        .where(eq(feed_follows.userId, userID))
        .orderBy(sql`${posts.publishedAt} DESC`)
        .limit(maxPosts);

    const items: RSSItem[] = [];
    for (let item of results) {
        items.push({
            title: item.title ? item.title : undefined,
            link: item.url,
            description: item.description,
            pubDate: item.publishedAt
        })
    }

    return items;
}
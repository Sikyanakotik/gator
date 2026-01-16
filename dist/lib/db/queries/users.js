import { db } from "..";
import { users, feeds, feed_follows, posts } from "../../../schema";
import { and, eq, sql } from 'drizzle-orm';
export async function createUser(name) {
    const [result] = await db.insert(users).values({ name: name }).returning();
    return {
        id: result.id,
        name: result.name,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
    };
}
export async function isUserInDatabase(name) {
    const result = await db.select().from(users).where(eq(users.name, name));
    return result.length > 0;
}
export async function getUserByName(name) {
    const result = await db.select().from(users).where(eq(users.name, name));
    if (!result[0]) {
        throw new Error(`User "${name}" does not exist.`);
    }
    return {
        id: result[0].id,
        name: result[0].name,
        createdAt: result[0].createdAt,
        updatedAt: result[0].updatedAt,
    };
}
export async function getUserById(id) {
    const result = await db.select().from(users).where(eq(users.id, id));
    if (!result[0]) {
        throw new Error(`User with ID "${id}" does not exist.`);
    }
    return result[0];
}
export async function getFeedByURL(url) {
    const result = await db.select().from(feeds).where(eq(feeds.url, url));
    if (!result[0]) {
        throw new Error(`Feed with URL "${url}" does not exist.`);
    }
    return result[0];
}
export async function getFeedById(id) {
    const result = await db.select().from(feeds).where(eq(feeds.id, id));
    if (!result[0]) {
        throw new Error(`Feed with ID "${id}" does not exist.`);
    }
    return result[0];
}
export async function getFeedFollowByIds(userId, feedId) {
    const result = await db.select().from(feed_follows).where(and(eq(feed_follows.userId, userId), eq(feed_follows.feedId, feedId)));
    if (!result[0]) {
        return null;
    }
    const user = await getUserById(userId);
    const feed = await getFeedById(feedId);
    return {
        userId: userId,
        userName: user.name,
        feedId: feedId,
        feedName: feed.name,
        feedURL: feed.url,
        feedFollowId: result[0].id,
        createdAt: result[0].createdAt,
        updatedAt: result[0].updatedAt
    };
}
export async function resetDatabase() {
    const result = await db.delete(users);
    return result;
}
export async function getUsers() {
    const result = await db.select({ name: users.name }).from(users);
    return result;
}
export async function addFeed(feedName, feedURL, user) {
    await db.insert(feeds).values({
        name: feedName,
        url: feedURL,
        userId: user.id
    });
}
export async function getFeeds() {
    const result = await db.select({ name: feeds.name, url: feeds.url, userName: users.name }).from(feeds).leftJoin(users, eq(feeds.userId, users.id));
    return result;
}
export async function createFeedFollow(user, feedURL) {
    const userID = user.id;
    const feed = await getFeedByURL(feedURL);
    const feedID = feed.id;
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
        feedFollowId: result[0].id,
        createdAt: result[0].createdAt,
        updatedAt: result[0].updatedAt
    };
}
export async function getFeedFollowsForUser(user) {
    const userID = user.id;
    const results = await db.select().from(feed_follows).innerJoin(feeds, eq(feed_follows.feedId, feeds.id)).where(eq(feed_follows.userId, userID));
    const feedFollows = [];
    for (let result of results) {
        feedFollows.push({
            userId: userID,
            userName: user.name,
            feedId: result.feeds.id,
            feedName: result.feeds.name,
            feedURL: result.feeds.url,
            feedFollowId: result.feed_follows.id,
            createdAt: result.feed_follows.createdAt,
            updatedAt: result.feed_follows.updatedAt
        });
    }
    return feedFollows;
}
export async function unfollowFeed(user, feedURL) {
    const userID = user.id;
    const feed = await getFeedByURL(feedURL);
    const feedID = feed.id;
    await db.delete(feed_follows).where(and(eq(feed_follows.userId, userID), eq(feed_follows.feedId, feedID)));
}
export async function markFeedFetched(feedID) {
    await db.update(feeds).set({ lastFetchedAt: new Date(), updatedAt: new Date() }).where(eq(feeds.id, feedID));
}
export async function getNextFeedToFetch() {
    const result = await db.select({ id: feeds.id, url: feeds.url }).from(feeds).orderBy(sql `${feeds.lastFetchedAt} ASC NULLS FIRST`).limit(1);
    if (result.length === 0) {
        return null;
    }
    return {
        id: result[0].id,
        url: result[0].url
    };
}
export async function createPost(item, feedID) {
    let values = {
        title: item.title,
        url: item.link,
        description: item.description,
        publishedAt: item.pubDate,
        feedId: feedID
    };
    await db.insert(posts).values(values).onConflictDoUpdate({ target: posts.url, set: values });
}
export async function getPostsForUser(user, maxPosts) {
    const userID = user.id;
    const results = await db.select({ title: posts.title, url: posts.url, description: posts.description, publishedAt: posts.publishedAt })
        .from(posts)
        .innerJoin(feeds, eq(posts.feedId, feeds.id))
        .innerJoin(feed_follows, and(eq(feed_follows.feedId, feeds.id), eq(feed_follows.userId, userID)))
        .where(eq(feed_follows.userId, userID))
        .orderBy(sql `${posts.publishedAt} DESC`)
        .limit(maxPosts);
    const items = [];
    for (let item of results) {
        items.push({
            title: item.title ? item.title : undefined,
            link: item.url,
            description: item.description,
            pubDate: item.publishedAt
        });
    }
    return items;
}

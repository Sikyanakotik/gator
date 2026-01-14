import { db } from "..";
import { users, feeds } from "../../../schema";
import { eq } from 'drizzle-orm';
export async function createUser(name) {
    const [result] = await db.insert(users).values({ name: name }).returning();
    return result;
}
export async function getUserByName(name) {
    const result = await db.select().from(users).where(eq(users.name, name));
    return result[0];
}
export async function resetDatabase() {
    const result = await db.delete(users);
    return result;
}
export async function getUsers() {
    const result = await db.select({ name: users.name }).from(users);
    return result;
}
export async function addFeed(feedName, feedURL, username) {
    const user = await getUserByName(username);
    if (!user) {
        throw new Error(`User ${username} does not exist.`);
    }
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

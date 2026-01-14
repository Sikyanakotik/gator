import { db } from "..";
import { users } from "../../../schema";
import { eq } from 'drizzle-orm';

export async function createUser(name: string) {
  const [result] = await db.insert(users).values({ name: name }).returning();
  return result;
}

export async function getUserByName(name: string) {
  const result = await db.select().from(users).where(eq(users.name,name));
  return result[0];
}

export async function resetDatabase() {
    const result = await db.delete(users);
    return result;
}

export async function getUsers(): Promise<{name: string}[]> {
    const result = await db.select({name: users.name}).from(users);
    return result;
}
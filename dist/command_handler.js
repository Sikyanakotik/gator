import { readConfig, setUser } from "./config";
import { createUser, getUserByName, resetDatabase, getUsers, addFeed, getFeeds, createFeedFollow, getFeedFollowsForUser, isUserInDatabase, unfollowFeed, getPostsForUser } from "./lib/db/queries/users";
import { scrapeNextFeed } from "./feed";
export function loggedIn(handler) {
    return async (commandName, ...args) => {
        const currentUserName = (await readConfig()).currentUserName;
        if (!currentUserName) {
            throw new Error("No user is currently logged in. Please login first.");
        }
        const currentUser = await getUserByName(currentUserName);
        if (!currentUser) {
            throw new Error(`Logged in user "${currentUserName}" does not exist in the database.`);
        }
        await handler(commandName, currentUser, ...args);
    };
}
export async function getCommandsRegistry() {
    let registry = new Map();
    registerCommand(registry, "login", handlerLogin);
    registerCommand(registry, "register", handlerRegister);
    registerCommand(registry, "reset", handlerReset);
    registerCommand(registry, "users", loggedIn(handlerUsers));
    registerCommand(registry, "agg", loggedIn(handlerAgg));
    registerCommand(registry, "addfeed", loggedIn(handlerAddFeed));
    registerCommand(registry, "feeds", handlerFeeds);
    registerCommand(registry, "follow", loggedIn(handlerFollow));
    registerCommand(registry, "following", loggedIn(handlerFollowing));
    registerCommand(registry, "unfollow", loggedIn(handlerUnfollow));
    registerCommand(registry, "browse", loggedIn(handlerBrowse));
    return registry;
}
export function registerCommand(registry, commandName, handler) {
    registry.set(commandName, handler);
}
export async function runCommand(registry, commandName, ...args) {
    const handler = registry.get(commandName);
    if (handler) {
        // NOTE: We might be able to move the await further up the chain...
        await handler(commandName, ...args);
    }
    else {
        throw new Error(`Command not found: ${commandName}`);
    }
}
export async function handlerLogin(commandName, ...args) {
    if (args.length < 1) {
        throw new Error("Username is required for login command.");
    }
    const username = args[0];
    if (!(await getUserByName(username))) {
        throw Error(`User ${username} does not exist. Please register first.`);
    }
    let config = await readConfig();
    await setUser(config, username);
    let updatedConfig = await readConfig();
    if (updatedConfig.currentUserName === username) {
        console.log(`Login successful. Username has been set to ${updatedConfig.currentUserName}.`);
    }
    else {
        console.log("Login failed. Username was not updated.");
    }
}
export async function handlerRegister(commandName, ...args) {
    if (args.length < 1) {
        throw new Error("Username is required for register command.");
    }
    const username = args[0];
    if (!(await isUserInDatabase(username))) {
        await createUser(username);
        await setUser(await readConfig(), username);
        console.log(`User ${username} created successfully.`);
    }
    else {
        throw Error(`User ${username} already exists.`);
    }
}
export async function handlerReset(commandName) {
    await resetDatabase();
    console.log("Database has been reset.");
}
export async function handlerAgg(commandName, user, ...args) {
    if (args.length < 1) {
        throw new Error("Time interval in seconds is required for agg command.");
    }
    let durationString = args[0];
    const regex = /^(\d+)(ms|s|m|h)$/;
    const match = durationString.match(regex);
    if (!match) {
        throw new Error("Invalid time format. Please provide a valid time interval (e.g., 10s, 5m, 1h).");
    }
    const value = parseInt(match[1], 10);
    const unit = match[2];
    let timeBetweenReqs;
    switch (unit) {
        case "ms":
            timeBetweenReqs = value;
            break;
        case "s":
            timeBetweenReqs = value * 1000;
            break;
        case "m":
            timeBetweenReqs = value * 60 * 1000;
            break;
        case "h":
            timeBetweenReqs = value * 60 * 60 * 1000;
            break;
        default:
            throw new Error("Invalid time unit. Please use ms, s, m, or h.");
    }
    console.log(`Starting feed aggregation for user "${user.name}" every ${durationString}...`);
    scrapeNextFeed().catch((error) => {
        console.error("Error during feed aggregation:", error.message);
    });
    const interval = setInterval(() => {
        scrapeNextFeed().catch((error) => {
            console.error("Error during feed aggregation:", error.message);
        });
    }, timeBetweenReqs);
    await new Promise((resolve) => {
        process.on("SIGINT", () => {
            console.log("Shutting down feed aggregator...");
            clearInterval(interval);
            resolve();
        });
    });
}
export async function handlerAddFeed(commandName, user, ...args) {
    if (args.length < 2) {
        throw new Error("Feed name and URL are required for addFeed command.");
    }
    const feedName = args[0];
    const feedURL = args[1];
    await addFeed(feedName, feedURL, user);
    await createFeedFollow(user, feedURL);
    console.log(`Feed "${feedName}" added successfully for user "${user.name}".`);
}
export async function handlerFollow(commandName, user, ...args) {
    if (args.length < 1) {
        throw new Error("URL is required for follow command.");
    }
    const feedURL = args[0];
    let feedFollow = await createFeedFollow(user, feedURL);
    console.log(`User "${user.name}" is now following feed "${feedFollow.feedName}" with URL "${feedURL}".`);
}
export async function handlerFollowing(commandName, user) {
    if (!user) {
        throw new Error("No user is currently logged in. Please login first.");
    }
    const feedFollows = await getFeedFollowsForUser(user);
    console.log(`Feeds followed by user "${user.name}":`);
    for (const feedFollow of feedFollows) {
        console.log(`* "${feedFollow.feedName}" with URL "${feedFollow.feedURL}"`);
    }
}
export async function handlerUnfollow(commandName, user, ...args) {
    if (args.length < 1) {
        throw new Error("URL is required for unfollow command.");
    }
    const feedURL = args[0];
    await unfollowFeed(user, feedURL);
    console.log(`User "${user.name}" has unfollowed feed with URL "${feedURL}".`);
}
export async function handlerBrowse(commandName, user, ...args) {
    const defaultMaxPosts = 2;
    let maxPosts = defaultMaxPosts;
    if (args.length >= 1) {
        maxPosts = Number(args[0]);
        if ((Number.isNaN(maxPosts)) && (maxPosts <= 0)) {
            maxPosts = defaultMaxPosts;
        }
    }
    console.log(`Recent RSS posts for user ${user.name}:`);
    const posts = await getPostsForUser(user, maxPosts);
    for (let post of posts) {
        console.log(`- ${post.title} (${post.link})`);
        console.log(`  Posted ${post.pubDate}`);
    }
}
export async function handlerUsers(commandName, user) {
    const users = await getUsers();
    console.log("Registered users:");
    for (const registeredUser of users) {
        if (registeredUser.name === user.name) {
            console.log(`* ${registeredUser.name} (current)`);
        }
        else {
            console.log(`* ${registeredUser.name}`);
        }
    }
}
export async function handlerFeeds(commandName) {
    const feeds = await getFeeds();
    console.log("Registered feeds:");
    for (const feed of feeds) {
        const owner = feed.userName ? feed.userName : "unknown";
        console.log(`* ${feed.name} (${feed.url}) - owned by ${owner}`);
    }
}

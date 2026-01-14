import { get } from "node:http";
import { Config, readConfig, setUser } from "./config";
import { createUser, getUserByName, resetDatabase, getUsers } from "./lib/db/queries/users";

export type CommandHandler = (commandName: string, ...args: string[]) => Promise<void>;

export type CommandsRegistry = Map<string, CommandHandler>;

export function getCommandsRegistry(): CommandsRegistry {
    let registry: CommandsRegistry = new Map<string, CommandHandler>();
    
    registerCommand(registry, "login", handlerLogin);
    registerCommand(registry, "register", handlerRegister);
    registerCommand(registry, "reset", handlerReset);
    registerCommand(registry, "users", handlerUsers);

    return registry;
}

export function registerCommand(registry: CommandsRegistry, commandName: string, handler: CommandHandler): void {
    registry.set(commandName, handler);
}

export async function runCommand(registry: CommandsRegistry, commandName: string, ...args: string[]): Promise<void> {
    const handler = registry.get(commandName);
    if (handler) {
        // NOTE: We might be able to move the await further up the chain...
        await handler(commandName, ...args);
    } else {
        throw new Error(`Command not found: ${commandName}`);
    }
}

export async function handlerLogin(commandName: string, ...args: string[]): Promise<void> {
    if (args.length < 1) {
        throw new Error("Username is required for login command.");
    }

    const username = args[0];
    if (!(await getUserByName(username))) {
        throw Error(`User ${username} does not exist. Please register first.`);
    }
    
    let config:Config = await readConfig();
    await setUser(config, username);
    let updatedConfig:Config = await readConfig();
    if (updatedConfig.currentUserName === username) {
        console.log(`Login successful. Username has been set to ${updatedConfig.currentUserName}.`);
    } else {
        console.log("Login failed. Username was not updated.");
    }
}

export async function handlerRegister(commandName: string, ...args: string[]): Promise<void> {
    if (args.length < 1) {
        throw new Error("Username is required for register command.");
    }

    const username = args[0];
    if (!(await getUserByName(username))) {
        await createUser(username);
        await setUser(await readConfig(), username);
        console.log(`User ${username} created successfully.`);
    } else {
        throw Error(`User ${username} already exists.`);
    }
}

export async function handlerReset(commandName: string): Promise<void> {
    await resetDatabase();
    console.log("Database has been reset.");
}

export async function handlerUsers(commandName: string): Promise<void> {
    const currentUser = (await readConfig()).currentUserName;
    const users = await getUsers();
    console.log("Registered users:");
    for (const user of users) {
        if (user.name === currentUser) {
            console.log(`* ${user.name} (current)`);
        } else {
            console.log(`* ${user.name}`);
        }
    }
}
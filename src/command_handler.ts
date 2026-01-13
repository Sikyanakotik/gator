import { Config, readConfig, setUser } from "./config";

export type CommandHandler = (commandName: string, ...args: string[]) => void;

export type CommandsRegistry = Map<string, CommandHandler>;

export function getCommandsRegistry(): CommandsRegistry {
    let registry: CommandsRegistry = new Map<string, CommandHandler>();
    
    registerCommand(registry, "login", handlerLogin);

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
    let config:Config = await readConfig();
    await setUser(config, username);
    let updatedConfig:Config = await readConfig();
    if (updatedConfig.currentUserName === username) {
        console.log(`Login successful. Username has been set to ${updatedConfig.currentUserName}.`);
    } else {
        console.log("Login failed. Username was not updated.");
    }
}
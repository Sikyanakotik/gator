import { readConfig, setUser } from "./config";
export function getCommandsRegistry() {
    let registry = new Map();
    registerCommand(registry, "login", handlerLogin);
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

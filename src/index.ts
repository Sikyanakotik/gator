import { Config, setUser, readConfig } from "./config";
import { CommandsRegistry, runCommand, getCommandsRegistry } from "./command_handler";
import { exit } from "node:process";

async function main() {
    let registry: CommandsRegistry = getCommandsRegistry();
    let commandName = process.argv[2];
    // console.log(`commandName: ${commandName}`);
    if (!commandName) {
        // We should set this to run the help function when/if we have one.
        console.error("No command provided.");
        exit(1);
    }
    let args = process.argv.slice(3);
    // console.log(`args: ${args}`);
    try {
        await runCommand(registry, commandName, ...args);
    } catch (error) {
        console.error(`Error executing command '${commandName}':`, error.message);
        exit(1);
    }
}

main();
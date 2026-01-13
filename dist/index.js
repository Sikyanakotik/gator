import { runCommand, getCommandsRegistry } from "./command_handler";
async function main() {
    let registry = getCommandsRegistry();
    let commandName = process.argv[2];
    console.log(`commandName: ${commandName}`);
    if (!commandName) {
        // We should set this to run the help function when/if we have one.
        console.log("No command provided.");
        return;
    }
    let args = process.argv.slice(3);
    console.log(`args: ${args}`);
    await runCommand(registry, commandName, ...args);
}
main();

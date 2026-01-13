import os from 'os';
import fs from 'fs';
import path from 'path';
export async function setUser(config, username) {
    config.currentUserName = username;
    let homeDirectory = os.homedir();
    let configPath = path.join(homeDirectory, ".gatorconfig.json");
    // Save the updated config to .gatorconfig.json in the user's home directory
    const toSave = {
        db_url: config.dbUrl,
        current_user_name: config.currentUserName,
    };
    fs.writeFileSync(configPath, JSON.stringify(toSave));
}
export async function readConfig() {
    let homeDirectory = os.homedir();
    let configPath = path.join(homeDirectory, ".gatorconfig.json");
    if (fs.existsSync(configPath)) {
        let configJson = fs.readFileSync(configPath, 'utf8');
        let rawJSON = JSON.parse(configJson);
        return { dbUrl: rawJSON.db_url, currentUserName: rawJSON.current_user_name };
    }
    return { dbUrl: '', currentUserName: undefined };
}

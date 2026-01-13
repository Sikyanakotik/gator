import os from 'os';
import fs from 'fs';
import path from 'path';

export type Config = {
    dbUrl: string;
    currentUserName: string | undefined;
}

export async function setUser(config: Config, username: string): Promise<void> {
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

export async function readConfig(): Promise<Config> {
    let homeDirectory = os.homedir();
    let configPath = path.join(homeDirectory, ".gatorconfig.json");
    if (fs.existsSync(configPath)) {
        let configJson = fs.readFileSync(configPath, 'utf8');
        let rawJSON = JSON.parse(configJson) as { db_url: string; current_user_name: string | undefined };
        return { dbUrl: rawJSON.db_url, currentUserName: rawJSON.current_user_name };
    }
    return { dbUrl: '', currentUserName: undefined };
}
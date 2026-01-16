# gator
A basic RSS aggregator for the Boot.dev "Build a Blog Aggregator in Typescript" project

### Setup
1. Install Node.js and NPM
2. Install and run PostgreSQL (e.g., via your OS package manager).
3. Create a database named `gator` and a user with access to it.
4. From a terminal, connect to Postgres and run the initial schema:
```sh
sudo -u postgres psql
CREATE DATABASE gator;
\c gator
\i src/lib/db/0000_remarkable_lila_cheney.sql
```
4. Add the following to your Linux root directory as ~/.gatorconfig.json
```
{"db_url":"postgres://postgres:postgres@localhost:5432/gator?sslmode=disable","current_user_name":""}
```
5. Navigate to the gator root directory in your terminal, then run ```npm install```.
6. You can then run gator commands by using:
```
npm run start <command> <args>
```
The start script uses tsx to run the TypeScript entrypoint at src/index.ts.

### What does it do?
gator aggregates posts from multiple RSS feeds, providing titles and URL links to the feed contents. It supports multiple users on one machine, each of whom may be subscribed to different feeds.

### Commands
All commands are lowercase.

* **register** *(args: username):* Registers a new user in the database, and immediately makes them the current user.
* **login** *(args: username):* Sets the current user. Raises an error if that user hasn't previously been registered.
* **reset** *(args: None):* Deletes the database, including all users, feeds, subscriptions, and posts. Use this for testing purposes only.
* **users** *(args: None):* Prints the list of registered users, indicating which user is currently active.
* **agg** *(args: timeBetweenRequests):* Starts the aggregator. It will update the least recently updated feed at the specified interval. The intent is to leave this script active in another terminal window to keep feeds up to date, using a reasonably long interval. This script will run forever on its own, but you can use Ctrl-C to terminate it. timeBetweenRequests must be an integer followed by "ms" (for milliseconds), "s" (for seconds), "m" (for minutes), or "h" (for hours).
* **addfeed** *(args: feedName, feedURL):* Subscribes the current user to the RSS feed at feedURL, and adds the feed to the database as feedName. Note that this script does not verify that the URL points to a valid and accessible RSS feed.
* **feeds** *(args: None):* Lists all feeds any user is subscribed to.
* **follow** *(args: feedURL):* Subscribes the current user to the RSS feed at feedURL. The feed must have been added with addfeed first.
* **following** *(args: None):* Lists all feeds the active user is subscribed to. (Yes, this is easily confused with the two previous commands. I didn't pick the name or the functionality.)
* **unfollow** *(args: feedURL):* Unsubscribes the current user from the RSS feed at feedURL, and removes the feed from the database if no other user is subscribed to it.
* **browse** *(args: maxPosts):* Lists the most recent posts from all feeds the current user is subscribed to, up to maxPosts (or 2, if maxPosts is not given or invalid).

### Okay, that's ... a lot. Why would I use this instead of...
Don't. Just don't. This was a toy project made for learning purposes only. Use a real RSS aggregator instead of this trash.

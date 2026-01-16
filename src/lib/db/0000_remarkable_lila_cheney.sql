CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "users_name_unique" UNIQUE("name")
);

CREATE TABLE feeds (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"name" TEXT NOT NULL,
	"url" TEXT NOT NULL,
	"user_id" uuid NOT NULL,
	"last_fetched_at" timestamp,
	CONSTRAINT "unique_url" UNIQUE("url"),
	CONSTRAINT "fk_user" FOREIGN KEY("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE TABLE feed_follows (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	"feed_id" uuid NOT NULL,
	CONSTRAINT "unique_user_feed" UNIQUE("user_id", "feed_id"),
	CONSTRAINT "fk_user_ff" FOREIGN KEY("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
	CONSTRAINT "fk_feed_ff" FOREIGN KEY("feed_id") REFERENCES "feeds"("id") ON DELETE CASCADE
);

CREATE TABLE posts (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"title" TEXT,
	"url" TEXT NOT NULL UNIQUE,
	"description" TEXT,
	"published_at" timestamp,
	"feed_id" uuid NOT NULL,
	CONSTRAINT "fk_feed_id" FOREIGN KEY("feed_id") REFERENCES "feeds"("id") ON DELETE CASCADE
);
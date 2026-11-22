CREATE TYPE "public"."wish_pool" AS ENUM('character', 'weapon', 'chronicled');--> statement-breakpoint
CREATE TABLE "wish_banners" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "wish_banners_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"pool" "wish_pool" NOT NULL,
	"version" text NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"starts_globally" boolean DEFAULT false NOT NULL,
	"ends_globally" boolean DEFAULT false NOT NULL,
	"five_star_ids" integer[] NOT NULL,
	"four_star_ids" integer[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wish_banners_pool_starts_at_key" UNIQUE("pool","starts_at")
);
--> statement-breakpoint
ALTER TABLE "wish_banners" ADD CONSTRAINT "wish_banners_version_game_versions_version_fk" FOREIGN KEY ("version") REFERENCES "public"."game_versions"("version") ON DELETE no action ON UPDATE no action;
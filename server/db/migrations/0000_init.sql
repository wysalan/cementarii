CREATE TYPE "public"."artifact_slot" AS ENUM('flower', 'plume', 'sands', 'goblet', 'circlet');--> statement-breakpoint
CREATE TYPE "public"."ability_kind" AS ENUM('normal_attack', 'elemental_skill', 'elemental_burst', 'alternate_sprint', 'passive', 'constellation');--> statement-breakpoint
CREATE TYPE "public"."body_type" AS ENUM('boy', 'girl', 'lady', 'male', 'loli');--> statement-breakpoint
CREATE TYPE "public"."cost_kind" AS ENUM('ascension', 'talent');--> statement-breakpoint
CREATE TYPE "public"."element" AS ENUM('pyro', 'hydro', 'anemo', 'electro', 'dendro', 'cryo', 'geo');--> statement-breakpoint
CREATE TYPE "public"."locale" AS ENUM('zh-TW', 'en', 'ja', 'ko');--> statement-breakpoint
CREATE TYPE "public"."weapon_type" AS ENUM('sword', 'claymore', 'polearm', 'bow', 'catalyst');--> statement-breakpoint
CREATE TABLE "material_i18n" (
	"material_id" integer NOT NULL,
	"locale" "locale" NOT NULL,
	"name" text NOT NULL,
	"type_text" text,
	"description" text,
	"sources" text[],
	CONSTRAINT "material_i18n_material_id_locale_pk" PRIMARY KEY("material_id","locale")
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" integer PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"rarity" smallint NOT NULL,
	"icon" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "materials_rarity_check" CHECK ("materials"."rarity" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "game_versions" (
	"version" text PRIMARY KEY NOT NULL,
	"major" smallint NOT NULL,
	"minor" smallint NOT NULL,
	"released_on" date,
	CONSTRAINT "game_versions_major_minor_unique" UNIQUE("major","minor")
);
--> statement-breakpoint
CREATE TABLE "artifact_piece_i18n" (
	"set_id" integer NOT NULL,
	"slot" "artifact_slot" NOT NULL,
	"locale" "locale" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"story" text,
	CONSTRAINT "artifact_piece_i18n_set_id_slot_locale_pk" PRIMARY KEY("set_id","slot","locale")
);
--> statement-breakpoint
CREATE TABLE "artifact_pieces" (
	"set_id" integer NOT NULL,
	"slot" "artifact_slot" NOT NULL,
	"icon" text NOT NULL,
	CONSTRAINT "artifact_pieces_set_id_slot_pk" PRIMARY KEY("set_id","slot")
);
--> statement-breakpoint
CREATE TABLE "artifact_set_i18n" (
	"set_id" integer NOT NULL,
	"locale" "locale" NOT NULL,
	"name" text NOT NULL,
	"bonus1pc" text,
	"bonus2pc" text,
	"bonus4pc" text,
	CONSTRAINT "artifact_set_i18n_set_id_locale_pk" PRIMARY KEY("set_id","locale")
);
--> statement-breakpoint
CREATE TABLE "artifact_sets" (
	"id" integer PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"min_rarity" smallint NOT NULL,
	"max_rarity" smallint NOT NULL,
	"released_in" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "artifact_sets_slug_unique" UNIQUE("slug"),
	CONSTRAINT "artifact_sets_rarity_check" CHECK ("artifact_sets"."min_rarity" between 1 and 5 and "artifact_sets"."max_rarity" between "artifact_sets"."min_rarity" and 5)
);
--> statement-breakpoint
CREATE TABLE "character_abilities" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "character_abilities_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"character_id" integer NOT NULL,
	"kind" "ability_kind" NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"is_enhanced" boolean DEFAULT false NOT NULL,
	"icon" text,
	"parameters" jsonb,
	CONSTRAINT "character_abilities_character_kind_order_enhanced_key" UNIQUE("character_id","kind","sort_order","is_enhanced")
);
--> statement-breakpoint
CREATE TABLE "character_ability_i18n" (
	"ability_id" integer NOT NULL,
	"locale" "locale" NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"labels" text[],
	CONSTRAINT "character_ability_i18n_ability_id_locale_pk" PRIMARY KEY("ability_id","locale")
);
--> statement-breakpoint
CREATE TABLE "character_costs" (
	"character_id" integer NOT NULL,
	"kind" "cost_kind" NOT NULL,
	"stage" smallint NOT NULL,
	"material_id" integer NOT NULL,
	"count" integer NOT NULL,
	CONSTRAINT "character_costs_character_id_kind_stage_material_id_pk" PRIMARY KEY("character_id","kind","stage","material_id"),
	CONSTRAINT "character_costs_count_check" CHECK ("character_costs"."count" > 0)
);
--> statement-breakpoint
CREATE TABLE "character_i18n" (
	"character_id" integer NOT NULL,
	"locale" "locale" NOT NULL,
	"name" text NOT NULL,
	"title" text,
	"description" text NOT NULL,
	"affiliation" text,
	"region" text,
	"constellation_name" text,
	"voice_actors" jsonb,
	"glossary" jsonb,
	CONSTRAINT "character_i18n_character_id_locale_pk" PRIMARY KEY("character_id","locale")
);
--> statement-breakpoint
CREATE TABLE "character_lore" (
	"character_id" integer NOT NULL,
	"locale" "locale" NOT NULL,
	"stories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"voicelines" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "character_lore_character_id_locale_pk" PRIMARY KEY("character_id","locale")
);
--> statement-breakpoint
CREATE TABLE "character_outfits" (
	"character_id" integer NOT NULL,
	"outfit_id" integer NOT NULL,
	"variant" text DEFAULT 'default' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	CONSTRAINT "character_outfits_character_id_outfit_id_pk" PRIMARY KEY("character_id","outfit_id")
);
--> statement-breakpoint
CREATE TABLE "characters" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "characters_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"game_id" integer NOT NULL,
	"slug" text NOT NULL,
	"element" "element",
	"weapon_type" "weapon_type" NOT NULL,
	"body_type" "body_type" NOT NULL,
	"rarity" smallint NOT NULL,
	"association" text NOT NULL,
	"birth_month" smallint,
	"birth_day" smallint,
	"stats" jsonb NOT NULL,
	"images" jsonb NOT NULL,
	"released_in" text NOT NULL,
	"released_at" timestamp with time zone,
	"enhanced_in" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "characters_slug_unique" UNIQUE("slug"),
	CONSTRAINT "characters_game_id_element_key" UNIQUE("game_id","element"),
	CONSTRAINT "characters_rarity_check" CHECK ("characters"."rarity" in (4, 5)),
	CONSTRAINT "characters_birthday_check" CHECK ("characters"."birth_month" between 1 and 12 and "characters"."birth_day" between 1 and 31)
);
--> statement-breakpoint
CREATE TABLE "outfit_i18n" (
	"outfit_id" integer NOT NULL,
	"variant" text DEFAULT 'default' NOT NULL,
	"locale" "locale" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	CONSTRAINT "outfit_i18n_outfit_id_variant_locale_pk" PRIMARY KEY("outfit_id","variant","locale")
);
--> statement-breakpoint
CREATE TABLE "outfits" (
	"id" integer NOT NULL,
	"variant" text DEFAULT 'default' NOT NULL,
	"images" jsonb NOT NULL,
	"released_in" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outfits_id_variant_pk" PRIMARY KEY("id","variant")
);
--> statement-breakpoint
CREATE TABLE "weapon_costs" (
	"weapon_id" integer NOT NULL,
	"stage" smallint NOT NULL,
	"material_id" integer NOT NULL,
	"count" integer NOT NULL,
	CONSTRAINT "weapon_costs_weapon_id_stage_material_id_pk" PRIMARY KEY("weapon_id","stage","material_id"),
	CONSTRAINT "weapon_costs_count_check" CHECK ("weapon_costs"."count" > 0)
);
--> statement-breakpoint
CREATE TABLE "weapon_i18n" (
	"weapon_id" integer NOT NULL,
	"locale" "locale" NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"effect_name" text,
	"effect_description" text,
	"story" text,
	CONSTRAINT "weapon_i18n_weapon_id_locale_pk" PRIMARY KEY("weapon_id","locale")
);
--> statement-breakpoint
CREATE TABLE "weapons" (
	"id" integer PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"weapon_type" "weapon_type" NOT NULL,
	"rarity" smallint NOT NULL,
	"substat_type" text,
	"stats" jsonb NOT NULL,
	"refinement_params" jsonb NOT NULL,
	"images" jsonb NOT NULL,
	"released_in" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weapons_slug_unique" UNIQUE("slug"),
	CONSTRAINT "weapons_rarity_check" CHECK ("weapons"."rarity" between 1 and 5)
);
--> statement-breakpoint
ALTER TABLE "material_i18n" ADD CONSTRAINT "material_i18n_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifact_piece_i18n" ADD CONSTRAINT "artifact_piece_i18n_set_id_slot_artifact_pieces_set_id_slot_fk" FOREIGN KEY ("set_id","slot") REFERENCES "public"."artifact_pieces"("set_id","slot") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifact_pieces" ADD CONSTRAINT "artifact_pieces_set_id_artifact_sets_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."artifact_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifact_set_i18n" ADD CONSTRAINT "artifact_set_i18n_set_id_artifact_sets_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."artifact_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifact_sets" ADD CONSTRAINT "artifact_sets_released_in_game_versions_version_fk" FOREIGN KEY ("released_in") REFERENCES "public"."game_versions"("version") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_abilities" ADD CONSTRAINT "character_abilities_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_ability_i18n" ADD CONSTRAINT "character_ability_i18n_ability_id_character_abilities_id_fk" FOREIGN KEY ("ability_id") REFERENCES "public"."character_abilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_costs" ADD CONSTRAINT "character_costs_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_costs" ADD CONSTRAINT "character_costs_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_i18n" ADD CONSTRAINT "character_i18n_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_lore" ADD CONSTRAINT "character_lore_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_outfits" ADD CONSTRAINT "character_outfits_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_outfits" ADD CONSTRAINT "character_outfits_outfit_id_variant_outfits_id_variant_fk" FOREIGN KEY ("outfit_id","variant") REFERENCES "public"."outfits"("id","variant") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_released_in_game_versions_version_fk" FOREIGN KEY ("released_in") REFERENCES "public"."game_versions"("version") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_enhanced_in_game_versions_version_fk" FOREIGN KEY ("enhanced_in") REFERENCES "public"."game_versions"("version") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outfit_i18n" ADD CONSTRAINT "outfit_i18n_outfit_id_variant_outfits_id_variant_fk" FOREIGN KEY ("outfit_id","variant") REFERENCES "public"."outfits"("id","variant") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outfits" ADD CONSTRAINT "outfits_released_in_game_versions_version_fk" FOREIGN KEY ("released_in") REFERENCES "public"."game_versions"("version") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weapon_costs" ADD CONSTRAINT "weapon_costs_weapon_id_weapons_id_fk" FOREIGN KEY ("weapon_id") REFERENCES "public"."weapons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weapon_costs" ADD CONSTRAINT "weapon_costs_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weapon_i18n" ADD CONSTRAINT "weapon_i18n_weapon_id_weapons_id_fk" FOREIGN KEY ("weapon_id") REFERENCES "public"."weapons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weapons" ADD CONSTRAINT "weapons_released_in_game_versions_version_fk" FOREIGN KEY ("released_in") REFERENCES "public"."game_versions"("version") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "materials_category_rarity_idx" ON "materials" USING btree ("category","rarity");--> statement-breakpoint
CREATE INDEX "character_costs_material_idx" ON "character_costs" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "characters_element_idx" ON "characters" USING btree ("element");--> statement-breakpoint
CREATE INDEX "weapon_costs_material_idx" ON "weapon_costs" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "weapons_type_rarity_idx" ON "weapons" USING btree ("weapon_type","rarity");
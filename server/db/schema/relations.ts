import { relations } from "drizzle-orm";
import {
  characters,
  characterI18n,
  characterLore,
  characterAbilities,
  characterAbilityI18n,
  characterCosts,
  outfits,
  outfitI18n,
  characterOutfits,
} from "./data/characters";
import { weapons, weaponI18n, weaponCosts } from "./data/weapons";
import { materials, materialI18n } from "./core/materials";
import { artifactSets, artifactSetI18n, artifactPieces, artifactPieceI18n } from "./data/artifacts";

export const charactersRelations = relations(characters, ({ many }) => ({
  i18n: many(characterI18n),
  lore: many(characterLore),
  abilities: many(characterAbilities),
  costs: many(characterCosts),
  outfits: many(characterOutfits),
}));

export const characterI18nRelations = relations(characterI18n, ({ one }) => ({
  character: one(characters, {
    fields: [characterI18n.characterId],
    references: [characters.id],
  }),
}));

export const characterLoreRelations = relations(characterLore, ({ one }) => ({
  character: one(characters, {
    fields: [characterLore.characterId],
    references: [characters.id],
  }),
}));

export const characterAbilitiesRelations = relations(characterAbilities, ({ one, many }) => ({
  character: one(characters, {
    fields: [characterAbilities.characterId],
    references: [characters.id],
  }),
  i18n: many(characterAbilityI18n),
}));

export const characterAbilityI18nRelations = relations(characterAbilityI18n, ({ one }) => ({
  ability: one(characterAbilities, {
    fields: [characterAbilityI18n.abilityId],
    references: [characterAbilities.id],
  }),
}));

export const characterCostsRelations = relations(characterCosts, ({ one }) => ({
  character: one(characters, {
    fields: [characterCosts.characterId],
    references: [characters.id],
  }),
  material: one(materials, {
    fields: [characterCosts.materialId],
    references: [materials.id],
  }),
}));

export const outfitsRelations = relations(outfits, ({ many }) => ({
  i18n: many(outfitI18n),
  characters: many(characterOutfits),
}));

export const outfitI18nRelations = relations(outfitI18n, ({ one }) => ({
  outfit: one(outfits, {
    fields: [outfitI18n.outfitId, outfitI18n.variant],
    references: [outfits.id, outfits.variant],
  }),
}));

export const characterOutfitsRelations = relations(characterOutfits, ({ one }) => ({
  character: one(characters, {
    fields: [characterOutfits.characterId],
    references: [characters.id],
  }),
  outfit: one(outfits, {
    fields: [characterOutfits.outfitId, characterOutfits.variant],
    references: [outfits.id, outfits.variant],
  }),
}));

export const materialsRelations = relations(materials, ({ many }) => ({
  i18n: many(materialI18n),
  characterCosts: many(characterCosts),
  weaponCosts: many(weaponCosts),
}));

export const materialI18nRelations = relations(materialI18n, ({ one }) => ({
  material: one(materials, {
    fields: [materialI18n.materialId],
    references: [materials.id],
  }),
}));

export const weaponsRelations = relations(weapons, ({ many }) => ({
  i18n: many(weaponI18n),
  costs: many(weaponCosts),
}));

export const weaponI18nRelations = relations(weaponI18n, ({ one }) => ({
  weapon: one(weapons, {
    fields: [weaponI18n.weaponId],
    references: [weapons.id],
  }),
}));

export const weaponCostsRelations = relations(weaponCosts, ({ one }) => ({
  weapon: one(weapons, {
    fields: [weaponCosts.weaponId],
    references: [weapons.id],
  }),
  material: one(materials, {
    fields: [weaponCosts.materialId],
    references: [materials.id],
  }),
}));

export const artifactSetsRelations = relations(artifactSets, ({ many }) => ({
  i18n: many(artifactSetI18n),
  pieces: many(artifactPieces),
}));

export const artifactSetI18nRelations = relations(artifactSetI18n, ({ one }) => ({
  set: one(artifactSets, {
    fields: [artifactSetI18n.setId],
    references: [artifactSets.id],
  }),
}));

export const artifactPiecesRelations = relations(artifactPieces, ({ one, many }) => ({
  set: one(artifactSets, {
    fields: [artifactPieces.setId],
    references: [artifactSets.id],
  }),
  i18n: many(artifactPieceI18n),
}));

export const artifactPieceI18nRelations = relations(artifactPieceI18n, ({ one }) => ({
  piece: one(artifactPieces, {
    fields: [artifactPieceI18n.setId, artifactPieceI18n.slot],
    references: [artifactPieces.setId, artifactPieces.slot],
  }),
}));

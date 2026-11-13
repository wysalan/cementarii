import type { InternalApi } from "nitropack/types";
export type CharacterData = InternalApi["/api/character/:slug"]["get"];
export type ArtifactData = InternalApi["/api/artifact/:slug"]["get"];
export type CharacterListItem = InternalApi["/api/character"]["get"][number];
export type WeaponListItem = InternalApi["/api/weapon"]["get"][number];
export type ArtifactListItem = InternalApi["/api/artifact"]["get"][number];
export type MaterialListItem = InternalApi["/api/material"]["get"][number];

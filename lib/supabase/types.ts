import type { Database as GeneratedDatabase } from "./database";

type PublicSchema = GeneratedDatabase["public"];
type GeneratedRelations = PublicSchema["Tables"] & PublicSchema["Views"];
type RankingName = "artist_rankings" | "track_rankings" | "album_rankings";
type CommonRequiredColumn = "id" | "snapshot_id" | "user_id" | "created_at" | "rank";
type CommonInsertColumn = "snapshot_id" | "user_id" | "rank";

type RequiredColumns<Row, Column extends keyof Row> = {
  [Key in keyof Row]: Key extends Column ? NonNullable<Row[Key]> : Row[Key];
};

// View introspection does not retain NOT NULL constraints or reliably discover
// INSTEAD OF trigger writes. These contracts match the constraints and defaults
// enforced by the ranking storage migration, without modifying generated types.
type WritableRanking<
  Name extends RankingName,
  RequiredColumn extends keyof GeneratedRelations[Name]["Row"],
  InsertColumn extends keyof GeneratedRelations[Name]["Row"],
  Row = RequiredColumns<GeneratedRelations[Name]["Row"], RequiredColumn>,
> = Omit<GeneratedRelations[Name], "Row" | "Insert" | "Update"> & {
  Row: Row;
  Insert: Pick<Row, Extract<InsertColumn, keyof Row>> &
    Partial<Omit<Row, InsertColumn>>;
  Update: Partial<Row>;
};

type RankingRelations = {
  artist_rankings: WritableRanking<
    "artist_rankings",
    CommonRequiredColumn | "artist_id" | "artist_name",
    CommonInsertColumn | "artist_id" | "artist_name"
  >;
  track_rankings: WritableRanking<
    "track_rankings",
    CommonRequiredColumn | "track_id" | "track_name" | "artist_id" | "artist_name" | "album_id" | "album_name",
    CommonInsertColumn | "track_id" | "track_name" | "artist_id" | "artist_name" | "album_id" | "album_name"
  >;
  album_rankings: WritableRanking<
    "album_rankings",
    CommonRequiredColumn | "album_id" | "album_name" | "artist_id" | "artist_name" | "track_count",
    CommonInsertColumn | "album_id" | "album_name" | "artist_id" | "artist_name"
  >;
};

// Accept both the original table schema and the migrated view schema during
// rollout. Supabase uses the same REST endpoint for either relation kind.
export type Database = Omit<GeneratedDatabase, "public"> & {
  public: Omit<PublicSchema, "Tables" | "Views"> & {
    Tables: Omit<PublicSchema["Tables"], RankingName>;
    Views: Omit<PublicSchema["Views"], RankingName> & RankingRelations;
  };
};

export type ArtistRanking = RankingRelations["artist_rankings"]["Row"];
export type TrackRanking = RankingRelations["track_rankings"]["Row"];
export type AlbumRanking = RankingRelations["album_rankings"]["Row"];

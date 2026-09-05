export class SpotifyAPIError extends Error {
  constructor(message: string, public status: number, public shouldRefresh = false) {
    super(message);
    this.name = "SpotifyAPIError";
  }
}

# Unfollow Artists or Users `OAuth 2.0`

Remove the current user as a follower of one or more artists or other Spotify users.

---

### 🟢 Authorization scopes

> **user-follow-modify**

---

## Request

### `DELETE` **/me/following**

#### **Query Parameters**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| **type** | string | **Required** | The ID type: either artist or user.<br>

<br>Allowed values: `"artist"`, `"user"`<br>

<br>Example: `type=artist` |
| **ids** | string | **Required** | A comma-separated list of the artist or the user [Spotify IDs](https://www.google.com/search?q=https://developer.spotify.com/documentation/web-api/%23spotify-ids). For example: `ids=74ASZWbe4lXaubB36ztrGX,08td7MxkoHQkXnWAYD8d6Q`. A maximum of 50 IDs can be sent in one request.<br>

<br>Example: `ids=2CIMQHirSU0MQyyYHq0eOx,57dN52uHvrH0xijzpIgu3E,1vCWHaC5f2uS3yhpwwBIA6` |

#### **Body** `application/json`

supports free form additional properties

| Parameter | Type | Description |
| --- | --- | --- |
| **ids** | array of strings | A JSON array of the artist or user [Spotify IDs](https://www.google.com/search?q=https://developer.spotify.com/documentation/web-api/%23spotify-ids). For example: `{ "ids": ["74ASZWbe4lXaubB36ztrGX", "08td7MxkoHQkXnWAYD8d6Q"] }`. A maximum of 50 IDs can be sent in one request. **Note:** *if the ids parameter is present in the query string, any IDs listed here in the body will be ignored.* |

---

## Response `204` `401` `403` `429`

**Artist or user unfollowed**

---

# Follow Artists or Users `OAuth 2.0`

Add the current user as a follower of one or more artists or other Spotify users.

---

### 🟢 Authorization scopes

> **user-follow-modify**

---

## Request

### `PUT` **/me/following**

#### **Query Parameters**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| **type** | string | **Required** | The ID type.<br>

<br>Allowed values: `"artist"`, `"user"`<br>

<br>Example: `type=artist` |
| **ids** | string | **Required** | A comma-separated list of the artist or the user [Spotify IDs](https://www.google.com/search?q=https://developer.spotify.com/documentation/web-api/%23spotify-uris-and-ids). A maximum of 50 IDs can be sent in one request.<br>

<br>Example: `ids=2CIMQHirSU0MQyyYHq0eOx,57dN52uHvrH0xijzpIgu3E,1vCWHaC5f2uS3yhpwwBIA6` |

#### **Body** `application/json`

supports free form additional properties

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| **ids** | array of strings | **Required** | A JSON array of the artist or user [Spotify IDs](https://www.google.com/search?q=https://developer.spotify.com/documentation/web-api/%23spotify-uris-and-ids). For example: `{ "ids": ["74ASZWbe4lXaubB36ztrGX", "08td7MxkoHQkXnWAYD8d6Q"] }`. A maximum of 50 IDs can be sent in one request. **Note:** *if the ids parameter is present in the query string, any IDs listed here in the body will be ignored.* |

---

## Response `204` `401` `403` `429`

**Artist or user followed**

---

Add the current user as a follower of one or more artists or other Spotify users.

---

### 🟢 Authorization scopes

> **user-follow-modify**

---

## Request

### `PUT` **/me/following**

#### **Query Parameters**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| **type** | string | **Required** | The ID type.<br>

<br>Allowed values: `"artist"`, `"user"`<br>

<br>Example: `type=artist` |
| **ids** | string | **Required** | A comma-separated list of the artist or the user [Spotify IDs](https://www.google.com/search?q=https://developer.spotify.com/documentation/web-api/%23spotify-uris-and-ids). A maximum of 50 IDs can be sent in one request.<br>

<br>Example: `ids=2CIMQHirSU0MQyyYHq0eOx,57dN52uHvrH0xijzpIgu3E,1vCWHaC5f2uS3yhpwwBIA6` |

#### **Body** `application/json`

supports free form additional properties

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| **ids** | array of strings | **Required** | A JSON array of the artist or user [Spotify IDs](https://www.google.com/search?q=https://developer.spotify.com/documentation/web-api/%23spotify-uris-and-ids). For example: `{ "ids": ["74ASZWbe4lXaubB36ztrGX", "08td7MxkoHQkXnWAYD8d6Q"] }`. A maximum of 50 IDs can be sent in one request. **Note:** *if the ids parameter is present in the query string, any IDs listed here in the body will be ignored.* |

---

## Response `204` `401` `403` `429`

**Artist or user followed**

---

---

# Check If User Follows Artists or Users `OAuth 2.0`

Check to see if the current user is following one or more artists or other Spotify users.

---

### 🟢 Authorization scopes

> **user-follow-read**

---

## Request

### `GET` **/me/following/contains**

#### **Query Parameters**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| **type** | string | **Required** | The ID type: either artist or user.<br>

<br>Allowed values: `"artist"`, `"user"`<br>

<br>Example: `type=artist` |
| **ids** | string | **Required** | A comma-separated list of the artist or the user [Spotify IDs](https://www.google.com/search?q=https://developer.spotify.com/documentation/web-api/%23spotify-uris-and-ids) to check. For example: `ids=74ASZWbe4lXaubB36ztrGX,08td7MxkoHQkXnWAYD8d6Q`. A maximum of 50 IDs can be sent in one request.<br>

<br>Example: `ids=2CIMQHirSU0MQyyYHq0eOx,57dN52uHvrH0xijzpIgu3E,1vCWHaC5f2uS3yhpwwBIA6` |

---

## Response `200` `401` `403` `429`

**Array of booleans**
An array of:
Example: `[false, true]`

---

# Spotify URIs and IDs

In requests to the Web API and responses from it, you will frequently encounter the following parameters:

| Parameter | Description |
| --- | --- |
| **Spotify URI** | The resource identifier of, for example, an artist, album or track. This can be entered in the search box in a Spotify Desktop Client, to navigate to that resource. To find a Spotify URI, right-click (on Windows) or Ctrl-Click (on a Mac) on the artist, album or track name. <br>

<br>Example: `spotify:track:6rqhFgbBKwnb9MLmUQD hG6` |
| **Spotify ID** | The base-62 identifier found at the end of the Spotify URI (see above) for an artist, track, album, playlist, etc. Unlike a Spotify URI, a Spotify ID does not clearly identify the type of resource; that information is provided elsewhere in the call. <br>

<br>Example: `6rqhFgbBKwnb9MLmUQD hG6` |
| **Spotify category ID** | The unique string identifying the Spotify category. <br>

<br>Example: `party` |
| **Spotify user ID** | The unique string identifying the Spotify user that you can find at the end of the Spotify URI for the user. The ID of the current user can be obtained via the Get Current User's Profile endpoint. <br>

<br>Example: `wizzler` |
| **Spotify URL** | When visited, if the user has the Spotify client installed, it will launch the Client and navigate to the requested resource. Which client is determined by the user's device and account settings at [play.spotify.com](https://www.google.com/search?q=http://play.spotify.com). <br>

<br>Example: `http://open.spotify.com/track/6rqhFgbBKwnb9MLmUQD hG6` |

---
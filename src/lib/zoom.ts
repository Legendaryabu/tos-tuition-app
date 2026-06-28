/**
 * Zoom Server-to-Server OAuth API Helper
 * 
 * This uses Zoom's Server-to-Server OAuth (recommended by Zoom since June 2023)
 * NOT the old JWT app type (which Zoom deprecated).
 * 
 * Setup steps:
 * 1. Go to https://marketplace.zoom.us/develop/create
 * 2. Choose "Server-to-Server OAuth" app type
 * 3. Give it a name (e.g., "TBOS Integration")
 * 4. Under "Scopes", add these:
 *    - meeting:read:admin
 *    - meeting:write:admin
 *    - user:read:admin
 * 5. Copy Account ID, Client ID, Client Secret
 * 6. Add them to your .env file
 */

const ZOOM_BASE_URL = "https://api.zoom.us/v2";

interface ZoomTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

// In-memory token cache per institute
const tokenCache = new Map<string, {
  accessToken: string;
  expiresAt: number;
}>();

/**
 * Get a Server-to-Server OAuth access token from Zoom
 */
export async function getZoomAccessToken(
  accountId: string,
  clientId: string,
  clientSecret: string,
  instituteId?: string
): Promise<string> {
  // Check cache first
  if (instituteId) {
    const cached = tokenCache.get(instituteId);
    if (cached && cached.expiresAt > Date.now() + 60000) {
      return cached.accessToken;
    }
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Zoom OAuth failed (${response.status}): ${error}`);
  }

  const data: ZoomTokenResponse = await response.json();

  // Cache the token
  if (instituteId) {
    tokenCache.set(instituteId, {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in * 1000),
    });
  }

  return data.access_token;
}

/**
 * Make an authenticated request to the Zoom API
 */
async function zoomApiRequest(
  accessToken: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const url = `${ZOOM_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Zoom API error (${response.status}): ${error}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

/**
 * Create a Zoom meeting
 */
export async function createZoomMeeting(accessToken: string, params: {
  topic: string;
  type?: number; // 1=instant, 2=scheduled, 3=recurring, 8=recurring fixed
  startTime?: string; // ISO 8601
  duration?: number; // minutes
  hostEmail?: string;
  agenda?: string;
  settings?: {
    host_video?: boolean;
    participant_video?: boolean;
    join_before_host?: boolean;
    mute_upon_entry?: boolean;
    waiting_room?: boolean;
    auto_recording?: "local" | "cloud" | "none";
    meeting_authentication?: boolean;
    password?: boolean;
  };
}) {
  const body: any = {
    topic: params.topic,
    type: params.type || 2,
    duration: params.duration || 60,
    settings: {
      host_video: true,
      participant_video: false,
      join_before_host: true,
      mute_upon_entry: true,
      waiting_room: false,
      auto_recording: "local",
      meeting_authentication: false,
      ...params.settings,
    },
  };

  if (params.startTime) body.start_time = params.startTime;
  if (params.hostEmail) body.host_email = params.hostEmail;
  if (params.agenda) body.agenda = params.agenda;

  return zoomApiRequest(accessToken, "/users/me/meetings", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * List meetings for a user
 */
export async function listMeetings(accessToken: string, userId: string = "me", params?: {
  type?: "live" | "upcoming" | "scheduled" | "past";
  page_size?: number;
  page_number?: number;
}) {
  const query = new URLSearchParams();
  if (params?.type) query.set("type", params.type);
  if (params?.page_size) query.set("page_size", String(params.page_size));
  if (params?.page_number) query.set("page_number", String(params.page_number));

  return zoomApiRequest(accessToken, `/users/${userId}/meetings?${query.toString()}`);
}

/**
 * Get a specific meeting's details
 */
export async function getMeeting(accessToken: string, meetingId: string) {
  return zoomApiRequest(accessToken, `/meetings/${meetingId}`);
}

/**
 * Get meeting participants
 */
export async function getMeetingParticipants(accessToken: string, meetingId: string) {
  return zoomApiRequest(accessToken, `/report/meetings/${meetingId}/participants`);
}

/**
 * End a meeting
 */
export async function endMeeting(accessToken: string, meetingId: string) {
  return zoomApiRequest(accessToken, `/meetings/${meetingId}/status`, {
    method: "PUT",
    body: JSON.stringify({ action: "end" }),
  });
}

/**
 * Delete a meeting
 */
export async function deleteMeeting(accessToken: string, meetingId: string) {
  return zoomApiRequest(accessToken, `/meetings/${meetingId}`, {
    method: "DELETE",
  });
}

/**
 * Update a meeting
 */
export async function updateMeeting(accessToken: string, meetingId: string, data: any) {
  return zoomApiRequest(accessToken, `/meetings/${meetingId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/**
 * Get meeting recording files
 */
export async function getMeetingRecordings(accessToken: string, meetingId: string) {
  return zoomApiRequest(accessToken, `/meetings/${meetingId}/recordings`);
}

/**
 * List all recordings (cloud)
 */
export async function listRecordings(accessToken: string, params?: {
  from?: string; // YYYY-MM-DD
  to?: string;
  page_size?: number;
}) {
  const query = new URLSearchParams();
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  if (params?.page_size) query.set("page_size", String(params.page_size));

  return zoomApiRequest(accessToken, `/users/me/recordings?${query.toString()}`);
}

/**
 * Get the current user's info (to verify connection works)
 */
export async function getCurrentUser(accessToken: string) {
  return zoomApiRequest(accessToken, "/users/me");
}

/**
 * Generate the OAuth authorize URL for user-level OAuth (optional - for advanced use)
 * Not needed for Server-to-Server OAuth, but included for future expansion
 */
export function getOAuthAuthorizeUrl(clientId: string, redirectUri: string) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
  });
  return `https://zoom.us/oauth/authorize?${params.toString()}`;
}
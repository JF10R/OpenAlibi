const SERVICE_CONTRACT_VERSION = 1;

function normalizeBaseUrl(value) {
  const url = new URL(String(value));
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) {
    throw new Error('Premium services require HTTPS outside local development.');
  }
  return url.toString().replace(/\/$/, '');
}

export function createFriendRequest(value) {
  const friendCode = String(value ?? '').toUpperCase().replace(/\s+/g, '');
  if (!/^[A-Z0-9-]{6,32}$/.test(friendCode)) throw new Error('A valid friend code is required.');
  return { friendCode };
}

export function createRankedSubmission(record, manifest) {
  if (manifest?.authority !== 'server' || !manifest.signature) {
    throw new Error('Ranked play requires a server-authorized challenge manifest.');
  }
  if (!record?.solved || record.revealed || record.hints || record.wrongChecks) {
    throw new Error('Ranked completions must be solved without assistance.');
  }
  if (record.caseId !== manifest.caseId || record.generatorVersion !== manifest.generatorVersion) {
    throw new Error('The completion does not match the official challenge.');
  }
  return {
    version: SERVICE_CONTRACT_VERSION,
    challengeId: String(manifest.id),
    caseId: String(record.caseId),
    sessionId: String(record.sessionId),
    generatorVersion: Number(record.generatorVersion),
    difficulty: String(record.difficulty),
    caseType: String(record.caseType),
    completedAt: String(record.completedAt),
    manifestSignature: String(manifest.signature),
  };
}

export function createPremiumService({ baseUrl, fetchImpl = globalThis.fetch } = {}) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required.');

  async function request(path, options = {}) {
    const headers = { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}) };
    const response = await fetchImpl(`${normalizedBaseUrl}${path}`, {
      method: options.method ?? 'GET',
      credentials: 'include',
      headers,
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });
    if (!response?.ok) throw new Error(`Premium service request failed (${response?.status ?? 'network'}).`);
    if (response.status === 204) return null;
    return response.json();
  }

  return Object.freeze({
    getProfile: () => request('/v1/profile'),
    updateProfile: (profile) => request('/v1/profile', { method: 'PATCH', body: profile }),
    listFriends: () => request('/v1/friends'),
    sendFriendRequest: (friendCode) => request('/v1/friends', {
      method: 'POST',
      body: createFriendRequest(friendCode),
    }),
    getLeaderboard: ({ scope = 'friends', difficulty = 'expert' } = {}) => request(
      `/v1/leaderboards?scope=${encodeURIComponent(scope)}&difficulty=${encodeURIComponent(difficulty)}`,
    ),
    submitRankedCompletion: (submission) => request('/v1/ranked-completions', {
      method: 'POST',
      body: submission,
    }),
  });
}

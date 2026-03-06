export function buildDirectConversationId(uidA: string, uidB: string): string {
  const first = uidA.trim();
  const second = uidB.trim();
  const sorted = [first, second].sort();
  return `direct_${sorted[0]}_${sorted[1]}`;
}

export function buildDirectMessageHref(
  currentUid: string | null | undefined,
  otherUid: string,
  options?: { username?: string | null | undefined },
): string {
  const normalizedOtherUid = otherUid.trim();
  if (!normalizedOtherUid) return "/messages";

  const params = new URLSearchParams();
  params.set("userId", normalizedOtherUid);

  const username = options?.username?.trim();
  if (username) {
    params.set("username", username);
  }

  if (!currentUid?.trim()) {
    return `/messages?${params.toString()}`;
  }

  const conversationId = buildDirectConversationId(currentUid, normalizedOtherUid);
  return `/messages/${encodeURIComponent(conversationId)}?${params.toString()}`;
}

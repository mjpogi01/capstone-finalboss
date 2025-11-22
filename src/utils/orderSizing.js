export const getApparelSizeVisibility = (orderItem, fallback = {}) => {
  const fallbackJersey = Boolean(fallback?.jersey);
  const fallbackShorts = Boolean(fallback?.shorts);

  if (!orderItem) {
    return { showJersey: fallbackJersey, showShorts: fallbackShorts };
  }

  const primaryType =
    orderItem.jerseyType ??
    orderItem.jersey_type ??
    orderItem.singleOrderDetails?.jerseyType ??
    orderItem.singleOrderDetails?.jersey_type ??
    orderItem.single_order_details?.jerseyType ??
    orderItem.single_order_details?.jersey_type ??
    null;

  const teamType =
    (Array.isArray(orderItem.teamMembers) && orderItem.teamMembers[0]?.jerseyType) ||
    (Array.isArray(orderItem.team_members) && orderItem.team_members[0]?.jerseyType) ||
    null;

  const rawType = (primaryType ?? teamType ?? '')
    .toString()
    .toLowerCase();

  const normalized = rawType.replace(/[^a-z]/g, '');

  if (!normalized) {
    return { showJersey: fallbackJersey, showShorts: fallbackShorts };
  }

  const hasFull = normalized.includes('full');
  const hasShortKeyword = normalized.includes('short');
  const hasShirtKeyword = normalized.includes('shirt');

  const isShortOnly =
    normalized.includes('shortonly') ||
    normalized.includes('shortsonly') ||
    (hasShortKeyword && !hasShirtKeyword && !hasFull);

  const isShirtOnly =
    normalized.includes('shirtonly') ||
    normalized.includes('jerseyonly') ||
    (hasShirtKeyword && !hasShortKeyword && !hasFull);

  if (hasFull) {
    return { showJersey: true, showShorts: true };
  }

  if (isShortOnly) {
    return { showJersey: false, showShorts: true };
  }

  if (isShirtOnly) {
    return { showJersey: true, showShorts: false };
  }

  return { showJersey: fallbackJersey, showShorts: fallbackShorts };
};


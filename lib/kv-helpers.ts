// ponytail: follows existing pattern from app/api/vote/route.ts
// Email is case-insensitive and can arrive with surrounding whitespace, so it is folded
// to one canonical form before it becomes an account key. Only trim and lowercase:
// dropping dots or +tags would change which mailbox an address actually reaches.
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const userKeys = {
  byEmail: (email: string) => `user:email:${normalizeEmail(email)}`,
  // Accounts created before email normalization kept the caller's raw string as their key.
  // Reads fall back to it so those accounts stay reachable instead of locked out.
  byRawEmail: (email: string) => `user:email:${email}`,
  byUsername: (username: string) => `user:username:${username}`,
  byId: (id: string) => `user:id:${id}`,
};

export const commentKeys = {
  forSlug: (slug: string) => `comments:${slug}`,
  byId: (id: string) => `comment:${id}`,
};

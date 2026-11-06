// Demo data belongs to short-lived visitor sessions. Keep reads request-local so
// reset, role changes, and expiry always consult current database state.
export function cachedRead<T>(
  load: () => Promise<T>,
  _keyParts: string[],
  _options: { tags: string[] },
) {
  return load;
}

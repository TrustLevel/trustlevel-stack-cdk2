/**
 * Return envVar parsed To <T> if not null, otherwise throw Error.
 * @param key
 */
export const readEnvVar = <T>(key: string): T => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const envVar = process.env[key] as any;
  if (!envVar) {
    throw new Error(`envVar is missing for key: "${key}"`);
  }
  try {
    return JSON.parse(envVar) as T;
  } catch (e) {
    // If "envVar" cannot be parsed, we return it as it is.
    return envVar as T;
  }
};

/**
 * Package and analyzer version constants.
 *
 * Kept in a tiny standalone module so the rest of the runtime never has
 * to read `package.json` from disk (matters for the ncc bundle).
 */
export const RULE_PACK_VERSION = '1.0.0';

export const ANALYZER_VERSIONS: Record<string, string> = {
  eslint: '8.57.0',
  'ts-prune': '0.10.3',
  jscpd: '4.0.4',
  markdownlint: '0.34.0',
};

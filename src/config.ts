import * as fs from 'fs';
import * as path from 'path';
import { parse as parseYaml } from 'yaml';
import { DEFAULT_CONFIG, ReviewConfig } from './types';

/**
 * Load per-repo review configuration from the target repo's
 * `.github/ai-review.yml` if present. Missing or unreadable files
 * fall back to {@link DEFAULT_CONFIG}.
 */
export function loadConfig(configPath: string, workspace: string): ReviewConfig {
  const absPath = path.isAbsolute(configPath) ? configPath : path.join(workspace, configPath);
  if (!fs.existsSync(absPath)) {
    return { ...DEFAULT_CONFIG };
  }
  let raw: string;
  try {
    raw = fs.readFileSync(absPath, 'utf8');
  } catch {
    return { ...DEFAULT_CONFIG };
  }
  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch {
    return { ...DEFAULT_CONFIG };
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ...DEFAULT_CONFIG };
  }
  const data = parsed as Record<string, unknown>;
  const qualityBlock = (data.quality as Record<string, unknown> | undefined) ?? {};
  const overrides: ReviewConfig['ruleOverrides'] = {};
  const rawOverrides = qualityBlock.rules as Record<string, unknown> | undefined;
  if (rawOverrides && typeof rawOverrides === 'object') {
    for (const [k, v] of Object.entries(rawOverrides)) {
      if (v && typeof v === 'object') {
        const o = v as Record<string, unknown>;
        overrides[k] = {
          severity: typeof o.severity === 'string' ? (o.severity as ReviewConfig['ruleOverrides'][string]['severity']) : undefined,
          enabled: typeof o.enabled === 'boolean' ? o.enabled : undefined,
        };
      }
    }
  }
  return {
    enabled: typeof qualityBlock.enabled === 'boolean' ? qualityBlock.enabled : DEFAULT_CONFIG.enabled,
    excludePaths: Array.isArray(qualityBlock.exclude_paths)
      ? (qualityBlock.exclude_paths as string[])
      : DEFAULT_CONFIG.excludePaths,
    rulePackVersion: typeof qualityBlock.rule_pack_version === 'string' ? qualityBlock.rule_pack_version : undefined,
    ruleOverrides: overrides,
    maxFindingsPerFile:
      typeof qualityBlock.max_findings_per_file === 'number'
        ? qualityBlock.max_findings_per_file
        : DEFAULT_CONFIG.maxFindingsPerFile,
  };
}

/** Construct a stable citation URL for a rule's Markdown file. */
export function citationUrl(ruleId: string, version: string): string {
  return `https://github.com/sfg-labs/ai-reviewer-quality/blob/v${version}/src/rule-packs/${ruleId}.md`;
}

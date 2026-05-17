import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { citationUrl, loadConfig } from '../src/config';
import { DEFAULT_CONFIG } from '../src/types';

describe('loadConfig', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-rev-cfg-'));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('returns defaults when config file is missing', () => {
    expect(loadConfig('.github/ai-review.yml', tmp)).toEqual(DEFAULT_CONFIG);
  });

  it('parses a valid quality block', () => {
    const dir = path.join(tmp, '.github');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'ai-review.yml'), `
quality:
  enabled: false
  exclude_paths:
    - legacy/**
  max_findings_per_file: 5
  rules:
    QUAL.NAMING.001:
      enabled: false
      severity: HIGH
`);
    const cfg = loadConfig('.github/ai-review.yml', tmp);
    expect(cfg.enabled).toBe(false);
    expect(cfg.excludePaths).toEqual(['legacy/**']);
    expect(cfg.maxFindingsPerFile).toBe(5);
    expect(cfg.ruleOverrides['QUAL.NAMING.001'].enabled).toBe(false);
    expect(cfg.ruleOverrides['QUAL.NAMING.001'].severity).toBe('HIGH');
  });

  it('handles invalid YAML gracefully', () => {
    fs.writeFileSync(path.join(tmp, 'cfg.yml'), ':\n  : :\n  not: [valid');
    expect(loadConfig(path.join(tmp, 'cfg.yml'), tmp)).toEqual(DEFAULT_CONFIG);
  });

  it('falls back when parsed YAML is not an object', () => {
    fs.writeFileSync(path.join(tmp, 'cfg.yml'), '42');
    expect(loadConfig(path.join(tmp, 'cfg.yml'), tmp)).toEqual(DEFAULT_CONFIG);
  });

  it('falls back when YAML lacks a quality block', () => {
    fs.writeFileSync(path.join(tmp, 'cfg.yml'), 'other:\n  enabled: true\n');
    expect(loadConfig(path.join(tmp, 'cfg.yml'), tmp).enabled).toBe(DEFAULT_CONFIG.enabled);
  });

  it('handles unreadable files', () => {
    const dirAsFile = path.join(tmp, 'unreadable');
    fs.mkdirSync(dirAsFile);
    // Path points at a directory — readFileSync will throw EISDIR.
    expect(loadConfig(dirAsFile, tmp)).toEqual(DEFAULT_CONFIG);
  });

  it('accepts absolute config path', () => {
    const p = path.join(tmp, 'absolute.yml');
    fs.writeFileSync(p, 'quality:\n  enabled: true\n');
    expect(loadConfig(p, tmp).enabled).toBe(true);
  });

  it('ignores non-object rule overrides', () => {
    fs.writeFileSync(path.join(tmp, 'cfg.yml'), 'quality:\n  rules:\n    QUAL.X.001: true\n');
    expect(loadConfig(path.join(tmp, 'cfg.yml'), tmp).ruleOverrides).toEqual({});
  });

  it('captures rule_pack_version when provided as a string', () => {
    fs.writeFileSync(path.join(tmp, 'cfg.yml'), 'quality:\n  rule_pack_version: 2.1.0\n');
    expect(loadConfig(path.join(tmp, 'cfg.yml'), tmp).rulePackVersion).toBe('2.1.0');
  });

  it('ignores non-string rule_pack_version', () => {
    fs.writeFileSync(path.join(tmp, 'cfg.yml'), 'quality:\n  rule_pack_version: 5\n');
    expect(loadConfig(path.join(tmp, 'cfg.yml'), tmp).rulePackVersion).toBeUndefined();
  });

  it('ignores non-array exclude_paths', () => {
    fs.writeFileSync(path.join(tmp, 'cfg.yml'), 'quality:\n  exclude_paths: nope\n');
    expect(loadConfig(path.join(tmp, 'cfg.yml'), tmp).excludePaths).toEqual(DEFAULT_CONFIG.excludePaths);
  });

  it('ignores non-number max_findings_per_file', () => {
    fs.writeFileSync(path.join(tmp, 'cfg.yml'), 'quality:\n  max_findings_per_file: many\n');
    expect(loadConfig(path.join(tmp, 'cfg.yml'), tmp).maxFindingsPerFile).toBe(DEFAULT_CONFIG.maxFindingsPerFile);
  });
});

describe('citationUrl', () => {
  it('produces a stable versioned URL', () => {
    expect(citationUrl('QUAL.STYLE.001', '1.0.0')).toBe(
      'https://github.com/sfg-labs/ai-reviewer-quality/blob/v1.0.0/src/rule-packs/QUAL.STYLE.001.md'
    );
  });
});

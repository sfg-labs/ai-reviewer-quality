import Anthropic from '@anthropic-ai/sdk';
import { ChangedFile, Finding, Severity } from '../types';
import { citationUrl } from '../config';
import { ANALYZER_VERSIONS, RULE_PACK_VERSION } from '../version';

export const QUALITY_SYSTEM_PROMPT = `You are an AI code reviewer focused on code quality concerns: SOLID, complexity, naming, documentation, TODO ownership, missing tests, accessibility, import hygiene. You DO NOT comment on security or performance — sibling reviewers handle those.

Every finding must include rule_id, severity, confidence, file, line, explanation, remediation. Return ONLY a JSON array. No prose. Empty array [] is valid.

Valid rule_ids: QUAL.SOLID.001, QUAL.DEAD.001, QUAL.CLONE.001, QUAL.TEST.001, QUAL.DOC.001, QUAL.DEP.001, QUAL.DEP.002, QUAL.STYLE.001, QUAL.STYLE.002, QUAL.NAMING.001, QUAL.A11Y.001, QUAL.IMPORT.001, QUAL.COMMENT.001.`;

export interface RawFinding {
  rule_id?: string;
  severity?: string;
  confidence?: number;
  file?: string;
  line?: number;
  explanation?: string;
  remediation?: string;
}

const VALID_RULE_IDS = new Set([
  'QUAL.SOLID.001',
  'QUAL.DEAD.001',
  'QUAL.CLONE.001',
  'QUAL.TEST.001',
  'QUAL.DOC.001',
  'QUAL.DEP.001',
  'QUAL.DEP.002',
  'QUAL.STYLE.001',
  'QUAL.STYLE.002',
  'QUAL.NAMING.001',
  'QUAL.A11Y.001',
  'QUAL.IMPORT.001',
  'QUAL.COMMENT.001',
]);

const VALID_SEVERITIES: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

/**
 * Extract a JSON array from the model's response text. The model is
 * instructed to return ONLY a JSON array but defensive parsing handles
 * the case where it sneaks in a prose preamble or code fences.
 */
export function extractJsonArray(text: string): RawFinding[] {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  const start = candidate.indexOf('[');
  const end = candidate.lastIndexOf(']');
  if (start === -1 || end === -1 || end < start) return [];
  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Validate, normalize, and citation-stamp a raw finding from the model.
 * Returns `null` if the finding fails validation (unknown rule, missing
 * line, line not in the PR diff, etc.).
 */
export function normalizeFinding(raw: RawFinding, changed: ChangedFile[]): Finding | null {
  if (!raw.rule_id || !VALID_RULE_IDS.has(raw.rule_id)) return null;
  if (!raw.file || typeof raw.line !== 'number' || raw.line <= 0) return null;
  if (!raw.explanation || !raw.remediation) return null;

  const severity = (raw.severity ?? 'MEDIUM').toUpperCase() as Severity;
  if (!VALID_SEVERITIES.includes(severity)) return null;

  const file = changed.find((f) => f.filename === raw.file);
  if (!file) return null;
  if (!file.changedLines.includes(raw.line)) return null;

  let confidence = typeof raw.confidence === 'number' ? raw.confidence : 0.7;
  if (confidence < 0) confidence = 0;
  if (confidence > 1) confidence = 1;

  return {
    rule_id: raw.rule_id,
    severity,
    confidence,
    file: raw.file,
    line: raw.line,
    explanation: raw.explanation,
    remediation: raw.remediation,
    citation_url: citationUrl(raw.rule_id, RULE_PACK_VERSION),
    source: 'claude',
    rule_pack_version: RULE_PACK_VERSION,
    analyzer_versions: { 'claude-sonnet-4-6': ANALYZER_VERSIONS['claude-sonnet-4-6'] },
  };
}

/**
 * Build the user-message content for one batch of diff chunks. We slice
 * the changed-files set into ~10-file batches so we can stream feedback
 * and keep individual requests inside the context window.
 */
export function buildPrompt(batch: ChangedFile[]): string {
  const sections = batch.map((f) => {
    const header = `### ${f.filename} (${f.status}, +${f.additions} -${f.deletions})`;
    const patch = f.patch ? f.patch : '(no patch — file is binary or renamed only)';
    return `${header}\n\`\`\`diff\n${patch}\n\`\`\``;
  });
  return [
    'Review the following PR diff for code quality issues. Return a JSON array of findings.',
    'Only flag issues on lines that were ADDED or MODIFIED (lines starting with `+`).',
    '',
    sections.join('\n\n'),
  ].join('\n');
}

export interface ReasonerOptions {
  apiKey: string;
  model: string;
  maxTokens: number;
  batchSize?: number;
}

/**
 * Invoke Claude on the diff in batches and return validated findings.
 *
 * The reasoner is deliberately conservative: it returns an empty array
 * rather than throwing on API errors so that the static analyzers can
 * still post a review.
 */
export async function reason(changed: ChangedFile[], opts: ReasonerOptions, client?: Anthropic): Promise<Finding[]> {
  const c = client ?? new Anthropic({ apiKey: opts.apiKey });
  const batchSize = opts.batchSize ?? 10;
  const findings: Finding[] = [];

  for (let i = 0; i < changed.length; i += batchSize) {
    const batch = changed.slice(i, i + batchSize);
    try {
      const msg = await c.messages.create({
        model: opts.model,
        max_tokens: opts.maxTokens,
        system: QUALITY_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildPrompt(batch) }],
      });
      const text = extractText(msg);
      const raws = extractJsonArray(text);
      for (const r of raws) {
        const f = normalizeFinding(r, changed);
        if (f) findings.push(f);
      }
    } catch {
      // Skip batch on API error — static analyzers still cover the file.
      continue;
    }
  }
  return findings;
}

interface AnthropicTextBlock {
  type: string;
  text?: string;
}
interface AnthropicMessage {
  content?: AnthropicTextBlock[];
}

/** Pull all text blocks out of an Anthropic SDK message response. */
export function extractText(msg: unknown): string {
  if (!msg || typeof msg !== 'object') return '';
  const content = (msg as AnthropicMessage).content;
  if (!Array.isArray(content)) return '';
  return content
    .filter((c) => c.type === 'text' && typeof c.text === 'string')
    .map((c) => c.text!)
    .join('\n');
}

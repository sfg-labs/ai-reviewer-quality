/**
 * Sample diffs used by integration tests. Kept as TS strings so we can
 * parameterize them; the underlying patches are real (anonymized) output
 * from `git diff -U3`.
 */

export const SIMPLE_TS_PATCH = `@@ -1,3 +1,7 @@
 export const A = 1;
+export function unusedHelper(): number {
+  return 42;
+}
+export const RAW_COLOR = '#0a84ff';
 export const B = 2;`;

export const PATCH_WITH_TODO = `@@ -10,4 +10,6 @@
 function existing() {}
+// TODO: figure out the GST edge case
+export function newFn(u: any) { return u; }
 function alsoExisting() {}`;

export const PATCH_WITH_SUPPRESSION = `@@ -1,3 +1,6 @@
 const A = 1;
+// ai-review-ignore: QUAL.STYLE.002 — vendor SDK requires literal
+const SDK_COLOR = '#0a84ff';
 const B = 2;`;

export const PATCH_DELETION_ONLY = `@@ -1,5 +1,3 @@
 const A = 1;
-const old1 = 1;
-const old2 = 2;
 const B = 2;`;

export const MULTI_HUNK_PATCH = `@@ -1,3 +1,4 @@
 line1
+added at 2
 line2
 line3
@@ -20,2 +21,4 @@
 line20
+added at 22
+added at 23
 line21`;

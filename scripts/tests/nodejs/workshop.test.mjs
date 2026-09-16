import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as museum from "../../../start-museum/nodejs/src/curator.ts";
import * as accessibility from "../../../start-accessibility/nodejs/src/workshop.ts";

for (const [name, helpers] of [["museum", museum], ["accessibility", accessibility]]) {
  test(`${name}: artifact evidence is a changed nonempty regular file`, async () => {
    const directory = await mkdtemp(join(tmpdir(), "workshop-artifact-"));
    try {
      const path = join(directory, "output.html");
      const absent = await helpers.captureArtifactState(directory, "output.html");
      await assert.rejects(helpers.verifyArtifactUpdate(absent), /No output update/);
      await writeFile(path, "");
      await assert.rejects(helpers.verifyArtifactUpdate(absent), /No output update/);
      await writeFile(path, "first");
      await helpers.verifyArtifactUpdate(absent);
      const before = await helpers.captureArtifactState(directory, "output.html");
      await assert.rejects(helpers.verifyArtifactUpdate(before), /No output update/);
      await writeFile(path, "other");
      await helpers.verifyArtifactUpdate(before);
      await mkdir(join(directory, "folder"));
      await assert.rejects(helpers.captureArtifactState(directory, "folder"), /regular file/);
      await symlink(path, join(directory, "link.html"));
      await assert.rejects(helpers.captureArtifactState(directory, "link.html"), /regular file|ELOOP/);
    } finally {
      await rm(directory, { recursive: true });
    }
  });
  test(`${name}: unexpected permission is denied`, () => {
    assert.equal(helpers.denyUnexpectedPermission({ kind: "shell" }, {}).kind, "reject");
  });
}

test("facts and structural checks do not depend on a model", async () => {
  assert.throws(() => museum.boundFacts([]), /at least one/);
  assert.throws(() => museum.boundFacts(Array(21).fill("fact")), /20/);
  assert.throws(() => museum.boundFacts(["x".repeat(501)]), /500/);
  assert.deepEqual(museum.boundFacts([" fact ", ""]), ["fact"]);
  const valid = `# Test exhibit\n## Narrative\n${"gallery ".repeat(110)}\n## Visitor questions\n1. What do you notice?\n2. What would you ask?\n3. What might change?`;
  assert.equal(museum.validateExhibit(valid).valid, true);
  assert.equal(museum.validateExhibit(valid.replace("gallery", "terminal")).valid, false);
  assert.equal(museum.validateExhibit(valid.replace("## Narrative", "Narrative")).valid, false);
  assert.equal(museum.validateExhibit(valid.replace("3. What might change?", "")).valid, false);
  const tool = museum.createApprovedFactLookup(["a fact"]);
  assert.equal(tool.name, museum.approvedFactLookupName);
  assert.equal(tool.skipPermission, true);
});

test("source parsing is not provenance verification", () => {
  assert.deepEqual(museum.extractSources("No sources").sources, []);
  assert.deepEqual(museum.extractSources("## Sources\nmalformed").sources, []);
  const parsed = museum.extractSources("## Sources\n- Unverified: https://example.org/article");
  assert.equal(parsed.sources[0].url, "https://example.org/article");
});

test("permission handlers reject unknown, malformed, and out-of-scope requests", () => {
  const target = new URL("https://example.org/Target?q=One");
  const handler = accessibility.permissionForTarget(target);
  const request = { kind: "mcp", serverName: "playwright", toolName: "browser_navigate", args: { url: target.href } };
  assert.equal(handler(request, {}).kind, "approve-once");
  for (const args of [undefined, null, [], "", { url: "not a URL" }, { url: "https://example.org/target?q=One" }]) {
    assert.equal(handler({ ...request, args }, {}).kind, "reject");
  }
  assert.equal(handler({ ...request, serverName: "other" }, {}).kind, "reject");
  const wikipedia = museum.wikipediaPermissionHandler();
  assert.equal(wikipedia({ kind: "mcp", serverName: "wikipedia", toolName: "search" }, {}).kind, "approve-once");
  assert.equal(wikipedia({ kind: "mcp", serverName: "wikipedia", toolName: "write" }, {}).kind, "reject");
  const write = museum.exhibitWritePermission("/workshop");
  assert.equal(write({ kind: "write", fileName: "exhibit.html" }, {}).kind, "approve-once");
  assert.equal(write({ kind: "write", fileName: "notes.txt" }, {}).kind, "reject");
  assert.equal(write({ kind: "write", fileName: "../exhibit.html" }, {}).kind, "reject");
});

function sessionDouble(outcome) {
  let listener;
  let removals = 0;
  return {
    get removals() { return removals; },
    on(callback) {
      listener = callback;
      return () => { removals++; listener = undefined; };
    },
    async send() {
      if (outcome === "send-error") throw new Error("send failed");
      if (outcome === "idle") queueMicrotask(() => listener?.({ type: "session.idle" }));
      if (outcome === "session-error") queueMicrotask(() => listener?.({ type: "session.error", data: { message: "turn failed" } }));
    },
  };
}

for (const [name, stream] of [["museum", museum.streamExhibit], ["accessibility", accessibility.streamResponse]]) {
  for (const outcome of ["idle", "send-error", "session-error", "timeout"]) {
    test(`${name}: streaming releases subscriptions on ${outcome}`, async () => {
      const session = sessionDouble(outcome);
      const result = stream(session, "test", 10);
      if (outcome === "idle") await result;
      else await assert.rejects(result, /failed|timeout/i);
      assert.equal(session.removals, 1);
    });
  }
}

import test from "node:test";
import assert from "node:assert/strict";

import { hashContent } from "./hash.ts";
import { addItems, registryDependencyName, resolveInstallSet } from "./add.ts";
import type { RegistryItem, RegistrySource } from "./registry-source.ts";
import type { UiLock } from "./lockfile.ts";

const identity = (target: string) => target;
const EMPTY_LOCK: UiLock = { registry: "", items: {} };

function fakeRegistry(items: Record<string, Partial<RegistryItem>>): RegistrySource {
  return async (name) => {
    const item = items[name];
    if (!item) return null;
    return { name, files: [], ...item };
  };
}

function fakeReader(installed: Record<string, string>) {
  return async (path: string) => (path in installed ? installed[path]! : null);
}

/** Records writes instead of touching a filesystem. */
function fakeWriter(written: Record<string, string>) {
  return async (path: string, content: string) => {
    written[path] = content;
  };
}

test("registryDependencyName strips the registry namespace, passes bare names through", () => {
  assert.equal(registryDependencyName("@bydiorama/cn"), "cn");
  assert.equal(registryDependencyName("cn"), "cn");
});

test("resolves transitive registry dependencies, each item once, dependencies first", async () => {
  // A diamond: button and tooltip both need cn; menu needs menu-surface
  // which needs cn too. cn must be installed exactly once, before anything
  // that imports it.
  const registry = fakeRegistry({
    cn: {},
    "menu-surface": { registryDependencies: ["@bydiorama/cn"] },
    button: { registryDependencies: ["@bydiorama/cn"] },
    menu: { registryDependencies: ["@bydiorama/cn", "@bydiorama/menu-surface"] },
  });
  const { items, notFound } = await resolveInstallSet(["button", "menu"], registry);
  assert.deepEqual(notFound, []);
  const names = items.map((i) => i.item.name);
  assert.deepEqual(names, ["cn", "button", "menu-surface", "menu"]);
  assert.ok(names.indexOf("cn") < names.indexOf("button"));
  assert.ok(names.indexOf("menu-surface") < names.indexOf("menu"));
});

test("requested vs pulled-in survives dedup order", async () => {
  // cn is resolved first as button's dependency, then asked for by name.
  // It was requested; being seen as a dependency first must not erase that.
  const registry = fakeRegistry({ cn: {}, button: { registryDependencies: ["@bydiorama/cn"] } });
  const { items } = await resolveInstallSet(["button", "cn"], registry);
  const cn = items.find((i) => i.item.name === "cn")!;
  assert.equal(cn.requested, true);
  const button = items.find((i) => i.item.name === "button")!;
  assert.equal(button.requested, true);
});

test("an unknown requested name is collected; an unknown DEPENDENCY throws", async () => {
  // The caller's typo is their problem to see; a registry item naming a
  // dependency the registry doesn't ship is the registry being broken, and
  // installing around it produces an app that looks installed but cannot
  // compile.
  const typo = await resolveInstallSet(["buton"], fakeRegistry({ button: {} }));
  assert.deepEqual(typo.notFound, ["buton"]);
  assert.deepEqual(typo.items, []);

  await assert.rejects(
    resolveInstallSet(["button"], fakeRegistry({ button: { registryDependencies: ["@bydiorama/ghost"] } })),
    /Registry dependency "ghost" not found/,
  );
});

test("writes missing files, leaves identical files alone", async () => {
  const registry = fakeRegistry({
    button: { files: [{ target: "ui/button.tsx", content: "SOURCE" }, { target: "ui/button.doc.ts", content: "DOC" }] },
  });
  const written: Record<string, string> = {};
  const result = await addItems(
    ["button"],
    registry,
    EMPTY_LOCK,
    fakeReader({ "ui/button.doc.ts": "DOC" }),
    fakeWriter(written),
    identity,
  );
  assert.deepEqual(written, { "ui/button.tsx": "SOURCE" });
  assert.deepEqual(
    result.items[0]!.files,
    [
      { target: "ui/button.tsx", status: "added" },
      { target: "ui/button.doc.ts", status: "unchanged" },
    ],
  );
});

test("a differing installed file is kept, not overwritten — force makes overwriting a stated choice", async () => {
  const registry = fakeRegistry({ button: { files: [{ target: "ui/button.tsx", content: "UPSTREAM" }] } });
  const installed = fakeReader({ "ui/button.tsx": "local edit" });

  const written: Record<string, string> = {};
  const kept = await addItems(["button"], registry, EMPTY_LOCK, installed, fakeWriter(written), identity);
  assert.deepEqual(written, {});
  assert.equal(kept.items[0]!.files[0]!.status, "kept");

  const forced = await addItems(["button"], registry, EMPTY_LOCK, installed, fakeWriter(written), identity, { force: true });
  assert.equal(forced.items[0]!.files[0]!.status, "overwritten");
  assert.deepEqual(written, { "ui/button.tsx": "UPSTREAM" });
});

test("a locked fork is never overwritten — not even with force", async () => {
  // The fork record exists so anything that overwrites files has one boolean
  // to refuse on. `force` means "I know I edited this"; it does not mean
  // "destroy the fork I explicitly declared" — that is resolved by
  // re-locking without the divergence, a separate, deliberate act.
  const registry = fakeRegistry({ badge: { files: [{ target: "ui/badge.tsx", content: "UPSTREAM" }] } });
  const lock: UiLock = {
    registry: "",
    items: {
      badge: {
        revision: "abc",
        lockedAt: "2026-01-01T00:00:00.000Z",
        files: { "ui/badge.tsx": hashContent("my fork") },
        forked: { "ui/badge.tsx": hashContent("what upstream shipped then") },
      },
    },
  };
  const written: Record<string, string> = {};
  const result = await addItems(
    ["badge"],
    registry,
    lock,
    fakeReader({ "ui/badge.tsx": "my fork" }),
    fakeWriter(written),
    identity,
    { force: true },
  );
  assert.deepEqual(written, {});
  assert.equal(result.items[0]!.files[0]!.status, "forked");
});

test("aggregates npm dependencies across the whole install set, deduplicated", async () => {
  const registry = fakeRegistry({
    cn: { dependencies: ["clsx@^2.1.1", "tailwind-merge@^3.6.0"] },
    select: { dependencies: ["@base-ui/react@1.7.0", "griddy-icons@^0.2.0"], registryDependencies: ["@bydiorama/cn"] },
    tooltip: { dependencies: ["@base-ui/react@1.7.0"], registryDependencies: ["@bydiorama/cn"] },
  });
  const result = await addItems(["select", "tooltip"], registry, EMPTY_LOCK, fakeReader({}), fakeWriter({}), identity);
  assert.deepEqual(result.npmDependencies, ["clsx@^2.1.1", "tailwind-merge@^3.6.0", "@base-ui/react@1.7.0", "griddy-icons@^0.2.0"]);
});

test("files are written through the target resolver, not at the raw target", async () => {
  const registry = fakeRegistry({ cn: { files: [{ target: "lib/cn.ts", content: "CN" }] } });
  const written: Record<string, string> = {};
  await addItems(["cn"], registry, EMPTY_LOCK, fakeReader({}), fakeWriter(written), (t) => `src/app/${t}`);
  assert.deepEqual(Object.keys(written), ["src/app/lib/cn.ts"]);
});

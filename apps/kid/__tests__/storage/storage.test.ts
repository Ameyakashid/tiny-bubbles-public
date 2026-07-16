import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  childKey,
  childPrefix,
  isChildKey,
  isTbKey,
  namespacedStoreKey,
} from "../../src/storage/schemaVersion";
import {
  createAsyncStoragePort,
  resetAllTbData,
  resetChildData,
  setStoragePort,
  storage,
} from "../../src/storage/storage";

beforeEach(async () => {
  await AsyncStorage.clear();
  setStoragePort(createAsyncStoragePort()); // ensure the DEFAULT backend
});

afterEach(async () => {
  await AsyncStorage.clear();
});

describe("schemaVersion key helpers", () => {
  it("namespaces bare store names and leaves tb/ keys untouched", () => {
    expect(namespacedStoreKey("meta")).toBe("tb/meta");
    expect(namespacedStoreKey("tb/meta")).toBe("tb/meta");
  });

  it("builds per-child slice keys + recognises ownership", () => {
    expect(childKey("c1", "ledger")).toBe("tb/child/c1/ledger");
    expect(childPrefix("c1")).toBe("tb/child/c1/");
    expect(isTbKey("tb/child/c1/ledger")).toBe(true);
    expect(isTbKey("other/key")).toBe(false);
    expect(isChildKey("tb/child/c1/ledger", "c1")).toBe(true);
    expect(isChildKey("tb/child/c2/ledger", "c1")).toBe(false);
  });
});

describe("AsyncStorage default port", () => {
  it("round-trips a value through the stable facade", async () => {
    await storage.set("tb/meta", JSON.stringify({ hello: "world" }));
    const raw = await storage.getString("tb/meta");
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string)).toEqual({ hello: "world" });
  });

  it("returns null for an absent key and lists all keys", async () => {
    expect(await storage.getString("tb/missing")).toBeNull();
    await storage.set("tb/a", "1");
    await storage.set("tb/b", "2");
    expect((await storage.getAllKeys()).sort()).toEqual(["tb/a", "tb/b"]);
  });

  it("delete removes only the targeted key", async () => {
    await storage.set("tb/a", "1");
    await storage.set("tb/b", "2");
    await storage.delete("tb/a");
    expect(await storage.getString("tb/a")).toBeNull();
    expect(await storage.getString("tb/b")).toBe("2");
  });
});

describe("reset helpers ('delete my data')", () => {
  it("resetAllTbData clears ONLY tb/ keys, leaving foreign keys intact", async () => {
    await storage.set("tb/meta", "m");
    await storage.set("tb/child/c1/ledger", "l");
    // a foreign key written by some other library sharing AsyncStorage:
    await AsyncStorage.setItem("some-other-lib/token", "keep-me");

    const removed = await resetAllTbData();

    expect(removed.sort()).toEqual(["tb/child/c1/ledger", "tb/meta"]);
    expect(await storage.getString("tb/meta")).toBeNull();
    expect(await storage.getString("tb/child/c1/ledger")).toBeNull();
    expect(await AsyncStorage.getItem("some-other-lib/token")).toBe("keep-me");
  });

  it("resetChildData clears only ONE child's keys", async () => {
    await storage.set("tb/meta", "m");
    await storage.set("tb/child/c1/ledger", "l1");
    await storage.set("tb/child/c1/tasks", "t1");
    await storage.set("tb/child/c2/ledger", "l2");

    const removed = await resetChildData("c1");

    expect(removed.sort()).toEqual(["tb/child/c1/ledger", "tb/child/c1/tasks"]);
    expect(await storage.getString("tb/child/c1/ledger")).toBeNull();
    expect(await storage.getString("tb/child/c2/ledger")).toBe("l2");
    expect(await storage.getString("tb/meta")).toBe("m");
  });
});

describe("swappable port", () => {
  it("setStoragePort redirects the stable facade to an in-memory backend", async () => {
    const mem = new Map<string, string>();
    setStoragePort({
      getString: async (k) => (mem.has(k) ? (mem.get(k) as string) : null),
      set: async (k, v) => void mem.set(k, v),
      delete: async (k) => void mem.delete(k),
      getAllKeys: async () => [...mem.keys()],
    });

    await storage.set("tb/meta", "via-mem");
    expect(await storage.getString("tb/meta")).toBe("via-mem");
    // The AsyncStorage backend was never touched.
    expect(await AsyncStorage.getItem("tb/meta")).toBeNull();
  });
});

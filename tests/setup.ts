import "fake-indexeddb/auto";

Object.defineProperty(window, "confirm", { configurable: true, value: () => true });

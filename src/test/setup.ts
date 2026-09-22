import "@testing-library/jest-dom/vitest";

// IndexedDB is not available in jsdom; every test that touches the database
// installs its own fake via `fake-indexeddb`.
import "fake-indexeddb/auto";

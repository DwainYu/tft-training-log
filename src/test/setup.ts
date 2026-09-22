import "@testing-library/jest-dom/vitest";

// IndexedDB is not available in jsdom; every test that touches the database
// installs its own fake via `fake-indexeddb`.
import "fake-indexeddb/auto";

import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Vitest globals are off, so React Testing Library cannot register its own
// auto-cleanup — do it here or components accumulate across tests.
afterEach(cleanup);

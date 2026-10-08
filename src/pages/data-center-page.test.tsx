import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataCenterPage } from "./DataCenterPage";
import { EXTERNAL_RESOURCES, RESOURCE_CATEGORY_LABELS } from "../data/external-resources";
import { renderWithProviders } from "../test/render";

/**
 * The page is a navigation surface over a static catalog, so the tests pin
 * the contract that matters: every catalogued resource is rendered exactly
 * once, opens in a new tab with the safe rel, and the page never claims the
 * content is this app's own data.
 */
const render = () => renderWithProviders(<DataCenterPage />, "/data-center");

describe("Data Center page", () => {
  it("renders one card per catalogued resource, grouped by category", () => {
    render();
    const links = screen.getAllByRole("link");
    // every resource is a link; the page adds no other links
    expect(links).toHaveLength(EXTERNAL_RESOURCES.length);
    for (const r of EXTERNAL_RESOURCES) {
      const link = links.find((l) => l.getAttribute("href") === r.url);
      expect(link, `missing card for ${r.id}`).toBeDefined();
      expect(within(link!).getByText(r.title)).toBeInTheDocument();
      expect(within(link!).getByText(r.description)).toBeInTheDocument();
    }
  });

  it("opens external sites in a new tab with a safe rel", () => {
    render();
    for (const link of screen.getAllByRole("link")) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link.getAttribute("rel")?.split(" ")).toEqual(
        expect.arrayContaining(["noopener", "noreferrer"]),
      );
    }
  });

  it("renders every declared category section with its label", () => {
    render();
    for (const label of Object.values(RESOURCE_CATEGORY_LABELS)) {
      expect(screen.getByRole("region", { name: label })).toBeInTheDocument();
    }
  });

  it("says the content belongs to third parties, not to this app's database", () => {
    render();
    expect(screen.getByText(/内容由第三方网站维护/)).toBeInTheDocument();
    expect(screen.getByText(/不抓取、不内嵌/)).toBeInTheDocument();
  });
});

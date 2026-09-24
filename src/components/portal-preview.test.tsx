import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { portals } from "@/config/site";

import { PortalPreview } from "./portal-preview";

describe("PortalPreview", () => {
  it.each(portals)("labels the $role dashboard as a preview and lists its planned sections", (portal) => {
    render(<PortalPreview role={portal.role} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(`${portal.label} dashboard`);
    expect(screen.getByRole("note")).toHaveTextContent("still being built");
    for (const section of portal.plannedSections) {
      expect(screen.getByText(section)).toBeInTheDocument();
    }
  });
});

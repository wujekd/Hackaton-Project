import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { mockViewportWidth } from "../test/matchMedia";
import Messages from "./Messages";

function renderMessages(route: string, width: number) {
  mockViewportWidth(width);

  const router = createMemoryRouter(
    [
      { path: "/messages", element: <Messages /> },
      { path: "/messages/:conversationId", element: <Messages /> },
    ],
    { initialEntries: [route] },
  );

  return render(<RouterProvider router={router} />);
}

describe("Messages responsive flow", () => {
  it("uses a two-step list-to-thread flow on mobile", async () => {
    renderMessages("/messages", 375);

    expect(screen.getByText("Conversations")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Back" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: /Jamie Kim/i }));

    expect(await screen.findByRole("link", { name: "Back" })).toBeInTheDocument();
    expect(screen.getByText("Jamie Kim")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "Back" }));

    expect(await screen.findByText("Conversations")).toBeInTheDocument();
  });

  it("keeps split list and thread visible on desktop", () => {
    renderMessages("/messages", 1280);

    expect(screen.getByText("Conversations")).toBeInTheDocument();
    expect(screen.getByText("Collab AI Assistant")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Back" })).not.toBeInTheDocument();
  });
});

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { User } from "firebase/auth";
import { MemoryRouter } from "react-router-dom";
import MyAccount from "./MyAccount";
import { useAuthStore } from "../stores/auth.store";
import { useThemeStore } from "../stores/theme.store";

vi.mock("../services/collaboration.service", () => ({
  CollaborationService: {
    getByAuthor: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("../services/event.service", () => ({
  EventService: {
    getProposalsByAuthor: vi.fn().mockResolvedValue([]),
  },
}));

describe("MyAccount theme settings", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";

    act(() => {
      useThemeStore.setState({
        hydrated: true,
        preference: "system",
        resolvedTheme: "light",
      });

      useAuthStore.setState((state) => ({
        ...state,
        user: { uid: "user-1", email: "alex@example.com" } as unknown as User,
        profile: {
          uid: "user-1",
          email: "alex@example.com",
          username: "Alex",
          themePreference: "system",
          createdAt: {} as never,
        },
        loading: false,
        updateThemePreference: vi.fn().mockResolvedValue(undefined),
      }));
    });
  });

  afterEach(() => {
    act(() => {
      useAuthStore.setState((state) => ({
        ...state,
        user: null,
        profile: null,
        loading: false,
      }));
    });
  });

  it("updates the theme from the account settings control", async () => {
    render(
      <MemoryRouter>
        <MyAccount />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Dark" }));

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("dark");
      expect(window.localStorage.getItem("mdx-theme-preference")).toBe("dark");
    });
  });
});

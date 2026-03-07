import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { User } from "firebase/auth";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import Layout from "./Layout";
import { FeedbackService } from "../services/feedback.service";
import { useAuthStore } from "../stores/auth.store";
import { useMessagingStore } from "../stores/messaging.store";
import { useThemeStore } from "../stores/theme.store";
import { mockViewportWidth } from "../test/matchMedia";

vi.mock("../services/feedback.service", () => ({
  FeedbackService: {
    create: vi.fn().mockResolvedValue(undefined),
  },
}));

interface RenderLayoutOptions {
  route?: string;
  width?: number;
  admin?: boolean;
  signedIn?: boolean;
  unreadTotal?: number;
}

function renderLayout({
  route = "/",
  width = 375,
  admin = false,
  signedIn = true,
  unreadTotal = 0,
}: RenderLayoutOptions = {}) {
  mockViewportWidth(width);

  const user = signedIn
    ? ({ uid: "user-1", email: "alex@example.com" } as unknown as User)
    : null;

  act(() => {
    useAuthStore.setState((state) => ({
      ...state,
      user,
      profile: signedIn
        ? {
            uid: "user-1",
            email: "alex@example.com",
            username: "Alex",
            admin,
            createdAt: {} as never,
          }
        : null,
      loading: false,
      updateThemeSelection: vi.fn().mockResolvedValue(undefined),
      updateCustomThemes: vi.fn().mockResolvedValue(undefined),
    }));

    useMessagingStore.setState((state) => ({
      ...state,
      unreadTotal,
      listenConversations: vi.fn(),
      stopAll: vi.fn(),
    }));

    useThemeStore.setState({
      hydrated: true,
      preference: "system",
      resolvedTheme: "light",
      customThemes: [],
      activeCustomThemeId: null,
    });
  });

  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: <Layout />,
        children: [
          { index: true, element: <div>Home view</div> },
          { path: "collaborations", element: <div>Collabs view</div> },
          { path: "events", element: <div>Events view</div> },
          { path: "messages", element: <div>Messages view</div> },
          { path: "account", element: <div>Account view</div> },
          { path: "appearance", element: <div>Appearance view</div> },
          { path: "admin/moderation", element: <div>Moderation view</div> },
          { path: "login", element: <div>Login view</div> },
        ],
      },
    ],
    { initialEntries: [route] },
  );

  return render(<RouterProvider router={router} />);
}

describe("Layout mobile shell", () => {
  afterEach(() => {
    vi.clearAllMocks();

    act(() => {
      useAuthStore.setState((state) => ({
        ...state,
        user: null,
        profile: null,
        loading: false,
        updateThemeSelection: vi.fn().mockResolvedValue(undefined),
        updateCustomThemes: vi.fn().mockResolvedValue(undefined),
      }));

      useMessagingStore.setState((state) => ({
        ...state,
        unreadTotal: 0,
        listenConversations: vi.fn(),
        stopAll: vi.fn(),
      }));

      useThemeStore.setState({
        hydrated: false,
        preference: "system",
        resolvedTheme: "light",
        customThemes: [],
        activeCustomThemeId: null,
      });
    });
  });

  it("renders bottom tabs on mobile and hides desktop sidebar", () => {
    renderLayout({ width: 375 });

    expect(screen.getByRole("navigation", { name: "Primary mobile navigation" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Primary sidebar" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More" })).toBeInTheDocument();
  });

  it("opens and closes the mobile more sheet with keyboard", () => {
    renderLayout({ width: 390, admin: false });

    const dialog = screen.getByRole("dialog", { name: "More options" });
    const moreButton = screen.getByRole("button", { name: "More" });

    expect(dialog).not.toHaveClass("open");
    fireEvent.click(moreButton);
    expect(dialog).toHaveClass("open");
    expect(screen.queryByText("Moderation")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Appearance" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(dialog).not.toHaveClass("open");
  });

  it("shows moderation link for admins in more sheet", () => {
    renderLayout({ width: 390, admin: true });

    fireEvent.click(screen.getByRole("button", { name: "More" }));

    expect(screen.getByRole("link", { name: "Moderation" })).toBeInTheDocument();
  });

  it("renders desktop sidebar on desktop width", () => {
    renderLayout({ width: 1280 });

    expect(screen.getByRole("navigation", { name: "Primary sidebar" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Primary mobile navigation" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Appearance" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Help Us Improve!/i })).toBeInTheDocument();
  });

  it("shows unread badge count from messaging store", () => {
    renderLayout({ width: 1280, unreadTotal: 7 });

    const sidebar = screen.getByRole("navigation", { name: "Primary sidebar" });
    expect(sidebar).toHaveTextContent("7");
  });

  it("lets users switch theme from the mobile more sheet", () => {
    renderLayout({ width: 390 });

    fireEvent.click(screen.getByRole("button", { name: "More" }));
    fireEvent.click(screen.getByRole("button", { name: "Dark" }));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem("mdx-theme-preference")).toBe("dark");
  });

  it("prefills the feedback subject from the current route", () => {
    renderLayout({ route: "/appearance", width: 1280 });

    fireEvent.click(screen.getByRole("button", { name: /Help Us Improve!/i }));

    expect(screen.getByRole("dialog", { name: "Help us improve MDX Collab" })).toBeInTheDocument();
    expect(screen.getByLabelText("Subject")).toHaveValue("Appearance");
  });

  it("submits feedback and shows a confirmation notice", async () => {
    const createFeedback = vi.mocked(FeedbackService.create);
    renderLayout({ route: "/messages", width: 1280 });

    fireEvent.click(screen.getByRole("button", { name: /Help Us Improve!/i }));
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "The message list needs stronger unread contrast." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send Feedback" }));

    await waitFor(() => {
      expect(createFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Messages",
          route: "/messages",
          message: "The message list needs stronger unread contrast.",
        }),
      );
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Help us improve MDX Collab" })).not.toBeInTheDocument();
    });

    expect(screen.getByRole("status")).toHaveTextContent("Thanks for sharing feedback about Messages.");
  });
});

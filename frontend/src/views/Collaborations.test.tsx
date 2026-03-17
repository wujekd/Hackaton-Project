import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { User } from "firebase/auth";
import { MemoryRouter } from "react-router-dom";
import Collaborations from "./Collaborations";
import { CollaborationService } from "../services/collaboration.service";
import { useAuthStore } from "../stores/auth.store";

vi.mock("../components/CollabListItem", () => ({
  default: ({ collab }: { collab: { title: string } }) => <div data-testid="collab-item">{collab.title}</div>,
}));

vi.mock("../services/collaboration.service", () => ({
  CollaborationService: {
    getAll: vi.fn(),
  },
}));

describe("Collaborations", () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.setState((state) => ({
        ...state,
        user: { uid: "user-1", email: "alex@example.com" } as unknown as User,
        profile: {
          uid: "user-1",
          email: "alex@example.com",
          username: "Alex",
          createdAt: {} as never,
        },
        loading: false,
      }));
    });

    vi.mocked(CollaborationService.getAll).mockResolvedValue([
      {
        id: "collab-1",
        title: "Music Producer Needed",
        description: "Looking for mixing help on a student EP.",
        authorId: "user-2",
        authorName: "Jamie",
        collaborators: [],
        tags: ["Music", "Production"],
        files: [],
        thumbnailUrl: null,
        mediaDefaultY: 50,
        mediaMinY: 14,
        mediaMaxY: 86,
        createdAt: {} as never,
        updatedAt: {} as never,
      },
      {
        id: "collab-2",
        title: "Short Film Editor",
        description: "Need an editor for a campus documentary.",
        authorId: "user-3",
        authorName: "Chris",
        collaborators: [],
        tags: ["Film & Media"],
        files: [],
        thumbnailUrl: null,
        mediaDefaultY: 50,
        mediaMinY: 14,
        mediaMaxY: 86,
        createdAt: {} as never,
        updatedAt: {} as never,
      },
    ]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("filters loaded collaborations by the selected topic", async () => {
    render(
      <MemoryRouter>
        <Collaborations />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(CollaborationService.getAll).toHaveBeenCalledTimes(1);
    });

    expect(screen.getAllByTestId("collab-item")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Music" }));

    expect(screen.getAllByText("Music Producer Needed").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("collab-item")).toHaveLength(1);
    expect(screen.getByTestId("collab-item")).toHaveTextContent("Music Producer Needed");
    expect(CollaborationService.getAll).toHaveBeenCalledTimes(1);
  });
});

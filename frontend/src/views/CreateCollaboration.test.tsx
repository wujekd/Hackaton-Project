import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { User } from "firebase/auth";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CreateCollaboration from "./CreateCollaboration";
import { CollaborationService } from "../services/collaboration.service";
import { useAuthStore } from "../stores/auth.store";

vi.mock("../components/CollabListItem", () => ({
  default: () => <div data-testid="collab-preview">Preview</div>,
}));

vi.mock("../components/TagInput", () => ({
  default: () => <div data-testid="tag-input" />,
}));

vi.mock("../services/collaboration.service", () => ({
  CollaborationService: {
    getById: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
}));

describe("CreateCollaboration delete confirmation", () => {
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
        updateThemeSelection: vi.fn().mockResolvedValue(undefined),
        updateCustomThemes: vi.fn().mockResolvedValue(undefined),
      }));
    });

    vi.mocked(CollaborationService.getById).mockResolvedValue({
      id: "collab-1",
      authorId: "user-1",
      authorName: "Alex",
      title: "Test collab",
      description: "A collab description",
      collaborators: [],
      tags: ["music"],
      files: [],
      thumbnailUrl: null,
      mediaDefaultY: 50,
      mediaMinY: 14,
      mediaMaxY: 86,
      createdAt: {} as never,
      updatedAt: {} as never,
    });
    vi.mocked(CollaborationService.delete).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("opens a themed confirmation dialog before deleting", async () => {
    render(
      <MemoryRouter initialEntries={["/collaborations/collab-1/edit"]}>
        <Routes>
          <Route path="/collaborations/:collaborationId/edit" element={<CreateCollaboration />} />
          <Route path="/account" element={<div>Account</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(CollaborationService.getById).toHaveBeenCalledWith("collab-1");
    });

    fireEvent.click(screen.getByRole("button", { name: "Delete Colaboration" }));

    expect(screen.getByRole("dialog", { name: "Delete this collaboration?" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete collaboration" }));

    await waitFor(() => {
      expect(CollaborationService.delete).toHaveBeenCalledWith("collab-1");
    });
  });
});

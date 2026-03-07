import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Moderation from "./Moderation";
import { EventService } from "../services/event.service";
import { FeedbackService } from "../services/feedback.service";
import { PollService } from "../services/poll.service";
import { useAuthStore } from "../stores/auth.store";
import { CollaborationService } from "../services/collaboration.service";

vi.mock("../services/event.service", () => ({
  EventService: {
    getPendingProposals: vi.fn(),
    getAllEvents: vi.fn(),
    deleteEventAsAdmin: vi.fn(),
    approveProposal: vi.fn(),
    rejectProposal: vi.fn(),
  },
}));

vi.mock("../services/poll.service", () => ({
  PollService: {
    listPolls: vi.fn(),
    createPoll: vi.fn(),
    publishPoll: vi.fn(),
    closePoll: vi.fn(),
  },
}));

vi.mock("../services/feedback.service", () => ({
  FeedbackService: {
    list: vi.fn(),
  },
}));

vi.mock("../services/collaboration.service", () => ({
  CollaborationService: {
    listPage: vi.fn(),
  },
}));

describe("Moderation delete event confirmation", () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.setState((state) => ({
        ...state,
        user: null,
        profile: {
          uid: "admin-1",
          email: "admin@example.com",
          username: "Admin",
          admin: true,
          createdAt: {} as never,
        },
        loading: false,
        updateThemeSelection: vi.fn().mockResolvedValue(undefined),
        updateCustomThemes: vi.fn().mockResolvedValue(undefined),
      }));
    });

    vi.mocked(EventService.getPendingProposals).mockResolvedValue([]);
    vi.mocked(EventService.getAllEvents).mockResolvedValue([
      {
        id: "event-1",
        name: "Spring Jam",
        description: "Open campus session",
        date: "2026-03-20T18:00:00.000Z",
        imageUrl: "",
      },
    ] as never);
    vi.mocked(EventService.deleteEventAsAdmin).mockResolvedValue(0);
    vi.mocked(PollService.listPolls).mockResolvedValue([]);
    vi.mocked(FeedbackService.list).mockResolvedValue([]);
    vi.mocked(CollaborationService.listPage).mockResolvedValue({
      items: [],
      cursor: null,
      hasMore: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("uses the themed confirmation dialog before deleting an event", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/moderation"]}>
        <Routes>
          <Route path="/admin/moderation" element={<Moderation />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Spring Jam")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete Event" }));

    expect(screen.getByRole("dialog", { name: 'Delete "Spring Jam"?' })).toBeInTheDocument();
    expect(screen.getByText("This will also remove every user's signup for this event.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete event" }));

    await waitFor(() => {
      expect(EventService.deleteEventAsAdmin).toHaveBeenCalledWith("event-1");
    });
  });
});

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
    updateStatus: vi.fn(),
    delete: vi.fn(),
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
    vi.mocked(FeedbackService.updateStatus).mockResolvedValue();
    vi.mocked(FeedbackService.delete).mockResolvedValue();
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

  it("shows only unaddressed feedback by default and lets admins address it", async () => {
    vi.mocked(FeedbackService.list).mockResolvedValue([
      {
        id: "feedback-1",
        uid: "user-1",
        userName: "Alex",
        userEmail: "alex@example.com",
        subject: "Home",
        message: "Please improve the landing page copy.",
        route: "/",
        contextLabel: "Home",
        createdAt: "2026-03-07T18:31:00.000Z",
        addressed: false,
        addressedAt: null,
      },
      {
        id: "feedback-2",
        uid: "user-2",
        userName: "Sam",
        userEmail: "sam@example.com",
        subject: "General Feedback",
        message: "Already handled.",
        route: "/admin/moderation",
        contextLabel: "General Feedback",
        createdAt: "2026-03-07T18:30:00.000Z",
        addressed: true,
        addressedAt: "2026-03-07T18:40:00.000Z",
      },
    ] as never);

    render(
      <MemoryRouter initialEntries={["/admin/moderation"]}>
        <Routes>
          <Route path="/admin/moderation" element={<Moderation />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Feedback" }));

    expect(await screen.findByText("Please improve the landing page copy.")).toBeInTheDocument();
    expect(screen.queryByText("Already handled.")).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mark Addressed" }));

    await waitFor(() => {
      expect(FeedbackService.updateStatus).toHaveBeenCalledWith("feedback-1", true);
    });

    expect(screen.getByText("No unaddressed feedback right now.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Addressed" }));

    expect(await screen.findByText("Already handled.")).toBeInTheDocument();
    expect(screen.getByText("Please improve the landing page copy.")).toBeInTheDocument();
  });

  it("uses the confirmation dialog before deleting feedback", async () => {
    vi.mocked(FeedbackService.list).mockResolvedValue([
      {
        id: "feedback-1",
        uid: "user-1",
        userName: "Alex",
        userEmail: "alex@example.com",
        subject: "Home",
        message: "Delete me",
        route: "/",
        contextLabel: "Home",
        createdAt: "2026-03-07T18:31:00.000Z",
        addressed: false,
        addressedAt: null,
      },
    ] as never);

    render(
      <MemoryRouter initialEntries={["/admin/moderation"]}>
        <Routes>
          <Route path="/admin/moderation" element={<Moderation />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Feedback" }));
    expect(await screen.findByText("Delete me")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete Feedback" }));

    expect(screen.getByRole("dialog", { name: 'Delete "Home"?' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete feedback" }));

    await waitFor(() => {
      expect(FeedbackService.delete).toHaveBeenCalledWith("feedback-1");
    });
  });
});

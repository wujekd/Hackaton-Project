import { act, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import type { User } from "firebase/auth";
import VerifyEmail from "./VerifyEmail";
import { useAuthStore } from "../stores/auth.store";

describe("VerifyEmail", () => {
  afterEach(() => {
    act(() => {
      useAuthStore.setState((state) => ({
        ...state,
        user: null,
        profile: null,
        loading: false,
        isEmailVerified: false,
        canAccessVerifiedFeatures: false,
        resendVerificationEmail: async () => undefined,
        refreshVerificationStatus: async () => false,
        signOut: async () => undefined,
      }));
    });
  });

  it("refreshes verification state automatically after returning from the email link", async () => {
    const refreshVerificationStatus = vi.fn().mockResolvedValue(false);

    act(() => {
      useAuthStore.setState((state) => ({
        ...state,
        user: { uid: "user-1", email: "alex@example.com", emailVerified: false } as User,
        profile: {
          uid: "user-1",
          email: "alex@example.com",
          createdAt: {} as never,
        },
        loading: false,
        isEmailVerified: false,
        canAccessVerifiedFeatures: false,
        resendVerificationEmail: async () => undefined,
        refreshVerificationStatus,
        signOut: async () => undefined,
      }));
    });

    const router = createMemoryRouter(
      [
        { path: "/verify-email", element: <VerifyEmail /> },
        { path: "/login", element: <div>Login</div> },
      ],
      { initialEntries: ["/verify-email?verified=1"] },
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(refreshVerificationStatus).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText("Your email is still unverified. Finish the link in your inbox, then try again."))
      .toBeInTheDocument();
  });
});

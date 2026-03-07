import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import ConfirmDialog from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  it("renders themed confirmation copy and handles cancel actions", () => {
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        isOpen
        title="Delete item?"
        message="This action cannot be undone."
        onCancel={onCancel}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Delete item?" })).toHaveClass("theme-surface");
    expect(screen.getByText("This action cannot be undone.")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

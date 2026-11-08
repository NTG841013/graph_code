import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useOrganizationList: vi.fn(),
  createOrganization: vi.fn(),
  setActive: vi.fn(),
  replace: vi.fn(),
  fetchPrevious: vi.fn(),
  fetchNext: vi.fn(),
  revalidate: vi.fn(),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: mocks.useAuth,
  useOrganizationList: mocks.useOrganizationList,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

import { OrganizationSetup } from "./organization-setup";

function createMembershipState(
  data: { organization: { id: string; name: string } }[] = [],
) {
  return {
    data,
    count: data.length,
    isLoading: false,
    isFetching: false,
    isError: false,
    error: undefined as { message: string } | undefined,
    revalidate: mocks.revalidate,
    page: 1,
    pageCount: 1,
    hasPreviousPage: false,
    hasNextPage: false,
    fetchPrevious: mocks.fetchPrevious,
    fetchNext: mocks.fetchNext,
  };
}

function setOrganizationList(
  userMemberships = createMembershipState(),
) {
  mocks.useOrganizationList.mockReturnValue({
    isLoaded: true,
    createOrganization: mocks.createOrganization,
    setActive: mocks.setActive,
    userMemberships,
  });
}

describe("OrganizationSetup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuth.mockReturnValue({ orgId: null });
    mocks.createOrganization.mockResolvedValue({
      id: "created-org",
      name: "Acme",
    });
    mocks.setActive.mockResolvedValue(undefined);
    setOrganizationList();
  });

  it("AC-3, AC-10: trims a valid name, activates the created organization, and returns to the requested path", async () => {
    const user = userEvent.setup();
    render(<OrganizationSetup returnTo="/repo/example?view=files" />);

    await user.type(
      screen.getByRole("textbox", { name: "Organization name" }),
      "  Acme  ",
    );
    await user.click(
      screen.getByRole("button", { name: "Create organization" }),
    );

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith("/repo/example?view=files");
    });
    expect(mocks.createOrganization).toHaveBeenCalledWith({ name: "Acme" });
    expect(mocks.setActive).toHaveBeenCalledWith({
      organization: "created-org",
    });
  });

  it("AC-3, AC-10: rejects a whitespace only name without calling Clerk", async () => {
    const user = userEvent.setup();
    render(<OrganizationSetup returnTo="/" />);

    await user.type(
      screen.getByRole("textbox", { name: "Organization name" }),
      "   ",
    );
    await user.click(
      screen.getByRole("button", { name: "Create organization" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enter an organization name.",
    );
    expect(mocks.createOrganization).not.toHaveBeenCalled();
  });

  it("AC-3, AC-10: preserves the entered name and shows Clerk creation errors", async () => {
    mocks.createOrganization.mockRejectedValue(
      new Error("The organization name is too long."),
    );
    const user = userEvent.setup();
    render(<OrganizationSetup returnTo="/" />);
    const nameInput = screen.getByRole("textbox", {
      name: "Organization name",
    });

    await user.type(nameInput, "A long name");
    await user.click(
      screen.getByRole("button", { name: "Create organization" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The organization name is too long.",
    );
    expect(nameInput).toHaveValue("A long name");
  });

  it("AC-3, AC-10: retries activation without creating the organization again", async () => {
    mocks.setActive.mockRejectedValueOnce(new Error("Activation unavailable."));
    const user = userEvent.setup();
    render(<OrganizationSetup returnTo="/repo" />);

    await user.type(
      screen.getByRole("textbox", { name: "Organization name" }),
      "Acme",
    );
    await user.click(
      screen.getByRole("button", { name: "Create organization" }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Acme is created and needs activation.",
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Activation unavailable.",
    );
    expect(mocks.createOrganization).toHaveBeenCalledTimes(1);

    await user.click(
      screen.getByRole("button", { name: "Retry activation" }),
    );

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith("/repo");
    });
    expect(mocks.createOrganization).toHaveBeenCalledTimes(1);
  });

  it("AC-3, AC-10: follows Clerk membership order and selects the chosen organization", async () => {
    const user = userEvent.setup();
    const memberships = createMembershipState([
      { organization: { id: "org-a", name: "Alpha" } },
      { organization: { id: "org-b", name: "Beta" } },
    ]);
    memberships.pageCount = 2;
    memberships.hasNextPage = true;
    memberships.hasPreviousPage = true;
    setOrganizationList(memberships);
    render(<OrganizationSetup returnTo="/repo" />);

    const rows = screen.getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("Alpha"),
      expect.stringContaining("Beta"),
    ]);
    expect(screen.getByRole("navigation", { name: "Organization pages" }))
      .toBeInTheDocument();

    await user.click(within(rows[1]!).getByRole("button", { name: "Select" }));

    await waitFor(() => {
      expect(mocks.setActive).toHaveBeenCalledWith({ organization: "org-b" });
      expect(mocks.replace).toHaveBeenCalledWith("/repo");
    });
  });

  it("AC-10: lets the user retry a failed membership load", async () => {
    const user = userEvent.setup();
    const memberships = createMembershipState();
    memberships.isError = true;
    memberships.error = { message: "Memberships are unavailable." };
    setOrganizationList(memberships);
    render(<OrganizationSetup returnTo="/" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Memberships are unavailable.",
    );
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(mocks.revalidate).toHaveBeenCalledTimes(1);
  });

  it("AC-10: announces loading while membership data is unavailable", () => {
    const memberships = createMembershipState();
    memberships.isLoading = true;
    setOrganizationList(memberships);
    render(<OrganizationSetup returnTo="/" />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading your organizations",
    );
  });
});

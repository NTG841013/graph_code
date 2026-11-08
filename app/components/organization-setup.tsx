"use client";

import { useAuth, useOrganizationList } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

type OrganizationSetupProps = {
  returnTo: string;
};

type PendingActivation = {
  id: string;
  name: string;
};

type PendingOperation = "selecting" | "creating" | "activating" | null;

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "The request did not complete. Try again.";
}

export function OrganizationSetup({ returnTo }: OrganizationSetupProps) {
  const router = useRouter();
  const { orgId } = useAuth();
  const { isLoaded, createOrganization, setActive, userMemberships } =
    useOrganizationList({
      userMemberships: {
        pageSize: 10,
      },
    });
  const [organizationName, setOrganizationName] = useState("");
  const [pendingOperation, setPendingOperation] =
    useState<PendingOperation>(null);
  const [pendingActivation, setPendingActivation] =
    useState<PendingActivation | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);

  if (!isLoaded || !createOrganization || !setActive || userMemberships.isLoading) {
    return (
      <p
        className="rounded-md border border-border bg-surface p-4 text-sm text-muted"
        role="status"
        aria-live="polite"
      >
        Loading your organizations…
      </p>
    );
  }

  async function selectOrganization(organizationId: string) {
    setPendingOperation("selecting");
    setOperationError(null);

    try {
      if (!setActive) {
        throw new Error("Organization selection is not available yet.");
      }

      await setActive({ organization: organizationId });
      router.replace(returnTo);
    } catch (error) {
      setOperationError(getErrorMessage(error));
    } finally {
      setPendingOperation(null);
    }
  }

  async function activateCreatedOrganization(organization: PendingActivation) {
    setPendingOperation("activating");
    setOperationError(null);

    try {
      if (!setActive) {
        throw new Error("Organization activation is not available yet.");
      }

      await setActive({ organization: organization.id });
      setPendingActivation(null);
      router.replace(returnTo);
    } catch (error) {
      setOperationError(
        `“${organization.name}” was created, but it could not be activated. ${getErrorMessage(error)}`,
      );
    } finally {
      setPendingOperation(null);
    }
  }

  async function createOrganizationFromForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = organizationName.trim();

    if (!name) {
      setOperationError("Enter an organization name.");
      return;
    }

    setPendingOperation("creating");
    setOperationError(null);

    try {
      if (!createOrganization) {
        throw new Error("Organization creation is not available yet.");
      }

      const organization = await createOrganization({ name });
      const created = { id: organization.id, name: organization.name };
      setPendingActivation(created);
      await activateCreatedOrganization(created);
    } catch (error) {
      setOperationError(getErrorMessage(error));
      setPendingOperation(null);
    }
  }

  async function retryMemberships() {
    setOperationError(null);

    try {
      if (!userMemberships.revalidate) {
        throw new Error("Organization loading cannot be retried yet.");
      }

      await userMemberships.revalidate();
    } catch (error) {
      setOperationError(getErrorMessage(error));
    }
  }

  const isBusy =
    pendingOperation !== null ||
    userMemberships.isFetching ||
    userMemberships.isLoading;
  const membershipError = userMemberships.isError
    ? userMemberships.error?.message ?? "Organizations could not be loaded."
    : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
      <section
        className="rounded-lg border border-border bg-background p-4 sm:p-5"
        aria-labelledby="organizations-heading"
      >
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-muted">
              Organization access
            </p>
            <h2
              id="organizations-heading"
              className="mt-1 text-lg font-semibold"
            >
              Your organizations
            </h2>
          </div>
          <p className="font-mono text-xs text-muted">
            {userMemberships.count} total
          </p>
        </div>

        {membershipError ? (
          <div className="rounded-md border border-border bg-surface p-4">
            <p className="text-sm text-danger" role="alert">
              {membershipError}
            </p>
            <button
              type="button"
              className="mt-3 min-h-11 rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 focus-visible:outline focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={retryMemberships}
              disabled={isBusy}
            >
              Try again
            </button>
          </div>
        ) : userMemberships.data.length === 0 ? (
          <p className="rounded-md bg-surface p-4 text-sm text-muted">
            You do not belong to an organization yet. Create one to continue.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {userMemberships.data.map((membership) => {
              const isActive = membership.organization.id === orgId;

              return (
                <li
                  key={membership.organization.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {membership.organization.name}
                    </p>
                    <p className="font-mono text-xs text-muted">
                      {isActive ? "Active organization" : "Organization"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="min-h-11 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-surface focus-visible:outline focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() =>
                      void selectOrganization(membership.organization.id)
                    }
                    disabled={isBusy || isActive}
                  >
                    {isActive
                      ? "Selected"
                      : pendingOperation === "selecting"
                        ? "Selecting…"
                        : "Select"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {userMemberships.isFetching && !userMemberships.isLoading ? (
          <p
            className="mt-3 text-xs text-muted"
            role="status"
            aria-live="polite"
          >
            Loading organization memberships…
          </p>
        ) : null}

        {!membershipError && userMemberships.pageCount > 1 ? (
          <nav
            className="mt-5 flex items-center justify-between border-t border-border pt-3"
            aria-label="Organization pages"
          >
            <button
              type="button"
              className="min-h-11 rounded-md px-3 py-2 text-sm font-medium text-accent hover:bg-surface focus-visible:outline focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={userMemberships.fetchPrevious}
              disabled={!userMemberships.hasPreviousPage || isBusy}
            >
              Previous
            </button>
            <span className="font-mono text-xs text-muted" aria-live="polite">
              Page {userMemberships.page} of {userMemberships.pageCount}
            </span>
            <button
              type="button"
              className="min-h-11 rounded-md px-3 py-2 text-sm font-medium text-accent hover:bg-surface focus-visible:outline focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={userMemberships.fetchNext}
              disabled={!userMemberships.hasNextPage || isBusy}
            >
              Next
            </button>
          </nav>
        ) : null}
      </section>

      <section
        className="rounded-lg border border-border bg-background p-4 sm:p-5"
        aria-labelledby="create-organization-heading"
      >
        <p className="font-mono text-xs uppercase tracking-widest text-muted">
          New workspace
        </p>
        <h2
          id="create-organization-heading"
          className="mt-1 text-lg font-semibold"
        >
          Create an organization
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Organization context keeps Graphcode work with your team.
        </p>

        <form className="mt-5 space-y-3" onSubmit={createOrganizationFromForm}>
          <label
            className="block text-sm font-medium"
            htmlFor="organization-name"
          >
            Organization name
          </label>
          <input
            id="organization-name"
            name="organizationName"
            className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus-visible:outline focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2"
            value={organizationName}
            onChange={(event) => {
              setOrganizationName(event.currentTarget.value);
              setOperationError(null);
            }}
            autoComplete="organization"
            required
            disabled={isBusy || pendingActivation !== null}
          />
          <button
            type="submit"
            className="min-h-11 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 focus-visible:outline focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBusy || pendingActivation !== null}
          >
            {pendingOperation === "creating"
              ? "Creating…"
              : "Create organization"}
          </button>
        </form>

        {pendingActivation ? (
          <div className="mt-4 rounded-md border border-border bg-surface p-4">
            <p className="text-sm text-foreground" role="status">
              {pendingActivation.name} is created and needs activation.
            </p>
            <button
              type="button"
              className="mt-3 min-h-11 rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 focus-visible:outline focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() =>
                void activateCreatedOrganization(pendingActivation)
              }
              disabled={isBusy}
            >
              {pendingOperation === "activating"
                ? "Activating…"
                : "Retry activation"}
            </button>
          </div>
        ) : null}

        {operationError ? (
          <p className="mt-4 text-sm text-danger" role="alert">
            {operationError}
          </p>
        ) : null}
      </section>
    </div>
  );
}

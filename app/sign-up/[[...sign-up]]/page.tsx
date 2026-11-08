import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";
import { AuthShell } from "@/app/components/auth-shell";
import { getValidatedReturnTo } from "@/app/lib/return-to";

type SignUpPageProps = {
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

export default function SignUpPage({ searchParams }: SignUpPageProps) {
  return (
    <Suspense
      fallback={
        <AuthShell mode="sign-up" returnTo="/">
          <p className="py-6 text-sm text-muted" role="status">
            Loading sign up
          </p>
        </AuthShell>
      }
    >
      <SignUpContent searchParams={searchParams} />
    </Suspense>
  );
}

async function SignUpContent({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  const returnTo = getValidatedReturnTo(params.returnTo) ?? "/";

  return (
    <AuthShell mode="sign-up" returnTo={returnTo}>
      <SignUp
        forceRedirectUrl={returnTo}
        signInUrl={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`}
      />
    </AuthShell>
  );
}

import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";
import { AuthShell } from "@/app/components/auth-shell";
import { getValidatedReturnTo } from "@/app/lib/return-to";

type SignInPageProps = {
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

export default function SignInPage({ searchParams }: SignInPageProps) {
  return (
    <Suspense
      fallback={
        <AuthShell mode="sign-in" returnTo="/">
          <p className="py-6 text-sm text-muted" role="status">
            Loading sign in
          </p>
        </AuthShell>
      }
    >
      <SignInContent searchParams={searchParams} />
    </Suspense>
  );
}

async function SignInContent({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const returnTo = getValidatedReturnTo(params.returnTo) ?? "/";

  return (
    <AuthShell mode="sign-in" returnTo={returnTo}>
      <SignIn
        forceRedirectUrl={returnTo}
        signUpUrl={`/sign-up?returnTo=${encodeURIComponent(returnTo)}`}
      />
    </AuthShell>
  );
}

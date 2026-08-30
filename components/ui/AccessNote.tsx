import Link from "next/link";
import { Icon } from "./Icon";
import { Panel } from "./Panel";
import { PrimaryButton } from "./PrimaryButton";

/** Standard "you need to sign in" surface shown when there is no session. */
export function AccessNote({
  message,
  signInHref,
  signInLabel = "Sign In"
}: {
  message: string;
  signInHref?: string;
  signInLabel?: string;
}) {
  return (
    <Panel withTopBar topBar={<span>Access</span>}>
      <div className="flex flex-col gap-5 p-6 sm:p-7">
        <p className="text-sm text-muted-foreground">{message}</p>
        {signInHref && (
          <Link href={signInHref} className="w-fit">
            <PrimaryButton rightIcon={<Icon name="arrow.right" className="h-4 w-4" />}>
              {signInLabel}
            </PrimaryButton>
          </Link>
        )}
      </div>
    </Panel>
  );
}

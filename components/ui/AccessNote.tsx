import Link from "next/link";
import { Icon } from "./Icon";
import { Panel } from "./Panel";
import { PrimaryButton } from "./PrimaryButton";

// Standard "you need to sign in" surface shown by role portals when there is no
// authenticated session. Centralises the previously-duplicated access panel.
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
    <Panel withTopBar topBar={<span>00 / ACCESS</span>}>
      <div className="p-7 flex flex-col gap-5">
        <p className="font-mono text-mono-sm uppercase tracking-widest text-muted">
          {message}
        </p>
        {signInHref && (
          <Link href={signInHref} className="w-fit">
            <PrimaryButton>
              <Icon name="arrow.right" className="h-4 w-4" strokeWidth={2} />
              {signInLabel}
            </PrimaryButton>
          </Link>
        )}
      </div>
    </Panel>
  );
}

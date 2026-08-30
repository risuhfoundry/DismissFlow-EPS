"use client";

import { signInParent } from "@/lib/auth/parent-login";
import { AuthShell } from "@/components/auth/AuthShell";

export default function ParentLoginPage() {
  return (
    <AuthShell
      role="parent"
      roleLabel="Parent"
      roleIcon="users"
      heading="Sign in to manage your child's dismissal requests."
      description="Use the credentials provided by your school."
      identifierLabel="Admission number"
      identifierPlaceholder="Your admission number"
      identifierAutocomplete="username"
      identifierHint="Your school-issued admission number."
      portal="/parent"
      signIn={signInParent}
    />
  );
}

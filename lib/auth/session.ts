export type Role = "parent" | "teacher" | "gate" | "admin";

export type SessionUser = {
  userId: string;
  role: Role;
  loginId: string;
  linkedStudentId?: string;
  assignedClassId?: string;
};

export function isParent(u: SessionUser | null | undefined): u is SessionUser {
  return !!u && u.role === "parent";
}

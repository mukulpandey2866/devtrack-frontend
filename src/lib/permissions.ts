import type { ProjectResponse, ProjectRole } from '../types/api'

const RANK: Record<ProjectRole, number> = { VIEWER: 1, MEMBER: 2, MANAGER: 3, OWNER: 4 }

export function roleAtLeast(role: ProjectRole | null | undefined, required: ProjectRole): boolean {
  return role != null && RANK[role] >= RANK[required]
}

export function roleOutranks(role: ProjectRole | null | undefined, other: ProjectRole): boolean {
  return role != null && RANK[role] > RANK[other]
}

/** Roles the actor may hand out: owners any role, managers only roles below their own. */
export function grantableRoles(actor: ProjectRole | null | undefined, all: readonly ProjectRole[]): ProjectRole[] {
  if (actor === 'OWNER') return [...all]
  return all.filter((role) => roleOutranks(actor, role))
}

export function isArchived(project: Pick<ProjectResponse, 'status'>): boolean {
  return project.status === 'ARCHIVED'
}

/** UI hints only; the backend enforces the same rules and remains the authority. */
export function projectPermissions(project: Pick<ProjectResponse, 'status' | 'currentUserRole'>) {
  const role = project.currentUserRole
  const writable = !isArchived(project)
  return {
    canCreateIssue: writable && roleAtLeast(role, 'MEMBER'),
    canEditIssue: writable && roleAtLeast(role, 'MEMBER'),
    canComment: writable && roleAtLeast(role, 'MEMBER'),
    canDeleteIssue: writable && roleAtLeast(role, 'MANAGER'),
    canEditProject: writable && roleAtLeast(role, 'MANAGER'),
    canManageMembers: writable && roleAtLeast(role, 'MANAGER'),
    canManageLabels: writable && roleAtLeast(role, 'MANAGER'),
    canArchive: role === 'OWNER' && writable,
    canRestore: role === 'OWNER' && !writable,
    isOwner: role === 'OWNER',
  }
}

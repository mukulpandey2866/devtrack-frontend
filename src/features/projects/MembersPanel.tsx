import { LogOut, Trash2, UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert } from '../../components/ui/Alert'
import { Avatar } from '../../components/ui/Avatar'
import { RoleBadge } from '../../components/ui/Badge'
import { Button, IconButton } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { SelectField, TextField } from '../../components/ui/Field'
import { SkeletonRows } from '../../components/ui/Loading'
import { Modal } from '../../components/ui/Modal'
import { ErrorState } from '../../components/ui/States'
import { useToast } from '../../components/ui/useToast'
import { useAction } from '../../hooks/useAction'
import { useAsync } from '../../hooks/useAsync'
import { formatDate, ROLE_LABELS } from '../../lib/format'
import { grantableRoles, projectPermissions, roleOutranks } from '../../lib/permissions'
import { hasErrors, validateEmail, type FieldErrors } from '../../lib/validation'
import { PROJECT_ROLES, type MemberResponse, type ProjectResponse, type ProjectRole } from '../../types/api'
import { useCurrentUser } from '../auth/useAuth'
import { projectsService } from './projectsService'

function AddMemberDialog({ project, onAdded, onClose }: { project: ProjectResponse; onAdded: () => void; onClose: () => void }) {
  const roles = grantableRoles(project.currentUserRole, PROJECT_ROLES)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<ProjectRole>(roles.includes('MEMBER') ? 'MEMBER' : roles[0])
  const [errors, setErrors] = useState<FieldErrors<'email'>>({})
  const { run, pending, error } = useAction(() => projectsService.addMember(project.id, { email: email.trim(), role }))

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const next = { email: validateEmail(email) }
    setErrors(next)
    if (hasErrors(next)) return
    const result = await run()
    if (result?.ok) onAdded()
  }

  const emailError = errors.email ?? error?.fieldErrors.email
  return (
    <Modal
      title="Add member"
      description="Add an existing DevTrack user to this project by email."
      size="sm"
      onClose={onClose}
      locked={pending}
      footer={
        <>
          <Button onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form="member-form" variant="primary" loading={pending}>
            Add member
          </Button>
        </>
      }
    >
      <form id="member-form" className="form" onSubmit={onSubmit} noValidate>
        {error && !error.fieldErrors.email && <Alert tone="error">{error.message}</Alert>}
        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={emailError} required />
        <SelectField label="Role" value={role} onChange={(e) => setRole(e.target.value as ProjectRole)}>
          {roles.map((value) => (
            <option key={value} value={value}>
              {ROLE_LABELS[value]}
            </option>
          ))}
        </SelectField>
      </form>
    </Modal>
  )
}

export function MembersPanel({ project }: { project: ProjectResponse }) {
  const toast = useToast()
  const navigate = useNavigate()
  const currentUser = useCurrentUser()
  const { canManageMembers } = projectPermissions(project)
  const actorRole = project.currentUserRole
  const writable = project.status !== 'ARCHIVED'
  const { data, error, initialLoading, reload } = useAsync((signal) => projectsService.listMembers(project.id, signal), [project.id])
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<MemberResponse | null>(null)
  const [busyUserId, setBusyUserId] = useState<string | null>(null)

  const canManageTarget = (member: MemberResponse) =>
    canManageMembers && member.user.id !== currentUser.id && (actorRole === 'OWNER' || roleOutranks(actorRole, member.role))

  const changeRole = async (member: MemberResponse, role: ProjectRole) => {
    setBusyUserId(member.user.id)
    try {
      await projectsService.changeMemberRole(project.id, member.user.id, role)
      toast.success(`${member.user.fullName} is now ${ROLE_LABELS[role].toLowerCase()}.`)
      reload()
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Could not change the role.')
    } finally {
      setBusyUserId(null)
    }
  }

  const grantable = grantableRoles(actorRole, PROJECT_ROLES)

  return (
    <section className="card card--flush" aria-labelledby="members-heading">
      <div className="card__header card__header--padded">
        <h2 id="members-heading" className="card__title">
          Members
        </h2>
        {canManageMembers && grantable.length > 0 && (
          <Button size="sm" variant="primary" icon={<UserPlus className="icon" aria-hidden="true" />} onClick={() => setAdding(true)}>
            Add member
          </Button>
        )}
      </div>
      {initialLoading ? (
        <SkeletonRows rows={4} label="Loading members" />
      ) : error && !data ? (
        <ErrorState error={error} onRetry={reload} title="Could not load members" />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Member</th>
                <th scope="col">Role</th>
                <th scope="col">Joined</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data?.map((member) => {
                const isSelf = member.user.id === currentUser.id
                const manageable = canManageTarget(member)
                return (
                  <tr key={member.user.id}>
                    <td>
                      <span className="person">
                        <Avatar name={member.user.fullName} />
                        <span>
                          <span className="person__name">
                            {member.user.fullName}
                            {isSelf && <span className="table__muted"> (you)</span>}
                          </span>
                          <span className="person__email">{member.user.email}</span>
                        </span>
                      </span>
                    </td>
                    <td>
                      {manageable ? (
                        <select
                          className="input select input--inline"
                          aria-label={`Role for ${member.user.fullName}`}
                          value={member.role}
                          disabled={busyUserId === member.user.id}
                          onChange={(e) => void changeRole(member, e.target.value as ProjectRole)}
                        >
                          {PROJECT_ROLES.filter((r) => grantable.includes(r) || r === member.role).map((r) => (
                            <option key={r} value={r} disabled={!grantable.includes(r)}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <RoleBadge role={member.role} />
                      )}
                    </td>
                    <td className="table__muted">{formatDate(member.joinedAt)}</td>
                    <td className="table__actions">
                      {writable && (manageable || isSelf) && (
                        <IconButton
                          label={isSelf ? 'Leave project' : `Remove ${member.user.fullName}`}
                          onClick={() => setRemoving(member)}
                        >
                          {isSelf ? <LogOut className="icon" aria-hidden="true" /> : <Trash2 className="icon" aria-hidden="true" />}
                        </IconButton>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {adding && (
        <AddMemberDialog
          project={project}
          onClose={() => setAdding(false)}
          onAdded={() => {
            toast.success('Member added.')
            setAdding(false)
            reload()
          }}
        />
      )}
      {removing && (
        <ConfirmDialog
          title={removing.user.id === currentUser.id ? 'Leave project' : 'Remove member'}
          message={
            removing.user.id === currentUser.id
              ? `Leave ${project.name}? You will lose access and be unassigned from its issues.`
              : `Remove ${removing.user.fullName} from ${project.name}? They will be unassigned from the project's issues.`
          }
          confirmLabel={removing.user.id === currentUser.id ? 'Leave project' : 'Remove member'}
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            await projectsService.removeMember(project.id, removing.user.id)
            if (removing.user.id === currentUser.id) {
              toast.success('You left the project.')
              navigate('/projects', { replace: true })
            } else {
              toast.success('Member removed.')
              reload()
            }
          }}
        />
      )}
    </section>
  )
}

import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../../components/common/PageHeader'
import { Alert } from '../../components/ui/Alert'
import { ButtonLink } from '../../components/ui/Button'
import { SelectField } from '../../components/ui/Field'
import { Skeleton } from '../../components/ui/Loading'
import { EmptyState, ErrorState } from '../../components/ui/States'
import { useAsync } from '../../hooks/useAsync'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { projectsService } from '../projects/projectsService'
import { ProjectIssues } from './ProjectIssues'

const PROJECT_PICKER_LIMIT = 100

/** The API lists issues per project, so this page scopes the list to one selected project. */
export function IssuesPage() {
  useDocumentTitle('Issues')
  const [params, setParams] = useSearchParams()
  const { data, error, initialLoading, reload } = useAsync(
    (signal) => projectsService.list({ size: PROJECT_PICKER_LIMIT, sort: 'updatedAt,desc' }, signal),
    [],
  )

  const projects = data?.content ?? []
  const requested = params.get('project')
  const selected = projects.find((p) => p.id === requested) ?? projects[0]

  return (
    <>
      <PageHeader title="Issues" description="Browse and filter issues within a project." />

      {initialLoading ? (
        <Skeleton height={64} />
      ) : error && !data ? (
        <ErrorState error={error} onRetry={reload} title="Could not load projects" />
      ) : projects.length === 0 ? (
        <section className="card">
          <EmptyState
            title="No projects yet"
            description="Issues belong to projects. Create or join a project to start tracking work."
            action={
              <ButtonLink variant="primary" to="/projects">
                Go to projects
              </ButtonLink>
            }
          />
        </section>
      ) : (
        <div className="stack">
          <div className="card project-picker">
            <SelectField
              label="Project"
              value={selected?.id ?? ''}
              onChange={(event) => setParams({ project: event.target.value })}
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.projectKey} - {project.name}
                </option>
              ))}
            </SelectField>
            {selected && (
              <Link className="project-picker__link" to={`/projects/${selected.id}`}>
                View project
              </Link>
            )}
          </div>
          {data && data.totalElements > PROJECT_PICKER_LIMIT && (
            <Alert tone="info">
              Showing your {PROJECT_PICKER_LIMIT} most recently updated projects. Use the <Link to="/projects">projects page</Link> to find others.
            </Alert>
          )}
          {selected && <ProjectIssues key={selected.id} project={selected} />}
        </div>
      )}
    </>
  )
}

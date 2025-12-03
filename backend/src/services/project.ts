import { Project, CreateProjectInput, UpdateProjectInput } from '../types/project';

const projectsStore = new Map<string, Project>();

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const project: Project = {
    id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: input.name,
    description: input.description,
    location: input.location,
    status: 'planning',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  projectsStore.set(project.id, project);
  return project;
}

export async function getProject(id: string): Promise<Project | null> {
  return projectsStore.get(id) || null;
}

export async function listProjects(): Promise<Project[]> {
  return Array.from(projectsStore.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function updateProject(id: string, input: UpdateProjectInput): Promise<Project> {
  const project = projectsStore.get(id);
  if (!project) throw new Error('Project not found');

  if (input.name) project.name = input.name;
  if (input.description !== undefined) project.description = input.description;
  if (input.location !== undefined) project.location = input.location;
  if (input.status) project.status = input.status;
  project.updatedAt = new Date();

  projectsStore.set(id, project);
  return project;
}

export async function deleteProject(id: string): Promise<void> {
  if (!projectsStore.has(id)) throw new Error('Project not found');
  projectsStore.delete(id);
}

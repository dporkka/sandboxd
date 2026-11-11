import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BuilderHome } from './BuilderHome'
import { api } from './api'

vi.mock('./api', () => ({
  api: {
    listPresets: vi.fn().mockResolvedValue([]),
    getAgents: vi.fn().mockResolvedValue([]),
    listModelProviders: vi.fn().mockResolvedValue([]),
    getBuildCoachStatus: vi.fn().mockResolvedValue({ enabled: true }),
    generateBuildCoachBrief: vi.fn().mockResolvedValue({
      project_id: 'project-1',
      documents_included: 3,
      dashboard_url: 'https://build.example/projects/project-1',
      prompt: 'original idea plus structured implementation brief',
    }),
    createApp: vi.fn().mockResolvedValue({ id: 'app-1' }),
    createAppSandbox: vi.fn().mockResolvedValue({}),
  },
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function mount(onCreated = vi.fn()) {
  render(
    <BuilderHome
      apps={[]}
      reload={() => {}}
      onOpen={() => {}}
      onCreated={onCreated}
      goSettings={() => {}}
      saveDraft={() => {}}
    />,
  )
  return onCreated
}

function fillPlanningInputs() {
  fireEvent.change(screen.getByLabelText('Problem to solve'), { target: { value: 'Teams have no way to coordinate work' } })
  fireEvent.change(screen.getByLabelText('Target users'), { target: { value: 'Small teams managing client projects' } })
  fireEvent.change(screen.getByLabelText('MVP features'), { target: { value: 'Tasks, assignments and permissions' } })
}

describe('Build with AI Build Coach', () => {
  it('passes an authenticated server-generated brief to the agent before app creation', async () => {
    const onCreated = mount()
    fireEvent.change(screen.getByTestId('build-prompt'), { target: { value: 'A task manager for teams' } })
    fireEvent.click(await screen.findByTestId('build-coach-toggle'))
    fillPlanningInputs()
    fireEvent.click(screen.getByTestId('build-app'))
    await waitFor(() => expect(api.createApp).toHaveBeenCalledTimes(1))
    expect(api.generateBuildCoachBrief).toHaveBeenCalledWith(expect.objectContaining({
      idea: 'A task manager for teams',
      audience: 'Small teams managing client projects',
      mvpFeatures: 'Tasks, assignments and permissions',
    }))
    expect(onCreated).toHaveBeenCalledWith('app-1', expect.objectContaining({
      prompt: 'original idea plus structured implementation brief',
    }))
  })

  it('does not create an app if planning fails', async () => {
    vi.mocked(api.generateBuildCoachBrief).mockRejectedValueOnce(new Error('Planner unavailable'))
    mount()
    fireEvent.change(screen.getByTestId('build-prompt'), { target: { value: 'A task manager for teams' } })
    fireEvent.click(await screen.findByTestId('build-coach-toggle'))
    fillPlanningInputs()
    fireEvent.click(screen.getByTestId('build-app'))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Planner unavailable'))
    expect(api.createApp).not.toHaveBeenCalled()
  })

  it('keeps regular app creation unchanged when the feature is not selected', async () => {
    const onCreated = mount()
    fireEvent.change(screen.getByTestId('build-prompt'), { target: { value: 'A simple portfolio' } })
    fireEvent.click(screen.getByTestId('build-app'))
    await waitFor(() => expect(api.createApp).toHaveBeenCalledTimes(1))
    expect(api.generateBuildCoachBrief).not.toHaveBeenCalled()
    expect(onCreated).toHaveBeenCalledWith('app-1', expect.objectContaining({ prompt: 'A simple portfolio' }))
  })
})

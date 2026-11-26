import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import {
  mockAreas,
  mockCameras,
  mockDetections,
  mockIncidentActivities,
  mockIncidents,
  mockInvestigationNotes,
} from '../../mocks'
import {
  FalseAlarmDialog,
  ResolveIncidentDialog,
} from './components/IncidentActionDialogs'
import { IncidentDetails } from './components/IncidentDetails'
import { IncidentPriorityOverview } from './components/IncidentPriorityOverview'
import { IncidentSummaryCards } from './components/IncidentSummaryCards'
import { InvestigationNotes } from './components/InvestigationNotes'

describe('Incident Management components', () => {
  it('shows dynamic status and priority counts', () => {
    render(
      <>
        <IncidentSummaryCards incidents={mockIncidents} />
        <IncidentPriorityOverview incidents={mockIncidents} />
      </>,
    )

    expect(screen.getByText('Total Incidents').previousElementSibling).toHaveTextContent(
      '3',
    )
    expect(screen.getByText('New Incidents').previousElementSibling).toHaveTextContent(
      '1',
    )
    expect(screen.getByText('Investigating').previousElementSibling).toHaveTextContent(
      '1',
    )
    expect(screen.getByText('Resolved').previousElementSibling).toHaveTextContent('1')
    expect(screen.getByText('Critical').nextElementSibling).toHaveTextContent('1')
    expect(screen.getByText('High').nextElementSibling).toHaveTextContent('1')
  })

  it('shows incident, camera, detection, evidence, notes, and timeline details', () => {
    const incident = mockIncidents[1]
    render(
      <IncidentDetails
        areas={mockAreas}
        activities={mockIncidentActivities.filter(
          (activity) => activity.incidentId === incident.id,
        )}
        cameras={mockCameras}
        detections={mockDetections}
        incident={incident}
        notes={mockInvestigationNotes.filter((note) => note.incidentId === incident.id)}
        onAcknowledge={vi.fn()}
        onAddNote={vi.fn(async () => undefined)}
        onAssign={vi.fn()}
        onClose={vi.fn()}
        onFalseAlarm={vi.fn()}
        onInvestigate={vi.fn()}
        onResolve={vi.fn()}
      />,
    )

    expect(screen.getAllByText(incident.incidentNumber).length).toBeGreaterThan(0)
    expect(screen.getByText(/Commercial District Loading Area Camera/)).toBeInTheDocument()
    expect(screen.getAllByText(/DET-004/).length).toBeGreaterThan(0)
    expect(screen.getByText(/SIMULATED EVIDENCE/)).toBeInTheDocument()
    expect(screen.getByText(/Officer dispatched/)).toBeInTheDocument()
    expect(screen.getByText(/On-site investigation started/)).toBeInTheDocument()
  })

  it('rejects empty investigation notes and submits valid notes', async () => {
    const user = userEvent.setup()
    const onAddNote = vi.fn(async () => undefined)
    render(
      <InvestigationNotes
        incident={mockIncidents[1]}
        notes={[]}
        onAddNote={onAddNote}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Add Note' }))
    expect(screen.getByText(/note content is required/i)).toBeInTheDocument()
    await user.type(
      screen.getByLabelText('Add investigation note'),
      'Patrol officer confirmed the area is secured.',
    )
    await user.click(screen.getByRole('button', { name: 'Add Note' }))
    await waitFor(() => expect(onAddNote).toHaveBeenCalledTimes(1))
  })

  it('requires resolution notes before confirmation', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn(async () => undefined)
    render(
      <ResolveIncidentDialog
        incident={mockIncidents[1]}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Confirm Resolution' }))
    expect(screen.getByText('Resolution notes are required.')).toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('requires a false-alarm reason before confirmation', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn(async () => undefined)
    render(
      <FalseAlarmDialog
        incident={mockIncidents[0]}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Confirm False Alarm' }))
    expect(screen.getByText(/Select or enter a false-alarm reason/)).toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
  })
})

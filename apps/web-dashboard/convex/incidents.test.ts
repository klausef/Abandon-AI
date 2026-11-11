import { convexTest } from 'convex-test'
import { beforeAll, describe, expect, it } from 'vitest'
import { api, internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import schema from './schema'
import {
  TEST_EVENT_PATH,
  TEST_PROCESSOR_SECRET,
  potentialIncidentEvent,
  signEventRequest,
} from './testSupport'

const modules = import.meta.glob('./**/*.ts')

type TestConvex = Awaited<ReturnType<typeof setup>>

async function setup() {
  const t = convexTest(schema, modules)
  await t.mutation(internal.development.seedReferenceData, {})
  return t
}

const administrator = (t: TestConvex) =>
  t.withIdentity({ tokenIdentifier: 'demo:administrator' })
const supervisor = (t: TestConvex) =>
  t.withIdentity({ tokenIdentifier: 'demo:supervisor' })
const officer = (t: TestConvex) =>
  t.withIdentity({ tokenIdentifier: 'demo:officer' })
const officerTwo = (t: TestConvex) =>
  t.withIdentity({ tokenIdentifier: 'demo:officer-2' })

let incidentSequence = 0

async function createIncident(
  t: TestConvex,
  overrides: Record<string, unknown> = {},
) {
  incidentSequence += 1
  const body = potentialIncidentEvent({
    event_id: `evt-incident-${incidentSequence}`,
    idempotency_key: `idem-incident-${incidentSequence}-abcdef`,
    tracking_id: incidentSequence,
    ...overrides,
  })
  const signed = await signEventRequest({ body })
  const response = await t.fetch(TEST_EVENT_PATH, {
    method: 'POST',
    headers: signed.headers,
    body: signed.bodyText,
  })
  expect(response.status).toBe(201)
  const payload = (await response.json()) as { incident_id: string }
  const incident = await t.run(async (ctx) =>
    ctx.db.get(payload.incident_id as Id<'incidents'>),
  )
  expect(incident).not.toBeNull()
  return incident!
}

async function userIdFor(t: TestConvex, tokenIdentifier: string) {
  const user = await t.run(async (ctx) =>
    ctx.db
      .query('users')
      .withIndex('by_tokenIdentifier', (query) =>
        query.eq('tokenIdentifier', tokenIdentifier),
      )
      .unique(),
  )
  expect(user).not.toBeNull()
  return user!._id
}

beforeAll(() => {
  process.env.PROCESSOR_SHARED_SECRET = TEST_PROCESSOR_SECRET
  delete process.env.PROCESSOR_DEVICE_ID
  delete process.env.PROCESSOR_MAX_CLOCK_SKEW_SECONDS
  delete process.env.PROCESSOR_MAX_REQUEST_BYTES
})

describe('incident authentication', () => {
  it('fails closed when no identity provider has authenticated the caller', async () => {
    const t = await setup()
    await expect(t.query(api.incidents.list, {})).rejects.toMatchObject({
      data: { code: 'UNAUTHENTICATED' },
    })
  })

  it('rejects an identity that has not been provisioned', async () => {
    const t = await setup()
    await expect(
      t
        .withIdentity({ tokenIdentifier: 'demo:not-provisioned' })
        .query(api.incidents.list, {}),
    ).rejects.toMatchObject({ data: { code: 'USER_NOT_PROVISIONED' } })
  })

  it('rejects an inactive account', async () => {
    const t = await setup()
    const targetUserId = await userIdFor(t, 'demo:officer-2')

    await administrator(t).mutation(api.users.setStatus, {
      userId: targetUserId,
      status: 'Inactive',
    })

    await expect(officerTwo(t).query(api.incidents.list, {})).rejects.toMatchObject(
      { data: { code: 'ACCOUNT_INACTIVE' } },
    )
  })
})

describe('incident visibility', () => {
  it('lets administrators and supervisors see every incident', async () => {
    const t = await setup()
    const incident = await createIncident(t)

    const adminIncidents = await administrator(t).query(api.incidents.list, {})
    const supervisorIncidents = await supervisor(t).query(
      api.incidents.list,
      {},
    )

    expect(adminIncidents.map((item) => item._id)).toEqual([incident._id])
    expect(supervisorIncidents.map((item) => item._id)).toEqual([
      incident._id,
    ])
    await expect(
      supervisor(t).query(api.incidents.get, { incidentId: incident._id }),
    ).resolves.toMatchObject({ _id: incident._id })
  })

  it('hides unassigned incidents from security officers', async () => {
    const t = await setup()
    const incident = await createIncident(t)

    await expect(officer(t).query(api.incidents.list, {})).resolves.toEqual([])
    await expect(
      officer(t).query(api.incidents.get, { incidentId: incident._id }),
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } })
  })

  it("hides another officer's incident from a security officer", async () => {
    const t = await setup()
    const incident = await createIncident(t)
    const secondOfficerId = await userIdFor(t, 'demo:officer-2')

    await administrator(t).mutation(api.incidents.assign, {
      incidentId: incident._id,
      officerUserId: secondOfficerId,
    })

    await expect(officer(t).query(api.incidents.list, {})).resolves.toEqual([])
    await expect(
      officer(t).query(api.incidents.get, { incidentId: incident._id }),
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } })
  })

  it('restricts detection visibility to tracks linked to assigned incidents', async () => {
    const t = await setup()
    const incident = await createIncident(t)
    const officerId = await userIdFor(t, 'demo:officer')

    await expect(officer(t).query(api.detections.list, {})).resolves.toEqual([])

    await administrator(t).mutation(api.incidents.assign, {
      incidentId: incident._id,
      officerUserId: officerId,
    })

    const detections = await officer(t).query(api.detections.list, {})
    expect(detections).toHaveLength(1)
    expect(detections[0].trackKey).toBe(incident.trackKey)
  })
})

describe('incident workflow', () => {
  it('supports assignment during new, then acknowledge, investigate, note, and resolve', async () => {
    const t = await setup()
    const incident = await createIncident(t)
    const officerId = await userIdFor(t, 'demo:officer')

    const assigned = await supervisor(t).mutation(api.incidents.assign, {
      incidentId: incident._id,
      officerUserId: officerId,
    })
    expect(assigned).toMatchObject({
      status: 'new',
      assignedUserId: officerId,
      assignedOfficerName: 'Daniel Reyes',
    })

    const acknowledged = await officer(t).mutation(api.incidents.acknowledge, {
      incidentId: incident._id,
    })
    expect(acknowledged.status).toBe('acknowledged')
    expect(acknowledged.acknowledgedAt).not.toBeNull()

    const investigating = await officer(t).mutation(
      api.incidents.startInvestigation,
      { incidentId: incident._id },
    )
    expect(investigating.status).toBe('investigating')

    const note = await officer(t).mutation(api.incidents.addNote, {
      incidentId: incident._id,
      content: 'Reviewed the camera feed and notified the duty supervisor.',
    })
    expect(note).toMatchObject({ type: 'note_added' })

    const resolved = await officer(t).mutation(api.incidents.resolve, {
      incidentId: incident._id,
      resolutionNotes: 'Owner retrieved the bag after verification.',
    })
    expect(resolved.status).toBe('resolved')
    expect(resolved.resolvedAt).not.toBeNull()

    const timeline = await officer(t).query(api.incidents.timeline, {
      incidentId: incident._id,
    })
    expect(timeline.map((entry) => entry.type)).toEqual([
      'detected',
      'created',
      'assigned',
      'acknowledged',
      'investigation_started',
      'note_added',
      'resolved',
    ])
  })

  it('allows supervisors to manage any incident without assignment', async () => {
    const t = await setup()
    const incident = await createIncident(t)

    const acknowledged = await supervisor(t).mutation(
      api.incidents.acknowledge,
      { incidentId: incident._id },
    )
    expect(acknowledged.status).toBe('acknowledged')

    const investigating = await supervisor(t).mutation(
      api.incidents.startInvestigation,
      { incidentId: incident._id },
    )
    expect(investigating.status).toBe('investigating')
  })

  it('rejects invalid status transitions', async () => {
    const t = await setup()
    const incident = await createIncident(t)

    await expect(
      administrator(t).mutation(api.incidents.resolve, {
        incidentId: incident._id,
        resolutionNotes: 'Skipping the workflow.',
      }),
    ).rejects.toMatchObject({ data: { code: 'INVALID_TRANSITION' } })

    await administrator(t).mutation(api.incidents.acknowledge, {
      incidentId: incident._id,
    })

    await expect(
      administrator(t).mutation(api.incidents.resolve, {
        incidentId: incident._id,
        resolutionNotes: 'Still skipping investigation.',
      }),
    ).rejects.toMatchObject({ data: { code: 'INVALID_TRANSITION' } })
  })

  it('accepts investigation notes only while investigating', async () => {
    const t = await setup()
    const incident = await createIncident(t)

    await expect(
      administrator(t).mutation(api.incidents.addNote, {
        incidentId: incident._id,
        content: 'Premature note.',
      }),
    ).rejects.toMatchObject({ data: { code: 'INVALID_TRANSITION' } })
  })

  it('records a false alarm decision from a new incident', async () => {
    const t = await setup()
    const incident = await createIncident(t)

    const falseAlarm = await administrator(t).mutation(
      api.incidents.markFalseAlarm,
      {
        incidentId: incident._id,
        reason: 'The object belonged to a person standing beside it.',
      },
    )

    expect(falseAlarm.status).toBe('false_alarm')
    expect(falseAlarm.resolutionNotes).toContain('person standing beside it')
    expect(falseAlarm.resolvedAt).not.toBeNull()
  })

  it('rejects assignment after an incident is resolved', async () => {
    const t = await setup()
    const incident = await createIncident(t)
    const officerId = await userIdFor(t, 'demo:officer')

    await administrator(t).mutation(api.incidents.acknowledge, {
      incidentId: incident._id,
    })
    await administrator(t).mutation(api.incidents.startInvestigation, {
      incidentId: incident._id,
    })
    await administrator(t).mutation(api.incidents.resolve, {
      incidentId: incident._id,
      resolutionNotes: 'Resolved for the assignment test.',
    })

    await expect(
      administrator(t).mutation(api.incidents.assign, {
        incidentId: incident._id,
        officerUserId: officerId,
      }),
    ).rejects.toMatchObject({ data: { code: 'INVALID_TRANSITION' } })
  })

  it('prevents security officers from assigning incidents', async () => {
    const t = await setup()
    const incident = await createIncident(t)
    const officerId = await userIdFor(t, 'demo:officer')

    await expect(
      officer(t).mutation(api.incidents.assign, {
        incidentId: incident._id,
        officerUserId: officerId,
      }),
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } })
  })

  it('allows unassigning an incident that is still active', async () => {
    const t = await setup()
    const incident = await createIncident(t)
    const officerId = await userIdFor(t, 'demo:officer')

    await administrator(t).mutation(api.incidents.assign, {
      incidentId: incident._id,
      officerUserId: officerId,
    })

    const unassigned = await administrator(t).mutation(api.incidents.assign, {
      incidentId: incident._id,
      officerUserId: null,
    })

    expect(unassigned.assignedUserId).toBeNull()
    expect(unassigned.assignedOfficerName).toBeNull()
  })
})

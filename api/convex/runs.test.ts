import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { api, internal } from './_generated/api'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')
const WEBHOOK_PATH = '/roboflow-webhook'
const TEST_WEBHOOK_SECRET = 'test-roboflow-webhook-secret-0123456789'

function setup() {
  return convexTest(schema, modules)
}

function webhookRequest(body: unknown, secret = TEST_WEBHOOK_SECRET) {
  return {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-webhook-secret': secret,
    },
    body: JSON.stringify(body),
  }
}

const originalWebhookSecret = process.env.ROBOFLOW_WEBHOOK_SECRET
const originalTrainingSecret = process.env.KAGGLE_RUN_SECRET

beforeEach(() => {
  process.env.ROBOFLOW_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET
  delete process.env.KAGGLE_RUN_SECRET
})

afterEach(() => {
  if (originalWebhookSecret === undefined) {
    delete process.env.ROBOFLOW_WEBHOOK_SECRET
  } else {
    process.env.ROBOFLOW_WEBHOOK_SECRET = originalWebhookSecret
  }

  if (originalTrainingSecret === undefined) {
    delete process.env.KAGGLE_RUN_SECRET
  } else {
    process.env.KAGGLE_RUN_SECRET = originalTrainingSecret
  }
})

describe('training runs', () => {
  it('starts and completes a run with YOLO metrics', async () => {
    const t = setup()
    const runId = await t.mutation(api.runs.startRun, {
      project: 'public-space-objects',
      version: 1,
      modelArch: 'yolov8n.pt',
      epochs: 50,
      startedAt: 1_000,
    })

    await t.mutation(api.runs.completeRun, {
      runId,
      mAP50: 0.91,
      mAP50_95: 0.73,
      completedAt: 2_000,
    })

    await expect(t.query(api.runs.listRuns, {})).resolves.toMatchObject([
      {
        _id: runId,
        project: 'public-space-objects',
        version: 1,
        modelArch: 'yolov8n.pt',
        epochs: 50,
        status: 'completed',
        mAP50: 0.91,
        mAP50_95: 0.73,
        startedAt: 1_000,
        completedAt: 2_000,
      },
    ])
  })

  it('marks a running job as failed', async () => {
    const t = setup()
    const runId = await t.mutation(api.runs.startRun, {
      project: 'public-space-objects',
      version: 1,
      modelArch: 'yolov8n.pt',
      epochs: 50,
      startedAt: 5_000,
    })

    await t.mutation(api.runs.failRun, {
      runId,
      completedAt: 6_000,
    })

    const [run] = await t.query(api.runs.listRuns, {})
    expect(run).toMatchObject({
      _id: runId,
      status: 'failed',
      completedAt: 6_000,
    })
  })

  it('returns newest runs first and clamps the requested limit', async () => {
    const t = setup()
    for (let index = 1; index <= 3; index += 1) {
      await t.mutation(api.runs.startRun, {
        project: `project-${index}`,
        version: 1,
        modelArch: 'yolov8n.pt',
        epochs: 50,
        startedAt: index,
      })
    }

    const runs = await t.query(api.runs.listRuns, { limit: 2.9 })
    expect(runs.map((run) => run.project)).toEqual(['project-3', 'project-2'])

    const minimum = await t.query(api.runs.listRuns, { limit: 0 })
    expect(minimum).toHaveLength(1)
    expect(minimum[0].project).toBe('project-3')
  })

  it('requires the optional deployment-side training secret when configured', async () => {
    const t = setup()
    process.env.KAGGLE_RUN_SECRET = 'private-kaggle-run-secret'
    const args = {
      project: 'public-space-objects',
      version: 1,
      modelArch: 'yolov8n.pt',
      epochs: 50,
    }

    await expect(t.mutation(api.runs.startRun, args)).rejects.toThrow(
      'Training run authentication failed',
    )
    await expect(
      t.mutation(api.runs.startRun, {
        ...args,
        secret: 'private-kaggle-run-secret',
      }),
    ).resolves.toBeDefined()
  })
})

describe('POST /roboflow-webhook', () => {
  it('fails closed when the webhook secret is not configured', async () => {
    const t = setup()
    delete process.env.ROBOFLOW_WEBHOOK_SECRET

    const response = await t.fetch(
      WEBHOOK_PATH,
      webhookRequest({ predictions: [] }),
    )
    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'WEBHOOK_NOT_CONFIGURED' },
    })
  })

  it('rejects a missing or incorrect webhook secret', async () => {
    const t = setup()
    const missing = await t.fetch(WEBHOOK_PATH, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ predictions: [] }),
    })
    expect(missing.status).toBe(401)

    const incorrect = await t.fetch(
      WEBHOOK_PATH,
      webhookRequest({ predictions: [] }, 'incorrect-secret'),
    )
    expect(incorrect.status).toBe(401)
    await expect(incorrect.json()).resolves.toMatchObject({
      error: { code: 'INVALID_WEBHOOK_SECRET' },
    })
  })

  it('rejects malformed JSON after authenticating the request', async () => {
    const t = setup()
    const response = await t.fetch(WEBHOOK_PATH, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-webhook-secret': TEST_WEBHOOK_SECRET,
      },
      body: '{not-json',
    })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'INVALID_JSON' },
    })
  })

  it('stores top-level predictions as normalized metadata only', async () => {
    const t = setup()
    const response = await t.fetch(
      WEBHOOK_PATH,
      webhookRequest({
        image: {
          width: 1_000,
          height: 500,
          url: 'https://example.invalid/roboflow/sample.jpg',
        },
        predictions: [
          {
            class: 'backpack',
            confidence: 0.91,
            x: 500,
            y: 250,
            width: 200,
            height: 100,
          },
          {
            class: 'person',
            confidence: 0.96,
            x: 200,
            y: 200,
            width: 100,
            height: 300,
          },
          { class: 'invalid-confidence', confidence: 2 },
        ],
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true, saved: 2 })

    const records = await t.query(api.runs.listRecentDetections, {})
    expect(records).toHaveLength(2)
    const backpack = records.find((record) => record.label === 'backpack')
    expect(backpack).toMatchObject({
      confidence: 0.91,
      imageUrl: 'https://example.invalid/roboflow/sample.jpg',
    })
    expect(backpack?.bbox?.x).toBeCloseTo(0.4)
    expect(backpack?.bbox?.y).toBeCloseTo(0.4)
    expect(backpack?.bbox?.width).toBeCloseTo(0.2)
    expect(backpack?.bbox?.height).toBeCloseTo(0.2)

    const operationalCounts = await t.run(async (ctx) => ({
      detections: (await ctx.db.query('detections').collect()).length,
      incidents: (await ctx.db.query('incidents').collect()).length,
    }))
    expect(operationalCounts).toEqual({ detections: 0, incidents: 0 })
  })

  it('parses nested Roboflow Workflow outputs and omits boxes without dimensions', async () => {
    const t = setup()
    const response = await t.fetch(
      WEBHOOK_PATH,
      webhookRequest({
        outputs: [
          {
            predictions: {
              predictions: [
                {
                  label: 'parcel',
                  confidence: 0.82,
                  bbox: [10, 20, 30, 40],
                },
              ],
            },
          },
        ],
      }),
    )

    expect(response.status).toBe(200)
    const records = await t.query(api.runs.listRecentDetections, {})
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({ label: 'parcel', confidence: 0.82 })
    expect(records[0].bbox).toBeUndefined()
  })

  it('accepts the named model_predictions Workflow response shape', async () => {
    const t = setup()
    const response = await t.fetch(
      WEBHOOK_PATH,
      webhookRequest([
        {
          model_predictions: {
            image: { width: 200, height: 100 },
            predictions: [
              {
                class_name: 'box',
                score: 0.75,
                xyxy: [20, 10, 120, 60],
              },
            ],
          },
        },
      ]),
    )

    expect(response.status).toBe(200)
    const [record] = await t.query(api.runs.listRecentDetections, {})
    expect(record).toMatchObject({
      label: 'box',
      confidence: 0.75,
      bbox: { x: 0.1, y: 0.1, width: 0.5, height: 0.5 },
    })
  })

  it('keeps saveDetection internal while exposing a bounded recent query', async () => {
    const t = setup()
    await t.mutation(internal.runs.saveDetection, {
      label: 'cup',
      confidence: 0.8,
      receivedAt: 1,
    })
    await t.mutation(internal.runs.saveDetection, {
      label: 'bottle',
      confidence: 0.9,
      receivedAt: 2,
    })

    const records = await t.query(api.runs.listRecentDetections, { limit: 1 })
    expect(records).toHaveLength(1)
    expect(records[0].label).toBe('bottle')
  })
})

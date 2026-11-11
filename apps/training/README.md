# Kaggle YOLOv8 training

This private Kaggle script downloads Roboflow project version 1 in YOLOv8
format, trains `yolov8n.pt` for 50 epochs, records run status and metrics in
Convex, and uploads `weights/best.pt` back to the same Roboflow version.

Only training metadata is sent to Convex. Dataset images and model weights are
handled by Kaggle and Roboflow.

## 1. Configure Kaggle secrets

Attach these private secrets to the Kaggle kernel using the exact labels:

- `ROBOFLOW_API_KEY`
- `ROBOFLOW_WORKSPACE`
- `ROBOFLOW_PROJECT`
- `CONVEX_URL` — the `https://<deployment>.convex.cloud` URL

If `KAGGLE_RUN_SECRET` is configured in the Convex deployment, attach the same
value as a private Kaggle secret. Do **not** add `ROBOFLOW_WEBHOOK_SECRET` to
Kaggle; it belongs only in the Convex deployment and the Roboflow Workflow
webhook header.

Never paste API keys or secrets into `train.py`, this repository, or chat.

## 2. Set the kernel identity

Replace `your-kaggle-username` in `kernel-metadata.json` with your Kaggle
username. The complete `id` must remain in `username/kernel-slug` form.

## 3. Push the private kernel

From this directory, after installing and authenticating the Kaggle CLI:

```powershell
kaggle kernels push
```

The metadata enables both GPU and internet access. Keep `is_private` set to
`true` because the job connects to private Roboflow and Convex resources.

## 4. Configure the webhook separately

After the Convex schema and functions are deployed, set
`ROBOFLOW_WEBHOOK_SECRET` in the Convex deployment. Configure the Roboflow
Workflow webhook to send the same value in the `x-webhook-secret` header and
POST JSON to:

```text
https://<deployment>.convex.site/roboflow-webhook
```

Webhook detections are telemetry only. They do not create incidents and do not
bypass the existing temporal-evidence and human-review pipeline.

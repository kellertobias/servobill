# Kubernetes deployment

Kustomize manifests for running Servobill on Kubernetes:

```
base/                 app + workers Deployments, Services, Ingress, queue volume
components/postgres/  optional in-cluster Postgres (StatefulSet)
components/s3/        optional in-cluster S3 (SeaweedFS) + bucket job + Ingress
overlays/example/     an installation using both components
```

| Workload | Replaces (serverless) |
|---|---|
| `servobill-app` Deployment | CloudFront, API Gateway, API Lambdas |
| `servobill-workers` Deployment (1 replica) | EventBridge, event handler Lambdas, cron, PDF rendering |
| Postgres (component or external) | DynamoDB |
| SeaweedFS (component) or any S3-compatible storage | S3 |
| your SMTP server | SES |

## Install

```bash
cp -r deploy/kubernetes/overlays/example deploy/kubernetes/overlays/mine
cd deploy/kubernetes/overlays/mine
cp secrets.env.example secrets.env   # fill in, never commit
# edit config.env and the hostnames in kustomization.yaml
kubectl apply -k .
```

Then open `PUBLIC_URL` and sign in with `INITIAL_ADMIN_EMAIL` /
`INITIAL_ADMIN_PASSWORD` (or your OIDC provider, see
[docs/authentication.md](../../docs/authentication.md)).

If you keep the overlay in Git, manage `secrets.env` with your secret tooling
(SOPS, Sealed Secrets, External Secrets, …) and replace the `secretGenerator`.

## Notes

- **Storage.** The app is stateless when files are in S3/MinIO, so it can run
  several replicas. `S3_PUBLIC_ENDPOINT` must be reachable by browsers
  (presigned download URLs), which is why the S3 component has its own
  Ingress. With an external S3, drop the S3 component and set
  `ENDPOINT_S3`, `S3_PUBLIC_ENDPOINT`, `BUCKET_FILES` and the credentials.
  A ReadWriteMany volume mounted at `/data/files` in both Deployments with
  `UPLOAD_DIRECTORY=/data/files` works too.
- **Workers** must run as a single replica (`Recreate` strategy): the event queue
  is a SQLite file on the `servobill-workers-queue` volume.
- **Database.** The Postgres component is meant for small installations. For
  production prefer a managed database or an operator such as CloudNativePG
  and set `POSTGRES_URL` accordingly.
- **Ingress.** The manifests do not set an ingress class or cert-manager
  annotations; add them in your overlay. The app reads `PUBLIC_URL` for sign-in
  redirects.

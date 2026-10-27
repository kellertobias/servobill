# Temporary Lambda Node security runtime

The regional managed Node22 and24 runtimes measured on26 October2026 were below the published October21 security fixes. The app moves from EOL Node20 to supported Node22 and uses AWS_LAMBDA_EXEC_WRAPPER to start checksum-verified upstream Node22.23.4 while keeping AWS runtime-interface code, existing startup arguments, architecture, environment and application code.

Run `npm run security:runtime-layers` before deployment. The standard-library Python builder downloads official Node release archives, validates SHA256 against the official manifest, and creates architecture-specific ZIPs under ignored `.sst/node-security-layers`. No binaries belong in Git. SST owns both layer versions and attaches the corresponding binary to every current application Lambda. Cold starts log only the actual Node version and architecture for verification.

The Node layer adds about119MiB on x64. Check combined uncompressed Lambda code plus all layers stays below250MiB, especially PDF/Chromium bundles. Verify real cold-start version logs for all functions after deployment; runtime labels and INIT_START's managed-runtime version alone do not identify the wrapper's interpreter.

Next16.4.1 and Sharp0.35.5 are pinned. OpenNext4.1.12 is pinned separately, with SHARP_VERSION0.35.5 because the adapter installs its own optimizer copy independently of Next's dependency. Verify the emitted optimizer package and Linux ARM64 native dependencies.

Remove the temporary layer/wrapper once fresh managed-runtime diagnostics and vendor patch evidence demonstrate the required fixes. Keep Next/Sharp patches, supported runtime selection, account, stage, domain, storage and application data unchanged. These transforms currently cover Node ZIP functions; review explicitly before adding another runtime/container function.

AWS mechanism: https://docs.aws.amazon.com/lambda/latest/dg/runtimes-modify.html
Node fixes: https://nodejs.org/en/blog/vulnerability/october-2026-security-releases

The generated revalidation seeder bundles its AWS SDK explicitly via scripts/bundle-runtime-sdk.mjs. Upstream Node does not implement the managed runtime's ESM NODE_PATH extension. The post-build checks reject remaining external AWS SDK imports in this helper.

Servobill's normal deploy command now builds a disposable snapshot and performs all serverless-only preparation there. It preserves the primary checkout, SQL dependencies used by Docker, existing local invoice edits and private environment-file permissions. It never invokes git reset or git checkout. `npm run deploy -- --prepare-only` prepares a snapshot without deployment; remove that returned temporary directory after inspection. The deploy stage remains prod and the existing provider remains6.66.2; no SST4/provider state migration is required.

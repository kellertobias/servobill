# GitHub Repository Setup Guide

This guide helps you set up your GitHub repository to work with Servobill's semantic versioning system.

## Prerequisites

1. **Repository Permissions**: Ensure you have admin access to the repository
2. **GitHub Actions**: Actions should be enabled for the repository
3. **GitHub Container Registry**: Should be enabled (usually enabled by default)

## Step 1: Enable GitHub Actions

1. Go to your repository on GitHub
2. Click on the **Settings** tab
3. In the left sidebar, click **Actions** → **General**
4. Under "Actions permissions", select **Allow all actions and reusable workflows**
5. Click **Save**

## Step 2: Configure Repository Permissions

The workflow requires specific permissions to:
- Create releases
- Push Docker images to GitHub Container Registry
- Update repository files (CHANGELOG.md, package.json)

These permissions are configured in the workflow file, but you may need to ensure they're granted:

1. Go to **Settings** → **Actions** → **General**
2. Scroll down to "Workflow permissions"
3. Select **Read and write permissions**
4. Check **Allow GitHub Actions to create and approve pull requests**
5. Click **Save**

## Step 3: Enable GitHub Container Registry

1. Go to **Settings** → **Packages**
2. Ensure **Inherit access from source repository** is enabled
3. This allows the workflow to push Docker images

## Step 4: Set Up Repository Variables (Optional)

If you want to customize the deployment, you can set repository variables:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **Variables** tab
3. Add any custom variables you need

## Step 5: Test the Workflow

1. Make a commit with a conventional commit message:
   ```bash
   git commit -m "feat: add semantic versioning support"
   git push origin main
   ```

2. Go to **Actions** tab to monitor the workflow
3. Check that all jobs complete successfully

## Troubleshooting

### Workflow Fails with Permission Errors

If you see permission errors:

1. **Check Repository Settings**: Ensure Actions have write permissions
2. **Verify Token**: The workflow uses `GITHUB_TOKEN` which should have sufficient permissions
3. **Container Registry**: Ensure packages are enabled in repository settings

### Docker Images Not Pushing

If Docker images fail to push:

1. **Check Registry Access**: Go to **Settings** → **Packages** → **Container registry**
2. **Verify Permissions**: Ensure the workflow has `packages: write` permission
3. **Check Image Names**: Ensure the repository name is correct in the workflow

### No Release Created

If no release is created:

1. **Check Commit Messages**: Ensure you're using conventional commit format
2. **Verify Branch**: Only pushes to `main` trigger releases
3. **Check Workflow Logs**: Look for errors in the semantic-release step

## Repository Structure

After setup, your repository should have:

```
.github/
  workflows/
    release.yml          # Semantic release workflow
deploy/
  dockerized/
    docker-compose.prod.yml  # Production deployment
    deploy.sh               # Deployment script
    README.md              # Deployment documentation
.releaserc.json           # Semantic release configuration
CHANGELOG.md              # Auto-generated changelog
docs/
  semantic-versioning.md  # Versioning documentation
  github-setup.md         # This file
```

## First Release

To create your first release:

1. **Set Initial Version**: Update `package.json` with your current version
2. **Create Initial Tag**: 
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
3. **Make a Feature Commit**:
   ```bash
   git commit -m "feat: initial release"
   git push origin main
   ```

## Continuous Deployment

Once set up, every push to main with conventional commits will:

1. ✅ Run linting and tests
2. ✅ Analyze commit messages
3. ✅ Determine version changes
4. ✅ Build Docker images
5. ✅ Push to GitHub Container Registry
6. ✅ Create GitHub release
7. ✅ Update CHANGELOG.md

## Security Considerations

- **Secrets**: The workflow uses `GITHUB_TOKEN` which is automatically provided
- **Permissions**: Only necessary permissions are requested
- **Container Registry**: Images are public by default (can be made private in repository settings)

## Support

If you encounter issues:

1. Check the [GitHub Actions documentation](https://docs.github.com/en/actions)
2. Review the [semantic-release documentation](https://semantic-release.gitbook.io/)
3. Check the workflow logs in the **Actions** tab
4. Ensure all prerequisites are met 
# Semantic Versioning Setup

This document explains how Servobill's semantic versioning system works and how to use it effectively.

## Overview

Servobill uses [semantic-release](https://semantic-release.gitbook.io/) to automatically version and release the application based on conventional commit messages. When you push to the main branch, the system:

1. Analyzes commit messages to determine version changes
2. Runs linting and tests
3. Builds and pushes Docker images to GitHub Container Registry
4. Creates a GitHub release with release notes
5. Updates the CHANGELOG.md file

## Commit Message Convention

Use conventional commit messages to trigger appropriate version bumps:

### Commit Types

| Type | Description | Version Bump |
|------|-------------|--------------|
| `feat:` | New features | Minor |
| `fix:` | Bug fixes | Patch |
| `docs:` | Documentation changes | Patch |
| `style:` | Code style changes (formatting, etc.) | Patch |
| `refactor:` | Code refactoring | Patch |
| `perf:` | Performance improvements | Patch |
| `test:` | Adding or updating tests | Patch |
| `build:` | Build system changes | Patch |
| `ci:` | CI/CD changes | Patch |
| `chore:` | Maintenance tasks | Patch |
| `revert:` | Reverting previous commits | Patch |

### Breaking Changes

To indicate a breaking change that requires a major version bump, include `BREAKING CHANGE:` in your commit message:

```
feat: redesign user interface

BREAKING CHANGE: API endpoints have changed and are no longer backward compatible
```

### Examples

```bash
# Patch release (1.0.0 -> 1.0.1)
git commit -m "fix: resolve login authentication issue"

# Minor release (1.0.0 -> 1.1.0)
git commit -m "feat: add invoice template customization"

# Major release (1.0.0 -> 2.0.0)
git commit -m "feat: redesign user interface

BREAKING CHANGE: API endpoints have changed and require migration"
```

## Workflow

### 1. Development

1. Create a feature branch from main
2. Make your changes
3. Use conventional commit messages
4. Push to your branch

### 2. Release Process

1. Merge your branch to main
2. GitHub Actions automatically:
   - Runs linting and tests
   - Analyzes commits for version changes
   - Builds Docker images
   - Creates a release
   - Updates CHANGELOG.md

### 3. Deployment

After a release is created, you can deploy using:

```bash
# Deploy latest version
./deploy/dockerized/deploy.sh

# Deploy specific version
VERSION=1.2.3 ./deploy/dockerized/deploy.sh
```

## Configuration

The semantic versioning is configured in `.releaserc.json`:

- **Branches**: Only the `main` branch triggers releases
- **Plugins**: Uses standard semantic-release plugins
- **Changelog**: Automatically generates CHANGELOG.md
- **GitHub**: Creates releases with assets
- **NPM**: Updates package.json version (but doesn't publish)

## GitHub Actions Workflow

The workflow (`.github/workflows/release.yml`) includes:

1. **Lint Job**: Runs ESLint and tests
2. **Release Job**: Analyzes commits and creates releases
3. **Docker Job**: Builds and pushes Docker images
4. **Create Release Job**: Creates GitHub release with assets

## Docker Images

Each release creates two Docker images:

- `ghcr.io/your-username/servobill/app:version` - Next.js application
- `ghcr.io/your-username/servobill/workers:version` - Background workers

Images are tagged with:
- Semantic version (e.g., `1.2.3`)
- Major version (e.g., `1`)
- Minor version (e.g., `1.2`)
- `latest` (for main branch)

## Troubleshooting

### No Release Created

If no release is created, check:

1. **Commit Messages**: Ensure you're using conventional commit format
2. **Branch**: Only pushes to `main` trigger releases
3. **Workflow**: Check GitHub Actions for any failures

### Manual Release

To create a release manually:

1. Go to GitHub Actions
2. Select the "Semantic Release" workflow
3. Click "Run workflow"
4. Select the main branch

### Version Conflicts

If you need to force a specific version:

1. Create a commit with the desired version in the message
2. Use `BREAKING CHANGE:` for major versions
3. Use `feat:` for minor versions
4. Use `fix:` for patch versions

## Best Practices

1. **Use Conventional Commits**: Always use the conventional commit format
2. **Small, Focused Commits**: Make small, focused commits with clear messages
3. **Test Before Release**: Ensure all tests pass before merging to main
4. **Review Release Notes**: Check the generated release notes for accuracy
5. **Tag Important Releases**: Consider manually tagging important releases

## Migration from Manual Versioning

If you're migrating from manual versioning:

1. Set the current version in `package.json`
2. Create a commit with the current version as a tag
3. Start using conventional commits
4. The system will automatically handle future releases

## Support

For issues with semantic versioning:

1. Check the [semantic-release documentation](https://semantic-release.gitbook.io/)
2. Review GitHub Actions logs
3. Check the `.releaserc.json` configuration
4. Ensure commit messages follow the convention 
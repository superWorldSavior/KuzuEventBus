# Publishing the SDK to npm

## Prerequisites

1. Create an npm account at https://npmjs.com
2. Login locally: `npm login`

## Steps to Publish

```bash
cd sdk/typescript

# 1. Install dependencies
npm install

# 2. Build the SDK
npm run build

# 3. Test the build
npm pack  # Creates a .tgz file to verify content

# 4. Publish to npm (first time)
npm publish --access public

# 5. For updates, increment version first
npm version patch  # 0.1.0 -> 0.1.1
npm publish
```

## Usage After Publishing

Users can install via:

```bash
npm install @kuzu-eventbus/sdk
```

## Alternative: Install from Git

If you don't want to publish to npm, users can install directly from GitHub:

```bash
# Install from main branch
npm install github:YOUR_USERNAME/KuzuEventBus#main:sdk/typescript

# Or specific tag
npm install github:YOUR_USERNAME/KuzuEventBus#v0.1.0:sdk/typescript
```

## Alternative: Private npm Registry

For private projects, use a private registry like:
- Verdaccio (self-hosted)
- GitHub Packages
- npm private packages

### GitHub Packages Example

1. Update package.json:
```json
{
  "name": "@YOUR_USERNAME/kuzu-eventbus-sdk",
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

2. Authenticate with GitHub token:
```bash
echo "//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN" >> ~/.npmrc
```

3. Publish:
```bash
npm publish
```

4. Install in projects:
```bash
npm install @YOUR_USERNAME/kuzu-eventbus-sdk
```

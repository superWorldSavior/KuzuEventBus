# Publishing the SDK

## 🎯 Options de Publication

Le SDK `@kuzu-eventbus/sdk` v0.2.0 peut être publié de 3 façons :

### 1. 🆓 GitHub Packages (Recommandé - Privé Gratuit)
### 2. 📦 npm Registry Public (Gratuit - Tout public)
### 3. 💰 npm Registry Privé (Payant - ~$7/mois)

---

## ✅ Option 1: GitHub Packages (Privé Gratuit)

**Avantages**: Privé par défaut, gratuit, intégré GitHub

### Étapes

```bash
cd sdk/typescript

# 1. Créer un GitHub Personal Access Token
# Aller sur: https://github.com/settings/tokens/new
# Permissions requises: write:packages, read:packages

# 2. Configurer .npmrc (copier depuis .npmrc.example)
cp .npmrc.example .npmrc
# Éditer .npmrc et remplacer YOUR_GITHUB_TOKEN par ton token

# 3. Build
npm install
npm run build

# 4. Publier
npm publish

# 5. Pour les mises à jour
npm version patch  # 0.2.0 -> 0.2.1
npm publish
```

### Installation (Utilisateurs)

Les utilisateurs doivent configurer npm pour lire depuis GitHub Packages :

```bash
# Dans le projet qui veut installer le SDK
echo "@kuzu-eventbus:registry=https://npm.pkg.github.com" >> .npmrc

# Puis installer
npm install @kuzu-eventbus/sdk
```

---

## 📦 Option 2: npm Public (Gratuit)

**Avantages**: Simple, accessible partout
**Inconvénient**: Tout le monde peut voir et installer

```bash
cd sdk/typescript

# 1. Login npm
npm login

# 2. Build
npm install
npm run build

# 3. Publier en public
npm publish --access public

# Installation (tout le monde)
npm install @kuzu-eventbus/sdk
```

---

## 💰 Option 3: npm Privé

**Coût**: ~$7/mois pour organisation npm privée

```bash
# 1. Créer org npm privée sur npmjs.com
# 2. Login
npm login

# 3. Publier (privé par défaut pour scoped packages)
npm publish --access restricted
```

---

## 🔗 Option 4: Installation depuis Git (Sans Registry)

**Le plus simple pour démarrer** - pas besoin de publier :

```bash
# Dans ton projet
npm install git+https://github.com/YOUR_ORG/KuzuEventBus.git#main:sdk/typescript

# Ou avec un tag spécifique
npm install git+https://github.com/YOUR_ORG/KuzuEventBus.git#sdk-v0.2.0:sdk/typescript
```

**Pour créer un tag de release** :
```bash
git tag sdk-v0.2.0
git push origin sdk-v0.2.0
```

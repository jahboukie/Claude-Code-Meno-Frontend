# Metiscore Health Monorepo - Quick Start

## 🚀 One-Command Setup

```powershell
.\setup.ps1
```

## 🏗️ Monorepo Architecture

This is a **unified monorepo** with shared dependencies to eliminate bloat and enable scalable development.

### **Shared Dependencies at Root Level**
- All `react`, `next`, `firebase`, `typescript` dependencies are at the root
- Apps only declare workspace-specific dependencies
- Zero dependency duplication

### **Workspace Structure**
```
metiscorehealth-ecosystem/
├── apps/
│   ├── meno-wellness/          # Primary wellness app (port 3000)
│   └── partner-support/        # Partner dashboard (port 3001)
├── shared/
│   ├── types/                  # Shared TypeScript types
│   └── ui/                     # Shared React components & security utils
└── package.json               # Root dependencies & scripts
```

## 🛠️ Development Workflow

### **Unified Development (Recommended)**
```powershell
pnpm dev
```
- Starts both apps simultaneously
- Unified logging with color-coded output
- Perfect for full-stack development

### **Individual App Development**
```powershell
pnpm dev:meno       # Wellness app only
pnpm dev:partner    # Partner app only
```

### **Production Build**
```powershell
pnpm build          # Builds all apps
pnpm build:meno     # Build wellness app only
pnpm build:partner  # Build partner app only
```

## 📁 Adding New Apps

1. Create new app in `apps/new-app-name/`
2. Add workspace dependency: `"@metiscore/types": "workspace:*"`
3. Add script to root `package.json`:
   ```json
   "dev:new-app": "pnpm --filter new-app-name dev"
   ```
4. Dependencies automatically shared from root

## 🔧 Shared Components

All apps can import from shared packages:
```typescript
import { ConsentManager, SecurityUtils } from '@metiscore/ui';
import { UserConsent, AuditLog } from '@metiscore/types';
```

## 🎯 Benefits

✅ **No Dependency Bloat** - Single `node_modules` at root  
✅ **Consistent Versions** - All apps use same library versions  
✅ **Efficient Development** - Unified workflow for multiple apps  
✅ **Easy Scaling** - Add new apps without complexity  
✅ **Shared Security** - Compliance features available to all apps  

## 🔗 Next Steps

1. Run `.\setup.ps1`
2. Update `.env.local` files
3. Run `pnpm dev`
4. Access apps at http://localhost:3000 and http://localhost:3001
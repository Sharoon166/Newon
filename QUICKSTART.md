# 🚀 Authentication Quick Start

## Setup in 3 Steps

### 1️⃣ Start the Server
```bash
npm run dev
```

### 2️⃣ Create Admin User
Open your browser and go to:
```
http://localhost:3000/setup
```

Click **"Create Admin User"**

### 3️⃣ Login
Go to:
```
http://localhost:3000
```

Login with:
- **Email**: `admin@newon.com`
- **Password**: `admin123`

---

## ✅ What You Get

- 🔐 Full authentication system with NextAuth
- 👥 Two roles: **Admin** (full access) & **Staff** (limited access)
- 🛡️ Protected routes and components
- 📊 Staff management page at `/staff` (admin only)
- 🎨 User menu in header with logout

---

## 📚 Documentation

- **[AUTH_SETUP.md](docs/AUTH_SETUP.md)** - Complete setup guide
- **[USAGE_EXAMPLES.md](docs/USAGE_EXAMPLES.md)** - Code examples
- **[AUTHENTICATION_SUMMARY.md](docs/AUTHENTICATION_SUMMARY.md)** - Full overview

---

## 🔑 Admin Credentials

After setup, use these credentials:

```
Email: admin@newon.com
Password: admin123
```

⚠️ **Change the password after first login!**

---

## 🎯 Quick Examples

### Protect a Page (Server)
```typescript
import { requireAuth } from '@/lib/auth-utils';

export default async function Page() {
  await requireAuth(); // Redirects if not logged in
  return <YourComponent />;
}
```

### Show/Hide Based on Permission (Client)
```typescript
import { PermissionGate } from '@/components/auth/permission-gate';

<PermissionGate permission="edit:inventory">
  <EditButton />
</PermissionGate>
```

### Check Permission in Component
```typescript
import { usePermission } from '@/hooks/use-permission';

const canEdit = usePermission('edit:inventory');
```

---

## 🛠️ Key Routes

- `/auth/login` - Login page
- `/setup` - Create first admin (one-time use)
- `/staff` - Manage staff members (admin only)
- `/unauthorized` - Access denied page

---

## 💡 Tips

1. The middleware automatically protects all routes except auth pages
2. Admin users have full access to everything
3. Staff users have limited permissions (view only mostly)
4. Customize permissions in `src/lib/rbac.ts`
5. User menu is in the top-right corner of the dashboard

---

**Need help?** Check the full documentation in the `docs/` folder!

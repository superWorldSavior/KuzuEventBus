# Demo User Credentials

For development and testing purposes, the following demo users are available:

## Default Demo User

**Email:** `demo@kuzu-eventbus.com`  
**Password:** `demo123`  
**Role:** Admin  
**Description:** Full access to all features - ideal for exploring the platform

## Quick Login Options

### Option 1: Use the "Try Demo Account" Button

- Click the blue "Try Demo Account" button on the login page
- Automatically logs in with the default demo user

### Option 2: Manual Login

- Enter the demo credentials manually in the login form
- Email: `demo@kuzu-eventbus.com`
- Password: `demo123`

### Option 3: Any Valid Email

- For development, any valid email format with any password will work
- Example: `test@example.com` with password `password123`

## Environment Configuration

Demo user credentials can be customized via environment variables:

```bash
# In .env.local
VITE_DEMO_EMAIL=demo@kuzu-eventbus.com
VITE_DEMO_PASSWORD=demo123
```

## Features Available

Once logged in with the demo user, you can:

- ✅ **Explore Dashboard** - View metrics and system overview
- ✅ **Navigate Sidebar** - Test responsive navigation and routing
- ✅ **View Widgets** - See database stats, recent queries, and activity timeline
- ✅ **Responsive Design** - Test mobile and desktop layouts
- ✅ **Mock Data** - Interact with realistic sample data

## Development Notes

- Authentication is currently **mocked** for frontend development
- All API calls are **simulated** with mock data
- User sessions **persist** across browser refreshes
- **Logout** functionality clears the session

---

**Ready to explore!** Use any of the login methods above to access the Kuzu EventBus dashboard.

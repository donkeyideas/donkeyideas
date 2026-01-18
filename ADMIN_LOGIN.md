# Admin Login Credentials

## Default Admin Account

Use these credentials to log into the admin dashboard:

```
Email: info@donkeyideas.com
Password: Donkey2026!
```

## How to Login

1. Navigate to: http://localhost:3001/login
2. Enter the email and password above
3. Click "Sign In"
4. You'll be redirected to the admin dashboard

## Important Security Notes

⚠️ **Change this password after first login!**

To change your password:
1. Go to Settings page in the admin dashboard
2. Update your password
3. Never share your credentials

## If You Need to Reset/Recreate Admin User

If you've lost access or need to recreate the admin user:

### Option 1: Run the seed script
```powershell
cd packages/database
npm run db:seed
```

### Option 2: Use the PowerShell script
```powershell
.\CREATE_ADMIN.ps1
```

---

**Created**: January 2026  
**Last Updated**: January 2026

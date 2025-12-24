# Troubleshooting Dev Server Hanging Issue

## Steps to Fix:

1. **Completely stop all Node processes:**
   ```powershell
   Get-Process node | Stop-Process -Force
   ```

2. **Clear ALL caches:**
   ```powershell
   cd C:\Users\beltr\Donkey.Ideas\apps\dashboard
   Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
   Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
   ```

3. **Try building instead of dev mode to see actual errors:**
   ```powershell
   npm run build
   ```
   This will show you the exact compilation error.

4. **If build works, try dev with minimal changes:**
   ```powershell
   npm run dev
   ```

5. **Check for specific file issues:**
   - The issue might be in `src/app/app/financials/page.tsx`
   - Or in `src/app/api/companies/[id]/transactions/route.ts`
   - Try temporarily commenting out the `loadFinancials` call in useEffect

6. **Alternative: Use a different port:**
   ```powershell
   npx next dev -p 3002
   ```





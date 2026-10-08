# Cookie's Learning Burrow (Srimaa's account, synced everywhere)

One account, "Srimaa Biswas". Progress (stars, carrots, pets, stickers, times-tables memory) is saved on the server,
so it follows her to every iPad, phone or computer, and it survives clearing Safari, app updates and new devices.
When the account is first created she gets a **100 carrot gift**.

## What is in here
- `public/` the app (one `index.html`), icons and the Home Screen manifest
- `api/` small serverless functions: `setup` (create the account, once), `login`, `data` (save and load), `snaps` (server safety copies), `reset` (owner password reset), `status`
- Storage: **Upstash Redis** (free tier is plenty) added through Vercel

## Deploy (about 10 minutes)
1. Put this folder in a new GitHub repository (or run `npx vercel` inside the folder).
2. In Vercel: **Add New > Project**, import the repository. No build settings are needed (leave Framework as "Other").
3. In the project: **Storage > Create Database > Upstash for Redis** (Marketplace) and connect it to the project.
   This adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL` / `_TOKEN`) automatically.
4. **Settings > Environment Variables**, add:
   - `SESSION_SECRET` a long random string (32+ characters). Required.
   - `SETUP_CODE` a short secret you will type once when creating the account. Recommended, so no stranger can claim the account first.
   - `RESET_KEY` optional, only needed if you ever forget the password.
5. **Redeploy** (Deployments > the latest > Redeploy) so the variables take effect.
6. Open the site on the iPad. It shows **Create Srimaa's account**. Enter an email, a password and the setup code.
   Srimaa starts with 100 carrots. On every other device, open the same address and log in.
7. On the iPad, in Safari: Share > **Add to Home Screen**. Log in once on each device.

## How syncing works
- The app saves on the device first (so it works with no internet), then sends to the server a moment later.
- If two devices both played, the server merges them: stars and carrots add up, stickers/pets/hats/clothes/paints are combined, garden upgrade levels keep the higher value,
  best scores keep the higher value. Nothing is overwritten with an older copy.
- The server keeps a safety copy once a day for seven days. Restore one in **Grown-ups corner > Account and sync**.
- **Log out** is inside Grown-ups corner (behind the multiplication question). It saves first, then clears the device.

## If you forget the password
Set `RESET_KEY` in Vercel, redeploy, then run (replace the address, key and password):
```
curl -X POST https://YOUR-SITE.vercel.app/api/reset -H "content-type: application/json" -d '{"key":"YOUR_RESET_KEY","password":"a new password"}'
```

## Carrots and the burrow
- Every right answer earns **3 carrots** (6 on Year 3 and 4 work). The Carrot Windmill upgrade adds more.
- Burrow shop: hats, clothes, furniture, pets, wall and floor paints. **Garden upgrades** (carrot patch, wishing well, windmill, pet treehouse, star greenhouse, rainbow bridge) are unlocked and upgraded with carrots.
- New save fields all have safe defaults, so existing progress loads unchanged.

## Privacy
Only the email, a salted password hash (scrypt), and the game progress are stored. No analytics, no tracking, no ads.
The speech feature (Read to me) uses the device's own voice.

## Local test
`node test.js` runs the whole account flow against a mock database (setup, login, two-device merge, offline, restore, lockout).

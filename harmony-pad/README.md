# Hanglian Harmony Pad

HarmonyOS ArkTS native MatePad app shell for the Hanglian MVP.

## Scope

- Stage model ArkTS app.
- Tablet-first, landscape-oriented layout.
- Login flow backed by `API_BASE_URL` that already includes `/api`:
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `POST /auth/logout`
  - `GET /auth/me`
- Shared API client with bearer token injection and refresh-on-401 handling.

## Configuration

Set the Sealos public HTTPS backend URL in:

`entry/src/main/ets/services/AppConfig.ets`

```ts
static readonly API_BASE_URL: string = 'https://sealos-api.example.com/api';
```

Agent S should replace this placeholder with the final HTTPS API base URL.

## Build

Open `harmony-pad/` in DevEco Studio and sync the HarmonyOS SDK/Hvigor versions for the local toolchain. The project is prepared for HarmonyOS tablet targets using API 12-style Stage model configuration.

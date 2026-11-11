# Optional AI Build Coach planning integration

This integration adds an explicit **Plan first with AI Build Coach** option to
sandboxd's new-app composer. The normal prompt-to-preview flow is unchanged.

## Setup

Create a developer API key in AI Build Coach, then set these two variables on
the **sandboxd control-plane only** (for Docker Compose, add them to .env):

```sh
SANDBOXD_BUILD_COACH_URL=https://build.davidporkka.com
SANDBOXD_BUILD_COACH_API_KEY=your-private-developer-key
```

Restart only the sandboxd control-plane after configuring. The toggle appears
when both values are present. A HTTPS origin is required except for loopback
testing; do not append `/api` to the origin. Configure control-plane authentication
before enabling this feature on any shared deployment.

## Behavior

1. A user checks **Plan first**, enters the problem, audience, and MVP features,
   and submits the idea (500 characters maximum in planning mode).
2. The sandboxd API calls AI Build Coach `POST /api/v1/briefs` with a server-side
   `x-api-key`; the authenticated creation response contains the generated
   documents directly, without any public project read.
3. Only implementation-related documents are included in a bounded (24 KB
   maximum additional context) agent prompt. The market-validation and other
   non-implementation documents are intentionally excluded.
4. Only after successful planning does sandboxd create an app and start a sandbox.
   On error, app creation does not proceed; users can uncheck the option and
   use normal generation.

The Build Coach key is never sent to the browser, an agent prompt, or a coding
sandbox. The server includes generic errors without upstream response bodies.

**Current limitations:** This is a first-party integration for trusted operators,
not a public multi-tenant billing proxy. The external Build Coach service has
its own request quota; its project read and export routes must be ownership-
checked before accepting confidential prompts. A companion security PR in
`dev-plan` adds those checks. Redirects are not followed with the developer key.
The planning step is synchronous and can take tens of seconds; publication,
strong multi-tenant sandbox isolation, and managed databases are separate work.

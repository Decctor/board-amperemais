# AI Agent MCP Mutations — Temporary Implementation Plan

> Working checklist for the first MCP mutation capabilities. This file is temporary and may be
> removed or converted into permanent documentation after the implementation is complete.

## 1. Objective

Add carefully scoped MCP mutations for campaign drafts and message templates while preserving the
existing organization tenancy, entity schemas, UI workflows, Meta integration, and audit trail.

The first release must favor reversible local changes. Campaign activation and submission to Meta
are separate external-effect operations with separate authorization and approval requirements.

## 2. Decisions already settled

- [x] Current MCP tools are read-only; mutation support is new work.
- [x] MCP principals receive mutation scopes explicitly. Platform access does not imply organization
      write access.
- [x] Each mutation-capable MCP principal has one administrator-configured responsible user.
- [x] Existing `autorId` fields continue to receive a user ID; no broad entity-authorship remodel is
      planned for this phase.
- [x] The MCP audit trail records the actual principal and credential that initiated the operation.
- [x] Member discovery may be used to select a business owner/responsible member, but never to let
      the model impersonate an arbitrary audit author.
- [x] Message-template media remains part of the existing template content; no asset table or general
      asset domain will be introduced.
- [x] The stable media handoff identifier is an organization-scoped Supabase Storage object path.
- [x] The server generates storage paths. Agents may carry returned paths between tools but may not
      choose arbitrary paths or organization prefixes.
- [x] The MCP media-path field is input-only. The implementation resolves it to the canonical public
      Storage URL and persists that URL in the existing
      `conteudo.cabecalho.conteudoMidiaUrl` field.
- [x] The existing `conteudo.cabecalho.conteudoMidiaHandle` continues to store the Meta header handle.
- [x] MCP template mutations must not accept caller-controlled `conteudoMidiaUrl` values.

### Language note

If the temporary media path is nested inside entity-shaped template content, use a Portuguese data
field such as `conteudoMidiaCaminho`, not `conteudoMidiaPath`. Function names, tool names, and
operation-envelope fields remain English according to `CLAUDE.md`.

## 3. Responsible-user attribution

### Principal configuration

- [x] Add nullable `responsavelUsuarioId` to the MCP access-principal model.
- [x] Add the corresponding relationship/index where appropriate.
- [x] Add migration and schema validation.
- [x] Allow organization administrators to assign or change the responsible user.
- [x] Limit selection to members of the relevant organization.
- [ ] For platform principals, define whether responsibility is global or selected per organization.
      Preferred first implementation: require a responsible user valid for the target organization.
- [x] Show clear UI copy: actions through this MCP principal are attributed to the selected user.
- [x] Do not rewrite historical records when the configured responsible user changes.

### Runtime enforcement

- [x] Resolve the responsible user before exposing or executing mutation tools.
- [x] Verify that the user still belongs to the target organization.
- [x] Hide mutation tools, or return a configuration error, when no valid responsible user exists.
- [x] Supply the resolved user to existing `autorId` fields.
- [x] Record `principalId`, `credentialId`, responsible user, tool name, input hash, timestamp, and
      resulting resource identifiers in the MCP operation/audit record.

### Member discovery

- [x] Add `list_members` behind an exact organization-member read scope.
- [x] Return organization members (the current membership model has no active-status column).
- [x] Return member ID, display name, and a minimally disclosed email.
- [x] Document that member selection is for business responsibility fields, not audit impersonation.

## 4. Shared mutation architecture

- [ ] Extract campaign write logic from `app/api/campaigns/route.ts` into a reusable lifecycle module.
- [ ] Extract message-template write/orchestration logic from its route files into a reusable lifecycle
      module.
- [ ] Keep HTTP routes and MCP tools as shallow adapters over the same implementations.
- [x] Pass trusted `{ organizationId, actor }` context explicitly; do not fabricate a human session.
- [x] Ensure all referenced entities are scoped to the target organization.
- [x] Add idempotency keys and durable operation results for mutation tools.
- [x] Keep submission per phone so every external operation has one structured outcome.

## 5. Campaign capabilities

### First increment

- [x] `get_campaign_configuration`
- [x] `create_campaign_draft`
- [x] `update_campaign_draft`
- [x] `validate_campaign_draft`
- [x] Ensure create/update cannot activate, schedule, enqueue, or send a campaign.
- [x] Persist campaign plus segmentations transactionally.
- [x] Fix message-template lookup so it is scoped to the organization.
- [ ] Define a narrow model-facing schema instead of exposing the full entity schema.

### External-effect increment

- [x] `activate_campaign`
- [x] Give activation a scope separate from campaign draft writes.
- [x] Put activation behind `action_approval_requests`.
- [x] Bind approval to a hash of the complete campaign configuration.
- [x] Return the resulting activation status explicitly.

## 6. Message-template capabilities

### Read and draft increment

- [x] `list_message_templates`
- [x] `get_message_template`
- [x] `list_whatsapp_template_destinations`
- [x] `create_message_template_draft`
- [x] `update_message_template_draft`
- [x] Draft creation must default to local-only and must never submit to Meta implicitly.
- [ ] Return per-phone approval status, quality, external template ID, last synchronization time, and
      summarized/worst status where available.

### Meta lifecycle increment

- [x] `submit_message_template_for_approval`
- [x] `sync_message_template_status`
- [x] Give Meta submission a scope separate from template draft writes.
- [x] Put submission behind `action_approval_requests`.
- [x] Never describe successful submission as approval.
- [x] Report pending review and one phone outcome per operation explicitly.
- [x] Preserve local media URL/handle information when synchronizing Meta content.
- [ ] Resolve local/remote divergence rules for name, language, category, and content updates.

## 7. Template media upload without an asset table

### Storage contract

- [x] Use the existing public `files` bucket.
- [x] Generate paths using an organization-owned namespace, for example:
      `organizations/{organizationId}/agent-message-template-media/{uploadId}/{sanitizedFileName}`.
- [x] Treat the path as an opaque MCP handoff value.
- [x] Reject paths that do not exactly match the authenticated organization's expected prefix.
- [x] Never authorize access based only on a prefix supplied by the caller; construct/compare against
      the authenticated organization server-side.

### Upload tools

- [x] Add `create_message_template_media_upload`.
- [x] Accept expected filename, MIME, byte size, and header purpose.
- [x] Generate the random upload ID and complete Storage path server-side.
- [x] Return a signed upload URL, opaque path, expiration, and expected constraints.
- [x] Add `complete_message_template_media_upload`.
- [x] Confirm that the object exists at the issued organization path.
- [x] Validate actual file signature/MIME, byte size, and image dimensions.
- [x] Reject unsupported formats, oversized objects, malformed images, and path mismatches.
- [x] Return the opaque path plus its canonical public URL.
- [x] Revalidate critical media constraints when the path enters a template mutation.

### Template mutation mapping

- [x] Accept `conteudoMidiaCaminho` only in the MCP input schema.
- [x] Do not add it to the persisted `MessageTemplateContentSchema`.
- [x] Resolve the path through the trusted Storage adapter.
- [x] Derive the canonical public URL server-side.
- [x] Map that URL to existing `conteudoMidiaUrl` before persistence.
- [x] Clear or refresh `conteudoMidiaHandle` when the referenced media changes.
- [x] Ensure HTTP/UI behavior using existing `conteudoMidiaUrl` remains unchanged.
- [x] Harden the current URL fetch path to the configured Supabase public files bucket.

### Lifecycle limitations accepted for this phase

- [x] No relational usage tracking for uploaded media.
- [x] No durable asset validation record.
- [x] No general reusable asset library.
- [ ] Decide a conservative cleanup rule for abandoned agent uploads.
- [ ] Do not automatically delete media referenced by a message template.

## 8. Exact access scopes

- [x] `agent:members:read`
- [x] `agent:campaigns:write`
- [x] `agent:campaigns:activate`
- [x] `agent:message-templates:read`
- [x] `agent:message-templates:write`
- [x] `agent:message-templates:submit`
- [x] `agent:message-template-media:write`
- [x] Confirm ORG principals can mutate only their bound organization.
- [x] Confirm platform principals must provide a target organization and possess the exact organization
      and the exact organization mutation scope.

## 9. Suggested delivery order

- [x] Phase 1 — responsible-user principal configuration and mutation authorization context.
- [x] Phase 2 — member discovery and shared mutation audit/idempotency support.
- [ ] Phase 3 — campaign lifecycle extraction and campaign draft tools.
- [ ] Phase 4 — message-template lifecycle extraction and read/draft tools.
- [x] Phase 5 — organization-scoped Storage upload and media mapping.
- [x] Phase 6 — approval-backed campaign activation and Meta submission.
- [ ] Phase 7 — Meta synchronization, quality/status reporting, and partial-failure hardening.
- [ ] Phase 8 — tests, documentation, and real-client validation in Claude Code/Codex.

## 10. Verification checklist

- [x] Unit tests for scope filtering and mutation-tool visibility.
- [ ] Unit tests for responsible-user resolution, inactive users, and cross-organization rejection.
- [ ] Unit tests for idempotent replay and conflicting inputs.
- [ ] Integration tests for transactional campaign draft writes.
- [ ] Integration tests for template draft creation without Meta submission.
- [ ] Storage tests for generated path ownership and signed upload expiration.
- [ ] Security tests for traversal, alternate organization prefixes, spoofed MIME, oversized files,
      malformed images, redirect attempts, and direct URL injection.
- [ ] Meta adapter tests for pending, approved, rejected, quality changes, and partial phone failures.
- [ ] Verify existing HTTP/UI flows continue to use the same persisted template fields.
- [x] Run the MCP protocol/tool tests. Database-backed mutation validation remains pending until the
      migration is applied to a configured environment.
- [ ] Validate at least one generated-image header workflow end to end with a real MCP client.

## 11. Open decisions

- [ ] For platform principals, determine how a valid responsible user is assigned for each target
      organization without allowing arbitrary model-selected authorship.
- [ ] Decide whether local draft writes require approval or only activation/Meta submission does.
- [ ] Decide abandoned-upload retention duration.
- [ ] Confirm which MCP clients can perform a direct HTTP PUT to a signed Storage upload URL.

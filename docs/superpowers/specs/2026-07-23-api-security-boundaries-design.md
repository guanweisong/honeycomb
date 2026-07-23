# API Security Boundaries Design

## Goal

Close the remaining high-priority API data exposure and authorization gaps
without introducing a heavyweight repository architecture.

## Architecture

Use the project's existing lightweight data access layer pattern:

```text
tRPC router -> service/DAL -> Drizzle ORM
                         \-> explicit response DTO
```

Routers declare authentication and validate input. Services enforce resource
visibility, ownership relationships, and other business invariants close to the
database. Public responses use explicit field projections or DTO mappers and
never serialize complete database records.

## User Safety

- `user.create` and `user.update` return an explicit safe user DTO containing
  only `id`, `email`, `level`, `name`, `status`, `createdAt`, and `updatedAt`.
- Password hashes must not be selected into an API response.
- `user.index` is restricted to `ADMIN` and `EDITOR`; `GUEST` cannot enumerate
  user emails.

## Tag Visibility

- `tag.index` remains public and always enforces `status = ENABLE`, ignoring any
  caller attempt to request disabled tags.
- `tag.adminIndex` is protected for `ADMIN` and `EDITOR` and may query any
  status.
- Both procedures call one shared tag list service using
  `ResourceVisibility`.
- All admin tag consumers use `tag.adminIndex`; blog consumers keep using
  `tag.index`.

## Comment Safety

### Public DTO

`comment.create` returns the same safe public shape used for rendered comments:

- `id`
- `author`
- `content`
- `site`
- `parentId`
- `status`
- `createdAt`
- derived `avatar`

The response never contains `email`, `ip`, or `userAgent`. Internal email
notification queries may still load private fields, but those objects never
cross the API response boundary.

### Target Validation

Before listing or creating comments:

- A post target must exist, be `PUBLISHED`, and have
  `commentStatus = ENABLE`.
- A page target must exist, be `PUBLISHED`, and have
  `commentStatus = ENABLE`.
- A custom target is treated as a post-backed resource and must satisfy the
  same published/comment-enabled rules.
- An unavailable target produces `NOT_FOUND`; a published target with comments
  disabled produces `FORBIDDEN`.

Before creating a reply, the parent comment must reference exactly the same
`postId`, `pageId`, and `customId` tuple as the new comment. A mismatch produces
`BAD_REQUEST` and no insert or email notification occurs.

Comment input must identify exactly one target field among `postId`, `pageId`,
and `customId`.

## Published-Content Mutations and Lookups

- `post.incrementViews` updates only `PUBLISHED` posts.
- `page.incrementViews` updates only `PUBLISHED` pages.
- `post.getCategoryId` returns a category only for a `PUBLISHED` post.
- Missing or non-public targets use the existing null/undefined behavior where
  compatible; view mutations return `NOT_FOUND` when nothing was updated.

## Abuse Protection Scope

The existing CAPTCHA remains required for comment creation. Rate limiting and
view deduplication are valuable follow-up controls, but they require deployment
and product policy decisions and are outside this change.

## Testing

Tests are written before implementation and must demonstrate:

- password hashes are absent from user mutation responses;
- `GUEST` cannot call `user.index`;
- public tag queries force `ENABLE`, while unauthenticated callers cannot use
  `tag.adminIndex`;
- comment creation returns no private fields;
- unpublished, comment-disabled, multi-target, and cross-resource reply
  attempts are rejected;
- comment listing cannot expose comments attached to unavailable targets;
- public post/page helpers include `PUBLISHED` in their database predicates.

Completion requires passing targeted tests, full TypeScript checking, ESLint,
the complete unit test suite, and a production Next.js build.

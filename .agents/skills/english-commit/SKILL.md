---
name: English Commit Generator
description: A skill to analyze code changes and generate standard, high-quality conventional English commit messages.
---

# English Commit Generator (英文 Commit 生成器)

When the user wants to commit their code or asks you to generate a commit message, use this skill to create a high-quality, conventional English commit message.

## Instructions

Please follow these steps strictly when the user invokes this skill:

1. **Check Code Status:**
   - Run `git diff --cached` to see what changes are staged.
   - If the output is empty, run `git diff` or `git status` to check unstaged changes.
   - If there are unstaged changes, ask the user if they want to stage them first, or proactively propose a commit message based on the unstaged changes.

2. **Determine the Conventional Commit Type:**
   Analyze the diff and select the most appropriate type:
   - `feat`: A new feature
   - `fix`: A bug fix
   - `docs`: Documentation only changes
   - `style`: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc.)
   - `refactor`: A code change that neither fixes a bug nor adds a feature
   - `perf`: A code change that improves performance
   - `test`: Adding missing tests or correcting existing tests
   - `chore`: Changes to the build process or auxiliary tools and libraries such as documentation generation
   
   *Optional*: Determine the `<scope>` based on the directory or component being modified (e.g., `api`, `ui`, `deps`).

3. **Draft the Commit Message (in English):**
   - **Subject Line**: Use the format `<type>(<scope>): <subject>`. 
     - Keep it under 50 characters if possible.
     - Use the **imperative mood** (e.g., "add" instead of "added" or "adds").
     - Do not capitalize the first letter.
     - Do not end with a period.
   - **Body (Optional but recommended for complex changes)**: 
     - Leave one blank line after the subject.
     - Explain the *what* and *why* of the change (e.g., "This prevents X from crashing when Y happens.").
     - Wrap at 72 characters.

4. **Execute or Propose:**
   Present the commit message to the user. You can provide a turbo step so they can easily execute it:

   ```bash
   // turbo
   git commit -m "<type>(<scope>): <subject>" -m "<body>"
   ```

## Example Best Practices

**Good:**
`feat(auth): implement edge runtime support for trpc routers`

**Bad:**
`fixed the login bug` (Does not follow conventional commits, wrong tense)

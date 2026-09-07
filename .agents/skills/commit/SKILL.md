---
name: commit
description: "Use when writing commit messages. Enforces conventional commit format with capitalized descriptions."
---

# Commit Message Guidelines

Use these guidelines whenever writing or generating git commit messages.

## Format Rules

### 1. Subject Line (First Line)
- Format: `<type>(<scope>): <Description>`
- Example: `feat(abc): Make abc`
- **Capitalization**: The `<Description>` **MUST start with a capital letter**.
- **Punctuation**: Do not end the subject line with a period (`.`).
- **Length**: Keep under 72 characters (ideally ~50 characters).
- **Mood**: Use the imperative mood (e.g., "Make abc", "Add feature", "Fix issue").

### 2. Type Conventions
- `feat`: A new feature
- `fix`: A bug fix
- `chore`: Maintenance, dependencies, build, or configuration changes
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (formatting, white-space, etc.)
- `test`: Adding or correcting tests

### 3. Body (Optional)
- Separate the subject from the body with a single blank line.
- Use bullet points (`-`) to detail multiple changes or explain the reasoning behind them.

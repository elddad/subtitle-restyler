#!/bin/sh
# Shared guard: only GitHub no-reply addresses may appear in commits. Anything
# else (a personal Gmail, a work address) is published verbatim in commit
# metadata the moment the commit is pushed to a public repo, and rewriting
# history afterwards does not reliably remove it from GitHub.
is_allowed() {
  case "$1" in
    *@users.noreply.github.com) return 0 ;;
    *) return 1 ;;
  esac
}

#!/bin/zsh

set -u

ROOT_DIR="${0:A:h}"
CODEX_RUNTIME="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies"
NODE_BIN="$CODEX_RUNTIME/node/bin/node"

if [[ ! -x "$NODE_BIN" ]]; then
  NODE_BIN="$(command -v node 2>/dev/null || true)"
fi

if [[ -z "$NODE_BIN" || ! -x "$NODE_BIN" ]]; then
  echo "Impossibile trovare Node.js. Apri Codex e riprova."
  STATUS=1
else
  "$NODE_BIN" "$ROOT_DIR/strumenti/prepara-portfolio.mjs" "$@"
  STATUS=$?
fi

echo
if [[ $STATUS -eq 0 ]]; then
  echo "Operazione completata. Ora apri GitHub Desktop, controlla le modifiche, poi usa Commit e Push."
else
  echo "Operazione interrotta: nessun aggiornamento incompleto è stato pubblicato."
fi

if [[ -z "${PORTFOLIO_NO_PAUSE:-}" ]]; then
  read -k 1 "?Premi un tasto per chiudere questa finestra."
  echo
fi

exit $STATUS


# F043 — Admin Orion (grant + acesso + trial)

## Status
Implementado — 2026-10-29

## Contexto

O Club tem `/admin` com allowlist e membros. No Orion o grant é só via
webhook/CLI (`conceder-acesso`, `conceder-trial-pro`): não dá pra ver quem
**logou**, quem **ativou** compra, nem controlar trial pela UI.

## Comportamento

Painel `/admin` (só `User.role = admin`):

| Aba | Faz |
|-----|-----|
| **Allowlist** | Grant por e-mail (único + bulk). Libera acesso via `HublaEntitlement`. Opcional: + trial Pro (`trial-pro-*`, `expires_at` = agora + `CORTESIA_PRO_DIAS`). Conta existente → marca `purchase_*` na hora. |
| **Alunos** | Lista: e-mail, tem conta?, ativou?, plano, trial/`expires_at`, último login. Ações: ativar/revogar acesso; conceder/revogar/estender trial. |

### Modelo (não copiar Membership do Club)

- Grant = upsert `HublaEntitlement` no product de acesso (`HUBLA_PRODUCT_ID` /
  primeiro id de `idsChaveAcessoHubla()`), espelhando o CLI.
- Trial = `concederCortesiaPro` / `revogarCortesiaPro` / estender `expires_at`
  (F035). Conceder **não** empurra cortesia já vigente; **Estender** sim.
- Admin: `User.role` (`user` \| `admin`) + `BOOTSTRAP_ADMIN_EMAIL` e
  `ADMIN_EMAILS` (CSV). Bootstrap self-heal no `requireAdmin`.
- Sem Better Auth admin plugin / impersonate (fora de escopo).

### Quem acessou

| Sinal | Significado |
|-------|-------------|
| `User` + sessão recente | Acessou a plataforma |
| `purchaseVerifiedAt` | Ativou compra/acesso (entregáveis) |
| Entitlement sem `User` | Liberado, nunca logou |

### Auto-verificação

No create de User (hook Better Auth): `tentarAutoVerificar` se já houver
entitlement de acesso para o e-mail (grant admin ou webhook prévio).

## Critérios

- [ ] Só admin abre `/admin`; demais → redirect `/`
- [ ] Allowlist: e-mail único + bulk; libera acesso; checkbox/flag trial
- [ ] Conta existente no grant → `purchaseVerifiedAt` preenchido (se e-mail livre)
- [ ] Aba Alunos mostra login / ativação / trial / last login
- [ ] Conceder / revogar / estender trial; revogar acesso
- [ ] Link Admin na sidebar só para admin

## Fora de escopo

- Impersonate (F123 Club)
- Denied-login UI
- Métricas Resend / CS completo
- Tabela `AllowedEmail` separada

## Env

```
BOOTSTRAP_ADMIN_EMAIL=
ADMIN_EMAILS=          # CSV opcional
```

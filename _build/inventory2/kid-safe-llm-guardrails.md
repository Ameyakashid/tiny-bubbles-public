# Kid-Safe LLM Guardrails / Moderation — Source Inventory (v2)

**Category:** LLM guardrails / moderation / kid-safe chatbot
**Stream:** SOURCES2 (Tiny Bubbles v2)
**Date:** 2026-07-09
**Purpose:** Inform the **server-side proxy + moderation layer** for **Bloop**, the super-guardrailed LLM companion for kids (Gemini Flash default / DeepSeek alt), with input/output moderation, PII refusal, topic-scoping, crisis-escalation-to-parent, transcript visibility, and on/off controls.

All clones live under `/Users/ameyakashid/Desktop/adhd india/_sources2/`. Clones are `--depth 1` (shallow). **These repos are Python** — they are *reference architecture + reusable prompts/config/patterns* for our Node/TypeScript Cloud Functions proxy, not drop-in RN code. The Bloop proxy is server-side (Firebase Cloud Functions on GCP), so the Python patterns port cleanly to a TS Functions handler; the **prompt templates, scanner taxonomy, YAML rail configs, and API endpoint shapes are directly reusable regardless of language**.

---

## Summary table

| Repo (local slug) | URL | License (verified) | Stars | Lang | Ship / Reference | Cloned |
|---|---|---|---|---|---|---|
| `llm-guard` | https://github.com/protectai/llm-guard | **MIT** (`LICENSE`, "The MIT License (MIT)", © Protect AI) | ~3,162 | Python | **Ship-safe (MIT)** | ✅ |
| `guardrails-ai` | https://github.com/guardrails-ai/guardrails | **Apache-2.0** (`LICENSE`, Apache v2.0) | ~7,121 | Python | **Ship-safe (Apache)** | ✅ |
| `nemo-guardrails` | https://github.com/NVIDIA-NeMo/Guardrails | **Apache-2.0** (`LICENSE-Apache-2.0.txt` + SPDX header `Apache-2.0` in `LICENSE.md`) | ~6,651 | Python | **Ship-safe (Apache)** | ✅ |
| tldrsec/prompt-injection-defenses | https://github.com/tldrsec/prompt-injection-defenses | **NONE** (no LICENSE; API `license: null`) | ~712 | Markdown (awesome-list) | **Reference only — do NOT ship** | ❌ |
| MindfulwareDev/PromptProof | https://github.com/MindfulwareDev/PromptProof | **GPL-3.0** (copyleft) | ~1 | Python | **Reference only — do NOT ship** | ❌ |

> **License-detection note:** GitHub's API reports NeMo Guardrails as `NOASSERTION` only because its license file is named `LICENSE.md` and leads with SPDX headers the classifier doesn't auto-map. The repo ships a full `LICENSE-Apache-2.0.txt` and `LICENSE.md` states `SPDX-License-Identifier: Apache-2.0`. **Confirmed Apache-2.0 by file inspection.**
>
> **Archived note:** `protectai/llm-guard` is **archived** on GitHub (read-only upstream) but was pushed as recently as 2026-07. Archived ≠ unlicensed — MIT stands and the code is stable/self-contained. Fine to vendor patterns; just don't expect upstream fixes.

---

## 1. `llm-guard` (Protect AI) — MIT — PRIMARY DONOR for the proxy

**The single best fit.** It is literally a self-hostable **moderation gateway**: a library of composable input/output *scanners* plus a **FastAPI server** (`llm_guard_api/`) exposing `/analyze/prompt` and `/analyze/output`. This is the exact shape of the Bloop proxy.

### Tech stack
- Python 3.10+, FastAPI, Pydantic, HuggingFace `transformers` (local classifier models), Presidio (PII), structlog, OpenTelemetry/Prometheus.
- Two packages: `llm_guard/` (the scanner library) and `llm_guard_api/` (the deployable proxy service, Dockerized).

### Reusable for Tiny Bubbles v2 — concrete pointers
- **Server-side proxy blueprint** → `_sources2/llm-guard/llm_guard_api/app/app.py`. Verified routes: `POST /analyze/prompt` (input moderation), `POST /analyze/output` (output moderation), plus `/healthz`/`/readyz`. Includes **HTTP bearer auth** (`_check_auth_function`), **rate limiting**, **per-scan timeouts** (`scan_prompt_timeout`/`scan_output_timeout`), cached scanner init, and OTEL tracing. Port this handler shape to our Cloud Function: kid message → `/analyze/prompt` → Gemini/DeepSeek → `/analyze/output` → kid.
- **Scanner pipeline config (declarative)** → `_sources2/llm-guard/llm_guard_api/config/scanners.yml`. Shows how to declare an ordered scanner chain in YAML with per-scanner thresholds — a clean model for our own moderation-config (feature-flag which checks run, tune thresholds without code changes).
- **Input scanners** → `_sources2/llm-guard/llm_guard/input_scanners/`:
  - `prompt_injection.py` — jailbreak / injection classifier (**prompt-injection defense**).
  - `ban_topics.py` — zero-shot **topic-scoping** (allow only ADHD/autism-support topics; block off-scope). Directly serves our "topic-scoping" requirement.
  - `anonymize.py` (Presidio) — **PII detection/refusal** on the way IN.
  - `ban_substrings.py`, `ban_code.py`, `regex.py` — cheap deterministic blocklists (slurs, self-harm terms, phone/address regex) — good first-line, zero-cost pre-filters before any model call.
  - `toxicity.py`, `sentiment.py`, `emotion_detection.py` — signals usable for **crisis-escalation** heuristics (e.g. distress/self-harm sentiment → notify parent).
  - `gibberish.py`, `language.py`, `token_limit.py`, `invisible_text.py` — hygiene (unicode-smuggling `invisible_text` is a real injection vector).
- **Output scanners** → `_sources2/llm-guard/llm_guard/output_scanners/`:
  - `toxicity.py`, `bias.py`, `ban_topics.py`, `ban_substrings.py` — block unsafe model replies.
  - `sensitive.py`, `deanonymize.py` — **PII leakage** prevention in Bloop's replies.
  - `no_refusal.py` (+ `NoRefusalLight` substring version) — detect when the model refused (so we can serve a kid-friendly fallback instead of a raw refusal).
  - `relevance.py` — embedding cosine check that the reply actually answers the child's prompt (anti-derail / stay-on-task).
  - `malicious_urls.py`, `url_reachabitlity.py` — never surface a bad link to a child.
- **Scanner base contract** → `input_scanners/base.py` / `output_scanners/base.py`: every scanner returns `(sanitized_text, is_valid: bool, risk_score: float)`. Adopt this uniform `{valid, score, sanitized}` contract for our TS moderators so results compose and threshold uniformly.
- **Vault pattern for PII** → `llm_guard/vault.py`: anonymize→(call model)→deanonymize round-trip. Useful if we ever must pass a name through without exposing it to the LLM provider.

### Caveats
- Scanners load HF transformer models (hundreds of MB, CPU/GPU) — heavier than we want per-call and not Node-native. For v2 use the **cheaper cloud pattern**: reuse llm-guard's *taxonomy, thresholds, YAML config, endpoint shape, and the deterministic regex/substring scanners* (which port 1:1 to TS), and delegate the ML-classifier checks to a cheap moderation model (Gemini safety settings / a small classifier) rather than self-hosting all of Presidio+transformers.
- Archived upstream (see note above).

---

## 2. `nemo-guardrails` (NVIDIA) — Apache-2.0 — RAILS + SELF-CHECK PROMPTS DONOR

Programmable "rails" for conversational LLMs (input / output / dialog / topic / retrieval rails), configured in YAML + Colang. Strongest asset for us is its **library of self-check prompts and topic/content-safety rail templates** — provider-agnostic text we can lift directly into our Gemini/DeepSeek proxy.

### Tech stack
- Python, LangChain-based, Colang DSL, YAML config. Ships a server (`nemoguardrails/server/`) and many third-party moderation integrations.

### Reusable for Tiny Bubbles v2 — concrete pointers
- **Self-check input/output prompt templates** → `_sources2/nemo-guardrails/examples/bots/abc/prompts.yml` (verified). Contains ready-to-adapt `self_check_input` and `self_check_output` prompts ("Should the message be blocked? Yes/No") with an editable **policy list** (no explicit content, no impersonation, no "forget the rules", no PII sharing, no code execution, refusals must be polite). This is the cheapest, most portable moderation primitive — swap the policy bullets for our **kid-safety + topic-scope policy** and run against Gemini Flash. Rail wiring shown in `examples/bots/abc/config.yml` (`rails.input.flows: [self check input]`, `rails.output.flows: [self check output]`).
- **Built-in rail library** → `_sources2/nemo-guardrails/nemoguardrails/library/`:
  - `self_check/input_check/` & `self_check/output_check/` — the LLM-as-moderator flows + `actions.py`.
  - `topic_safety/` — **topic-scoping** rail (`flows.co`, `actions.py`) — model for locking Bloop to ADHD/autism supports.
  - `content_safety/` — content moderation rail wiring.
  - `jailbreak_detection/` — heuristics + model-based **prompt-injection defense** (`heuristics/`, `model_based/`, `server.py`).
  - `sensitive_data_detection/` — **PII** rail (Presidio-backed).
  - `gcp_moderate_text/` → `actions.py` — **Google Cloud Natural Language moderation** integration. Directly relevant: v2 is on **GCP**, so GCP Moderate Text is a natural, cheap first-pass moderation call we can wire server-side. Study this action.
  - `llama_guard/` — pattern for delegating moderation to a dedicated safety model (analog for a cheap safety model in front of DeepSeek).
- **Crisis / disallowed-topic flows** → `_sources2/nemo-guardrails/examples/bots/abc/rails/disallowed.co` — pattern for defining refuse-and-redirect behavior; adapt to "if self-harm/abuse/crisis detected → safe response + **escalate to parent**".

### Caveats
- Colang/LangChain runtime is heavier than we need; we want the **prompt text and policy structure**, not the whole engine. Many `library/*` subdirs are paid third-party vendor integrations (activefence, clavata, patronusai, etc.) — ignore those; the value is in `self_check`, `topic_safety`, `content_safety`, `jailbreak_detection`, `gcp_moderate_text`.

---

## 3. `guardrails-ai` (Guardrails AI) — Apache-2.0 — OUTPUT-VALIDATION + ON-FAIL-ACTION DONOR

Validation framework that wraps an LLM call with typed **Guards** and **validators**, with structured **on-fail actions**. Most useful to us as the **on-fail-action state machine** and the "validate structured output" pattern.

### Tech stack
- Python, Pydantic, supports async + streaming (`async_guard.py`), a Hub of pluggable validators, and a **FastAPI server** deployment (`server_ci/`, `guardrails/cli/server`).

### Reusable for Tiny Bubbles v2 — concrete pointers
- **On-fail action taxonomy** → `_sources2/guardrails-ai/guardrails/types/on_fail.py` (verified). `OnFailAction` enum: `REASK` (ask the model to try again), `FIX`, `FILTER`, `REFRAIN` (return empty/safe), `NOOP`, `EXCEPTION`, `FIX_REASK`, `CUSTOM`. This is exactly the decision layer our proxy needs when a moderator flags output: **reask** (regenerate with a stricter system prompt), **refrain** (serve a canned kid-safe fallback), **filter/redact**, or **escalate**. Model our proxy's post-moderation branching on this enum.
- **Guard wrapper pattern** → `guardrails-ai/guardrails/guard.py` / `async_guard.py`: `Guard().use(validator, on_fail=...)` wrapping `llm_api(...)`. Clean template for our "wrap the Gemini/DeepSeek call in pre- and post-validators" proxy structure. Async + **streaming validation** (`async_guard.py`, `run/`) matters if Bloop streams tokens to kids — validate as you stream.
- **Self-hosted validation server** → `_sources2/guardrails-ai/server_ci/` (`config.py`, `Dockerfile`, `fastapi-entry.sh`, `guard-template.json`) and `guardrails/cli/` — reference for exposing validation as an HTTP service (mirrors llm-guard's proxy; pick whichever endpoint shape we prefer).
- **Validator interface** → `guardrails/validator_base.py` — the `FailResult`/`PassResult` + fix-value contract for writing our own custom kid-safety validators.

### Caveats
- As of current versions the concrete validators live in the **Guardrails Hub** (installed separately via `guardrails hub install ...`); the in-repo `guardrails/validators/` dir is essentially empty (`__init__.py` only). So this repo gives us the **framework + on-fail semantics + server pattern**, not a bundled library of ready checks. For actual detectors, llm-guard (above) is the richer donor.

---

## Reference-only (NOT cloned; do not ship code)

- **tldrsec/prompt-injection-defenses** (https://github.com/tldrsec/prompt-injection-defenses) — **no license** (all-rights-reserved by default). An excellent *curated catalog* of every practical prompt-injection defense (spotlighting, delimiters, sandwich/instruction defense, dual-LLM, known jailbreak datasets). **Read it for design; copy no text/code.** Use it as a checklist to make sure Bloop's system prompt + moderation covers the known attack classes.
- **MindfulwareDev/PromptProof** (https://github.com/MindfulwareDev/PromptProof) — **GPL-3.0 (copyleft)**. Plug-and-play guardrail *system-prompt* templates (injection/PII/bias) + adversarial test-suite idea. GPL-3.0 is incompatible with shipping in a proprietary app, so **do not vendor**. Fine as inspiration for our own from-scratch prompt library and adversarial test cases.

---

## How this maps to the v2 Bloop requirements

| v2 requirement | Best source pointer |
|---|---|
| Server-side proxy (Cloud Functions) | `llm-guard/llm_guard_api/app/app.py` (endpoint shape, auth, timeouts, rate-limit) + `guardrails-ai/server_ci/` |
| Input moderation | `llm-guard/llm_guard/input_scanners/*` + NeMo `self_check_input` prompt (`abc/prompts.yml`) |
| Output moderation | `llm-guard/llm_guard/output_scanners/*` + NeMo `self_check_output` prompt |
| PII refusal | `llm-guard` `anonymize.py` / `sensitive.py` / `vault.py`; NeMo `sensitive_data_detection/` |
| Topic-scoping (ADHD/autism only) | `llm-guard` `input_scanners/ban_topics.py`; NeMo `topic_safety/` |
| Prompt-injection defense | `llm-guard` `prompt_injection.py` + `invisible_text.py`; NeMo `jailbreak_detection/`; tldrsec catalog (ref) |
| Crisis-escalation-to-parent | `llm-guard` `sentiment.py`/`emotion_detection.py`/`toxicity.py` signals + NeMo `disallowed.co` refuse-and-redirect + `guardrails` `OnFailAction` branching |
| On/refrain/reask decision layer | `guardrails-ai/guardrails/types/on_fail.py` (`REASK`/`REFRAIN`/`FILTER`/`CUSTOM`) |
| Cheap-model moderation on GCP | NeMo `gcp_moderate_text/actions.py` (Google Cloud Moderate Text) |
| Config-driven check toggles/thresholds | `llm-guard/llm_guard_api/config/scanners.yml` (declarative pipeline) |
| Parent transcript visibility / on-off | (app-side Firestore feature — none of these provide it; build custom. These inform only the moderation middle.) |

**Bottom line:** vendor the **patterns, prompt templates, YAML config shapes, scanner taxonomy, and on-fail semantics** from the three MIT/Apache repos into a TypeScript Cloud Functions proxy; keep heavy self-hosted ML classifiers optional and lean on cheap cloud moderation (GCP Moderate Text / Gemini safety settings / LLM self-check) as the default per-call path.

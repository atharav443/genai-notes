# RLHF — Alignment of Autoregressive LMs
### Source: `GenAI-IITM.pdf` p128–146 + professor's lecture transcript (`transript_RLHF.rtf`, 54 min)

Merged reconstruction. Three inputs:
1. **The ink** (p128–146) — handwritten, vector ink, lossy text layer. Cleaned here.
2. **The lecture** — cited as `t=MM:SS`. Adds material the notes lack.
3. **Derivations** — algebra the notes gesture at but never write. Marked ➕.

> **Study sheet with all of this typeset + self-test + worked examples:**
> `pdf/RLHF-Study-Notes.pdf` (16 pp). Editable source: `viz/RLHF-Study-Notes.html`.

---

## Page / timestamp map

| pages | topic | lecture |
|---|---|---|
| 126–127 | *(prerequisite)* AR decoding: greedy, top-k, top-p / nucleus, temperature | — |
| 128 | alignment goal; RL overview; agent/environment | t=0:07–3:27 |
| 129 | MDP six-tuple | t=7:27–9:49 |
| 130 | trajectory distribution, discounted return, objective | t=10:04–15:42 |
| 131 | policy gradient theorem (log-derivative trick) | t=17:52–21:42 |
| 132 | reward-to-go `R_t`, baseline, variance reduction | t=23:49–25:44 |
| 133 | value / Q / advantage; unbiasedness of `R_t − V(s_t)` | t=25:44–31:37 |
| 134 | the key equation; AR-LM as policy (start) | t=31:37–34:29 |
| 135 | state/action concatenation diagram | t=34:29–39:02 |
| 136 | PPO: on-policy estimator, rollouts | t=39:10–41:18 |
| 137 | importance sampling | t=42:34–44:52 |
| 138 | off-policy surrogate objective | t=45:48–48:49 |
| 139 | surrogate gradient identity; explosion; TRPO motivation | t=48:00–50:04 |
| 140 | TRPO constraint; PPO clip | t=50:04–52:42 |
| 141 | full PPO loss; reward modelling intro | t=52:42–53:32 |
| 142 | preference data `(x, y_w, y_l)` | t=53:32 |
| 143 | Bradley–Terry reward model | — |
| 144 | DPO goal; constrained objective; closed form; `Z(x)` intractable | — |
| 145 | inverting the closed form; substituting into BT | — |
| 146 | DPO objective; "independent of `r_φ`"; **End of RLHF** | — |

---

## §1 Why alignment is RL (p128, t=0:07–3:27)

Three paradigms (t=3:39): supervised learns `p(y|x)`, unsupervised learns `p(x)`,
**RL learns a policy `π_θ(a|s)`** with no dataset — the signal comes from acting.

Alignment is a **training-time** operation (t=1:42): we change the *parameters*, not
the decoding.

```
goal of alignment: make the LM compatible with a desired, pre-defined
                   rule / behaviour, specified by human annotations
                   or by fixed rules                              [p128]
```

**Verifiable rewards** (t=2:02–3:14) — *not in the notes at all*: RLHF works best when
`r` is deterministic and checkable (a unit test passes; the answer equals 42). Hence math
and code. Chat is the hard case: the reward is "vague", so it must be *learned* from
preferences. ⇒ **"your policy gradient algorithm is as good as your reward model"** (t=32:36).

Monster picture (t=35:20): pre-train ⇒ ugly monster; + SFT ⇒ pink face (still monstrous);
+ RLHF ⇒ smiley face. A thin veneer, and it costs millions just to make the model say "thank you".

**Why not plain SFT?** (my addition; neither source argues it)
- *format blocker*: preference data is comparative, not generative — there is no target string.
- *locality blocker*: "helpful" is a property of the whole sequence, not of any token.

---

## §2 The MDP (p129, t=7:27)

```
(S, A, p, r, γ, ρ_0)
S      state space        {s_1..s_M}                 finite here
A      action space       {a_1..a_n}
p      transition kernel  p(s_{t+1}|s_t,a_t)          first-order Markov ⇒ "MDP" (t=9:38)
r      reward             r : S×A → R                 scalar, may be negative
γ      discount           γ ∈ (0,1)
ρ_0    initial state dist ρ_0(s_0)
π_θ    policy             π_θ(a_t|s_t)                agent ≡ policy (t=13:27)
```

γ's purpose (t=14:02): controls how much weight distant reward gets. γ→0 immediate only;
γ→1 all equal (and the sum may diverge). *The lecture's "recent rewards" phrasing is
loose — the mechanism is γ^t, i.e. discounting the future.*

---

## §3 Trajectory, return, objective (p130, t=10:04)

```
trajectory    τ = (s_0, a_0, ..., s_T, a_T)
distribution  p_θ(τ) = ρ_0(s_0) · Π_t π_θ(a_t|s_t) · p(s_{t+1}|s_t,a_t)
                                  ^^^^^^^^^^^^^^^^ only this factor has θ
return        R(τ) = Σ_t γ^t r(s_t, a_t)
objective     J(θ) = E_{τ~p_θ}[R(τ)] = ∫ p_θ(τ) R(τ) dτ
goal          θ* = argmax_θ J(θ)
```

The obstruction: `∇_θ J = ∫ ∇_θ p_θ(τ) · R(τ) dτ` — θ is in the **measure**, not the
integrand. So `E[∇R(τ)] = 0`, and the integral is inaccessible twice (unknown `p_θ`,
unenumerable τ). Same shape as the VAE's intractable integral (t=18:15).

---

## §4 Policy gradient theorem (p131–132, t=17:52)

```
log-derivative trick:  ∇p = p · ∇log p

∇J(θ) = ∫ p_θ(τ) ∇log p_θ(τ) R(τ) dτ
      = E_{τ~p_θ}[ ∇log p_θ(τ) · R(τ) ]

log p_θ(τ) = log ρ_0(s_0) + Σ_t log π_θ(a_t|s_t) + Σ_t log p(s_{t+1}|s_t,a_t)
∇_θ log p_θ(τ) = Σ_t ∇_θ log π_θ(a_t|s_t)          ρ_0 and kernel are θ-free

∇J(θ) = E_{τ~p_θ}[ (Σ_t ∇_θ log π_θ(a_t|s_t)) · R(τ) ]
```

**The payoff** (t=21:03): you do not need the state-transition distribution. You never
model how the world reacts to a token. Every algorithm that follows is a modification
of this one equation.

---

## §5 Baseline → value → advantage (p132–134, t=23:49)

```
define  R_t = Σ_{k≥t} γ^{k−t} r(s_k, a_k)            reward-to-go  [p132]
replace R_t → R_t − b(s_t)

unbiased because:
E_{a~π}[ ∇log π(a|s) · b(s) ] = b(s) Σ_a ∇π(a|s) = b(s) ∇(Σ_a π(a|s)) = b(s)·∇1 = 0

V^π(s)   = E_π[ R_t | s_t = s ]
Q^π(s,a) = E_π[ R_t | s_t = s, a_t = a ]
A^π(s,a) = Q^π(s,a) − V^π(s)

E[ R_t − V(s_t) | s_t=s, a_t=a ] = Q(s,a) − V(s) = A(s,a)        [p133]
```

`R_t − V(s_t)` is a **single-sample estimator** of the advantage — drop the expectation
from an unbiased estimator (t=31:02).

**The key equation of every RLHF paper (p134, t=31:37):**

```
∇J(θ) ≈ E_{τ~π_θ}[ Σ_t ∇log π_θ(a_t|s_t) · Â(s_t, a_t) ]
```

Note `≈`: it is not *equal* to the advantage, it is a one-sample estimate.

**What you need to run it** (t=33:30): `∇log π_θ` (free — the policy is the transformer),
`Â` (needs reward *and* value), and many **rollouts** (the RL word for a dataset;
for an LLM, rollouts = inference).

---

## §6 AR-LM as an RL policy (p134–135, t=34:29)

```
s_0 = prompt                     ← ρ_0 is the prompt distribution
a_0 = first output token
s_1 = [s_0, a_0]
a_1 = second output token
...
A   = V, the vocabulary (|A| ~ 50k–200k)
π_θ(a_t|s_t) = softmax over V at position t
```

- The LM **is** the policy (t=37:07). No wrapper.
- Updating the policy = changing the transformer's weights (t=38:45).
- **Reward timing ➕**: `r(s_t,a_t) = 0` for all `t < T`; `r(s_T,a_T) = r_φ(x,y)` — one
  scalar for the whole response. Terminal-only, which is why the value head exists and
  why γ = 1 in practice (episodes end at EOS/max length).

---

## §7 PPO-1: importance sampling + clipping (p136–140, t=39:10–52:42)

```
on-policy:  ∇J = E_{τ~π_θ}[ ∇log π_θ Â ]     needs fresh rollouts every update

importance sampling:  E_{x~p}[f] = E_{x~q}[ (p/q) f ]

ratio:  r_t(θ) = π_θ(a_t|s_t) / π_θold(a_t|s_t)      computable: two forward passes

surrogate:  L(θ) = E_{π_old}[ r_t(θ) · Â ]

∇r_t = ∇(π_θ/π_old) = (π_θ/π_old)∇log π_θ = r_t ∇log π_θ
⇒ ∇L(θ)|_{θ=θ_old} = ∇J(θ)|_{θ=θ_old}                 [p139 — "homework", t=48:00]
```

The surrogacy holds **at** θ_old — a first-order approximation, not an identity.
➕ In LLM implementations the ratio is **per-token**, not the trajectory product (which
telescopes and is dominated by early tokens).

Ratio explodes ⇒ instability (p139). Fix:

```
TRPO:  max_θ E_{π_old}[ r_t Â ]   s.t.   E_s[ KL(π_old(·|s) ‖ π_θ(·|s)) ] ≤ δ   [p140]
       constrained optimisation is non-trivial (t=51:53)

PPO:   L_CLIP = E_t[ min( r_t Â_t , clip(r_t, 1−ε, 1+ε) Â_t ) ]     ε ≈ 0.1–0.2
```

`min` is a pessimistic bound: **flat** outside the band in the beneficial direction,
still **sloped** in the harmful direction. It never protects a bad update.

Lineage (t=50:43): REINFORCE → PPO (IS, off-policy) → TRPO (KL/trust region) →
PPO (clip) → GRPO (advantage without a reward model).

---

## §8 Full PPO loss (p141)

```
L_PPO_full(θ) = L_CLIP − c₁(V_θ(s_t) − R̂_t)² + c₂ H(π_θ(·|s_t))
```

| term | role |
|---|---|
| `L_CLIP` | raise probability of high-advantage actions |
| `(V_θ − R)²` | trains the value head needed for `A = Q − V` |
| `H(π_θ)` | entropy bonus — keep the policy stochastic |

**Missing from p141:** `−β·KL(π_θ ‖ π_ref)`. RLHF-PPO needs it (or the equivalent
per-token reward shaping `r_t = −β log(π_θ/π_ref)`) or it reward-hacks. p144 then
silently assumes it exists.

➕ Advantage estimation: **GAE** — `δ_t = r_t + γV(s_{t+1}) − V(s_t)`,
`Â_t = Σ_l (γλ)^l δ_{t+l}`, λ ≈ 0.95.

---

## §9 Reward modelling (p141–143, t=53:07)

Absolute reward labels are expensive/inconsistent (t=53:32) ⇒ ask for **comparisons**.

```
preference data:  (x, y_w, y_l)      x = prompt, y_w = preferred, y_l = other   [p142]

Bradley–Terry:  P(y_w ≻ y_l | x) = e^{r(x,y_w)} / ( e^{r(x,y_w)} + e^{r(x,y_l)} )
                                 = σ( r_φ(x,y_w) − r_φ(x,y_l) ),  σ(t)=1/(1+e^{−t})

L_REWARD(φ) = E[ log σ( r_φ(x,y_w) − r_φ(x,y_l) ) ]        φ* = argmax L_REWARD   [p143]
```

The two forms on p143 are identical (divide by `e^{r_w}`). Logistic loss on the gap:
weight = how wrong the model currently is.

➕ Three unstated properties that matter downstream:
1. **Only differences are identifiable** — `r → r + c` is a symmetry. The absolute scale
   and offset carry no information. This is exactly the freedom DPO exploits.
2. **Ties are unrepresentable.**
3. **The logistic link is an assumption**, not a theorem. Misspecification ⇒ PPO
   optimises the misspecification.

➕ **Reward hacking**: `r_φ` is a proxy; PPO is a pure optimiser. Goodhart's law with a
gradient. Mitigation is the KL leash to `π_ref`:

```
max_θ  E_{x, y~π_θ}[ r_φ(x,y) ]  −  β · KL( π_θ(·|x) ‖ π_ref(·|x) )
```

---

## §10 DPO (p144–146)

Goal (p144): optimise the policy on preference data **without a reward model**.

```
L_policy = E[ r(x,y) ] − β·KL( π_θ(·|x) ‖ π_ref(·|x) )

closed form (p144):   π_r(y|x) = (1/Z(x)) π_ref(y|x) exp( (1/β) r(x,y) )
                      Z(x) = Σ_y π_ref(y|x) exp( (1/β) r(x,y) )        ← intractable

invert (p145):        r(x,y) = β log( π_r(y|x)/π_ref(y|x) ) + β log Z(x)

substitute into BT:
  r_w − r_l = β log(π_r(y_w)/π_ref(y_w)) − β log(π_r(y_l)/π_ref(y_l))
              + β log Z(x) − β log Z(x)         ← cancels: Z is a function of x only,
                                                  and y_w, y_l share the same x
```

```
L_DPO(θ) = − E[ log σ( β log(π_θ(y_w|x)/π_ref(y_w|x))
                     − β log(π_θ(y_l|x)/π_ref(y_l|x)) ) ]                  [p146]
```

**DPO is Bradley–Terry reward modelling where the reward is the policy itself:**
`r̂_θ(x,y) = β log(π_θ(y|x)/π_ref(y|x))`. The reward is *implicit*, not absent.

Gradient: `−β·E[ σ(r̂_l − r̂_w)(∇log π_θ(y_w) − ∇log π_θ(y_l)) ]` — weight = surprise,
push `y_w` up and `y_l` down, both relative to `π_ref`.

| | PPO / RLHF | DPO |
|---|---|---|
| reward | explicit `r_φ` | implicit `β log(π/π_ref)` |
| data | on-policy rollouts | offline preference pairs |
| models | 4 (policy, ref, reward, value) | 2 (policy, ref) |
| failure | reward hacking | likelihood displacement / offline over-optimisation |

➕ Caveat: DPO assumes `π_ref` is the optimum for *some* reward (so the inversion is
exact). In practice `π_ref` is just the SFT checkpoint. And the loss only sees `y_w`,
`y_l` as strings, so it can lower `log π_θ(y_l)` by pushing mass onto responses that are
*neither*. Simpler, not strictly better.

---

## Error ledger

| where | written | truth |
|---|---|---|
| p130 | "policy updating using grad **descent**" beside `θ ← θ + α∇J` | the plus sign means **ascent**; the lecture self-corrects at t=22:52 |
| p130 | `R(τ) = Σ_t r(s_t,a_t)` | γ was declared on p129 ⇒ must be `Σ_t γ^t r` (lecture has it right, t=14:08) |
| t=24:57 | subtracting a **constant** baseline changes variance | false: `Var(X−c) = Var(X)`. Only a *state-dependent* baseline correlated with the return helps |
| t=14:02 | γ makes "**recent** rewards" matter most | γ^t **discounts the future**; recency is the wrong word |
| p132 | baseline reduces variance (unconditionally) | needs `Cov(X,b) > 0`; and `b` must not depend on `a_t` for unbiasedness |
| p141 | full PPO loss has no reference-policy KL | RLHF-PPO needs `−β KL(π_θ‖π_ref)`; p144 assumes it when motivating DPO |
| p141 | signs of value/entropy unclear in the ink | with `argmax`: `−c₁MSE + c₂H`; with a minimised loss, all signs flip |
| p143 | BT likelihood only | identifiability (`r→r+c`), ties, and the link-function assumption all go unstated |
| p128–146 | no mention of verifiable rewards | the lecture's central practical point (t=2:02) |
| p135 | state/action mapping drawn; reward timing never stated | the reward is **terminal only** |

*My own correction:* I initially flagged the notes for omitting a horizon. They use the
infinite-horizon discounted formulation (t=12:47), which is self-consistent. Not an error.


---

## §7b GRPO (lecture only — not in the notes) <small>t=50:25, t=21:49</small>

The lecture mentions GRPO twice but p128–146 never introduces it. It is the algorithm
that closes the loop between verifiable rewards (§1.4) and PPO (§7).

If the reward is verifiable there is no `r_φ` at all — the verifier *is* `r`. And the
baseline need not be a learned `V`; it only has to be action-independent and correlated
with the return (§5.2). So sample `G` completions per prompt, score each with the
verifier, and normalise within the group:

```
A_i = ( r_i − mean(r_1..r_G) ) / std( r_1..r_G )        i = 1..G
```

Each `A_i` replaces `Â_t` in the *same* clipped objective of §7.8 (per-token ratio
`ρ_{i,t}`), with the KL leash to `π_ref`.

| | PPO / RLHF | GRPO | DPO |
|---|---|---|---|
| reward from | learned `r_φ` | **verifier** | preference pairs |
| baseline | learned `V_θ` | **group mean** | — |
| networks | 4 | 2 | 2 |
| rollouts | yes | yes, `G` per prompt | no |
| works for chat? | yes | **no** | yes |

Two caveats: normalising by `std` means a group where every sample scores identically
(all pass or all fail) has `A_i = 0` and contributes no gradient; and GRPO requires a
*checkable* reward, so it is a math/code tool, not a chat-alignment tool.

---

## Build pipeline (how the PDF is produced)

The study notes are typeset, not ASCII. LaTeX lives in
`viz/RLHF-Study-Notes.src.html` between `\[ \]` (display) and `\( \)` (inline).
`viz/build/build-notes.js` pre-renders every snippet with KaTeX (0.16.9, from
`papers/.genai-work/node_modules`) and inlines `katex.min.css` with all 8 woff2 fonts
base64-embedded, so the HTML is self-contained and prints offline.

```bash
cd viz/build && node build-notes.js ../RLHF-Study-Notes.src.html ../RLHF-Study-Notes.html
```

Then Chrome headless `--print-to-pdf`. Current output: 14 pages, mean page fill 91.5%,
no horizontal overflow, 71 display + 318 inline formulas, 0 KaTeX errors.

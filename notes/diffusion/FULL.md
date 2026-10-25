# Diffusion — source notes (PDF pages 72–76)

## p72 — Denoising Diffusion probabilistic Models (DDPMs)

$$\text{Given Data } D = \{x_0\} \sim P_{x_0} \quad (\text{data distribution})$$
**Goal:** To learn to sample from \(P_{x_0}\) (Gen.AI)

DDPMs are latent variable Generative Models seen as **special case of hierarchical VAEs**.

Recall, in a VAE:
\[ \underbrace{x}_{\text{Data}} \xrightarrow[\ \ q(z|x)\ \ ]{\text{Enc}} \underbrace{z}_{\text{latent}} \xrightarrow[\ \ P(x|z)\ \ ]{\text{Dec}} \underbrace{x}_{\text{Data}} \]

In a **HVAE**, there are **multiple latent spaces**.
$$x \to z_1 \to z_2 \to z_3 \to \dots \to z_T \qquad (\text{Encoding})$$
$$z_T \to z_{T-1} \to z_{T-2} \to \dots \to x \qquad (\text{Decoding})$$

A DDPM is a h-VAE, with the following properties:
**(a)** There are multiple latent spaces: \(z_1,z_2,\dots,z_T\)

## p73 — DDPM vs VAE; notation

**(b)** The dimensionality of the latent spaces is **same as that of the data space**.
$$\dim(z_t) = \dim(x) \quad \forall t$$

**(c)** The **Encoding procedure is fixed or non-learnable**, unlike a VAE.
$$\text{VAE}: q_\varphi(z|x) \quad : \varphi \text{ is a NN that learned}$$
$$\text{DDPM}: q(z|x) \quad : \text{is fixed \& not learnable}$$
$$\text{VAE}: \text{both Encoding \& Decoding are learned}$$
$$\text{DDPM}: \text{only decoding is learned}$$

### DDPM Formulation — Notations
- Data variable is denoted by \(x_0\ (x)\)
- Latent space : \(x_1,x_2,\dots,x_T\ \ (z_1,z_2,\dots,z_T)\)
- (not to be confused with previous notations where \(x_1,x_2,\dots\) were data points)
- In the DDPM literature, \(x_0\) : data point; \(x_1,x_2,\dots,x_T\) : latent spaces / vectors.

## p74 — Encoding / Forward process

$$x_0 \to x_1 \to x_2 \to \dots \to x_T$$
\(x_0\): data point; \(x_1\dots x_T\): latent vectors corresponding to \(x_0\)
$$\dim(x_t) = \dim(x_0) \doteq \mathbb{R}^d \qquad \forall t$$
\(T\) : hyperparameter

**Define the Encoding / Forward process in DDPM**
$$x_1 = \sqrt{\alpha_1}\,x_0 + \sqrt{1-\alpha_1}\,\epsilon_1, \qquad \epsilon_1\sim\mathcal{N}(0,I)$$
$$x_2 = \sqrt{\alpha_2}\,x_1 + \sqrt{1-\alpha_2}\,\epsilon_2, \qquad \epsilon_2\sim\mathcal{N}(0,I)$$
$$\vdots$$
$$\boxed{x_t = \sqrt{\alpha_t}\,x_{t-1} + \sqrt{1-\alpha_t}\,\epsilon_t, \qquad \epsilon_t\sim\mathcal{N}(0,I)}$$
where \(\alpha_1\dots\alpha_T\) are fixed scalars \([0,1]\).

\[ \text{diagram: } \underbrace{\sqrt{\alpha_1}x_0}_{\text{image}} + \underbrace{\sqrt{1-\alpha_1}\epsilon_1}_{\text{noise}} \to
\underbrace{\sqrt{\alpha_2}x_1}_{\text{image}} + \underbrace{\sqrt{1-\alpha_2}\epsilon_2}_{\text{noise}} \to \cdots \to x_T \]
$$\underbrace{x_0}_{\text{Data}} \to \text{add noise} \to \underbrace{x_1}_{\text{noisy data}} \to \text{add noise} \to
\underbrace{x_2}_{\text{noisy-noisy data}} \dots \to \underbrace{x_T}_{\text{"noise only"}}$$

## p75 — Markov chain and forward conditionals

$$\dot{x}_t = \sqrt{\alpha_t}\cdot x_{t-1} + \sqrt{1-\alpha_t}\cdot\epsilon_t \qquad \epsilon_t\sim\mathcal{N}(0,I) \qquad -(1)$$

The above defines the **Encoding** or the **Forward process** of a DDPM.
Eq (1) : represents a **1st order markov chain**.

1st order Markov Chain defines a series of RVs, \(x_0,x_1,\dots,x_T\) s.t.
$$x_t \perp\!\!\perp x_{t-2}\dots x_0 \mid x_{t-1}$$

$$\Rightarrow \text{ One can define a series of Conditional distributions on the latent variables as:}$$
$$q\!\left(x_t\mid x_{t-1}\right) = \mathcal{N}\left(x_t;\ \underbrace{\sqrt{\alpha_t}\cdot x_{t-1}}_{\text{mean}},\ \underbrace{(1-\alpha_t)I}_{\text{var}}\right)$$
$$\text{because, } \dot{x}_t = \sqrt{\alpha_t}\cdot x_{t-1} + \sqrt{1-\alpha_t}\cdot\epsilon_t, \qquad \epsilon_t\sim\mathcal{N}(0,I)$$

- \(q(x_t|x_{t-1})\) : **Conditional forward / Encoding distributions.**
- \(q(x_T)\sim\mathcal{N}(0,I)\) : **Stationary distribution of the Markov Chain.**

## p76 — Model via a decoding distribution

$$P_\theta\left(\underbrace{x_0}_{\text{data}}, \underbrace{x_1,x_2,\dots,x_T}_{\text{lat. var}}\right)
= P_\theta(x_T)\prod_{t=1}^{T}P_\theta\left(x_{t-1}\mid x_t\right)$$
$$\text{where } P_\theta\left(x_{t-1}\mid x_t\right) \doteq \mathcal{N}\!\left(x_{t-1};\ \mu_\theta(x_t),\ \Sigma_\theta(x_t)\right)$$

\(P_\theta\) defines a latent variable model with multiple latent variables, similar to VAE, where we define
\(P_\theta(x,z)\) : joint dist. between data & lat. var.

The definition of the model distribution \(P_\theta(\cdot)\) in a DDPM, arises because of the **Markovian
(1st order) assumption in the reverse direction**, with **Gaussian transitions containing learnable
parameters**.
$$P_\theta\left(x_{t-1}\mid x_t\right) \doteq \mathcal{N}\!\left(x_{t-1};\ \mu_\theta(x_t),\ \Sigma_\theta(x_t)\right)$$
$$\mu_\theta(x_t) \ \&\ \Sigma_\theta(x_t) \text{ are learned via ELBO.}$$
# Diffusion — source notes (PDF pages 77–81)

## p77 — ELBO for the DDPM

Recall, in a VAE:
$$\log P_\theta(x) = \log\int_z P_\theta(x,z)\,dz, \qquad
J_\theta(q_\varphi) = \mathbb{E}_{q_\varphi(z|x)}\log\frac{P_\theta(x,z)}{q_\varphi(z|x)} \quad : \text{ Evidence lower Bound (ELBO)}$$

In a DDPM,
$$J_\theta(q)^{DDPM} = \mathbb{E}_{q(x_1,x_2..x_T|x_0)}\log\frac{P_\theta(x_0,x_1,x_2..,x_T)}{q(x_1,x_2..x_T|x_0)}$$

$$\boxed{\;J_\theta(q)^{DDPM} = \mathbb{E}_{q(x_{1:T}|x_0)}\ \log\frac{P_\theta(x_{0:T})}{q(x_{1:T}|x_0)}\;}$$

$$x_{1:T} = (x_1,x_2,\dots,x_T), \qquad x_{0:T} = (x_0,x_1,\dots,x_T)$$

## p78 — Expanding numerator and denominator

We have,
$$P_\theta(x_{0:T}) = P(x_T)\prod_{t=1}^{T}P_\theta\left(x_{t-1}\mid x_t\right), \qquad P(x_T) = \mathcal{N}(0,I)$$

Similarly,
$$q\left(x_{1:T}\mid x_0\right) = \prod_{t=1}^{T}q\left(x_t\mid x_{t-1}\right)$$
$$q(x_{1:T}|x_0) = q(x_1|x_0)\cdot q(x_2|x_1,x_0)\cdot q(x_3|x_2,x_1,x_0)\dots q(x_T|x_{T-1},x_{T-2}\dots x_0)$$
$$= \prod_{t=1}^{T}q(x_t|x_{t-1})
\qquad\because \text{ the forward / Encoding is first order Markov}$$

## p79 — Splitting off the t=1 term

$$\therefore\ J_\theta(q) = \mathbb{E}_q\log\frac{P_\theta(x_{0:T})}{q(x_{1:T}|x_0)}
= \mathbb{E}_q\log\left[\frac{P(x_T)\cdot\prod_{t=1}^{T}P_\theta(x_{t-1}|x_t)}{\prod_{t=1}^{T}q(x_t|x_{t-1})}\right]$$

Consider
$$\log\left[\frac{P(x_T)\cdot\prod_{t=1}^{T}P_\theta(x_{t-1}|x_t)}{\prod_{t=1}^{T}q(x_t|x_{t-1})}\right]$$
$$= \log\left[\frac{P(x_T)\cdot P_\theta(x_0|x_1)\cdot\prod_{t=2}^{T}P_\theta(x_{t-1}|x_t)}{q(x_1|x_0)\cdot\prod_{t=2}^{T}q(x_t|x_{t-1})}\right]$$
$$= \log\frac{P(x_T)P_\theta(x_0|x_1)}{q(x_1|x_0)} + \log\prod_{t=2}^{T}\frac{P_\theta(x_{t-1}|x_t)}{q(x_t|x_{t-1})}$$

## p80 — Bayes rule on the denominator (3 RVs)

Consider the denominator in the second term
$$q(x_t|x_{t-1}) = q(x_t|x_{t-1},x_0) \qquad\because \text{ 1st order Markov}$$
$$= \frac{q(x_{t-1}|x_t,x_0)\cdot q(x_t|x_0)}{q(x_{t-1}|x_0)} \qquad : \text{ Baye's rule with 3 Rvs.}$$

$$q\left(x_{t-1}\mid x_t,x_0\right) \quad : \ \text{dist. of } x_{t-1}, \text{ given that the Encoding process has landed}
\text{ at } x_t \text{ at } t=t, \text{ starting from } x_0.$$

Plugging the above expression on to the ELBO,
$$\log\frac{P(x_T)P_\theta(x_0|x_1)}{q(x_1|x_0)} + \log\prod_{t=2}^{T}\frac{P_\theta(x_{t-1}|x_t)}{q(x_t|x_{t-1})}$$
$$= \log\frac{P(x_T)P_\theta(x_0|x_1)}{q(x_1|x_0)}
+ \log\prod_{t=2}^{T}\left(\frac{P_\theta(x_{t-1}|x_t)}{\frac{q(x_{t-1}|x_t,x_0)\,q(x_t|x_0)}{q(x_{t-1}|x_0)}}\right)$$
$$= \underline{\quad\quad} + \log\prod_{t=2}^{T}\left(\frac{P_\theta(x_{t-1}|x_t)\,q(x_{t-1}|x_0)}{q(x_{t-1}|x_t,x_0)\cdot q(x_t|x_0)}\right)$$

## p81 — Telescoping product → the final per-term form

$$= \log\frac{P(x_T)P_\theta(x_0|x_1)}{q(x_1|x_0)}
+ \log\prod_{t=2}^{T}\frac{P_\theta(x_{t-1}|x_t)}{q(x_{t-1}|x_t,x_0)}
+ \left(\log\prod_{t=2}^{T}\frac{q(x_{t-1}|x_0)}{q(x_t|x_0)}\right)$$

\[ \text{Note: } \log\prod_{t=2}^{T}\frac{q(x_{t-1}|x_0)}{q(x_t|x_0)} = \log\frac{q(x_1|x_0)\cancel{q(x_2|x_0)}}{\cancel{q(x_2|x_0)}\cancel{q(x_3|x_0)}\cdots} \ \ \text{(telescopes)} \]

$$= \log\frac{P(x_T)P_\theta(x_0|x_1)}{q(x_1|x_0)}
+ \log\prod_{t=2}^{T}\frac{P_\theta(x_{t-1}|x_t)}{q(x_{t-1}|x_t,x_0)}
+ \log\frac{q(x_1|x_0)}{q(x_T|x_0)}$$

$$= \log P_\theta(x_0|x_1) + \log\frac{P(x_T)}{q(x_T|x_0)}
+ \log\prod_{t=2}^{T}\frac{P_\theta(x_{t-1}|x_t)}{q(x_{t-1}|x_t,x_0)}$$

$$= \log P_\theta(x_0|x_1) + \log\frac{P(x_T)}{q(x_T|x_0)}
+ \sum_{t=2}^{T}\log\frac{P_\theta(x_{t-1}|x_t)}{q(x_{t-1}|x_t,x_0)}$$
\[ \text{the } \sum \text{ block is labelled "Term"} \]

**Bringing in the outer expectation term,**
# Diffusion — source notes (PDF pages 82–86)

## p82 — Applying the outer expectation correctly

$$\mathbb{E}_{q(x_{1:T}|x_0)}\Big(\text{Term}\Big)$$

Since the sub-terms in (Term) depends only on **subsets** of \(x_{1:T}\), the outer expectation can
be written appropriately.

$$J_\theta(q) = \mathbb{E}_{q(x_1|x_0)}\log P_\theta(x_0|x_1)
+ \mathbb{E}_{q(x_T|x_0)}\log\frac{P(x_T)}{q(x_T|x_0)}$$
$$+ \sum_{t=2}^{T}\mathbb{E}_{q(x_{t-1},x_t|x_0)}\log\frac{P_\theta(x_{t-1}|x_t)}{q(x_{t-1}|x_t,x_0)}$$

$$\text{Consider } \mathbb{E}_{(x_{t-1},x_t|x_0)}(\ \cdot\ )
= \mathbb{E}_{q(x_t|x_0)}\cdot\mathbb{E}_{q(x_{t-1}|x_t,x_0)}(\ \cdot\ )$$
\[ \text{property of the cond. expectation} \]
Then: *Rewriting the ELBO using the property of cond. exp.*

## p83 — The three terms of the DDPM ELBO

$$J_\theta(q) = \mathbb{E}_{q(x_1|x_0)}\log P_\theta(x_0|x_1)
+ \mathbb{E}_{q(x_T|x_0)}\log\frac{P(x_T)}{q(x_T|x_0)}$$
$$+ \sum_{t=2}^{T}\mathbb{E}_{q(x_t|x_0)}\cdot\mathbb{E}_{q(x_{t-1}|x_t,x_0)}\left(\log\frac{P_\theta(x_{t-1}|x_t)}{q(x_{t-1}|x_t,x_0)}\right)$$

$$\boxed{
\begin{aligned}
J_\theta(q) =\ & \mathbb{E}_{q(x_1|x_0)}\log P_\theta(x_0|x_1)
- D_{KL}\Big(q(x_T|x_0)\,\Big\Vert\,P(x_T)\Big) \\
& - \sum_{t=2}^{T}\mathbb{E}_{q(x_t|x_0)}\Big[D_{KL}\Big(q(x_{t-1}|x_t,x_0)\,\Big\Vert\,P_\theta(x_{t-1}|x_t)\Big)\Big]
\end{aligned}}$$

**The above objective of DDPM contains three terms:**
1. \(\mathbb{E}_{q(x_1|x_0)}\log P_\theta(x_0|x_1)\) : **Reconstruction term**
2. \(D_{KL}\left(q(x_T|x_0)\,\Vert\,P(x_T)\right)\) : **prior matching term** — *Independent of \(\theta\)*
3. \(\sum_{t=2}^{T}\mathbb{E}_{q(x_t|x_0)}\left[D_{KL}\left(q(x_{t-1}|x_t,x_0)\,\Vert\,P_\theta(x_{t-1}|x_t)\right)\right]\)
   - \(q(x_{t-1}|x_t,x_0)\) : **"Known" denoising**
   - \(P_\theta(x_{t-1}|x_t)\) : **learnable denoising**

## p84 — Consistency (denoising matching) term

**Consistency or denoising matching term.**

**Objective:** \(\theta^* = \arg\max_\theta J_\theta(q)\) (ELBO)

**Estimating the \(D_{KL}\) in the Consistency term**
$$D_{KL}\left(q(x_{t-1}|x_t,x_0)\,\Big\Vert\,P_\theta(x_{t-1}|x_t)\right)$$

**To compute \(q(x_{t-1}|x_t,x_0)\)**
$$q(x_{t-1}|x_t,x_0) = \frac{q(x_t|x_{t-1},x_0)\cdot q(x_{t-1}|x_0)}{q(x_t|x_0)} \qquad : \text{ Baye's rule}$$
$$= \frac{q(x_t|x_{t-1})\cdot q(x_{t-1}|x_0)}{q(x_t|x_0)}$$

We know
$$q(x_t|x_{t-1}) = \mathcal{N}\!\left(x_t;\ \sqrt{\alpha_t}\cdot x_{t-1},\ (1-\alpha_t)I\right)$$

## p85 — Recursion to obtain q(x_t | x_0)

\(q(x_t|x_0)\) can be obtained using **recursion** as below:

We have,
$$x_t = \sqrt{\alpha_t}\,x_{t-1} + \sqrt{1-\alpha_t}\,\epsilon_{t-1}, \qquad \epsilon_{t-1}\sim\mathcal{N}(0,I)$$
$$= \sqrt{\alpha_t}\left(\sqrt{\alpha_{t-1}}\,x_{t-2} + \sqrt{1-\alpha_{t-1}}\,\epsilon_{t-2}\right) + \sqrt{1-\alpha_t}\,\epsilon_{t-1},
\qquad \epsilon_{t-2}\sim\mathcal{N}(0,I)$$
$$= \sqrt{\alpha_t\alpha_{t-1}}\,x_{t-2} + \underbrace{\sqrt{\alpha_t-\alpha_t\alpha_{t-1}}\,\epsilon_{t-2} + \sqrt{1-\alpha_t}\,\epsilon_{t-1}}_{T_2}$$

$$\text{consider } T_2 = \sqrt{\alpha_t-\alpha_t\alpha_{t-1}}\,\epsilon_{t-2} + \sqrt{1-\alpha_t}\,\epsilon_{t-1}
= a\cdot\epsilon_1 + b\cdot\epsilon_2, \qquad \epsilon_1,\epsilon_2\sim \text{iid } \mathcal{N}(0,I)$$

\(T_2\) is a **linear combination of two normal RVs** \& ∴ it'll lead to another Gausn. Rv.
$$T_2 = \epsilon^*\sim\mathcal{N}\!\left(0,\ (1-\alpha_t\alpha_{t-1})I\right)$$
$$x_t = \sqrt{\alpha_t\alpha_{t-1}}\,x_{t-2} + \left(\sqrt{1-\alpha_t\alpha_{t-1}}\right)\epsilon^*_{t-2}$$
continuing the recursion till \(x_0\), \(\epsilon^*_{t-2}\sim\mathcal{N}(0,I)\)

## p86 — Closed form and the consistency-term ingredients

$$x_t = \sqrt{\alpha_t\alpha_{t-1}\dots\alpha_1}\,x_0 + \sqrt{1-\alpha_t\alpha_{t-1}\dots\alpha_1}\,\epsilon, \qquad \epsilon\sim\mathcal{N}(0,I)$$
$$x_t = \sqrt{\bar{\alpha}_t}\cdot x_0 + \sqrt{1-\bar{\alpha}_t}\cdot\epsilon$$
$$\text{where } \bar{\alpha}_t = \prod_{i=1}^{t}\alpha_i, \qquad \epsilon\sim\mathcal{N}(0,I)$$

$$q\!\left(x_t\mid x_0\right) = \mathcal{N}\!\left(x_t;\ \sqrt{\bar{\alpha}_t}\cdot x_0,\ (1-\bar{\alpha}_t)I\right)$$

$$\Rightarrow \text{ the } t^{th} \text{ latent can be obtained directly from the data } (x_0), \text{ without hopping for } t\text{-steps.}$$

**Getting back to the consistency term**
$$q\!\left(x_{t-1}\mid x_t,x_0\right) = \frac{q\!\left(x_t\mid x_{t-1}\right)\cdot q\!\left(x_{t-1}\mid x_0\right)}{q\!\left(x_t\mid x_0\right)}$$
$$q(x_t|x_{t-1}) = \mathcal{N}\!\left(x_t;\sqrt{\alpha_t}\,x_{t-1},\ (1-\alpha_t)I\right)$$
$$q(x_t|x_0) = \mathcal{N}\!\left(x_t;\sqrt{\bar{\alpha}_t}\,x_0,\ (1-\bar{\alpha}_t)I\right)$$
$$q(x_{t-1}|x_0) = \mathcal{N}\!\left(x_{t-1};\sqrt{\bar{\alpha}_{t-1}}\cdot x_0,\ (1-\bar{\alpha}_{t-1})I\right)$$
# Diffusion — source notes (PDF pages 87–91)

## p87 — Closed form for q(x_{t-1} | x_t, x_0)

$$\Rightarrow\ q\!\left(x_{t-1}\mid x_t,x_0\right) \propto \frac{\exp\!\left[-\|x_t-(\cdot)\|_2^2\right]\exp\!\left(-\|x_{t-1}-(\cdot)\|_2^2\right)}{\exp\!\left[-\|x_{t-1}-(\cdot)\|_2^2\right]}
\;\propto\; \exp\!\left[-\left\|x_{t-1}-\mu_q\right\|_2^2\right]$$
\[ \text{obtained via completion of the square method} \]

$$q\!\left(x_{t-1}\mid x_t,x_0\right) = \mathcal{N}\!\left(x_{t-1};\ \mu_q(x_t,x_0),\ \Sigma_q\right)$$

where
$$\mu_q(x_t,x_0) = \frac{\sqrt{\alpha_t}\,(1-\bar{\alpha}_{t-1})\cdot x_t \;+\; \sqrt{\bar{\alpha}_{t-1}}\,(1-\alpha_t)\cdot x_0}{1-\bar{\alpha}_t}$$
$$\Sigma_q = \underbrace{\frac{(1-\alpha_t)(1-\bar{\alpha}_{t-1})}{1-\bar{\alpha}_t}}_{\displaystyle \sigma_q^2}\cdot I = \sigma_q^2\cdot I$$

Both \(\mu_q\) & \(\Sigma_q\) and ∴ \(q(x_{t-1}|x_t,x_0)\) are **computable & known**.

## p88 — The KL becomes a regression on μ_q

$$D_{KL}\left(q(x_{t-1}|x_t,x_0)\,\Big\Vert\,P_\theta(x_{t-1}|x_t)\right)$$
$$P_\theta(x_{t-1}|x_t) = \mathcal{N}\!\left(x_{t-1};\ \mu_\theta,\ \Sigma_q\right)$$
$$\Rightarrow\ D_{KL}\left(q\,\Vert\,P_\theta\right) = D_{KL}\Big[\mathcal{N}(x_{t-1};\mu_q,\Sigma_q)\,\Big\Vert\,\mathcal{N}(x_{t-1};\mu_\theta,\Sigma_q)\Big]$$
$$= \frac{1}{2}\left[\log\frac{|\Sigma_q|}{|\Sigma_q|} - d + \text{tr}\Big(\underbrace{\Sigma_q^{-1}\Sigma_q}_{I}\Big)
+ \left(\mu_\theta-\mu_q\right)^T\underbrace{\Sigma_q^{-1}}_{\left(\sigma_q^2 I\right)^{-1}}\left(\mu_q-\mu_\theta\right)\right]$$
$$= \frac{1}{2\sigma_q^2}\left\|\mu_\theta-\mu_q\right\|_2^2 \qquad : \text{ Regression over } \mu_q$$

## p89 — ELBO for DDPM (boxed) + the reconstruction term

$$\boxed{\;J_\theta(q) = \mathbb{E}_{q(x_1|x_0)}\log P_\theta(x_0|x_1)
- \sum_{t=2}^{T}\mathbb{E}_{q(x_t|x_0)}\frac{1}{2\sigma_q^2}\left\|\mu_\theta-\mu_q\right\|_2^2\;}
\qquad \text{where } x_T\sim\mathcal{N}(0,I)$$

**To compute the reconstruction term:**
$$\text{Consider } \log P_\theta(x_0|x_1)$$
We know \(P_\theta(x_{t-1}|x_t) = \mathcal{N}\!\left(x_{t-1};\mu_\theta(x_t),\Sigma_q\right)\)
$$\Rightarrow P_\theta(x_0|x_1) = \mathcal{N}\!\left(x_0;\ \mu_\theta(x_1),\ \sigma_q^2 I\right)$$
$$\log P_\theta(x_0|x_1) = \log\frac{\exp}{(2\pi\sigma_q^2)^{d/2}}
- \left\{\frac{\|x_0-\mu_\theta(x_1)\|_2^2}{2\sigma_q^2}\right\}$$
$$= -\frac{\|x_0-\mu_\theta(x_1)\|_2^2}{2\sigma_q^2} - \left(\frac{d}{2}\log 2\pi\sigma_q^2\right)$$
\[ \text{the second term is labelled "Ind of } \theta\text{"} \]
$$\Rightarrow \log P_\theta(x_0|x_1) \propto -\frac{\|x_0-\mu_\theta(x_1)\|^2}{2\sigma_q^2}$$

## p90 — Final objective + the U-net approximator

$$J_\theta(q) = \mathbb{E}_{q(x_1|x_0)}\left(-\|x_0-\mu_\theta(x_1)\|_2^2\right)
+ \left(-\sum_{t=2}^{T}\mathbb{E}_{q(x_t|x_0)}\left[\frac{1}{2\sigma_q^2}\left\|\mu_\theta(x_t)-\mu_q\right\|_2^2\right]\right)$$
$$\theta^* = \arg\max_\theta J_\theta(q)$$

Basic idea is to express the **unknown \(\mu_\theta(x_t)\)** using a **function approximator (NN)**.

\[ \text{diagram: } x_t,\ t \to \boxed{\text{U-net}\ \ \theta\ \ (\text{decrease dim} \to \text{increase dim})} \to \mu_\theta(x_t)
\to \|\mu_\theta-\mu_q\|_2^2 \quad (\text{Regressor on } \mu_q) \]

- One NN which predicts \(\mu_\theta(x_t)\) for any \(x_t\).
- To ensure that NN has an idea of **"time"**, another fixed variable \(t\), corresponding to the
  "time" of \(x_t\) is given as input.
- \(t\) is converted into a vector using **sinusoidal positional Embeddings**.

## p91 — Positional embeddings + ELBO equivalence

**positional Embedding:** \(p : t \to \hat{t}\), \(t\in\mathbb{Z}^+\), \(\hat{t}\in\mathbb{R}^d\)
$$\hat{t}(t)_i = \begin{cases}
\sin(\omega_k t) & \text{if } i = 2k \\
\cos(\omega_k t) & \text{if } i = 2k+1
\end{cases}$$
$$\omega_k = \frac{1}{(10000)^{2k/d}}$$

**ELBO Equivalence:**
$$\text{Recall, } \frac{1}{2\sigma_q^2}\left\|\mu_\theta(x_t)-\mu_q(x_t,x_0)\right\|_2^2$$
$$\mu_q(x_t,x_0) = \frac{(1-\bar{\alpha}_{t-1})\cdot\sqrt{\alpha_t}}{1-\bar{\alpha}_t}\,x_t
+ \frac{(1-\alpha_t)\cdot\sqrt{\bar{\alpha}_{t-1}}}{1-\bar{\alpha}_t}\cdot x_0$$
$$\mu_\theta(x_t) = \frac{(1-\bar{\alpha}_{t-1})\cdot\sqrt{\alpha_t}}{1-\bar{\alpha}_t}\,x_t
+ \frac{(1-\alpha_t)\cdot\sqrt{\bar{\alpha}_{t-1}}}{1-\bar{\alpha}_t}\cdot \hat{x}_\theta(x_t)$$
where \(\hat{x}_\theta(x_t)\) is the output of a Neural Network.

with this, \(\frac{1}{2\sigma_q^2}\left\|\mu_\theta-\mu_q\right\|_2^2\)
# Diffusion — source notes (PDF pages 92–96)

## p92 — The network is a denoiser predicting x_0

$$= \frac{1}{2\sigma_q^2}\left\|\frac{(1-\alpha_t)\sqrt{\bar{\alpha}_{t-1}}}{1-\bar{\alpha}_t}\Big(\hat{x}_\theta(x_t)-x_0\Big)\right\|_2^2$$
$$= \frac{1}{2\sigma_q^2}\cdot\frac{(1-\alpha_t)^2\bar{\alpha}_{t-1}}{(1-\bar{\alpha}_t)^2}\left\|\hat{x}_\theta(x_t)-x_0\right\|_2^2$$

\[ \text{diagram: } x_t,\ t \to \boxed{\text{U-net}\ (\theta,\ \text{decrease dim} \to \text{increase dim})} \to \hat{x}_\theta(x_t)
\to \left\|\hat{x}_\theta(x_t)-x_0\right\|_2^2 \quad (\text{Regressor on the input data point } x_0) \]

The above network can be viewed as a **"denoiser"** for the datapoint \(x_0\), at all noisy instances \(x_t\).

Unlike in a GAN/VAE, the Neural Network that gets trained in a DDPM, **does not output the novel
data point from \(P_{x_0}\)** (true data dist).

## p93 — Training of a DDPM

Given a data point \(x_0\) from the true data dist.
**Repeat until convergence** (\(\alpha_1\dots\alpha_T\) are fixed \([0,1]\), \(T\approx 1000\)):
1. pick a \(t\sim\text{uniform}[0,T]\)
2. \(x_t^m\sim\mathcal{N}\!\left(x_t;\ \sqrt{\bar{\alpha}_t}x_0,\ 1-\bar{\alpha}_t I\right) \quad : q(x_t|x_0)\)
   $$x_t^m = \sqrt{\bar{\alpha}_t}x_0 + \sqrt{1-\bar{\alpha}_t}\cdot\epsilon_t, \qquad \epsilon_t\sim\mathcal{N}(0,I)$$
3. $$\theta^{k+1} \leftarrow \theta^{k} - \beta\,\nabla_\theta J_\theta(q)$$
   $$\text{where } J_\theta(q) = \sum_{m=1}^{M}\left\|\hat{x}_\theta\!\left(x_t^m\right)-x_0\right\|_2^2, \qquad M\subset\{0,T\}$$

\[ \text{diagram: } x_t,\ t \to \boxed{\text{U-net}\ \theta} \to \hat{x}_\theta(x_t) \to \text{forward pass to compute } \hat{x}_\theta(x_t); \]
\[ \nabla_\theta\sum_{m=1}^{M}\left\|\hat{x}_\theta(x_t^m)-x_0\right\|_2^2 \quad \text{Backward pass for Grad descent} \]

**— End of training DDPM —**

## p94 — Inference or Sampling in a DDPM

To get a sample \(x_0\sim P_{x_0}\), we need to traverse through the **backward / Decoding process**:
$$x_T \to x_{T-1} \to x_{T-2} \to \dots \to x_0$$

$$\Rightarrow \text{ we need to sample iteratively from decoding distributions:}$$
$$x_{t-1}\sim P_\theta\!\left(x_{t-1}\mid x_t\right) \qquad \text{for } t = T \text{ to } 1$$

$$x_T\sim\mathcal{N}(0,I), \quad x_{T-1}\sim P_\theta(x_{T-1}|x_T), \quad x_{T-2}\sim P_\theta(x_{T-2}|x_{T-1}), \ \dots\ , \quad x_0\sim P_\theta(x_0|x_1)$$

We have,
$$x_{t-1}\sim P_\theta(x_{t-1}|x_t)$$
$$P_\theta\!\left(x_{t-1}\mid x_t\right) = \mathcal{N}\!\left(x_{t-1};\ \mu_{\theta^*}(x_t),\ \sigma_q^2\cdot I\right)$$
$$x_{t-1} = \mu_{\theta^*}(x_t) + \sigma_q\cdot\epsilon, \qquad \epsilon\sim\mathcal{N}(0,I)$$
$$\text{where } \mu_{\theta^*}(x_t) = \frac{(1-\bar{\alpha}_{t-1})\cdot\sqrt{\alpha_t}}{1-\bar{\alpha}_t}\,x_t
+ \frac{(1-\alpha_t)\cdot\sqrt{\bar{\alpha}_{t-1}}}{1-\bar{\alpha}_t}\,\hat{x}_{\theta^*}(x_t)$$

## p95 — The inference algorithm

**Inference in a DDPM:**
- start with \(x_T\sim\mathcal{N}(0,I)\)
- **for** \(t = T, T-1, \dots, 1\)
- **do:**
  - get \(\hat{x}_{\theta^*}(x_t)\) from the NN
    \[ \text{diagram: } x_t,\ t \to \boxed{\text{U-net}\ \theta^*} \to \hat{x}_{\theta^*}(x_t) \quad \text{forward pass to get } \hat{x}_{\theta^*}(x_t) \]
  - $$x_{t-1} = \mu_{\theta^*}(x_t) + \sigma_q^2\epsilon, \qquad \epsilon\sim\mathcal{N}(0,I)
    \quad (\text{sampling from } P_\theta(x_{t-1}|x_t))$$
  - $$\mu_{\theta^*}(x_t) = \frac{(1-\bar{\alpha}_{t-1})\cdot\sqrt{\alpha_t}}{1-\bar{\alpha}_t}\,x_t
    + \frac{(1-\alpha_t)\cdot\sqrt{\bar{\alpha}_{t-1}}}{1-\bar{\alpha}_t}\,\hat{x}_{\theta^*}(x_t)$$
- **return** \(x_0\) ∴ the new generated sample.

To sample in a DDPM, we need to perform **T number of forward passes** through the trained NN (\(\theta^*\)).

**— End of DDPM training & Inference —**

## p96 — Alternate Interpretations of DDPM: (a) regression over noise

**(a) DDPM as regression over added "noise"**

Recall, the forward process of DDPM,
$$x_t = \sqrt{\bar{\alpha}_t}\cdot x_0 + \sqrt{1-\bar{\alpha}_t}\cdot\epsilon_t, \qquad \epsilon_t\sim\mathcal{N}(0,I)$$

Rearranging the above terms,
$$x_0 = \frac{x_t - \sqrt{1-\bar{\alpha}_t}\cdot\epsilon_t}{\sqrt{\bar{\alpha}_t}} \qquad -(1)$$

\(\epsilon_t\) : noise added to \(x_0\), to convert it into \(x_t\).

Consistency term in the ELBO : \(\left\|\mu_\theta-\mu_q\right\|_2^2\)
- \(\mu_q\) : mean of \(q(x_{t-1}|x_t,x_0)\)
- \(\mu_\theta\) : mean of \(P_\theta(x_{t-1}|x_t)\)

Represent \(\mu_q\), in terms of \(x_t\) & \(\epsilon_t\)
$$\mu_q(x_t,x_0) = \frac{\sqrt{\alpha_t}\cdot(1-\bar{\alpha}_{t-1})x_t + \sqrt{\bar{\alpha}_{t-1}}\cdot(1-\alpha_t)x_0}{1-\bar{\alpha}_t}$$
Replacing \(x_0\), above using Eq. 1
# Diffusion — source notes (PDF pages 97–101)

## p97 — μ_q and μ_θ in terms of the noise ε_t

$$\mu_q(x_t,x_0) = \frac{\sqrt{\alpha_t}(1-\bar{\alpha}_{t-1})\cdot x_t
+ \sqrt{\bar{\alpha}_{t-1}}\cdot(1-\alpha_t)\overbrace{\left(\frac{x_t-\sqrt{1-\bar{\alpha}_t}\,\epsilon_t}{\sqrt{\bar{\alpha}_t}}\right)}^{x_0}}{1-\bar{\alpha}_t}$$

$$\mu_q(x_t,\epsilon_t) = \frac{1}{\sqrt{\bar{\alpha}_t}}\cdot x_t
- \frac{1-\alpha_t}{\sqrt{1-\bar{\alpha}_t}\,\sqrt{\bar{\alpha}_t}}\cdot\epsilon_t$$

$$\mu_\theta(x_t) = \frac{1}{\sqrt{\alpha}}\cdot x_t
- \frac{1-\alpha_t}{\sqrt{1-\bar{\alpha}_t}\,\sqrt{\bar{\alpha}_t}}\cdot\hat{\epsilon}_\theta(x_t)$$

$$\text{consistency term} = \frac{1}{2\sigma_q^2}\left\|\mu_q-\mu_\theta\right\|_2^2$$
$$= \frac{1}{2\sigma_q^2}\cdot\frac{(1-\alpha_t)^2}{(1-\bar{\alpha}_t)\alpha_t}\left[\left\|\epsilon_t-\hat{\epsilon}_\theta(x_t)\right\|_2^2\right]$$
$$\propto \left\|\epsilon_t-\hat{\epsilon}_\theta(x_t)\right\|_2^2$$

**Regression over the added noise.**

\[ \text{diagram: } x_t,\ t \to \boxed{\text{U-net}\ \theta} \to \hat{\epsilon}_\theta(x_t)
\to \left\|\epsilon_t-\hat{\epsilon}_\theta(x_t)\right\|_2^2 \quad (\text{Regressor on the added noise}) \]

## p98 — (b) DDPM as score-predictors

$$\text{suppose } t\sim\mathcal{N}\!\left(t;\mu_t,\Sigma_t\right) \doteq P(t)$$

**Tweedie's formula:**
$$\mathbb{E}\left[\mu_t \mid t\right] = t + \Sigma_t\cdot\nabla_t\log P(t)$$
$$\text{where } \nabla_t\log P(t) \text{ defined as the "score function"}$$

Recall, that in a DDPM,
$$q(x_t|x_0) = \mathcal{N}\!\left(x_t;\ \sqrt{\bar{\alpha}_t}\cdot x_0,\ (1-\bar{\alpha}_t)I\right)$$

Apply Tweedie's formula to above,
$$\mathbb{E}\left(\mu\mid x_t\right) = x_t + (1-\bar{\alpha}_t)\cdot\nabla_{x_t}\log P(x_t)$$

The best estimate for \(\mathbb{E}(\mu|x_t)\) is the true mean. \(\Rightarrow \mathbb{E}(\mu|x_t) = \sqrt{\bar{\alpha}_t}\cdot x_0\).
$$\sqrt{\bar{\alpha}_t}\cdot x_0 = x_t + (1-\bar{\alpha}_t)\cdot\nabla_{x_t}\log P(x_t)$$

Rearranging the terms,
$$\boxed{\;x_0 = \frac{x_t + (1-\bar{\alpha}_t)\cdot\nabla_{x_t}\log P(x_t)}{\sqrt{\bar{\alpha}_t}}\;}$$

## p99 — Consistency term in terms of score functions

**Expressing the consistency term in terms of score-functions.**
$$\mu_q(x_t,x_0) = \frac{\sqrt{\alpha_t}(1-\bar{\alpha}_{t-1})\cdot x_t
+ \sqrt{\bar{\alpha}_{t-1}}\cdot(1-\alpha_t)\overbrace{\left(\frac{x_t+(1-\bar{\alpha}_t)\nabla\log P(x_t)}{\sqrt{\bar{\alpha}_t}}\right)}^{x_0}}{1-\bar{\alpha}_t}$$

$$\boxed{\;\mu_q = \frac{1}{\sqrt{\bar{\alpha}_t}}\cdot x_t + \frac{1-\alpha_t}{\sqrt{\bar{\alpha}_t}}\cdot\nabla_{x_t}\log P(x_t)\;}$$

$$\mu_\theta = \frac{1}{\sqrt{\bar{\alpha}_t}}\cdot x_t + \frac{1-\alpha_t}{\sqrt{\bar{\alpha}_t}}\cdot S_\theta(x_t)$$
\(S_\theta(x_t)\) : predicted **score** using NN.

$$\text{consistency term} \propto \left\|\mu_q-\mu_\theta\right\|_2^2
\;\propto\; \left\|\nabla_{x_t}\log P(x_t) - S_\theta(x_t)\right\|_2^2$$

**Regression over the score function.**

\[ \text{diagram: } x_t,\ t \to \boxed{\text{U-net}\ \theta} \to S_\theta(x_t)
\to \left\|\nabla_{x_t}\log P(x_t) - S_\theta(x_t)\right\|_2^2 \quad (\text{Regressor on the score function}) \]

## p100 — True score = negatively scaled noise

**To compute the true score**
$$x_0 = \frac{x_t + (1-\bar{\alpha}_t)\cdot\nabla_{x_t}\log P(x_t)}{\sqrt{\bar{\alpha}_t}} \qquad -(1)$$
$$\text{Also, } x_0 = \frac{x_t - \sqrt{1-\bar{\alpha}_t}\,\cdot\epsilon_t}{\sqrt{\bar{\alpha}_t}}
\quad \text{by definition}, \qquad \epsilon_t\sim\mathcal{N}(0,I) \qquad -(2)$$

Equating (1) & (2), & rearranging
$$\nabla_{x_t}\log P(x_t) = \frac{-1}{\sqrt{1-\bar{\alpha}_t}}\ \epsilon_t$$

**True score = negatively scaled noise**
$$\Rightarrow \text{ a DDPM trained to regress over added noise, is implicitly predicting the score function.}$$

---

## p100–101 — Guided Diffusion Models for Conditional Generation

Data : \((x_0,y)\) where \(y\) : conditioning variable
Eg. \(x_0\) : Image, \quad \(y\) : class-label, \quad \(y\) : text-Embedding

**Goal:** sample from the conditional distribution \(P(x_0|y)\) ?

**Question:** How to modify a DDPM to sample from the cond. dist. \(P(x_0|y)\)?

### Classifier Guidance
Recall that DDPMs are score-predictors, predicting the true score of the un-conditional or marginal
distribution, \(\nabla_{x_t}\log P(x_t)\).

From a conditional sampling perspective, the goal is to predict or regress over the
**conditional score**, \(\nabla_{x_t}\log P(x_t|y)\).

$$\nabla_{x_t}\log P(x_t|y) = \nabla\log\left(\frac{P(x_t)\cdot P(y|x_t)}{P(y)}\right)$$
$$= \nabla_{x_t}\log P(x_t) + \nabla_{x_t}\log P(y|x_t) - \nabla_{x_t}\log P(y)$$
$$\nabla_{x_t}\log P(x_t|y) = \nabla_{x_t}\log P(x_t) + \nabla_{x_t}\log P(y|x_t)$$
# Diffusion — source notes (PDF pages 102–106)

## p102 — Classifier guidance in practice; Classifier-Free Guidance

\[ \text{diagram: } \underbrace{y}_{},\ x_t,\ t \to \boxed{\text{U-net}\ \theta} \to \underbrace{\|\epsilon_t-\hat{\epsilon}_\theta\|_2^2}_{\text{predict unconditional score}}
\to \hat{\epsilon}_\theta\left(\nabla_{x_t}\log p(x_t)\right) \]
\[ \nabla_\theta\|\epsilon_t-\hat{\epsilon}_\theta\|_2^2 + \nabla_{x_t}\log P(y|x_t) \]
\[ x_t \to \boxed{\text{classifier / Regression}\ (\text{pre-trained})} \to P(y|x_t) \to \nabla_{x_t}\log P(y|x_t) \]

\[ \text{top labels: "unconditional score" (over the U-net output), "Classifier gradient"} \]

classifier / Regressor is trained **separately** to predict \(y\) (class label or Embedding) from \(x_t\).
**Training the classifier at different noise levels is difficult.**

### Classifier-Free Guidance
$$\nabla\log P(x_t|y) = \nabla\log P(x_t) + \nabla\log P(y|x_t)$$
$$\nabla\log P(y|x_t) = \nabla\log P(x_t|y) - \nabla\log P(x_t) \qquad (\text{Baye's law})$$

## p103 — The classifier-free guidance formula

$$\nabla\log P(x_t|y) \approx \nabla\log P(x_t) + \lambda\Big(\nabla\log P(x_t|y) - \nabla\log P(x_t)\Big)$$

$$\boxed{\;\nabla_{x_t}\log P(x_t|y) = \lambda\,\nabla_{x_t}\log P(x_t|y) + (1-\lambda)\,\nabla_{x_t}\log P(x_t)\;}$$
\(\lambda\) : hyper-parameter.

\[ \text{diagram: } y,\ x_t,\ t \to \boxed{\text{U-net}\ \theta} \to \cdots \quad (\text{Regressor over } \nabla_{x_t}\log P(x_t|y)) \]
\[ \text{null label / text } y=\phi:\quad x_t,\ t \to \boxed{\text{U-net}\ \theta\ (\text{copy of the above})} \to \cdots \quad (\text{Regressor over } \nabla_{x_t}\log P(x_t)) \]

**add both the \((\lambda)\) cond. & \((1-\lambda)\) uncond. scores before the gradient step.**

---

## p104 — Latent Diffusion Models

**The basic idea:** Build DMs on the **latent space** induced by another Encoder-Decoder Models.

Given data \(x_0\in\mathbb{R}^d\sim p(x_0)\), the first step is to learn a latent representation
\(z_0\in\mathbb{R}^k\), \(k\ll d\), using an Enc-Dec Model.

Eg: construct a **Vq-VAE** to learn a latent space.

\[ \text{diagram: } x_0 \to \boxed{\text{Enc}} \to z_0 \to \boxed{\text{Dec}} \to \hat{x}_0 \]

Let \(E_{\phi^*}\), \(D_\theta\) represent the Encoder & Decoder functions, respectively.
\(E_{\phi^*}\) & \(D_\theta\) are trained using the original data \(x_0\) or some other dataset similar to \(x_0\).

All the datapoints in \(\mathbb{R}^d\), are projected on to the latent space as
$$z_0 = E_{\phi^*}(x_0)$$

## p105 — Latent DM inference; DDIMs motivation

A **DDPM is constructed on the space of \(z_0\)**.
During inference, to generate a novel point from \(p(x_0)\), first sample a novel point from the
latent space with reverse diffusion, \(z_{novel}\) & \(x_{novel} = D_{\theta^*}(z_{novel})\sim p(x_0)\).

### Denoising Diffusion Implicit Models (DDIMs)
- DDPMs are **slow in sampling** (\(T=1000\)) & cannot be used for **deterministic posterior Inference**.
- The forward process is **stochastic**.
$$x_t = \sqrt{\bar{\alpha}_t}\,x_0 + \sqrt{1-\bar{\alpha}_t}\,\epsilon_t, \qquad \epsilon_t\sim\mathcal{N}(0,I)$$
$$\Rightarrow \text{ Given an } x_0, \text{ running the forward process multiple times leads to different } x_T$$
(final latent representation for \(x_0\))
$$\Rightarrow \text{ There does not exist a single / unique } x_T$$

## p106 — DDIM formulation

...that generates a given \(x_0\), from the reverse diffusion process.

The above issues (**slow-sampling** & **non-unique invertibility**) of DDPMs are solved with **DDIMs**.

### DDIMs
Let us consider a family of inference distributions, parameterized by a vector \(\sigma\in\mathbb{R}_{\ge 0}\)
$$q_\sigma\!\left(x_{1:T}\mid x_0\right) \doteq q_\sigma(x_T|x_0)\prod_{t=2}^{T}q_\sigma\!\left(x_{t-1}\mid x_t,x_0\right)$$

$$\text{where } q_\sigma(x_T|x_0) \doteq \mathcal{N}\!\left(\sqrt{\bar{\alpha}_T}\,x_0,\ (1-\alpha_T)I\right)$$
and for all \(t>1\)
$$q_\sigma(x_{t-1}|x_t,x_0) \doteq \mathcal{N}\!\left(
\underbrace{\sqrt{\bar{\alpha}_{t-1}}\,x_0 + \sqrt{1-\alpha_{t-1}-\sigma_t^2}\cdot\frac{x_t-\sqrt{\bar{\alpha}_t}\,x_0}{\sqrt{1-\bar{\alpha}_t}}}_{\text{mean}},\ \sigma_t^2 I\right)$$

The forward process corr. to the above posterior is:
$$q_\sigma\!\left(x_t\mid x_{t-1},x_0\right)
= \frac{q_\sigma(x_{t-1}|x_t,x_0)\cdot q_\sigma(x_t|x_0)}{q_\sigma(x_{t-1}|x_0)} \qquad (\text{Baye's rule})$$
# Diffusion — source notes (PDF pages 107–110)

## p107 — Why DDIM and DDPM share the same ELBO

The above forward process is **not Markovian**.
$$\Rightarrow\ x_t \not\!\perp\!\!\perp x_0 \mid x_{t-1}$$

$$\boxed{\text{In the above process, } q_\sigma(x_t|x_0) = \mathcal{N}\!\left(x_t;\ \sqrt{\bar{\alpha}_t}\cdot x_0,\ \sqrt{1-\alpha_t}\cdot I\right)}$$
the same as DDPM.

Since \(q_\sigma(x_t|x_0)\), conditional of \(x_t\) given \(x_0\) is the **same in both DDPM & DDIM**,
the ELBO for both of them are the same & optimizing the ELBO leads to the same solution.

∴ the ELBO in DDPM / DDIM depends **only on \(q(x_t|x_0)\)**
$$\Rightarrow \text{ as long as } q(x_t|x_0) \text{ is same as that of DDPMs, any process can be used }$$
& leads to the same solution for ELBO.
as far as \(q(x_t|x_0)\) is same as DDPM, any definition for \(q(x_{1:T}|x_0)\) can be chosen.

## p108 — Defining the Decoder / Reverse process

$$P_\theta\!\left(x_{t-1}\mid x_t\right) = \begin{cases}
\mathcal{N}\!\left(\mu_\theta(x_1),\ \sigma^2 I\right) & t=1 \\
q_\sigma\!\left(x_{t-1}\mid x_t,\ \mu_\theta(x_t)\right) & \text{otherwise}
\end{cases}$$

$$\text{where } \mu_\theta(x_t) = \frac{x_t-\sqrt{1-\alpha_t}\cdot\hat{\epsilon}_\theta}{\sqrt{\alpha_t}}
\qquad : \text{ approx for } x_0$$

Recall,
$$x_t = \sqrt{\alpha_t}\cdot x_0 + \sqrt{1-\alpha_t}\cdot\epsilon_t, \qquad \epsilon_t\sim\mathcal{N}(0,I)$$
$$x_0 = \frac{x_t-\sqrt{1-\alpha_t}\cdot\epsilon_t}{\sqrt{\alpha_t}}$$

**The main result:** The ELBO corresponding to the above non-markovian family of models & that of DDPM
are the **same** (off-by a const.)

$$\boxed{\Rightarrow\ \text{Training the regression network in DDPM is implicitly training all the above non-Markovian Models.}}$$

There is **no difference** between training DDPM & DDIMs, but the **inference process is different**.

## p109 — Inference with DDIMs

Sampling from \(P_\theta(x_{t-1}|x_t)\)
$$P_{\theta^*}\!\left(x_{t-1}\mid x_t\right) = \begin{cases}
\mathcal{N}\!\left(\mu_{\theta^*}(x_1),\ \sigma^2 I\right) & t=1 \\
q_\sigma\!\left(x_{t-1}\mid x_t,\ \mu_{\theta^*}(x_t)\right) & \text{otherwise}
\end{cases}$$

$$\mu_\theta(x_t) = \frac{x_t-\sqrt{1-\alpha_t}\cdot\hat{\epsilon}_\theta}{\sqrt{\alpha_t}}
\qquad\Longrightarrow\qquad
\frac{x_t-\sqrt{\bar{\alpha}_t}\,{\mu_{\theta^*}}}{\sqrt{1-\bar{\alpha}_t}} = \hat{\epsilon}_{\theta^*}$$

$$q_\sigma\!\left(x_{t-1}\mid x_t,\mu_{\theta^*}\right) \doteq \mathcal{N}\!\left(
\sqrt{\bar{\alpha}_{t-1}}\,\mu_{\theta^*} + \sqrt{1-\alpha_{t-1}-\sigma_t^2}\cdot\frac{x_t-\sqrt{\bar{\alpha}_t}\,\mu_{\theta^*}}{\sqrt{1-\bar{\alpha}_t}},\ \sigma_t^2 I\right)$$

putting all the above together, sampling from \(P_{\theta^*}(x_{t-1}|x_t)\) is as follows: \(z\sim\mathcal{N}(0,I)\)
$$\boxed{x_{t-1} = \sqrt{\bar{\alpha}_{t-1}}\left[\frac{x_t-\sqrt{1-\alpha_t}\cdot\hat{\epsilon}_{\theta^*}}{\sqrt{\alpha_t}}\right]
+ \sqrt{1-\alpha_{t-1}-\sigma_t^2}\,\hat{\epsilon}_{\theta^*} + \sigma_t^2\cdot z}$$

## p110 — DDPM as a special case; DDIM = deterministic

when
$$\sigma_t = \frac{\sqrt{1-\alpha_{t-1}}}{\sqrt{1-\alpha_t}}\cdot\frac{\sqrt{1-\alpha_t}}{\sqrt{\alpha_{t-1}}}$$
the above random process reduces to **DDPM**.

when \(\sigma_t = 0\), the sampling process has the following form:
$$\boxed{x_{t-1} = \sqrt{\bar{\alpha}_{t-1}}\left[\frac{x_t-\sqrt{1-\alpha_t}\cdot\hat{\epsilon}_{\theta^*}}{\sqrt{\alpha_t}}\right]
+ \sqrt{1-\alpha_{t-1}}\,\hat{\epsilon}_{\theta^*}}$$

- The above sampling process is **deterministic**.
- The only randomness is from \(x_T\sim\mathcal{N}(0,I)\)
- with \(\sigma_t=0\), the above model is called **DDIM**.
$$\Rightarrow \text{ the forward process in DDIM with } \sigma_t=0, \text{ is also deterministic.}$$
- The above implies that DDIM has a **unique invertibility**. (**DDIM Inversion**)

**— End of Diffusion Models —**

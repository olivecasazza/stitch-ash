<script setup lang="ts">
// Contact page (STI-254 D2). Posts to /api/bug-report as a customer
// (non-admin) submission; the function routes customer submissions to the
// human-admin queue (STITCH_BUG_REPORTS KV) and returns 202 on accept.

useSeoMeta({
  title: 'Contact — STITCH AND ASH',
  description:
    'Get in touch with STITCH AND ASH. Questions about sizing, embroidery, or your order — we read every message.',
})

const name = ref('')
const email = ref('')
const message = ref('')

const submitting = ref(false)
const success = ref(false)
const errorMsg = ref('')

const MIN_MESSAGE = 10

async function onSubmit() {
  errorMsg.value = ''
  if (message.value.trim().length < MIN_MESSAGE) {
    errorMsg.value = `Please describe what you'd like to discuss in at least ${MIN_MESSAGE} characters.`
    return
  }
  if (email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
    errorMsg.value = 'That email address does not look right. Please check and try again.'
    return
  }
  submitting.value = true
  try {
    const res = await fetch('/api/bug-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // The /api/bug-report endpoint accepts customer posts via these fields.
        // Customer submissions are routed to the human-admin queue (KV).
        description: message.value.trim(),
        email: email.value.trim(),
        route: '/contact',
        severity: 'low',
        reportedFrom: 'contact-form',
        // context for the admin reader — not surfaced as ops copy
        contactName: name.value.trim(),
      }),
    })
    if (res.status === 202 || res.status === 201) {
      success.value = true
      name.value = ''
      email.value = ''
      message.value = ''
      return
    }
    let detail = `We could not send your message right now (status ${res.status}).`
    try {
      const body = await res.json()
      if (body?.error) detail = `${detail} ${body.error}`
    } catch {
      // Ignore JSON parse errors; keep the status-only fallback.
    }
    errorMsg.value = detail
  } catch (err) {
    errorMsg.value = 'Network error — please try again in a moment.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="contact wrap">
    <p class="eyebrow">Get in touch</p>
    <h1 class="contact__title">Contact</h1>

    <p class="contact__lede section-title">
      Questions about sizing, embroidery, or your order — we read every message.
    </p>

    <section class="contact__panel stack-lg" aria-labelledby="contact-form-h">
      <h2 id="contact-form-h" class="contact__sub">Send a message</h2>

      <form v-if="!success" class="contact__form stack" novalidate @submit.prevent="onSubmit">
        <label class="contact__field">
          <span class="contact__label">Name</span>
          <input
            v-model="name"
            type="text"
            name="name"
            autocomplete="name"
            class="contact__input"
          >
        </label>

        <label class="contact__field">
          <span class="contact__label">Email</span>
          <input
            v-model="email"
            type="email"
            name="email"
            autocomplete="email"
            class="contact__input"
            required
          >
        </label>

        <label class="contact__field">
          <span class="contact__label">Message</span>
          <textarea
            v-model="message"
            name="message"
            rows="5"
            class="contact__input contact__input--area"
            :aria-describedby="errorMsg ? 'contact-error' : undefined"
            required
          />
        </label>

        <p
          v-if="errorMsg"
          id="contact-error"
          class="contact__error"
          role="alert"
        >
          {{ errorMsg }}
        </p>

        <button
          type="submit"
          class="contact__submit"
          :disabled="submitting"
          :aria-busy="submitting ? 'true' : 'false'"
        >
          {{ submitting ? 'Sending…' : 'Send message' }}
        </button>
      </form>

      <p v-else class="contact__success" role="status">
        Thanks — your message is on its way. We'll reply from a stitch-and-ash address
        within a few days.
      </p>
    </section>

    <section class="contact__panel" aria-labelledby="contact-direct-h">
      <h2 id="contact-direct-h" class="contact__sub">Direct</h2>
      <p class="contact__line">
        For order questions, you can also reach us at
        <a href="mailto:hello@stitch-and-ash.com" class="contact__link">hello@stitch-and-ash.com</a>.
      </p>
      <p class="contact__line text-muted">
        We respond within a few business days. We read every message by hand.
      </p>
    </section>
  </main>
</template>

<style scoped>
.contact {
  padding-block-start: clamp(2rem, 4vw, 3.5rem);
  padding-block-end: clamp(3rem, 8vw, 6rem);
  max-width: var(--measure);
  margin-inline: auto;
}

.contact__title {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  letter-spacing: 0.04em;
  margin-block-start: var(--space-lg);
  margin-block-end: var(--space-xl);
}

.contact__lede {
  color: var(--grey-200);
  margin-block-end: var(--space-3xl);
}

.contact__panel {
  padding-block: var(--space-2xl);
  border-block-start: var(--rule-light);
}

.contact__panel:first-of-type {
  border-block-start: 0;
  padding-block-start: 0;
}

.contact__sub {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--bone);
  margin-block-end: var(--space-xl);
}

.contact__form {
  display: block;
}

.contact__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.contact__label {
  font-size: var(--text-xs);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--grey-400);
}

.contact__input {
  width: 100%;
  background: var(--charcoal);
  color: var(--bone);
  border: 1px solid var(--border-rule);
  border-radius: 0;
  padding: var(--space-md) var(--space-lg);
  font: inherit;
  font-family: var(--font-body);
  letter-spacing: 0.02em;
  transition: border-color var(--transition-base);
}

.contact__input:focus-visible {
  outline: none;
  border-color: var(--bone);
}

.contact__input--area {
  resize: vertical;
  min-height: 112px;
}

.contact__error {
  color: var(--grey-400);
  font-size: var(--text-sm);
  text-decoration: underline;
  text-decoration-color: var(--grey-400);
  margin: 0;
}

.contact__submit {
  align-self: flex-start;
  background: var(--bone);
  color: var(--ink-black);
  border: 1px solid var(--bone);
  padding: var(--space-md) var(--space-lg);
  font-family: var(--font-display);
  font-size: var(--text-sm);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background var(--transition-base), color var(--transition-base);
}

.contact__submit:hover,
.contact__submit:focus-visible {
  background: var(--white);
  border-color: var(--white);
  color: var(--ink-black);
  outline: none;
}

.contact__submit:disabled {
  background: var(--border-rule);
  border-color: var(--border-rule);
  color: var(--grey-400);
  cursor: not-allowed;
}

.contact__success {
  color: var(--bone);
  font-size: var(--text-base);
  margin: 0;
}

.contact__line {
  margin: 0;
}

.contact__line + .contact__line {
  margin-block-start: var(--space-lg);
}

.contact__link {
  color: var(--bone);
  text-decoration: underline;
  text-decoration-color: var(--border-rule);
  text-underline-offset: 0.2em;
}

.contact__link:hover,
.contact__link:focus-visible {
  text-decoration-color: var(--bone);
  outline: none;
}
</style>

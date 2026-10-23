<script setup lang="ts">
const props = defineProps<{
  handle: string
}>()

const email = ref('')
const showForm = ref(false)
</script>

<template>
  <div class="pdp__notify-wrap">
    <button
      v-if="!showForm"
      class="pdp__atc-btn pdp__atc-btn--disabled"
      type="button"
      @click="showForm = true"
    >
      Notify me when available
    </button>

    <form
      v-else
      id="notify-form"
      method="POST"
      action="/api/checkout"
      class="pdp__notify-form"
    >
      <input type="hidden" name="intent" value="waitlist" />
      <input type="hidden" name="sku" :value="props.handle" />
      <input
        v-model="email"
        type="email"
        name="email"
        placeholder="your@email.com"
        autocomplete="email"
        required
        class="pdp__notify-email"
      />
      <button
        type="submit"
        class="pdp__atc-btn pdp__atc-btn--disabled"
        :disabled="!email"
      >
        Notify me
      </button>
    </form>
  </div>
</template>

<style scoped>
.pdp__notify-wrap {
  display: contents;
}

.pdp__notify-form {
  display: flex;
  gap: var(--space-sm);
  width: 100%;
}

.pdp__notify-email {
  flex: 1 1 14rem;
  min-width: 0;
  background: transparent;
  border: 1px solid var(--border-rule);
  color: var(--bone);
  font: inherit;
  font-size: var(--text-base);
  padding: var(--space-md) var(--space-lg);
  border-radius: 0;
  transition: border-color var(--transition-base);
  font-family: var(--font-body);
  letter-spacing: 0.04em;
}

.pdp__notify-email::placeholder {
  color: var(--grey-400);
}

.pdp__notify-email:focus {
  outline: none;
  border-color: var(--bone);
}
</style>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  sizes: string[]
  modelValue?: string
  name?: string
}>(), {
  modelValue: '',
  name: 'size'
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const selected = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})
</script>

<template>
  <fieldset class="size-selector">
    <legend class="size-selector__legend">Size</legend>
    <div class="size-selector__options">
      <label
        v-for="size in sizes"
        :key="size"
        class="size-selector__label"
        :for="`size-${size.toLowerCase().replace(/\s+/g, '-')}`"
      >
        <input
          class="size-selector__input"
          type="radio"
          :id="`size-${size.toLowerCase().replace(/\s+/g, '-')}`"
          :name="name"
          :value="size"
          v-model="selected"
        />
        <span class="size-selector__swatch">{{ size }}</span>
      </label>
    </div>
  </fieldset>
</template>

<style scoped>
  .size-selector {
    border: none;
    padding: 0;
    margin: 0;
  }

  .size-selector__legend {
    font-size: var(--text-sm);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ash-silver);
    margin-block-end: 0.6rem;
    padding: 0;
  }

  .size-selector__options {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  /* Hide the native radio visually; keep it accessible */
  .size-selector__input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
    pointer-events: none;
  }

  .size-selector__label {
    cursor: pointer;
  }

  .size-selector__swatch {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 2.6rem;
    height: 2.6rem;
    padding-inline: 0.5rem;
    border: 1px solid var(--ash-silver);
    font-size: var(--text-sm);
    font-weight: 500;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--bone);
    background: transparent;
    transition:
      border-color var(--transition-base),
      background var(--transition-base),
      color var(--transition-base);
    border-radius: var(--radius-none);
  }

  .size-selector__label:hover .size-selector__swatch {
    border-color: var(--bone);
  }

  /* Checked state via adjacent sibling combinator */
  .size-selector__input:checked + .size-selector__swatch {
    background: var(--bone);
    color: var(--ink-black);
    border-color: var(--bone);
  }

  /* Focus ring on swatch when input is focused */
  .size-selector__input:focus-visible + .size-selector__swatch {
    outline: 2px solid var(--thread-gold);
    outline-offset: 2px;
  }
</style>

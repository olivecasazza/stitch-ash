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
    color: var(--grey-400);
    margin-block-end: var(--space-md);
    padding: 0;
  }

  .size-selector__options {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
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
    min-width: 40px;
    height: 40px;
    padding-inline: var(--space-sm);
    border: 1px solid var(--grey-400);
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
    border-radius: 0;
  }

  .size-selector__label:hover .size-selector__swatch {
    border-color: var(--bone);
  }

  /* Checked state via adjacent sibling combinator */
  .size-selector__input:checked + .size-selector__swatch {
    background: var(--white);
    color: var(--ink-black);
    border-color: var(--white);
  }

  /* Focus ring on swatch when input is focused */
  .size-selector__input:focus-visible + .size-selector__swatch {
    outline: 1px solid var(--bone);
    outline-offset: 2px;
  }
</style>

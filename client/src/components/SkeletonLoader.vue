<template>
  <div
    class="skeleton"
    :class="[variant, { animate }]"
    :style="computedStyle"
    role="status"
    aria-busy="true"
    aria-label="Chargement..."
  >
    <span class="srOnly">Chargement...</span>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  variant: {
    type: String,
    default: 'text',
    validator: (v) => ['text', 'circular', 'rectangular', 'card', 'avatar', 'button'].includes(v)
  },
  width: {
    type: [String, Number],
    default: '100%'
  },
  height: {
    type: [String, Number],
    default: null
  },
  animate: {
    type: Boolean,
    default: true
  },
  lines: {
    type: Number,
    default: 1
  },
  borderRadius: {
    type: [String, Number],
    default: null
  }
});

const computedStyle = computed(() => {
  const style = {};
  
  if (props.width) {
    style.width = typeof props.width === 'number' ? `${props.width}px` : props.width;
  }
  
  if (props.height) {
    style.height = typeof props.height === 'number' ? `${props.height}px` : props.height;
  }
  
  if (props.borderRadius) {
    style.borderRadius = typeof props.borderRadius === 'number' ? `${props.borderRadius}px` : props.borderRadius;
  }
  
  return style;
});
</script>

<style scoped>
.skeleton {
  background: linear-gradient(
    90deg,
    rgba(118, 204, 214, 0.1) 25%,
    rgba(118, 204, 214, 0.2) 50%,
    rgba(118, 204, 214, 0.1) 75%
  );
  background-size: 200% 100%;
  border-radius: 4px;
}

.skeleton.animate {
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* Variants */
.skeleton.text {
  height: 1em;
  border-radius: 4px;
}

.skeleton.circular {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.skeleton.rectangular {
  height: 120px;
  border-radius: 8px;
}

.skeleton.card {
  height: 200px;
  border-radius: 12px;
}

.skeleton.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
}

.skeleton.button {
  height: 44px;
  border-radius: 8px;
  width: 120px;
}

.srOnly {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Light theme */
:global(html[data-theme="light"]) .skeleton {
  background: linear-gradient(
    90deg,
    rgba(7, 31, 52, 0.08) 25%,
    rgba(7, 31, 52, 0.15) 50%,
    rgba(7, 31, 52, 0.08) 75%
  );
  background-size: 200% 100%;
}
</style>

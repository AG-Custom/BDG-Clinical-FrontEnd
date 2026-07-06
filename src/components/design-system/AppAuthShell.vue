<script setup lang="ts">
import { DesignSystemAuth, DesignSystemBrand } from '@/constants/design-system';

defineProps<{
  variant: 'login' | 'register';
  formTitle: string;
  formSubtitle: string;
}>();

const content = {
  login: DesignSystemAuth.login,
  register: DesignSystemAuth.register,
};
</script>

<template>
  <q-page class="auth-premium">
    <aside class="auth-premium__visual" aria-hidden="true">
      <div class="auth-premium__visual-bg" />
      <div
        class="auth-premium__visual-image"
        :style="{ backgroundImage: `url(${DesignSystemAuth.heroImage})` }"
      />
      <div class="auth-premium__visual-overlay" />

      <div class="auth-premium__visual-content ds-animate-fade-in">
        <div class="auth-premium__visual-logo">
          <span class="auth-premium__visual-logo-icon">
            <q-icon :name="DesignSystemBrand.icone" size="24px" />
          </span>
          {{ DesignSystemBrand.nome }}
        </div>

        <h2 class="auth-premium__visual-headline">
          {{ content[variant].headline }}
        </h2>
        <p class="auth-premium__visual-subline">
          {{ content[variant].subline }}
        </p>

        <ul class="auth-premium__features">
          <li
            v-for="feature in content[variant].features"
            :key="feature.text"
            class="auth-premium__feature"
          >
            <span class="auth-premium__feature-icon" aria-hidden="true">
              <q-icon :name="feature.icon" size="18px" />
            </span>
            <span>{{ feature.text }}</span>
          </li>
        </ul>
      </div>
    </aside>

    <section class="auth-premium__form-panel">
      <div class="auth-premium__form-inner ds-animate-fade-in-up">
        <div class="auth-premium__form-brand">
          <span class="auth-premium__form-brand-icon" aria-hidden="true">
            <q-icon :name="DesignSystemBrand.icone" size="22px" color="primary" />
          </span>
          <span class="auth-premium__form-brand-name">{{ DesignSystemBrand.nome }}</span>
        </div>

        <header class="auth-premium__form-header">
          <h1>{{ formTitle }}</h1>
          <p>{{ formSubtitle }}</p>
        </header>

        <slot />
      </div>
    </section>
  </q-page>
</template>

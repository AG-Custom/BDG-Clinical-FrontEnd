import type { App } from 'vue';

import AppAuthShell from '@/components/design-system/AppAuthShell.vue';
import AppBrand from '@/components/design-system/AppBrand.vue';
import AppMetricCard from '@/components/design-system/AppMetricCard.vue';
import AppEmpresaMarca from '@/components/shared/AppEmpresaMarca.vue';
import AppEmpresaSwitcher from '@/components/shared/AppEmpresaSwitcher.vue';
import AppEmptyState from '@/components/shared/AppEmptyState.vue';
import AppPageHeader from '@/components/shared/AppPageHeader.vue';
import AppTableSkeleton from '@/components/shared/AppTableSkeleton.vue';
import AppTrocaEmpresaOverlay from '@/components/shared/AppTrocaEmpresaOverlay.vue';

export function registerGlobalComponents(app: App): void {
  app.component('AppAuthShell', AppAuthShell);
  app.component('AppBrand', AppBrand);
  app.component('AppMetricCard', AppMetricCard);
  app.component('AppEmpresaMarca', AppEmpresaMarca);
  app.component('AppEmpresaSwitcher', AppEmpresaSwitcher);
  app.component('AppEmptyState', AppEmptyState);
  app.component('AppPageHeader', AppPageHeader);
  app.component('AppTableSkeleton', AppTableSkeleton);
  app.component('AppTrocaEmpresaOverlay', AppTrocaEmpresaOverlay);
}

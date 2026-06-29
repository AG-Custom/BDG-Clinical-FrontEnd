<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import PermissaoArvoreEditor from '@/components/permissoes/PermissaoArvoreEditor.vue';
import { permissoes } from '@/constants/permissoes';
import { usePermissao } from '@/composables/usePermissao';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { funcionarioService } from '@/services/funcionario.service';
import { useAuthStore } from '@/stores/auth.store';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const podeEditar = usePermissao(permissoes.funcionarios.editar);

const carregando = ref(true);
const salvando = ref(false);
const nomeFuncionario = ref('');
const cargoNome = ref<string | null>(null);
const cargoPermissionKeys = ref<string[]>([]);

const funcionarioId = computed(() => route.params.id as string);

const form = reactive({
  allows: [] as string[],
  denies: [] as string[],
});

const effectivePermissions = ref<string[]>([]);

async function carregarDados(): Promise<void> {
  carregando.value = true;

  try {
    const [funcionario, permissoesFuncionario] = await Promise.all([
      funcionarioService.obter(funcionarioId.value),
      funcionarioService.obterPermissoes(funcionarioId.value),
    ]);

    nomeFuncionario.value = funcionario.nome;
    cargoNome.value = permissoesFuncionario.cargoNome;
    cargoPermissionKeys.value = [...permissoesFuncionario.cargoPermissionKeys];
    form.allows = [...permissoesFuncionario.allows];
    form.denies = [...permissoesFuncionario.denies];
    effectivePermissions.value = [...permissoesFuncionario.effectivePermissions];
  } catch (error) {
    notificacao.erro(obterMensagem(error));
    await router.push({ name: 'funcionarios' });
  } finally {
    carregando.value = false;
  }
}

async function salvar(): Promise<void> {
  salvando.value = true;

  try {
    const resultado = await funcionarioService.atualizarPermissoes(funcionarioId.value, {
      allows: form.allows,
      denies: form.denies,
    });

    effectivePermissions.value = [...resultado.effectivePermissions];

    if (resultado.usuarioId === authStore.usuario?.id) {
      await authStore.sincronizarUsuario();
    }

    notificacao.sucesso('Permissões atualizadas com sucesso.');
    await router.push({ name: 'funcionarios-editar', params: { id: funcionarioId.value } });
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    salvando.value = false;
  }
}

function cancelar(): void {
  router.push({ name: 'funcionarios-editar', params: { id: funcionarioId.value } });
}

onMounted(() => {
  void carregarDados();
});
</script>

<template>
  <q-page class="page-content page-content--form q-pa-md">
    <app-page-header
      titulo="Permissões avançadas"
      :subtitulo="`Exceções individuais sobre as permissões do cargo de ${nomeFuncionario || 'colaborador'}.`"
    />

    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div v-if="carregando" class="text-body2" style="color: var(--ds-text-secondary)">
          Carregando permissões...
        </div>

        <q-form v-else class="form-stack" @submit.prevent="salvar">
          <div class="text-subtitle2 text-weight-medium">Permissões do cargo</div>
          <div class="text-body2 q-mb-sm" style="color: var(--ds-text-secondary)">
            Cargo: {{ cargoNome ?? 'Não definido' }}
          </div>
          <div
            v-if="cargoPermissionKeys.length === 0"
            class="text-body2 q-mb-md"
            style="color: var(--ds-text-secondary)"
          >
            Nenhuma permissão configurada no cargo.
          </div>
          <div v-else class="row q-gutter-xs q-mb-md">
            <q-chip
              v-for="chave in cargoPermissionKeys"
              :key="chave"
              dense
              outline
              color="primary"
              :label="chave"
            />
          </div>

          <permissao-arvore-editor
            v-model="form.allows"
            :readonly="!podeEditar"
            modo="override-allow"
          />

          <permissao-arvore-editor
            v-model="form.denies"
            :readonly="!podeEditar"
            modo="override-deny"
          />

          <div class="text-subtitle2 text-weight-medium q-mt-md">Permissões efetivas</div>
          <div
            v-if="effectivePermissions.length === 0"
            class="text-body2 q-mb-md"
            style="color: var(--ds-text-secondary)"
          >
            Nenhuma permissão efetiva.
          </div>
          <div v-else class="row q-gutter-xs q-mb-md">
            <q-chip
              v-for="chave in effectivePermissions"
              :key="chave"
              dense
              color="primary"
              text-color="white"
              :label="chave"
            />
          </div>

          <div class="row q-gutter-sm">
            <q-btn
              color="primary"
              label="Salvar"
              type="submit"
              unelevated
              no-caps
              :loading="salvando"
              :disable="!podeEditar"
            />
            <q-btn flat label="Voltar" color="primary" no-caps @click="cancelar" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

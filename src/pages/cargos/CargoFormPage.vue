<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import PermissaoArvoreEditor from '@/components/permissoes/PermissaoArvoreEditor.vue';
import { permissoes } from '@/constants/permissoes';
import { usePermissao } from '@/composables/usePermissao';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { cargoService } from '@/services/cargo.service';

const route = useRoute();
const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const podeCriar = usePermissao(permissoes.cargos.criar);
const podeEditar = usePermissao(permissoes.cargos.editar);
const podeSalvar = computed(() => (isEdicao.value ? podeEditar.value : podeCriar.value));

const carregando = ref(false);
const salvando = ref(false);

const isEdicao = computed(() => route.name === 'cargos-editar');
const cargoId = computed(() => route.params.id as string | undefined);

const form = reactive({
  nome: '',
  flagAplicador: false,
  permissionKeys: [] as string[],
});

async function carregarCargo(): Promise<void> {
  if (!isEdicao.value || !cargoId.value) {
    return;
  }

  carregando.value = true;

  try {
    const [cargo, permissoesCargo] = await Promise.all([
      cargoService.obter(cargoId.value),
      cargoService.obterPermissoes(cargoId.value),
    ]);

    form.nome = cargo.nome;
    form.flagAplicador = cargo.flagAplicador;
    form.permissionKeys = [...permissoesCargo.permissionKeys];
  } catch (error) {
    notificacao.erro(obterMensagem(error));
    await router.push({ name: 'cargos' });
  } finally {
    carregando.value = false;
  }
}

async function salvar(): Promise<void> {
  salvando.value = true;

  try {
    const payloadBasico = {
      nome: form.nome.trim(),
      flagAplicador: form.flagAplicador,
    };

    let id = cargoId.value;

    if (isEdicao.value && id) {
      await cargoService.atualizar(id, payloadBasico);
    } else {
      const cargo = await cargoService.criar(payloadBasico);
      id = cargo.id;
    }

    await cargoService.atualizarPermissoes(id, {
      permissionKeys: form.permissionKeys,
    });

    notificacao.sucesso(isEdicao.value ? 'Cargo atualizado com sucesso.' : 'Cargo cadastrado com sucesso.');
    await router.push({ name: 'cargos' });
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    salvando.value = false;
  }
}

function cancelar(): void {
  router.push({ name: 'cargos' });
}

onMounted(() => {
  void carregarCargo();
});
</script>

<template>
  <q-page class="page-content page-content--fluid q-pa-md">
    <app-page-header
      :titulo="isEdicao ? 'Editar cargo' : 'Novo cargo'"
      :subtitulo="
        isEdicao
          ? 'Atualize o nome, permissões e configurações do cargo.'
          : 'Cadastre um cargo com permissões para vincular aos colaboradores.'
      "
    />

    <q-card flat bordered>
      <q-card-section>
        <div v-if="carregando" class="q-pa-md text-body2" style="color: var(--ds-text-secondary)">
          Carregando cargo...
        </div>

        <q-form v-else class="form-stack" @submit.prevent="salvar">
          <q-input
            v-model="form.nome"
            class="form-field--required"
            label="Nome"
            outlined
            :readonly="!podeSalvar"
            :rules="[(value: string) => Boolean(value?.trim()) || 'Informe o nome do cargo']"
          />

          <q-toggle
            v-model="form.flagAplicador"
            label="Permite que usuarios vinculados a esse cargo realizem aplicações"
            color="primary"
            :disable="!podeSalvar"
          />

          <permissao-arvore-editor
            v-model="form.permissionKeys"
            :readonly="!podeSalvar"
            modo="cargo"
          />

          <div
            v-if="podeSalvar && form.permissionKeys.length === 0"
            class="text-caption"
            style="color: var(--ds-text-secondary)"
          >
            Selecione ao menos uma permissão para salvar.
          </div>

          <div class="row q-gutter-sm q-mt-md">
            <q-btn
              color="primary"
              label="Salvar"
              type="submit"
              unelevated
              no-caps
              :loading="salvando"
              :disable="!podeSalvar || form.permissionKeys.length === 0"
            />
            <q-btn flat label="Cancelar" color="primary" no-caps @click="cancelar" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

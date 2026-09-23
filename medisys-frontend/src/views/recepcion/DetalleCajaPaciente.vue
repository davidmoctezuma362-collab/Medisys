<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
const router = useRouter();

const paciente = ref(null);
const listaPacientesBD = ref([]);
const pacienteSeleccionadoId = ref('');
const editCosto = ref(500);
const guardadoMsg = ref(false);

const pagarEfectivo = ref(true);
const montoEfectivo = ref(500);

const pagarTarjeta = ref(false);
const montoTarjeta = ref(0);

const pagarTransferencia = ref(false);
const montoTransferencia = ref(0);

const totalAbonado = ref(0);

// Recalcular el total abonado
watch([pagarEfectivo, montoEfectivo, pagarTarjeta, montoTarjeta, pagarTransferencia, montoTransferencia], () => {
  let suma = 0;
  if (pagarEfectivo.value) suma += parseFloat(montoEfectivo.value) || 0;
  if (pagarTarjeta.value) suma += parseFloat(montoTarjeta.value) || 0;
  if (pagarTransferencia.value) suma += parseFloat(montoTransferencia.value) || 0;
  totalAbonado.value = suma;
});

const inicializarCampos = (p) => {
  paciente.value = p;
  editCosto.value = p.total || 500;
  const abonadoInicial = p.abonado || 0;

  if (abonadoInicial > 0) {
    montoEfectivo.value = abonadoInicial;
  } else {
    montoEfectivo.value = editCosto.value;
  }
};

const cargarPaciente = async () => {
  // 1. Revisar si hay un paciente seleccionado previamente en localStorage
  const datos = localStorage.getItem('paciente_edicion_caja');
  if (datos) {
    try {
      const parsed = JSON.parse(datos);
      inicializarCampos(parsed);
      return;
    } catch (e) {
      console.error('Error al parsear paciente_edicion_caja', e);
    }
  }

  // 2. Si se entra directo desde el menú, consultar la lista a PostgreSQL
  try {
    const res = await fetch('https://medisys-uptex.tech/api/pacientes');
    if (res.ok) {
      const lista = await res.json();
      listaPacientesBD.value = lista;
      
      // Si existen pacientes, seleccionar el primero de la lista automáticamente
      if (lista.length > 0) {
        seleccionarPacienteManual(lista[0]);
      }
    }
  } catch (error) {
    console.error('Error al conectar con la API de PostgreSQL:', error);
  }
};

const seleccionarPacienteManual = (p) => {
  if (!p) return;
  pacienteSeleccionadoId.value = p.id;
  const adaptado = {
    id: p.id,
    nombre: p.nombre,
    curp: p.curp || 'SIN CURP',
    hash: `PG-${p.id}`,
    total: 500,
    abonado: 0,
    restante: 500,
    metodo: 'Efectivo',
    estatus: 'Pendiente'
  };
  inicializarCampos(adaptado);
};

const alCambiarSelect = () => {
  const encontrado = listaPacientesBD.value.find(p => p.id === Number(pacienteSeleccionadoId.value));
  if (encontrado) {
    seleccionarPacienteManual(encontrado);
  }
};

onMounted(() => {
  cargarPaciente();
});

const actualizarCaja = () => {
  if (paciente.value) {
    const total = parseFloat(editCosto.value) || 0;
    const abonado = totalAbonado.value;
    const restante = total - abonado;
    
    let metodosUtilizados = [];
    if (pagarEfectivo.value && montoEfectivo.value > 0) metodosUtilizados.push(`Efectivo ($${montoEfectivo.value})`);
    if (pagarTarjeta.value && montoTarjeta.value > 0) metodosUtilizados.push(`Tarjeta ($${montoTarjeta.value})`);
    if (pagarTransferencia.value && montoTransferencia.value > 0) metodosUtilizados.push(`SPEI ($${montoTransferencia.value})`);
    
    let metodoFinalString = metodosUtilizados.join(' + ') || 'No especificado';

    let estatusFinal = 'Pagado';
    if (restante > 0) {
      estatusFinal = 'Anticipo';
    } else if (abonado === 0 && total > 0) {
      estatusFinal = 'Pendiente';
    }

    paciente.value.total = total;
    paciente.value.abonado = abonado;
    paciente.value.restante = restante;
    paciente.value.metodo = metodoFinalString;
    paciente.value.estatus = estatusFinal;

    const masterList = JSON.parse(localStorage.getItem('pacientes_master')) || [];
    const index = masterList.findIndex(p => p.id === paciente.value.id);
    if (index !== -1) {
      masterList[index] = paciente.value;
      localStorage.setItem('pacientes_master', JSON.stringify(masterList));
    }

    // Limpiar caché temporal
    localStorage.removeItem('paciente_edicion_caja');

    guardadoMsg.value = true;
    
    setTimeout(() => {
      window.print();
    }, 150);

    setTimeout(() => {
      guardadoMsg.value = false;
      router.push('/recepcion/pacientes');
    }, 2800);
  }
};

const handleLogout = () => {
  localStorage.removeItem('medisys_jwt');
  localStorage.removeItem('paciente_edicion_caja');
  router.push('/login');
};
</script>

<template>
  <div class="dashboard-wrapper">
    <aside class="sidebar no-print">
      <div class="brand">MEDISYS 💼</div>
      <div class="user-profile">Módulo de Recepción</div>
      <nav class="menu">
        <router-link to="/dashboard/recepcion">📊 Dashboard</router-link>
        <router-link to="/recepcion/agenda">📅 Agenda de Citas</router-link>
        <router-link to="/recepcion/pacientes">👥 Registro de Pacientes</router-link>
        <router-link to="/recepcion/detalle-caja" class="active">💳 Cobro / Caja</router-link>
        <button @click="handleLogout" class="btn-logout">Cerrar Sesión</button>
      </nav>
    </aside>

    <main class="content">
      <header class="main-header no-print">
        <div class="header-inline">
          <router-link to="/recepcion/pacientes" class="btn-back">⬅ Volver al Listado</router-link>
          <h2>Auditoría y Desglose de Caja Multi-Método</h2>
        </div>
      </header>

      <!-- BARRA PARA SELECCIONAR PACIENTE SI SE ENTRÓ DIRECTO DESDE EL MENÚ -->
      <div v-if="listaPacientesBD.length > 0" class="select-paciente-card no-print">
        <label>👤 Seleccionar Paciente para Cobro:</label>
        <select v-model="pacienteSeleccionadoId" @change="alCambiarSelect" class="select-paciente-input">
          <option v-for="p in listaPacientesBD" :key="p.id" :value="p.id">
            #{{ p.id }} - {{ p.nombre }} ({{ p.telefono || 'Sin teléfono' }})
          </option>
        </select>
      </div>

      <div v-if="guardadoMsg" class="alert-success no-print">🔒 Transacción combinada procesada. El desglose fue firmado con éxito.</div>

      <div v-if="paciente" class="audit-container no-print">
        
        <div class="info-panel">
          <h3>Filiación de Identidad</h3>
          <p><strong>Paciente:</strong> <span>{{ paciente.nombre }}</span></p>
          <p><strong>CURP:</strong> <span class="mono">{{ paciente.curp }}</span></p>
          <p><strong>Código Hash ID:</strong> <span class="mono token">{{ paciente.hash || ('PG-' + paciente.id) }}</span></p>
          <div class="current-status">
            Estatus Interno: 
            <span :class="['badge', paciente.estatus === 'Pagado' ? 'badge-done' : 'badge-pending']">
              {{ paciente.estatus }}
            </span>
          </div>
        </div>

        <div class="modifier-panel">
          <h3>Estructura de Cobros Combinados (Mixtos)</h3>
          <form @submit.prevent="actualizarCaja">
            <div class="form-group">
              <label>Costo Total de la Consulta (MXN)</label>
              <input type="number" v-model="editCosto" min="0" required />
            </div>

            <div class="methods-selector-box">
              <label class="section-label">Selecciona los métodos de recepción:</label>
              
              <div class="checkbox-row">
                <input type="checkbox" id="efectivo" v-model="pagarEfectivo" />
                <label for="efectivo">💵 Efectivo</label>
                <input v-if="pagarEfectivo" type="number" v-model="montoEfectivo" class="small-input" placeholder="Monto" min="0" />
              </div>

              <div class="checkbox-row">
                <input type="checkbox" id="tarjeta" v-model="pagarTarjeta" />
                <label for="tarjeta">💳 Tarjeta de Crédito/Débito</label>
                <input v-if="pagarTarjeta" type="number" v-model="montoTarjeta" class="small-input" placeholder="Monto" min="0" />
              </div>

              <div class="checkbox-row">
                <input type="checkbox" id="spei" v-model="pagarTransferencia" />
                <label for="spei">🏦 Transferencia SPEI</label>
                <input v-if="pagarTransferencia" type="number" v-model="montoTransferencia" class="small-input" placeholder="Monto" min="0" />
              </div>
            </div>

            <div class="balance-preview-grid">
              <div class="preview-box">
                <p>Total Abonado:</p>
                <h3 style="color: #065f46;">${{ totalAbonado.toFixed(2) }}</h3>
              </div>
              <div class="preview-box">
                <p>Saldo Restante:</p>
                <h3 :class="{ 'debt': (editCosto - totalAbonado) > 0 }">
                  ${{ (editCosto - totalAbonado).toFixed(2) }} MXN
                </h3>
              </div>
            </div>

            <button type="submit" class="btn-save-box" :disabled="(editCosto - totalAbonado) < 0">
              Confirmar y Registrar Pago Mixto
            </button>
            <p v-if="(editCosto - totalAbonado) < 0" class="error-notice">⚠️ El monto abonado supera el costo total de la consulta.</p>
          </form>
        </div>
      </div>

      <div v-else class="empty-state no-print">
        <p>📭 No hay ningún paciente seleccionado para el cobro.</p>
        <router-link to="/recepcion/pacientes" class="btn-back">Ir a la lista de pacientes</router-link>
      </div>

      <!-- TICKET DE IMPRESIÓN -->
      <div v-if="paciente" class="print-only receipt-template">
        <div class="receipt-header">
          <h1>MEDISYS CLINIC 🩺</h1>
          <p>Comprobante de Actualización de Caja e Ingresos</p>
          <p class="receipt-date">Fecha de Emisión: 24 / 06 / 2026</p>
        </div>
        <div class="receipt-divider"></div>
        <div class="receipt-body">
          <p><strong>Paciente:</strong> {{ paciente.nombre }}</p>
          <p><strong>CURP:</strong> {{ paciente.curp }}</p>
          <p><strong>Estatus Final:</strong> {{ paciente.estatus }}</p>
          <p><strong>Desglose de Cobro:</strong> {{ paciente.metodo }}</p>
          <div class="receipt-divider"></div>
          <p>Costo del Servicio: ${{ paciente.total.toFixed(2) }} MXN</p>
          <p>Monto Liquidado: ${{ paciente.abonado.toFixed(2) }} MXN</p>
          <p>Restante de Deuda: ${{ paciente.restante.toFixed(2) }} MXN</p>
          <div class="receipt-total-box">
            <span>TOTAL PROCESADO EN CAJA:</span>
            <strong>${{ paciente.abonado.toFixed(2) }} MXN</strong>
          </div>
        </div>
        <div class="receipt-footer">
          <p>✔ Ajuste de Cuenta Validado Correctamente</p>
          <span class="digital-seal">Sello Digital: TRANS-MIX-{{ paciente.hash || ('PG-' + paciente.id) }}</span>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.dashboard-wrapper { display: flex; min-height: 100vh; font-family: sans-serif; background: #f1f5f9; }
.sidebar { width: 260px; background: #065f46; color: white; padding: 30px 20px; display: flex; flex-direction: column; }
.brand { font-size: 22px; font-weight: bold; margin-bottom: 10px; text-align: center; border-bottom: 1px solid #047857; padding-bottom: 15px; }
.user-profile { font-size: 13px; color: #a7f3d0; text-align: center; margin-bottom: 30px; }
.menu { display: flex; flex-direction: column; gap: 10px; flex-grow: 1; }
.menu a { color: #d1fae5; text-decoration: none; padding: 12px; border-radius: 6px; font-size: 15px; }
.menu a:hover, .menu a.active { background: #047857; color: white; font-weight: bold; }
.btn-logout { background: #b91c1c; color: white; border: none; padding: 12px; border-radius: 6px; cursor: pointer; font-weight: bold; margin-top: auto; }
.content { flex-grow: 1; padding: 40px; }
.main-header { margin-bottom: 25px; border-bottom: 2px solid #cbd5e1; padding-bottom: 15px; }
.header-inline { display: flex; align-items: center; gap: 20px; }
.btn-back { text-decoration: none; background: #64748b; color: white; padding: 8px 14px; border-radius: 6px; font-weight: bold; font-size: 13px; display: inline-block; }
h2 { color: #0f172a; margin: 0; }

.select-paciente-card { background: white; padding: 15px 20px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e2e8f0; display: flex; align-items: center; gap: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
.select-paciente-card label { font-weight: bold; color: #0f172a; font-size: 14px; }
.select-paciente-input { flex-grow: 1; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; outline: none; }

.audit-container { display: flex; gap: 30px; }
.info-panel { background: white; padding: 25px; border-radius: 12px; width: 38%; box-shadow: 0 4px 6px rgba(0,0,0,0.02); height: fit-content; }
.info-panel h3 { color: #065f46; margin-top: 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
.info-panel p { margin: 15px 0; color: #475569; font-weight: bold; }
.info-panel span { font-weight: normal; color: #0f172a; display: block; margin-top: 4px; font-size: 16px; }
.mono { font-family: monospace; }
.token { background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-size: 13px; display: inline-block !important; }
.current-status { margin-top: 25px; font-weight: bold; color: #475569; border-top: 1px solid #e2e8f0; padding-top: 15px; }

.modifier-panel { background: white; padding: 25px; border-radius: 12px; width: 62%; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
.modifier-panel h3 { color: #065f46; margin-top: 0; margin-bottom: 20px; }
.form-group { margin-bottom: 20px; }
label { display: block; margin-bottom: 6px; font-weight: 600; color: #475569; font-size: 14px; }
input { width: 95%; padding: 11px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 15px; }

.methods-selector-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
.section-label { font-weight: bold; color: #334155; margin-bottom: 12px; }
.checkbox-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; height: 40px; }
.checkbox-row input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; }
.checkbox-row label { display: inline; margin: 0; font-weight: 600; color: #475569; width: 220px; cursor: pointer; }
.small-input { width: 120px; padding: 6px 10px; border-radius: 4px; border: 1px solid #cbd5e1; font-size: 14px; }

.balance-preview-grid { display: flex; gap: 15px; margin: 20px 0; }
.preview-box { background: #f1f5f9; padding: 12px 20px; border-radius: 6px; width: 50%; }
.preview-box p { margin: 0 0 4px 0; font-size: 12px; color: #64748b; font-weight: bold; }
.preview-box h3 { margin: 0; font-size: 22px; color: #0f172a; }
.debt { color: #b91c1c !important; }

.btn-save-box { width: 100%; background: #065f46; color: white; border: none; padding: 12px; border-radius: 6px; font-weight: bold; font-size: 15px; cursor: pointer; }
.btn-save-box:disabled { background: #cbd5e1; color: #94a3b8; cursor: not-allowed; }
.error-notice { color: #b91c1c; font-size: 12px; font-weight: bold; margin-top: 8px; text-align: center; }

.badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
.badge-done { background: #d1fae5; color: #065f46; }
.badge-pending { background: #ffedd5; color: #c2410c; }
.alert-success { background: #d1fae5; color: #065f46; padding: 15px; border-radius: 6px; margin-bottom: 25px; font-weight: bold; border: 1px solid #a7f3d0; }

.empty-state { background: white; padding: 40px; border-radius: 12px; text-align: center; border: 1px solid #e2e8f0; color: #64748b; }

.print-only { display: none; }

@media print {
  .no-print, aside, nav, header, button, form { display: none !important; }
  .print-only { display: block !important; }
  body, .content { background: white !important; color: black !important; padding: 0 !important; width: 100% !important; }
  
  .receipt-template {
    border: 1px dashed #000;
    padding: 15px;
    max-width: 360px;
    margin: 0 auto;
    font-family: monospace;
    color: #000;
  }
  .receipt-header { text-align: center; margin-bottom: 10px; }
  .receipt-header h1 { font-size: 16px; margin: 0; }
  .receipt-header p { font-size: 10px; margin: 3px 0; }
  .receipt-date { font-size: 10px; margin-top: 4px; }
  .receipt-divider { border-top: 1px dashed #000; margin: 10px 0; }
  .receipt-body { font-size: 11px; line-height: 1.5; }
  .receipt-body p { margin: 3px 0; }
  .receipt-total-box { border-top: 1px dashed #000; border-bottom: 1px dashed #000; margin-top: 10px; padding: 6px 0; display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; }
  .receipt-footer { margin-top: 20px; text-align: center; font-size: 10px; }
  .digital-seal { display: block; font-size: 8px; margin-top: 10px; color: #444; word-break: break-all; }
}
</style>
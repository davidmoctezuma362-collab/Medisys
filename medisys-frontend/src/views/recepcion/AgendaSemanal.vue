<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

// CITAS DESDE LA BASE DE DATOS CENTRAL DE POSTGRESQL
const citas = ref([]);
const cargando = ref(true);
const listaConsultorios = ref([]);
const medicosDisponibles = ref([]);

// Filtros reactivos
const fechaFiltro = ref(new Date().toISOString().split('T')[0]);
const doctorFiltro = ref('todos');
const consultorioFiltro = ref('todos');
const busquedaTexto = ref('');

// CARGAR CONSULTORIOS DINÁMICOS DESDE POSTGRESQL
const fetchConsultorios = async () => {
  try {
    const res = await fetch('https://medisys-uptex.tech/api/consultorios');
    if (res.ok) {
      listaConsultorios.value = await res.json();
    }
  } catch (error) {
    console.error('Error al cargar consultorios:', error);
  }
};

// CARGAR MÉDICOS REALES DESDE POSTGRESQL
const fetchMedicos = async () => {
  try {
    const res = await fetch('https://medisys-uptex.tech/api/usuarios');
    if (res.ok) {
      const usuarios = await res.json();
      const medicos = usuarios.filter(u => (u.rol || '').toLowerCase() === 'medico' || (u.rol || '').toLowerCase() === 'doctor');
      if (medicos.length > 0) {
        medicosDisponibles.value = medicos.map(m => m.nombre);
      } else {
        medicosDisponibles.value = ['Dr. Alejandro Silva', 'Dra. Elena Restrepo'];
      }
    }
  } catch (error) {
    console.error('Error al cargar médicos:', error);
  }
};

// CARGAR CITAS REALES DESDE LA API CENTRAL DE POSTGRESQL
const cargarCitasProgramadas = async () => {
  cargando.value = true;
  try {
    const res = await fetch('https://medisys-uptex.tech/api/citas');
    if (res.ok) {
      const data = await res.json();
      // Mapeamos los datos extrayendo correctamente el nombre del doctor asignado
      citas.value = data.map(c => {
        let nombreDoctor = c.doctor || c.medico || c.nombre_medico;
        
        // Si no viene directo, intentamos sacarlo del motivo si trae formato de texto
        if (!nombreDoctor && c.motivo && c.motivo.includes('Consulta con ')) {
          nombreDoctor = c.motivo.replace('Consulta con ', '');
        }

        return {
          id: c.id,
          nombre: c.nombre_paciente || c.nombre || 'Paciente General',
          curp: c.curp || 'SIN CURP',
          doctor: nombreDoctor || 'Médico General',
          fecha: c.fecha,
          hora: c.hora || '09:00',
          consultorio: c.consultorio || 'Consultorio General',
          total: Number(c.total) || 500,
          abonado: Number(c.abonado) || 0,
          estatus: c.estatus || 'Pendiente',
          vitales: c.vitales || null
        };
      });
    } else {
      console.error('Error al obtener la lista de citas del servidor');
    }
  } catch (error) {
    console.error('Error al conectar con la API de PostgreSQL para citas:', error);
  } finally {
    cargando.value = false;
  }
};

onMounted(() => {
  cargarCitasProgramadas();
  fetchConsultorios();
  fetchMedicos();
});

// FILTRADO REACTIVO DE CITAS (EXCLUYE LAS CONSULTAS FINALIZADAS/ATENDIDAS)
const citasFiltradas = computed(() => {
  return citas.value.filter(c => {
    const noAtendido = c.estatus !== 'Atendido'; 
    const coincideFecha = !fechaFiltro.value || c.fecha === fechaFiltro.value;
    const coincideDoctor = doctorFiltro.value === 'todos' || (c.doctor && c.doctor.includes(doctorFiltro.value));
    const coincideConsultorio = consultorioFiltro.value === 'todos' || (c.consultorio && c.consultorio.includes(consultorioFiltro.value));
    const coincideTexto = !busquedaTexto.value || 
      (c.nombre && c.nombre.toLowerCase().includes(busquedaTexto.value.toLowerCase())) ||
      (c.curp && c.curp.toLowerCase().includes(busquedaTexto.value.toLowerCase()));

    return noAtendido && coincideFecha && coincideDoctor && coincideConsultorio && coincideTexto;
  });
});

const totalCitasDia = computed(() => citasFiltradas.value.length);
const totalCobradoDia = computed(() => {
  return citasFiltradas.value.reduce((acc, curr) => acc + (Number(curr.abonado) || 0), 0);
});

// MARCAR COMO ATENDIDO EN LA BASE DE DATOS CENTRAL
const marcarComoAtendido = async (id) => {
  try {
    const res = await fetch(`https://medisys-uptex.tech/api/citas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estatus: 'Atendido' })
    });

    if (res.ok) {
      cargarCitasProgramadas();
    } else {
      const index = citas.value.findIndex(c => c.id === id);
      if (index !== -1) {
        citas.value[index].estatus = 'Atendido';
      }
    }
  } catch (error) {
    console.error('Error al actualizar estado de la cita:', error);
    const index = citas.value.findIndex(c => c.id === id);
    if (index !== -1) {
      citas.value[index].estatus = 'Atendido';
    }
  }
};

// CANCELAR Y ELIMINAR CITA DE POSTGRESQL
const cancelarCita = async (id) => {
  if (confirm('¿Deseas cancelar y eliminar esta cita de la base de datos central?')) {
    try {
      const res = await fetch(`https://medisys-uptex.tech/api/citas/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        cargarCitasProgramadas();
      } else {
        citas.value = citas.value.filter(c => c.id !== id);
      }
    } catch (error) {
      console.error('Error al eliminar la cita:', error);
      citas.value = citas.value.filter(c => c.id !== id);
    }
  }
};

const limpiarFiltros = () => {
  fechaFiltro.value = '';
  doctorFiltro.value = 'todos';
  consultorioFiltro.value = 'todos';
  busquedaTexto.value = '';
};

const irARegistro = () => {
  router.push('/recepcion/pacientes');
};

const handleLogout = () => {
  localStorage.removeItem('medisys_jwt');
  localStorage.removeItem('medisys_user');
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
        <router-link to="/recepcion/agenda" class="active">📅 Agenda de Citas</router-link>
        <router-link to="/recepcion/pacientes">👥 Registro de Pacientes</router-link>
        <router-link to="/recepcion/detalle-caja">💳 Cobro / Caja</router-link>
        <button @click="handleLogout" class="btn-logout">Cerrar Sesión</button>
      </nav>
    </aside>

    <main class="content">
      <header class="main-header no-print">
        <div class="header-title-box">
          <h2>📅 Agenda Semanal de Citas y Control Diario</h2>
          <p class="subtitle">Monitoreo en tiempo real desde la base de datos central PostgreSQL</p>
        </div>
        <button @click="irARegistro" class="btn-new-appointment">
          ➕ Agendar Nueva Cita
        </button>
      </header>

      <div class="metrics-grid no-print">
        <div class="metric-card">
          <div class="metric-icon">📋</div>
          <div>
            <span class="metric-label">Citas Programadas</span>
            <h3 class="metric-value">{{ totalCitasDia }}</h3>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon">💵</div>
          <div>
            <span class="metric-label">Ingresos Recaudados (Filtro)</span>
            <h3 class="metric-value text-green">${{ totalCobradoDia.toFixed(2) }} MXN</h3>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon">📅</div>
          <div>
            <span class="metric-label">Fecha Seleccionada</span>
            <h3 class="metric-value text-blue">{{ fechaFiltro || 'Todas las fechas' }}</h3>
          </div>
        </div>
      </div>

      <!-- FILTROS MULTIPLES -->
      <div class="filters-card no-print">
        <div class="filter-group">
          <label>📅 Fecha:</label>
          <input type="date" v-model="fechaFiltro" class="filter-input" />
        </div>

        <div class="filter-group">
          <label>👨‍⚕️ Médico:</label>
          <select v-model="doctorFiltro" class="filter-select">
            <option value="todos">Todos los Médicos</option>
            <option v-for="(doc, dIdx) in medicosDisponibles" :key="dIdx" :value="doc">{{ doc }}</option>
          </select>
        </div>

        <div class="filter-group">
          <label>🏥 Consultorio:</label>
          <select v-model="consultorioFiltro" class="filter-select">
            <option value="todos">Todos los Consultorios</option>
            <option v-for="cons in listaConsultorios" :key="cons.id" :value="cons.nombre">
              {{ cons.nombre }} ({{ cons.hospital }})
            </option>
          </select>
        </div>

        <div class="filter-group search-group">
          <label>🔍 Buscar Paciente / CURP:</label>
          <input type="text" v-model="busquedaTexto" placeholder="Ej. Juan Pérez o CURP..." class="filter-input" />
        </div>

        <button @click="limpiarFiltros" class="btn-clear-filters">
          🧹 Limpiar
        </button>
      </div>

      <!-- TABLA DE CITAS -->
      <div class="table-container shadow-card">
        <div class="table-header">
          <h3>Listado de Citas Agendadas (Sincronizado con PostgreSQL)</h3>
          <span class="badge-count">{{ citasFiltradas.length }} cita(s) encontrada(s)</span>
        </div>

        <div v-if="cargando" class="loading-state">Cargando citas desde la base de datos central...</div>

        <table v-else class="agenda-table">
          <thead>
            <tr>
              <th>⏰ Hora / Fecha</th>
              <th>👤 Paciente</th>
              <th>👨‍⚕️ Médico & Consultorio</th>
              <th>🩺 Triage / Vitales</th>
              <th>💰 Pago / Estatus</th>
              <th>📌 Estado Cita</th>
              <th style="text-align: center;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cita in citasFiltradas" :key="cita.id" class="row-hover">
              <td class="time-cell">
                <span class="time-badge">⏰ {{ cita.hora || '09:00' }} hrs</span>
                <span class="date-sub">{{ cita.fecha }}</span>
              </td>
              <td>
                <p class="pac-name">{{ cita.nombre }}</p>
                <span class="curp-sub">{{ cita.curp }}</span>
              </td>
              <td>
                <p class="doc-name">{{ cita.doctor }}</p>
                <span class="room-tag">🏥 {{ cita.consultorio || 'Consultorio General' }}</span>
              </td>
              <td class="vitales-cell">
                <div v-if="cita.vitales">
                  <span>⚖️ {{ cita.vitales.peso }} kg | 📏 {{ cita.vitales.altura }} cm</span> <br>
                  <span>🩸 {{ cita.vitales.presion }} | 🌡️ {{ cita.vitales.temp }} °C</span>
                </div>
                <span v-else class="text-muted">Sin signos registrados</span>
              </td>
              <td>
                <p class="price-text">${{ Number(cita.total || 0).toFixed(2) }} MXN</p>
                <span :class="['badge-pay', cita.estatus === 'Pagado' ? 'pay-done' : 'pay-pending']">
                  {{ cita.estatus }}
                </span>
              </td>
              <td>
                <span :class="['badge-status', cita.estatus === 'Atendido' ? 'status-done' : 'status-scheduled']">
                  {{ cita.estatus === 'Atendido' ? '✔ Atendido' : '⏳ Pendiente' }}
                </span>
              </td>
              <td style="text-align: center;">
                <div class="action-buttons-flex">
                  <button 
                    v-if="cita.estatus !== 'Atendido'" 
                    @click="marcarComoAtendido(cita.id)" 
                    class="btn-action btn-check" 
                    title="Marcar Cita como Atendida"
                  >
                    ✔ Atender
                  </button>
                  <button 
                    @click="cancelarCita(cita.id)" 
                    class="btn-action btn-cancel" 
                    title="Cancelar y eliminar cita"
                  >
                    🗑️
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="!cargando && citasFiltradas.length === 0">
              <td colspan="7" class="empty-table-msg">
                📭 No hay citas registradas que coincidan con los filtros en PostgreSQL.
                <br>
                <button @click="irARegistro" class="btn-link-action">Haz clic aquí para agendar un nuevo paciente.</button>
              </td>
            </tr>
          </tbody>
        </table>
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
.content { flex-grow: 1; padding: 35px; }

.main-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 2px solid #cbd5e1; padding-bottom: 15px; }
.header-title-box h2 { color: #0f172a; margin: 0; font-size: 22px; }
.subtitle { color: #64748b; font-size: 13px; margin: 4px 0 0 0; }
.btn-new-appointment { background: #065f46; color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; font-size: 14px; cursor: pointer; }

.metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 25px; }
.metric-card { background: white; padding: 18px; border-radius: 12px; display: flex; align-items: center; gap: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); border: 1px solid #e2e8f0; }
.metric-icon { font-size: 28px; background: #f1f5f9; padding: 10px; border-radius: 10px; }
.metric-label { font-size: 12px; color: #64748b; font-weight: 600; display: block; }
.metric-value { font-size: 20px; color: #0f172a; margin: 2px 0 0 0; font-weight: bold; }
.text-green { color: #059669; }
.text-blue { color: #2563eb; }

.filters-card { background: white; padding: 16px; border-radius: 12px; display: flex; gap: 12px; align-items: flex-end; margin-bottom: 25px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); border: 1px solid #e2e8f0; flex-wrap: wrap; }
.filter-group { display: flex; flex-direction: column; gap: 4px; }
.filter-group label { font-size: 12px; font-weight: bold; color: #475569; }
.filter-input, .filter-select { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; outline: none; }
.search-group { flex-grow: 1; }
.btn-clear-filters { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 6px; font-size: 12px; font-weight: bold; color: #475569; cursor: pointer; height: 35px; }

.shadow-card { background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); border: 1px solid #e2e8f0; overflow: hidden; }
.table-header { padding: 16px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; }
.table-header h3 { margin: 0; font-size: 15px; color: #0f172a; }
.badge-count { background: #dbeafe; color: #1e40af; font-size: 11px; font-weight: bold; padding: 4px 8px; border-radius: 12px; }

.agenda-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
.agenda-table th { background: #f1f5f9; padding: 12px 14px; font-size: 12px; color: #475569; font-weight: bold; border-bottom: 1px solid #cbd5e1; }
.agenda-table td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; color: #334155; }
.row-hover:hover { background: #f8fafc; }

.time-badge { background: #065f46; color: white; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; display: inline-block; }
.date-sub { display: block; font-size: 10px; color: #64748b; margin-top: 2px; }
.pac-name { font-weight: bold; color: #0f172a; margin: 0; }
.curp-sub { font-family: monospace; font-size: 11px; color: #64748b; }
.doc-name { margin: 0; font-weight: 600; color: #1e293b; }
.room-tag { font-size: 11px; color: #047857; font-weight: bold; display: block; margin-top: 2px; }
.vitales-cell { font-size: 11px; }
.price-text { margin: 0; font-weight: bold; color: #0f172a; }

.badge-pay { padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; display: inline-block; }
.pay-done { background: #d1fae5; color: #065f46; }
.pay-pending { background: #fef3c7; color: #b45309; }

.badge-status { padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; display: inline-block; }
.status-done { background: #d1fae5; color: #065f46; }
.status-scheduled { background: #dbeafe; color: #1d4ed8; }

.action-buttons-flex { display: flex; gap: 6px; justify-content: center; }
.btn-action { border: none; padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer; }
.btn-check { background: #d1fae5; color: #065f46; }
.btn-cancel { background: #fee2e2; color: #991b1b; }

.loading-state, .empty-table-msg { text-align: center; color: #64748b; padding: 40px !important; font-size: 14px; }
.btn-link-action { background: transparent; border: none; color: #065f46; font-weight: bold; text-decoration: underline; cursor: pointer; margin-top: 8px; font-size: 13px; }
</style>
<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const pacientes = ref([]);
const pacientesPostgres = ref([]);
const listaDoctores = ref([]);
const cargando = ref(true);

// Variables para el modal de Cita Rápida con Doctor dinámico
const mostrarModalCita = ref(false);
const cargandoGuardar = ref(false);
const nuevaCita = ref({
  paciente_id: '',
  nombrePaciente: '',
  doctor: '',
  fecha: new Date().toISOString().split('T')[0],
  hora: '09:00',
  consultorio: 'Consultorio 1',
  motivo: 'Consulta General'
});

// 1. OBTENER PACIENTES Y DOCTORES DESDE POSTGRESQL Y LOCALSTORAGE
const fetchDatosDashboard = async () => {
  try {
    cargando.value = true;

    // A. Obtener pacientes desde la API PostgreSQL central
    const resPacientes = await fetch('https://medisys-uptex.tech/api/pacientes');
    if (resPacientes.ok) {
      pacientesPostgres.value = await resPacientes.json();
    }

    // B. Obtener médicos registrados desde PostgreSQL
    const resUsuarios = await fetch('https://medisys-uptex.tech/api/usuarios');
    if (resUsuarios.ok) {
      const usuariosBD = await resUsuarios.json();
      // Filtrar únicamente los usuarios con rol de médico o doctor
      listaDoctores.value = usuariosBD.filter(u => 
        (u.rol || '').toLowerCase() === 'medico' || (u.rol || '').toLowerCase() === 'doctor'
      );
    }
  } catch (error) {
    console.error('Error al conectar con la API de Recepción:', error);
  } finally {
    cargando.value = false;
  }

  // C. Combinar con localStorage para mantener agenda local de caja
  const master = JSON.parse(localStorage.getItem('pacientes_master')) || [];
  pacientes.value = master;
};

onMounted(() => {
  fetchDatosDashboard();
});

const hoyTexto = new Date().toISOString().split('T')[0];

const citasHoy = computed(() => {
  return pacientes.value.filter(p => p.fecha === hoyTexto);
});

// Calcula el total de pacientes considerando PostgreSQL o memoria local
const totalPacientesBD = computed(() => {
  return Math.max(pacientes.value.length, pacientesPostgres.value.length);
});

const totalIngresos = computed(() => {
  return pacientes.value.reduce((acc, p) => acc + (Number(p.abonado) || 0), 0);
});

// 2. GUARDAR NUEVA CITA CON DOCTOR SELECCIONADO EN LA BD
const guardarCitaRapida = async () => {
  if (!nuevaCita.value.doctor) {
    alert('Por favor selecciona un médico disponible.');
    return;
  }

  try {
    cargandoGuardar.value = true;

    // Petición POST a la API de PostgreSQL
    const res = await fetch('https://medisys-uptex.tech/api/citas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paciente_id: nuevaCita.value.paciente_id || 1,
        doctor: nuevaCita.value.doctor,
        fecha: nuevaCita.value.fecha,
        hora: nuevaCita.value.hora,
        consultorio: nuevaCita.value.consultorio,
        motivo: nuevaCita.value.motivo
      })
    });

    if (res.ok) {
      // Guardar también en localStorage para consistencia de Recepción
      const master = JSON.parse(localStorage.getItem('pacientes_master')) || [];
      master.push({
        id: Date.now(),
        nombre: nuevaCita.value.nombrePaciente || 'Paciente Agendado',
        doctor: nuevaCita.value.doctor,
        fecha: nuevaCita.value.fecha,
        hora: nuevaCita.value.hora,
        consultorio: nuevaCita.value.consultorio,
        estatus: 'Programada'
      });
      localStorage.setItem('pacientes_master', JSON.stringify(master));

      alert(`¡Cita agendada con éxito para el ${nuevaCita.value.doctor}!`);
      mostrarModalCita.value = false;
      fetchDatosDashboard(); // Recargar KPIs y listas
    } else {
      alert('Ocurrió un error al guardar la cita en la base de datos.');
    }
  } catch (error) {
    console.error('Error al agendar cita:', error);
    alert('Error de conexión con el servidor de MEDISYS.');
  } finally {
    cargandoGuardar.value = false;
  }
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
        <router-link to="/dashboard/recepcion" class="active">📊 Dashboard</router-link>
        <router-link to="/recepcion/agenda">📅 Agenda de Citas</router-link>
        <router-link to="/recepcion/pacientes">👥 Registro de Pacientes</router-link>
        <router-link to="/recepcion/detalle-caja">💳 Cobro / Caja</router-link>
        <button @click="handleLogout" class="btn-logout">Cerrar Sesión</button>
      </nav>
    </aside>

    <main class="content">
      <header class="main-header no-print">
        <div>
          <h2>📊 Dashboard de Recepción y Control Operativo</h2>
          <p class="subtitle">Resumen general de métricas y acceso rápido a cajas</p>
        </div>
      </header>

      <div class="kpi-grid">
        <div class="kpi-card">
          <p class="kpi-title">📅 Citas de Hoy ({{ hoyTexto }})</p>
          <h3 class="kpi-num">{{ citasHoy.length }}</h3>
        </div>
        <div class="kpi-card">
          <p class="kpi-title">👥 Pacientes Registrados Totales</p>
          <h3 class="kpi-num text-blue">{{ totalPacientesBD }}</h3>
        </div>
        <div class="kpi-card">
          <p class="kpi-title">🩺 Médicos Disponibles</p>
          <h3 class="kpi-num text-purple">{{ listaDoctores.length }} Doctor(es)</h3>
        </div>
        <div class="kpi-card">
          <p class="kpi-title">💰 Recaudación Total Caja</p>
          <h3 class="kpi-num text-green">${{ totalIngresos.toFixed(2) }} MXN</h3>
        </div>
      </div>

      <div class="quick-links-box">
        <h3>🚀 Acceso Rápido a Flujos</h3>
        <div class="btn-links-flex">
          <button @click="mostrarModalCita = true" class="card-btn btn-green border-none cursor-pointer">
            ➕ Agendar Cita Rápida
          </button>
          <router-link to="/recepcion/agenda" class="card-btn btn-blue">
            📅 Ver Agenda Completa
          </router-link>
          <router-link to="/recepcion/detalle-caja" class="card-btn btn-amber">
            💳 Arqueo de Caja y Cobro
          </router-link>
        </div>
      </div>

      <div class="quick-links-box style-mt">
        <h3>📋 Pacientes Recientes en Base de Datos Central</h3>
        <div v-if="cargando" class="loading-text">Cargando datos de PostgreSQL...</div>
        <div v-else-if="pacientesPostgres.length === 0" class="loading-text">No hay pacientes registrados en el servidor.</div>
        <div v-else class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Teléfono</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in pacientesPostgres.slice(0, 5)" :key="p.id">
                <td><strong>#{{ p.id }}</strong></td>
                <td>{{ p.nombre }}</td>
                <td>{{ p.email || 'Sin correo' }}</td>
                <td>{{ p.telefono || 'Sin teléfono' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>

    <div v-if="mostrarModalCita" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <h3>📅 Agendar Cita para Médico</h3>
          <button @click="mostrarModalCita = false" class="btn-close">&times;</button>
        </div>

        <form @submit.prevent="guardarCitaRapida" class="modal-body">
          <div class="form-group">
            <label>Paciente:</label>
            <select v-model="nuevaCita.paciente_id" class="form-input" required>
              <option value="" disabled>-- Seleccionar Paciente --</option>
              <option v-for="p in pacientesPostgres" :key="p.id" :value="p.id">
                #{{ p.id }} - {{ p.nombre }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Doctor Asignado:</label>
            <select v-model="nuevaCita.doctor" class="form-input" required>
              <option value="" disabled selected>-- Seleccionar Médico --</option>
              <option v-for="doc in listaDoctores" :key="doc.id" :value="doc.nombre">
                {{ doc.nombre }}
              </option>
            </select>
            <span v-if="listaDoctores.length === 0" class="help-text">
              No se encontraron médicos activos. Agrégalos desde el módulo Administrador.
            </span>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Fecha:</label>
              <input type="date" v-model="nuevaCita.fecha" class="form-input" required />
            </div>
            <div class="form-group">
              <label>Hora:</label>
              <input type="time" v-model="nuevaCita.hora" class="form-input" required />
            </div>
          </div>

          <div class="form-group">
            <label>Consultorio:</label>
            <select v-model="nuevaCita.consultorio" class="form-input">
              <option value="Consultorio 1">Consultorio 1 - General</option>
              <option value="Consultorio 2">Consultorio 2 - Especialidades</option>
            </select>
          </div>

          <div class="modal-actions">
            <button type="button" @click="mostrarModalCita = false" class="btn-cancel">Cancelar</button>
            <button type="submit" :disabled="cargandoGuardar" class="btn-save">
              {{ cargandoGuardar ? 'Guardando...' : 'Confirmar Cita' }}
            </button>
          </div>
        </form>
      </div>
    </div>
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

.main-header { margin-bottom: 25px; border-bottom: 2px solid #cbd5e1; padding-bottom: 15px; }
.main-header h2 { color: #0f172a; margin: 0; font-size: 22px; }
.subtitle { color: #64748b; font-size: 13px; margin: 4px 0 0 0; }

.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
.kpi-card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); border: 1px solid #e2e8f0; }
.kpi-title { margin: 0; font-size: 12px; color: #64748b; font-weight: bold; }
.kpi-num { margin: 8px 0 0 0; font-size: 22px; color: #0f172a; font-weight: bold; }
.text-green { color: #059669; }
.text-blue { color: #2563eb; }
.text-purple { color: #7c3aed; }

.quick-links-box { background: white; padding: 25px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
.quick-links-box h3 { margin: 0 0 15px 0; color: #0f172a; font-size: 16px; }
.btn-links-flex { display: flex; gap: 15px; }
.card-btn { flex: 1; padding: 15px; border-radius: 10px; text-decoration: none; font-weight: bold; text-align: center; color: white; font-size: 14px; transition: transform 0.2s; }
.card-btn:hover { transform: translateY(-2px); }
.btn-green { background: #065f46; }
.btn-blue { background: #2563eb; }
.btn-amber { background: #d97706; }
.border-none { border: none; }
.cursor-pointer { cursor: pointer; }

.style-mt { margin-top: 25px; }
.loading-text { font-size: 13px; color: #64748b; }
.table-responsive { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
.data-table th, .data-table td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
.data-table th { background: #f8fafc; color: #475569; font-weight: 600; }

/* ESTILOS DEL MODAL */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-card { background: white; width: 100%; max-width: 500px; padding: 25px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
.modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px; }
.modal-header h3 { margin: 0; color: #0f172a; font-size: 18px; }
.btn-close { background: transparent; border: none; font-size: 24px; cursor: pointer; color: #64748b; }

.modal-body { display: flex; flex-direction: column; gap: 15px; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-group label { font-size: 13px; font-weight: bold; color: #334155; }
.form-input { padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; background: white; }
.form-row { display: flex; gap: 15px; }
.form-row .form-group { flex: 1; }
.help-text { font-size: 11px; color: #dc2626; margin-top: 2px; }

.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 15px; }
.btn-cancel { padding: 10px 18px; background: #e2e8f0; color: #475569; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; }
.btn-save { padding: 10px 18px; background: #065f46; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; }
.btn-save:hover { background: #047857; }
</style>
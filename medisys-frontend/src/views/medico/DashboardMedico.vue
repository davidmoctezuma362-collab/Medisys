<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

// 1. OBTENER INFORMACIÓN DEL DOCTOR QUE INICIÓ SESIÓN
const obtenerDoctorSesion = () => {
  const usuarioGuardado = JSON.parse(localStorage.getItem('medisys_user') || '{}');
  return {
    nombre: usuarioGuardado.nombre || 'Dr. Alejandro Silva',
    especialidad: usuarioGuardado.especialidad || 'Medicina General'
  };
};

const doctorSesion = ref(obtenerDoctorSesion());
const citas = ref([]);
const cargando = ref(true);
const fechaSeleccionada = ref(new Date().toISOString().split('T')[0]);
const mesActual = ref(new Date());

// Función auxiliar para normalizar fechas de PostgreSQL / ISO a 'YYYY-MM-DD'
const normalizarFecha = (fechaRaw) => {
  if (!fechaRaw) return '';
  if (typeof fechaRaw === 'string' && fechaRaw.includes('T')) {
    return fechaRaw.split('T')[0];
  }
  return String(fechaRaw).substring(0, 10);
};

// 2. CARGAR Y SINCRONIZAR CITAS (BLINDADO)
const cargarCitasAsignadas = async () => {
  cargando.value = true;
  try {
    const res = await fetch('https://medisys-uptex.tech/api/citas');
    if (res.ok) {
      const citasBD = await res.json();
      
      // Mapeamos y normalizamos los campos para que el doctor siempre las visualice
      citas.value = citasBD.map(c => ({
        id: c.id,
        nombre: c.nombre || c.nombre_paciente || c.paciente || 'Paciente General',
        curp: c.curp || c.curp_paciente || 'SIN CURP',
        doctor: c.doctor || c.motivo || 'Médico General',
        fecha: c.fecha,
        hora: c.hora || '09:00',
        consultorio: c.consultorio || 'Consultorio General',
        estatus: c.estatus || 'Pendiente',
        vitales: c.vitales || null
      }));
    } else {
      citas.value = [];
    }
  } catch (error) {
    console.error('Error al conectar con la API para el médico:', error);
    citas.value = [];
  } finally {
    cargando.value = false;
  }
};

onMounted(() => {
  cargarCitasAsignadas();
});

// 3. CITAS ACTIVAS PENDIENTES DEL DOCTOR (EXCLUYE 'Atendido' Y 'Completada')
const citasPendientesDoctor = computed(() => {
  return citas.value.filter(c => {
    if (!c) return false;
    const estatusNormalizado = (c.estatus || '').toLowerCase();
    const esPendiente = estatusNormalizado !== 'atendido' && estatusNormalizado !== 'completada';
    return esPendiente;
  });
});

// LÓGICA DEL CALENDARIO INTERACTIVO
const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const nombreMesActual = computed(() => {
  return mesActual.value.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
});

const matrizDiasCalendario = computed(() => {
  const año = mesActual.value.getFullYear();
  const mes = mesActual.value.getMonth();
  
  const primerDiaMes = new Date(año, mes, 1).getDay();
  const totalDiasMes = new Date(año, mes + 1, 0).getDate();
  
  const dias = [];
  
  for (let i = 0; i < primerDiaMes; i++) {
    dias.push({ numero: null, fechaIso: null });
  }
  
  for (let d = 1; d <= totalDiasMes; d++) {
    const mesFormatted = String(mes + 1).padStart(2, '0');
    const diaFormatted = String(d).padStart(2, '0');
    const fechaIso = `${año}-${mesFormatted}-${diaFormatted}`;
    
    // Cuenta únicamente las citas PENDIENTES de este día
    const citasDelDia = citasPendientesDoctor.value.filter(c => normalizarFecha(c?.fecha) === fechaIso);
    
    dias.push({
      numero: d,
      fechaIso: fechaIso,
      citas: citasDelDia,
      tieneCitas: citasDelDia.length > 0
    });
  }
  
  return dias;
});

const cambiarMes = (offset) => {
  const nuevoMes = new Date(mesActual.value);
  nuevoMes.setMonth(nuevoMes.getMonth() + offset);
  mesActual.value = nuevoMes;
};

// 4. CITAS PENDIENTES DEL DÍA SELECCIONADO
const citasDelDiaSeleccionado = computed(() => {
  return citasPendientesDoctor.value.filter(c => normalizarFecha(c?.fecha) === fechaSeleccionada.value);
});

const seleccionarDiaCalendario = (dia) => {
  if (dia?.fechaIso) {
    fechaSeleccionada.value = dia.fechaIso;
  }
};

const atenderPaciente = (paciente) => {
  localStorage.setItem('paciente_actual', JSON.stringify(paciente));
  localStorage.setItem('paciente_consulta_activa', JSON.stringify(paciente));
  router.push('/medico/historial');
};

const iniciarVideoconsulta = (paciente) => {
  const nombreLimpio = (paciente?.nombre || paciente?.paciente_nombre || 'Paciente').replace(/\s+/g, '_');
  const urlSala = `https://meet.jit.si/MEDISYS_Consulta_${paciente?.id || Date.now()}_${nombreLimpio}`;
  window.open(urlSala, '_blank');
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
      <div class="brand">MEDISYS 🩺</div>
      <div class="user-profile">
        <p class="doc-name-side">{{ doctorSesion.nombre }}</p>
        <span class="doc-spec-side">{{ doctorSesion.especialidad }}</span>
      </div>
      <nav class="menu">
        <router-link to="/dashboard/medico" class="active">📅 Mi Agenda Personal</router-link>
        <router-link to="/medico/historial">📂 Expedientes Clínicos</router-link>
        <button @click="handleLogout" class="btn-logout">Cerrar Sesión</button>
      </nav>
    </aside>

    <main class="content">
      <header class="main-header no-print">
        <div>
          <h2>📅 Mi Agenda de Citas Asignadas</h2>
          <p class="subtitle">
            Mostrando consultas pendientes de: <strong>{{ doctorSesion.nombre }}</strong>
          </p>
        </div>
      </header>

      <div class="calendar-grid-layout">
        <div class="calendar-card shadow-card">
          <div class="calendar-header-bar">
            <button @click="cambiarMes(-1)" class="btn-month-nav">◀</button>
            <h3 class="month-title">{{ nombreMesActual }}</h3>
            <button @click="cambiarMes(1)" class="btn-month-nav">▶</button>
          </div>

          <div class="weekdays-grid">
            <div v-for="dia in diasSemana" :key="dia" class="weekday-cell">{{ dia }}</div>
          </div>

          <div class="days-grid">
            <div 
              v-for="(dia, idx) in matrizDiasCalendario" 
              :key="idx" 
              :class="[
                'day-cell', 
                { 'empty-cell': !dia.numero },
                { 'selected-day': dia.fechaIso === fechaSeleccionada },
                { 'has-appointments': dia.tieneCitas }
              ]"
              @click="seleccionarDiaCalendario(dia)"
            >
              <span v-if="dia.numero" class="day-number">{{ dia.numero }}</span>
              <div v-if="dia.tieneCitas" class="appointment-indicator">
                <span class="dot-badge"></span>
                <span class="count-badge">{{ dia.citas.length }} cita(s)</span>
              </div>
            </div>
          </div>
        </div>

        <div class="day-details-card shadow-card">
          <div class="day-details-header">
            <h3>📋 Consultas Pendientes ({{ fechaSeleccionada }})</h3>
            <span class="badge-total">{{ citasDelDiaSeleccionado.length }} paciente(s) por atender</span>
          </div>

          <div v-if="cargando" class="loading-state">
            Cargando consultas asignadas...
          </div>

          <div v-else-if="citasDelDiaSeleccionado.length > 0" class="appointments-list">
            <div v-for="cita in citasDelDiaSeleccionado" :key="cita.id" class="appointment-item-card">
              <div class="time-box">
                <span>⏰ <strong>{{ cita.hora || '09:00' }} hrs</strong></span>
                <span class="room-text">🏥 {{ typeof cita.consultorio === 'string' ? cita.consultorio.split('-')[0] : 'Consultorio' }}</span>
              </div>

              <div class="patient-info-box">
                <p class="patient-name">{{ cita.nombre || cita.paciente_nombre || 'Paciente sin nombre' }}</p>
                <p class="patient-curp font-mono">{{ cita.curp || 'SIN CURP' }}</p>
                
                <div v-if="cita.vitales" class="vitales-row">
                  <span>⚖️ {{ cita.vitales.peso || '--' }}kg</span>
                  <span>📏 {{ cita.vitales.altura || '--' }}cm</span>
                  <span>🩸 {{ cita.vitales.presion || '--' }}</span>
                </div>
              </div>

              <div class="status-action-box">
                <span class="badge-status status-pending">
                  ⏳ Por Atender
                </span>

                <div class="btn-group-actions">
                  <button @click="atenderPaciente(cita)" class="btn-attend">
                    📋 Atender
                  </button>
                  <button @click="iniciarVideoconsulta(cita)" class="btn-video" title="Videoconsulta Live">
                    🎥
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="empty-day-state">
            <p class="empty-icon">🎉</p>
            <p class="empty-text">No hay consultas pendientes para este día.</p>
            <p class="empty-sub">Todas las citas agendadas han sido atendidas o no hay programación asignada.</p>
          </div>
        </div>

      </div>
    </main>
  </div>
</template>

<style scoped>
.dashboard-wrapper { display: flex; min-height: 100vh; font-family: sans-serif; background: #f1f5f9; }
.sidebar { width: 260px; background: #1e3a8a; color: white; padding: 30px 20px; display: flex; flex-direction: column; }
.brand { font-size: 22px; font-weight: bold; margin-bottom: 10px; text-align: center; border-bottom: 1px solid #3b82f6; padding-bottom: 15px; }
.user-profile { text-align: center; margin-bottom: 30px; background: rgba(255,255,255,0.08); padding: 10px; border-radius: 8px; }
.doc-name-side { margin: 0; font-weight: bold; font-size: 14px; color: white; }
.doc-spec-side { font-size: 11px; color: #93c5fd; }

.menu { display: flex; flex-direction: column; gap: 10px; flex-grow: 1; }
.menu a { color: #dbeafe; text-decoration: none; padding: 12px; border-radius: 6px; font-size: 15px; }
.menu a:hover, .menu a.active { background: #2563eb; color: white; font-weight: bold; }
.btn-logout { background: #b91c1c; color: white; border: none; padding: 12px; border-radius: 6px; cursor: pointer; font-weight: bold; margin-top: auto; }
.content { flex-grow: 1; padding: 35px; }

.main-header { margin-bottom: 25px; border-bottom: 2px solid #cbd5e1; padding-bottom: 15px; }
.main-header h2 { color: #0f172a; margin: 0; font-size: 22px; }
.subtitle { color: #64748b; font-size: 13px; margin: 4px 0 0 0; }

.calendar-grid-layout { display: flex; gap: 25px; align-items: flex-start; }
.shadow-card { background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); border: 1px solid #e2e8f0; }

.calendar-card { width: 55%; padding: 20px; }
.calendar-header-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.month-title { margin: 0; font-size: 16px; color: #1e3a8a; font-weight: bold; text-transform: capitalize; }
.btn-month-nav { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: bold; }
.btn-month-nav:hover { background: #e2e8f0; }

.weekdays-grid { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-weight: bold; color: #64748b; font-size: 12px; margin-bottom: 8px; }
.weekday-cell { padding: 8px 0; }

.days-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.day-cell { min-height: 65px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px; cursor: pointer; transition: all 0.2s; background: #fafafa; display: flex; flex-direction: column; justify-content: space-between; }
.day-cell:hover { border-color: #2563eb; background: #eff6ff; }
.empty-cell { background: transparent; border-color: transparent; cursor: default; }

.day-number { font-weight: bold; font-size: 12px; color: #334155; }
.selected-day { border: 2px solid #2563eb !important; background: #dbeafe !important; }

.appointment-indicator { font-size: 10px; display: flex; align-items: center; gap: 4px; background: #d1fae5; color: #065f46; padding: 2px 4px; border-radius: 4px; font-weight: bold; }
.dot-badge { width: 6px; height: 6px; background: #10b981; border-radius: 50%; display: inline-block; }

.day-details-card { width: 45%; padding: 20px; min-height: 400px; }
.day-details-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 15px; }
.day-details-header h3 { margin: 0; font-size: 15px; color: #0f172a; }
.badge-total { background: #dbeafe; color: #1e40af; font-size: 11px; font-weight: bold; padding: 4px 8px; border-radius: 12px; }

.appointments-list { display: flex; flex-direction: column; gap: 12px; }
.appointment-item-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 8px; border-left: 4px solid #2563eb; }
.time-box { display: flex; justify-content: space-between; font-size: 12px; color: #1e3a8a; }
.room-text { font-weight: bold; color: #059669; }

.patient-name { margin: 0; font-weight: bold; font-size: 14px; color: #0f172a; }
.patient-curp { font-size: 11px; color: #64748b; margin: 2px 0 6px 0; }
.vitales-row { display: flex; gap: 12px; font-size: 11px; color: #475569; background: white; padding: 4px 8px; border-radius: 6px; border: 1px solid #e2e8f0; width: fit-content; }

.status-action-box { display: flex; justify-content: space-between; align-items: center; margin-top: 4px; }
.badge-status { padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: bold; }
.status-done { background: #d1fae5; color: #065f46; }
.status-pending { background: #fef3c7; color: #b45309; }

.btn-group-actions { display: flex; gap: 6px; }
.btn-attend { background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: bold; cursor: pointer; }
.btn-attend:hover { background: #059669; }
.btn-video { background: white; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; cursor: pointer; font-size: 12px; }

.loading-state, .empty-day-state { text-align: center; padding: 40px 20px; color: #64748b; }
.empty-icon { font-size: 32px; margin: 0; }
.empty-text { font-weight: bold; margin: 8px 0 4px 0; color: #334155; }
.empty-sub { font-size: 12px; margin: 0; }
</style>
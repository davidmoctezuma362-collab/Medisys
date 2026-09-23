<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
const router = useRouter();

// Estado reactivo para pacientes traídos de PostgreSQL
const pacientes = ref([]);
const cargandoPacientes = ref(true);

// Estado reactivo para médicos reales traídos de PostgreSQL
const doctoresStats = ref([]);
const cargandoDoctores = ref(true);

// Estado reactivo para métricas analíticas y gráficas
const metricas = ref({
  ingresosBrutos: 0,
  consultasConcluidas: 0,
  pacientesRegistrados: 0,
  vulnerabilidades: 0,
  graficas: {
    pacientesPorDia: [
      { dia: 'Lun', porcentaje: 20 },
      { dia: 'Mar', porcentaje: 20 },
      { dia: 'Mié', porcentaje: 20 },
      { dia: 'Jue', porcentaje: 20 },
      { dia: 'Vie', porcentaje: 20 }
    ],
    consultasPorMes: [
      { mes: 'Jul', porcentaje: 25 },
      { mes: 'Ago', porcentaje: 50 },
      { mes: 'Sep', porcentaje: 75 }
    ],
    enfermedadesTop: [
      { nombre: 'Diabetes T2:', porcentaje: 55, clase: 'color1' },
      { nombre: 'Hipertensión:', porcentaje: 30, clase: 'color2' },
      { nombre: 'Gripe Común:', porcentaje: 15, clase: 'color3' }
    ]
  }
});

// Total reactivo de pacientes
const totalPacientes = computed(() => metricas.value.pacientesRegistrados || pacientes.value.length);

// Función para formatear moneda en pesos mexicanos ($XX,XXX.00)
const formatearMoneda = (cantidad) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(cantidad || 0);
};

// Consultar analíticas, gráficas y doctores reales desde PostgreSQL
const fetchMetricas = async () => {
  try {
    const res = await fetch('https://medisys-uptex.tech/api/admin/metricas');
    if (res.ok) {
      const data = await res.json();
      metricas.value = data;

      // Actualizar dinámicamente el listado con los doctores reales de la BD
      if (Array.isArray(data.doctoresStats)) {
        doctoresStats.value = data.doctoresStats;
      }
    }
  } catch (error) {
    console.error('Error al obtener métricas analíticas:', error);
  } finally {
    cargandoDoctores.value = false;
  }
};

// Consultar pacientes registrados
const fetchPacientes = async () => {
  try {
    const res = await fetch('https://medisys-uptex.tech/api/pacientes');
    if (res.ok) {
      pacientes.value = await res.json();
    }
  } catch (error) {
    console.error('Error al conectar con la API de pacientes:', error);
  } finally {
    cargandoPacientes.value = false;
  }
};

const logs = ref([
  { id: 1, hora: '12:40 PM', evento: 'Token decodificado correctamente para Perfil Médico', tipo: 'SUCCESS' },
  { id: 2, hora: '12:42 PM', evento: 'Intento de acceso denegado a módulo /admin/usuarios desde IP Recepción', tipo: 'WARN' }
]);

onMounted(() => {
  fetchMetricas();
  fetchPacientes();

  setInterval(() => {
    const horasSimuladas = ['12:44 PM', '12:45 PM', '12:46 PM'];
    const eventosSimulados = [
      'Validación de firma criptográfica RSA-256 completada',
      'Log de auditoría financiera inyectado de forma segura',
      'Sesión inactiva purgada automáticamente de localStorage'
    ];
    const tiposSimulados = ['SUCCESS', 'INFO', 'SUCCESS'];
    const randomIndex = Math.floor(Math.random() * eventosSimulados.length);

    logs.value.unshift({
      id: Date.now(),
      hora: horasSimuladas[randomIndex],
      evento: eventosSimulados[randomIndex],
      tipo: tiposSimulados[randomIndex]
    });

    if (logs.value.length > 4) logs.value.pop();
  }, 4000);
});

const handleLogout = () => {
  localStorage.removeItem('medisys_jwt');
  localStorage.removeItem('medisys_user');
  router.push('/login');
};
</script>

<template>
  <div class="dashboard-wrapper">
    <aside class="sidebar">
      <div class="brand">MEDISYS 👑</div>
      <div class="user-profile">Consola del Administrador</div>
      <nav class="menu">
        <router-link to="/dashboard/admin" class="active">📊 Monitor Analítico</router-link>
        <router-link to="/admin/usuarios">👥 Gestión de Personal</router-link>
        <router-link to="/admin/consultorios">🏥 Gestión de Consultorios</router-link>
        <button @click="handleLogout" class="btn-logout">Cerrar Sesión</button>
      </nav>
    </aside>

    <main class="content">
      <header class="main-header">
        <h2>Panel Corporativo de Analítica y Auditoría Global</h2>
      </header>

      <!-- TARJETAS SUPERIORES -->
      <div class="metrics-row">
        <div class="metric-card">
          <h3>{{ formatearMoneda(metricas.ingresosBrutos) }}</h3>
          <p>Ingresos Brutos Mensuales</p>
        </div>
        <div class="metric-card">
          <h3>{{ metricas.consultasConcluidas }}</h3>
          <p>Consultas Concluidas</p>
        </div>
        <div class="metric-card patient-card">
          <h3>{{ totalPacientes }}</h3>
          <p>Pacientes Registrados en BD</p>
        </div>
        <div class="metric-card security-card">
          <h3>{{ metricas.vulnerabilidades }}</h3>
          <p>Vulnerabilidades / Brechas</p>
        </div>
      </div>

      <!-- FILA DE GRÁFICAS ACTUALIZADAS DINÁMICAMENTE -->
      <div class="charts-row">
        <!-- Gráfica 1: Pacientes por Día -->
        <div class="chart-card">
          <h4>📊 Pacientes por Día (Semana Actual)</h4>
          <div class="bars-container">
            <div 
              v-for="(item, idx) in (metricas.graficas?.pacientesPorDia || [
                { dia: 'Lun', porcentaje: 65 },
                { dia: 'Mar', porcentaje: 80 },
                { dia: 'Mié', porcentaje: 45 },
                { dia: 'Jue', porcentaje: 95 },
                { dia: 'Vie', porcentaje: 70 }
              ])" 
              :key="idx" 
              class="bar-wrapper"
            >
              <div class="bar-fill" :style="{ height: (item.porcentaje || 20) + '%' }"></div>
              <span>{{ item.dia }}</span>
            </div>
          </div>
        </div>

        <!-- Gráfica 2: Consultas por Mes -->
        <div class="chart-card">
          <h4>📈 Consultas por Mes</h4>
          <div class="bars-container">
            <div 
              v-for="(m, idx) in (metricas.graficas?.consultasPorMes || [
                { mes: 'Jul', porcentaje: 50 },
                { mes: 'Ago', porcentaje: 75 },
                { mes: 'Sep', porcentaje: 90 }
              ])" 
              :key="idx" 
              class="bar-wrapper"
            >
              <div class="bar-fill month-bar" :style="{ height: (m.porcentaje || 20) + '%' }"></div>
              <span>{{ m.mes }}</span>
            </div>
          </div>
        </div>

        <!-- Gráfica 3: Enfermedades Frecuentes -->
        <div class="chart-card">
          <h4>🦠 Enfermedades Frecuentes</h4>
          <div class="pie-sim-container">
            <div 
              v-for="(enf, idx) in (metricas.graficas?.enfermedadesTop || [
                { nombre: 'Migraña:', porcentaje: 55, clase: 'color1' },
                { nombre: 'Infeccion estomacal:', porcentaje: 30, clase: 'color2' },
                { nombre: 'Gripe Común:', porcentaje: 15, clase: 'color3' }
              ])" 
              :key="idx" 
              class="pie-row"
            >
              <span>{{ enf.nombre }}</span>
              <div :class="['pie-bar', enf.clase]" :style="{ width: Math.max(enf.porcentaje, 15) + '%' }">
                {{ enf.porcentaje }}%
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="layout-grid">
        <!-- RENDIMIENTO Y EPIDEMIOLOGÍA POR ESPECIALISTA (DINÁMICO DESDE POSTGRESQL) -->
        <div class="analytics-box">
          <div class="box-header">
            <h3>👨‍⚕️ Rendimiento y Epidemiología por Especialista</h3>
            <span class="badge-blue">Módulo 6</span>
          </div>

          <div class="doctors-list-wrapper">
            <div v-if="cargandoDoctores" class="loading-text">
              Cargando especialistas desde la base de datos central...
            </div>

            <div v-else-if="doctoresStats.length === 0" class="no-data-text">
              No hay médicos registrados en la base de datos. Registra uno en "Gestión de Personal".
            </div>

            <div v-else v-for="doc in doctoresStats" :key="doc.id" class="doctor-stat-card">
              <div class="doc-info-header">
                <div>
                  <h4>{{ doc.nombre }}</h4>
                  <p class="specialty-text">🔹 {{ doc.especialidad }}</p>
                </div>
                <div class="consults-count">
                  <strong>{{ doc.consultasMes }}</strong>
                  <span>Consultas</span>
                </div>
              </div>

              <div class="efficiency-section">
                <div class="efficiency-labels">
                  <span>Índice de Eficiencia Operativa</span>
                  <strong>{{ doc.eficiencia }}%</strong>
                </div>
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill" :style="{ width: doc.eficiencia + '%' }"></div>
                </div>
              </div>

              <div class="epidemiology-section">
                <p>🦠 <strong>Enfermedad Más Atendida:</strong></p>
                <span class="disease-tag">{{ doc.enfermedadTop }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="logs-box">
          <div class="box-header">
            <h3>🔒 Logs del Sistema de Auditoría en Tiempo Real</h3>
            <span class="badge-live">Live</span>
          </div>
          <div class="logs-container">
            <div v-for="log in logs" :key="log.id" class="log-row">
              <span class="log-time">[{{ log.hora }}]</span>
              <span :class="['log-badge', log.tipo.toLowerCase()]">{{ log.tipo }}</span>
              <p class="log-text">{{ log.evento }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- PACIENTES RECIENTES EN BD -->
      <div class="recent-patients-section">
        <div class="box-header">
          <h3>📋 Pacientes Recientes en la Base de Datos Central</h3>
          <span class="badge-blue">PostgreSQL</span>
        </div>
        <div v-if="cargandoPacientes" class="loading-text">Cargando pacientes...</div>
        <div v-else-if="pacientes.length === 0" class="no-data-text">No hay pacientes registrados aún.</div>
        <div v-else class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>CURP</th>
                <th>Correo</th>
                <th>Teléfono</th>
                <th>Género</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in pacientes.slice(0, 5)" :key="p.id">
                <td><strong>#{{ p.id }}</strong></td>
                <td>{{ p.nombre }}</td>
                <td><span class="mono-curp">{{ p.curp || 'SIN CURP' }}</span></td>
                <td>{{ p.email || 'N/A' }}</td>
                <td>{{ p.telefono || 'N/A' }}</td>
                <td><span class="gender-tag">{{ p.sexo || 'N/A' }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.dashboard-wrapper { display: flex; min-height: 100vh; font-family: sans-serif; background: #f1f5f9; }
.sidebar { width: 260px; background: #0f172a; color: white; padding: 30px 20px; display: flex; flex-direction: column; }
.brand { font-size: 22px; font-weight: bold; margin-bottom: 10px; text-align: center; border-bottom: 1px solid #1e293b; padding-bottom: 15px; }
.user-profile { font-size: 13px; color: #94a3b8; text-align: center; margin-bottom: 30px; }
.menu { display: flex; flex-direction: column; gap: 10px; flex-grow: 1; }
.menu a { color: #cbd5e1; text-decoration: none; padding: 12px; border-radius: 6px; font-size: 15px; }
.menu a:hover, .menu a.active { background: #1e293b; color: white; font-weight: bold; }
.btn-logout { background: #b91c1c; color: white; border: none; padding: 12px; border-radius: 6px; cursor: pointer; font-weight: bold; margin-top: auto; }
.content { flex-grow: 1; padding: 40px; }
.main-header { margin-bottom: 30px; border-bottom: 2px solid #cbd5e1; padding-bottom: 15px; }
.main-header h2 { color: #0f172a; margin: 0; }

.metrics-row { display: flex; gap: 20px; margin-bottom: 30px; }
.metric-card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); width: 25%; border-top: 4px solid #0f172a; }
.metric-card h3 { font-size: 30px; color: #0f172a; margin: 0 0 5px 0; font-weight: bold; }
.metric-card p { margin: 0; color: #64748b; font-size: 14px; font-weight: 500; }
.patient-card { border-top-color: #2563eb; }
.patient-card h3 { color: #2563eb; }
.security-card { border-top-color: #0d9488; }
.security-card h3 { color: #0d9488; }

.charts-row { display: flex; gap: 20px; margin-bottom: 30px; }
.chart-card { background: white; padding: 20px; border-radius: 12px; width: 33.33%; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
.chart-card h4 { margin: 0 0 15px 0; color: #334155; font-size: 14px; }
.bars-container { display: flex; justify-content: space-around; align-items: flex-end; height: 140px; padding-top: 10px; }
.bar-wrapper { display: flex; flex-direction: column; align-items: center; gap: 8px; width: 15%; height: 100%; justify-content: flex-end; }
.bar-fill { background: #3b82f6; width: 100%; border-radius: 4px 4px 0 0; transition: height 0.4s ease; min-height: 8px; }
.bar-fill.month-bar { background: #10b981; }
.bar-wrapper span { font-size: 11px; color: #64748b; font-weight: 500; }

.pie-sim-container { display: flex; flex-direction: column; gap: 10px; height: 140px; justify-content: center; }
.pie-row { display: flex; align-items: center; gap: 10px; font-size: 12px; color: #475569; }
.pie-row span { width: 95px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pie-bar { color: white; font-size: 11px; font-weight: bold; padding: 4px 8px; border-radius: 4px; text-align: right; transition: width 0.4s ease; min-width: 32px; }
.pie-bar.color1 { background: #ef4444; }
.pie-bar.color2 { background: #f59e0b; }
.pie-bar.color3 { background: #3b82f6; }

.layout-grid { display: flex; gap: 25px; align-items: flex-start; margin-bottom: 30px; }
.analytics-box { background: white; padding: 25px; border-radius: 12px; width: 55%; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
.logs-box { background: white; padding: 25px; border-radius: 12px; width: 45%; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }

.box-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 20px; }
.box-header h3 { margin: 0; color: #0f172a; font-size: 15px; }
.badge-blue { background: #e0f2fe; color: #0369a1; font-size: 11px; font-weight: bold; padding: 3px 8px; border-radius: 4px; }
.badge-live { background: #fee2e2; color: #ef4444; font-size: 11px; font-weight: bold; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; animation: pulse 2s infinite; }

.doctors-list-wrapper { display: flex; flex-direction: column; gap: 15px; }
.doctor-stat-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background: #f8fafc; }
.doc-info-header { display: flex; justify-content: space-between; align-items: flex-start; }
.doc-info-header h4 { margin: 0; font-size: 14px; color: #0f172a; }
.specialty-text { margin: 4px 0 0 0; font-size: 12px; color: #475569; font-weight: 500; }
.consults-count { text-align: right; }
.consults-count strong { font-size: 15px; color: #0f172a; display: block; }
.consults-count span { font-size: 11px; color: #64748b; }

.efficiency-section { margin: 12px 0; }
.efficiency-labels { display: flex; justify-content: space-between; font-size: 12px; color: #475569; margin-bottom: 5px; font-weight: 500; }
.progress-bar-bg { background: #e2e8f0; height: 8px; border-radius: 4px; overflow: hidden; }
.progress-bar-fill { background: #2563eb; height: 100%; border-radius: 4px; }

.epidemiology-section { font-size: 12px; color: #475569; border-top: 1px dashed #e2e8f0; padding-top: 10px; margin-top: 10px; }
.epidemiology-section p { margin: 0 0 5px 0; }
.disease-tag { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; font-weight: bold; padding: 3px 8px; border-radius: 4px; display: inline-block; font-size: 11px; }

.logs-container { display: flex; flex-direction: column; gap: 10px; max-height: 340px; overflow-y: auto; }
.log-row { background: #1e293b; color: #38bdf8; font-family: monospace; padding: 12px; border-radius: 6px; font-size: 12px; display: flex; gap: 8px; align-items: flex-start; }
.log-time { color: #94a3b8; }
.log-badge { padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
.log-badge.success { background: #065f46; color: #34d399; }
.log-badge.warn { background: #7f1d1d; color: #f87171; }
.log-badge.info { background: #1e3a8a; color: #60a5fa; }
.log-text { margin: 0; color: #f1f5f9; white-space: pre-wrap; word-break: break-all; }

.recent-patients-section { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
.table-responsive { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; }
.data-table th, .data-table td { padding: 12px 15px; border-bottom: 1px solid #e2e8f0; }
.data-table th { background: #f8fafc; color: #475569; font-weight: 600; }
.mono-curp { font-family: monospace; font-size: 12px; color: #475569; font-weight: 600; }
.gender-tag { background: #f1f5f9; color: #334155; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
.loading-text, .no-data-text { color: #64748b; font-size: 14px; padding: 10px 0; }

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.6; }
  100% { opacity: 1; }
}
</style>
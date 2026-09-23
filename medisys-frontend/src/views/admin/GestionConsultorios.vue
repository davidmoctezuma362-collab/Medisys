<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const consultorios = ref([]);
const cargando = ref(true);
const hospitalFiltro = ref('Todos');

// Lista de hospitales/sedes
const hospitalesDisponibles = ref([
  'Todos',
  'Hospital General Regional',
  'Clínica Universitaria UPTEX',
  'Centro de Salud Texcoco Norte'
]);

// Control de Ventana Modal
const modalAbierto = ref(false);
const modoEdicion = ref(false);
const formConsultorio = ref({
  id: null,
  hospital: 'Hospital General Regional',
  nombre: '',
  piso_ubicacion: 'Planta Baja',
  tipo_especialidad: 'Medicina General',
  estatus: 'Disponible'
});

// Consumir API centralizada
const fetchConsultorios = async () => {
  cargando.value = true;
  try {
    const res = await fetch('https://medisys-uptex.tech/api/consultorios');
    if (res.ok) {
      consultorios.value = await res.json();
    }
  } catch (err) {
    console.error('Error al cargar consultorios:', err);
  } finally {
    cargando.value = false;
  }
};

// Filtrado reactivo en pantalla
const consultoriosFiltrados = computed(() => {
  if (hospitalFiltro.value === 'Todos') {
    return consultorios.value;
  }
  return consultorios.value.filter(c => c.hospital === hospitalFiltro.value);
});

// Formularios y Acciones CRUD
const abrirModalCrear = () => {
  modoEdicion.value = false;
  formConsultorio.value = {
    id: null,
    hospital: hospitalFiltro.value !== 'Todos' ? hospitalFiltro.value : 'Hospital General Regional',
    nombre: '',
    piso_ubicacion: 'Planta Baja',
    tipo_especialidad: 'Medicina General',
    estatus: 'Disponible'
  };
  modalAbierto.value = true;
};

const abrirModalEditar = (item) => {
  modoEdicion.value = true;
  formConsultorio.value = { ...item };
  modalAbierto.value = true;
};

const guardarConsultorio = async () => {
  if (!formConsultorio.value.nombre.trim()) {
    alert('Ingresa el nombre del consultorio.');
    return;
  }

  const url = modoEdicion.value 
    ? `https://medisys-uptex.tech/api/consultorios/${formConsultorio.value.id}`
    : 'https://medisys-uptex.tech/api/consultorios';
  
  const metodo = modoEdicion.value ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formConsultorio.value)
    });

    if (res.ok) {
      modalAbierto.value = false;
      await fetchConsultorios();
    } else {
      const dataErr = await res.json();
      alert('Error: ' + dataErr.error);
    }
  } catch (err) {
    alert('Error al conectar con el servidor.');
  }
};

const eliminarConsultorio = async (id) => {
  if (!confirm('¿Deseas dar de baja este consultorio?')) return;
  try {
    const res = await fetch(`https://medisys-uptex.tech/api/consultorios/${id}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      consultorios.value = consultorios.value.filter(c => c.id !== id);
    }
  } catch (err) {
    alert('Error al eliminar consultorio.');
  }
};

const handleLogout = () => {
  localStorage.removeItem('medisys_jwt');
  localStorage.removeItem('medisys_user');
  router.push('/login');
};

onMounted(fetchConsultorios);
</script>

<template>
  <div class="dashboard-wrapper">
    <!-- BARRA LATERAL -->
    <aside class="sidebar">
      <div class="brand">MEDISYS 👑</div>
      <div class="user-profile">Consola del Administrador</div>
      <nav class="menu">
        <router-link to="/dashboard/admin">📊 Monitor Analítico</router-link>
        <router-link to="/admin/usuarios">👥 Gestión de Personal</router-link>
        <router-link to="/admin/consultorios" class="active">🏥 Gestión de Consultorios</router-link>
        <button @click="handleLogout" class="btn-logout">Cerrar Sesión</button>
      </nav>
    </aside>

    <!-- ÁREA PRINCIPAL -->
    <main class="content">
      <header class="main-header flex-header">
        <div>
          <h2>Gestión de Consultorios y Espacios Clínicos</h2>
          <p class="subtitle">Administración de consultorios categorizados por hospital y sede médica.</p>
        </div>
        <button @click="abrirModalCrear" class="btn-primary">+ Nuevo Consultorio</button>
      </header>

      <!-- FILTRO POR HOSPITAL -->
      <div class="filter-card">
        <div class="filter-group">
          <label>Filtrar por Hospital o Sede:</label>
          <select v-model="hospitalFiltro" class="form-select">
            <option v-for="h in hospitalesDisponibles" :key="h" :value="h">{{ h }}</option>
          </select>
        </div>
        <div class="counter-badge">
          Consultorios activos: <strong>{{ consultoriosFiltrados.length }}</strong>
        </div>
      </div>

      <!-- TABLA DE RESULTADOS -->
      <div class="table-container">
        <div v-if="cargando" class="loading">Cargando consultorios desde PostgreSQL...</div>
        <div v-else-if="consultoriosFiltrados.length === 0" class="no-data">
          No hay consultorios registrados para este hospital.
        </div>
        <table v-else class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Hospital / Sede</th>
              <th>Consultorio</th>
              <th>Piso / Módulo</th>
              <th>Especialidad Asignada</th>
              <th>Estatus</th>
              <th class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in consultoriosFiltrados" :key="c.id">
              <td><strong>#{{ c.id }}</strong></td>
              <td><span class="hospital-tag">{{ c.hospital }}</span></td>
              <td class="font-bold">{{ c.nombre }}</td>
              <td>{{ c.piso_ubicacion }}</td>
              <td>{{ c.tipo_especialidad }}</td>
              <td>
                <span :class="['status-pill', c.estatus.toLowerCase()]">
                  {{ c.estatus }}
                </span>
              </td>
              <td class="text-right">
                <button @click="abrirModalEditar(c)" class="btn-action edit">Editar</button>
                <button @click="eliminarConsultorio(c.id)" class="btn-action delete">Eliminar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>

    <!-- VENTANA MODAL FLOTANTE -->
    <div v-if="modalAbierto" class="modal-overlay">
      <div class="modal-box">
        <div class="modal-header">
          <h3>{{ modoEdicion ? 'Editar Consultorio' : 'Registrar Nuevo Consultorio' }}</h3>
          <button @click="modalAbierto = false" class="close-btn">&times;</button>
        </div>
        <form @submit.prevent="guardarConsultorio" class="modal-body">
          <div class="form-row">
            <label>Hospital o Sede Médica:</label>
            <select v-model="formConsultorio.hospital" class="form-input" required>
              <option value="Hospital General Regional">Hospital General Regional</option>
              <option value="Clínica Universitaria UPTEX">Clínica Universitaria UPTEX</option>
              <option value="Centro de Salud Texcoco Norte">Centro de Salud Texcoco Norte</option>
            </select>
          </div>

          <div class="form-row">
            <label>Nombre / Número de Consultorio:</label>
            <input 
              type="text" 
              v-model="formConsultorio.nombre" 
              class="form-input" 
              placeholder="Ej. Consultorio 104" 
              required
            />
          </div>

          <div class="form-grid">
            <div class="form-row">
              <label>Piso o Módulo:</label>
              <input type="text" v-model="formConsultorio.piso_ubicacion" class="form-input" placeholder="Ej. Planta Baja / Ala Norte" />
            </div>
            <div class="form-row">
              <label>Especialidad Médica:</label>
              <input type="text" v-model="formConsultorio.tipo_especialidad" class="form-input" placeholder="Ej. Pediatría / General" />
            </div>
          </div>

          <div class="form-row">
            <label>Estatus Operativo:</label>
            <select v-model="formConsultorio.estatus" class="form-input">
              <option value="Disponible">Disponible</option>
              <option value="Ocupado">Ocupado</option>
              <option value="Mantenimiento">Mantenimiento</option>
            </select>
          </div>

          <div class="modal-actions">
            <button type="button" @click="modalAbierto = false" class="btn-cancel">Cancelar</button>
            <button type="submit" class="btn-save">
              {{ modoEdicion ? 'Actualizar Cambios' : 'Guardar Consultorio' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-wrapper { display: flex; min-height: 100vh; font-family: sans-serif; background: #f1f5f9; }
.sidebar { width: 260px; background: #0f172a; color: white; padding: 30px 20px; display: flex; flex-direction: column; }
.brand { font-size: 22px; font-weight: bold; margin-bottom: 10px; text-align: center; border-bottom: 1px solid #1e293b; padding-bottom: 15px; }
.user-profile { font-size: 13px; color: #94a3b8; text-align: center; margin-bottom: 30px; }
.menu { display: flex; flex-direction: column; gap: 10px; flex-grow: 1; }
.menu a { color: #cbd5e1; text-decoration: none; padding: 12px; border-radius: 6px; font-size: 14px; }
.menu a:hover, .menu a.active { background: #1e293b; color: white; font-weight: bold; }
.btn-logout { background: #b91c1c; color: white; border: none; padding: 12px; border-radius: 6px; cursor: pointer; font-weight: bold; margin-top: auto; }

.content { flex-grow: 1; padding: 40px; }
.main-header { margin-bottom: 25px; border-bottom: 2px solid #cbd5e1; padding-bottom: 15px; }
.flex-header { display: flex; justify-content: space-between; align-items: center; }
.main-header h2 { color: #0f172a; margin: 0 0 5px 0; }
.subtitle { margin: 0; color: #64748b; font-size: 14px; }

.btn-primary { background: #0f172a; color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; }
.btn-primary:hover { background: #1e293b; }

.filter-card { background: white; padding: 18px 24px; border-radius: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
.filter-group { display: flex; align-items: center; gap: 12px; font-size: 14px; color: #334155; font-weight: 500; }
.form-select { padding: 8px 14px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 14px; outline: none; }
.counter-badge { font-size: 13px; color: #475569; }

.table-container { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
.data-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; }
.data-table th, .data-table td { padding: 12px 14px; border-bottom: 1px solid #e2e8f0; }
.data-table th { background: #f8fafc; color: #475569; font-weight: 600; }
.hospital-tag { background: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
.status-pill { padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; }
.status-pill.disponible { background: #dcfce7; color: #15803d; }
.status-pill.ocupado { background: #fee2e2; color: #b91c1c; }
.status-pill.mantenimiento { background: #fef3c7; color: #b45309; }

.text-right { text-align: right; }
.btn-action { border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500; margin-left: 6px; }
.btn-action.edit { background: #f1f5f9; color: #0f172a; }
.btn-action.delete { background: #fee2e2; color: #b91c1c; }

/* MODAL */
.modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.6); display: flex; align-items: center; justify-content: center; z-index: 999; }
.modal-box { background: white; width: 480px; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
.modal-header { padding: 16px 20px; background: #0f172a; color: white; display: flex; justify-content: space-between; align-items: center; }
.modal-header h3 { margin: 0; font-size: 16px; }
.close-btn { background: none; border: none; color: white; font-size: 20px; cursor: pointer; }
.modal-body { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
.form-row { display: flex; flex-direction: column; gap: 6px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.form-row label { font-size: 12px; font-weight: 600; color: #334155; }
.form-input { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; outline: none; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; }
.btn-cancel { background: #f1f5f9; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-weight: 500; }
.btn-save { background: #0f172a; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; }
.loading, .no-data { text-align: center; color: #64748b; padding: 20px; font-size: 14px; }
</style>
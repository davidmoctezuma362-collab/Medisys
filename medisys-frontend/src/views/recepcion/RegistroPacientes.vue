<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

// DATOS
const pacientes = ref([]);
const cargando = ref(true);
const busqueda = ref('');

// MODALES
const mostrarModalNuevo = ref(false);
const mostrarModalEditar = ref(false);
const mostrarModalCita = ref(false);
const pacienteSeleccionadoCita = ref(null);

// FORMULARIO NUEVO PACIENTE (INCLUYE CURP)
const nuevoPaciente = ref({
  nombre: '',
  apellido: '',
  curp: '',
  email: '',
  telefono: '',
  sexo: 'Masculino',
  direccion: '',
  contacto_emergencia: '',
  telefono_emergencia: ''
});

// FORMULARIO EDITAR PACIENTE
const pacienteEditando = ref({
  id: null,
  nombre: '',
  apellido: '',
  curp: '',
  email: '',
  telefono: '',
  sexo: 'Masculino',
  direccion: '',
  contacto_emergencia: '',
  telefono_emergencia: ''
});

// LISTAS DESPLEGABLES DINÁMICAS (CONECTADAS A POSTGRESQL)
const medicosDisponibles = ref([]);
const consultoriosDisponibles = ref([]);

// FORMULARIO AGENDAR CITA
const nuevaCita = ref({
  doctor: '',
  fecha: new Date().toISOString().split('T')[0],
  hora: '09:00',
  consultorio: ''
});

// OBTENER PACIENTES DE POSTGRESQL
const fetchPacientes = async () => {
  try {
    const res = await fetch('https://medisys-uptex.tech/api/pacientes');
    if (res.ok) {
      pacientes.value = await res.json();
    }
  } catch (error) {
    console.error('Error al conectar con la API de pacientes:', error);
  } finally {
    cargando.value = false;
  }
};

// OBTENER MÉDICOS REALES REGISTRADOS EN LA BASE DE DATOS
const fetchMedicosBD = async () => {
  try {
    const res = await fetch('https://medisys-uptex.tech/api/usuarios');
    if (res.ok) {
      const usuarios = await res.json();
      // Filtrar únicamente los usuarios con rol de médico o doctor
      medicosDisponibles.value = usuarios.filter(u => 
        (u.rol || '').toLowerCase() === 'medico' || (u.rol || '').toLowerCase() === 'doctor'
      );
    }
  } catch (error) {
    console.error('Error al obtener doctores desde PostgreSQL:', error);
  }
};

// OBTENER CONSULTORIOS REALES REGISTRADOS EN POSTGRESQL
const fetchConsultoriosBD = async () => {
  try {
    const res = await fetch('https://medisys-uptex.tech/api/consultorios');
    if (res.ok) {
      consultoriosDisponibles.value = await res.json();
    }
  } catch (error) {
    console.error('Error al obtener consultorios desde PostgreSQL:', error);
  }
};

onMounted(() => {
  fetchPacientes();
  fetchMedicosBD();
  fetchConsultoriosBD();
});

// FILTRAR PACIENTES
const pacientesFiltrados = computed(() => {
  if (!busqueda.value) return pacientes.value;
  const t = busqueda.value.toLowerCase();
  return pacientes.value.filter(p => 
    (p.nombre && p.nombre.toLowerCase().includes(t)) ||
    (p.curp && p.curp.toLowerCase().includes(t)) ||
    (p.email && p.email.toLowerCase().includes(t))
  );
});

// GUARDAR NUEVO PACIENTE EN POSTGRESQL
const guardarPaciente = async () => {
  try {
    const res = await fetch('https://medisys-uptex.tech/api/pacientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevoPaciente.value)
    });

    if (res.ok) {
      alert('¡Paciente registrado con éxito en la Base de Datos Central!');
      mostrarModalNuevo.value = false;
      nuevoPaciente.value = {
        nombre: '', apellido: '', curp: '', email: '', telefono: '',
        sexo: 'Masculino', direccion: '', contacto_emergencia: '', telefono_emergencia: ''
      };
      fetchPacientes();
    } else {
      const err = await res.json();
      alert('Error al guardar: ' + (err.error || 'Error desconocido'));
    }
  } catch (error) {
    alert('Error de red al intentar registrar al paciente.');
  }
};

// ABRIR MODAL EDITAR
const abrirModalEditar = (paciente) => {
  const partesNombre = (paciente.nombre || '').split(' ');
  const primerNombre = partesNombre[0] || '';
  const restoApellido = partesNombre.slice(1).join(' ') || '';

  pacienteEditando.value = {
    id: paciente.id,
    nombre: primerNombre,
    apellido: restoApellido,
    curp: paciente.curp || '',
    email: paciente.email || '',
    telefono: paciente.telefono || '',
    sexo: paciente.sexo || 'Masculino',
    direccion: paciente.direccion || '',
    contacto_emergencia: paciente.contacto_emergencia || '',
    telefono_emergencia: paciente.telefono_emergencia || ''
  };
  mostrarModalEditar.value = true;
};

// ACTUALIZAR PACIENTE
const actualizarPaciente = async () => {
  try {
    const res = await fetch(`https://medisys-uptex.tech/api/pacientes/${pacienteEditando.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pacienteEditando.value)
    });

    if (res.ok) {
      alert('¡Datos del paciente actualizados con éxito!');
      mostrarModalEditar.value = false;
      fetchPacientes();
    } else {
      const idx = pacientes.value.findIndex(p => p.id === pacienteEditando.value.id);
      if (idx !== -1) {
        pacientes.value[idx].nombre = `${pacienteEditando.value.nombre} ${pacienteEditando.value.apellido}`.trim();
        pacientes.value[idx].curp = pacienteEditando.value.curp;
        pacientes.value[idx].email = pacienteEditando.value.email;
        pacientes.value[idx].telefono = pacienteEditando.value.telefono;
        pacientes.value[idx].sexo = pacienteEditando.value.sexo;
      }
      alert('Paciente actualizado localmente.');
      mostrarModalEditar.value = false;
    }
  } catch (error) {
    console.error('Error al actualizar paciente:', error);
    const idx = pacientes.value.findIndex(p => p.id === pacienteEditando.value.id);
    if (idx !== -1) {
      pacientes.value[idx].nombre = `${pacienteEditando.value.nombre} ${pacienteEditando.value.apellido}`.trim();
      pacientes.value[idx].curp = pacienteEditando.value.curp;
      pacientes.value[idx].email = pacienteEditando.value.email;
      pacientes.value[idx].telefono = pacienteEditando.value.telefono;
      pacientes.value[idx].sexo = pacienteEditando.value.sexo;
    }
    mostrarModalEditar.value = false;
  }
};

// ELIMINAR PACIENTE DEFINITIVAMENTE DE LA BD
const eliminarPaciente = async (id, nombre) => {
  if (confirm(`¿Estás seguro de que deseas eliminar permanentemente al paciente "${nombre}"? Esta acción se reflejará en la base de datos central.`)) {
    try {
      const res = await fetch(`https://medisys-uptex.tech/api/pacientes/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        alert('¡Paciente eliminado exitosamente de PostgreSQL!');
        fetchPacientes();
      } else {
        const errData = await res.json();
        alert('No se pudo eliminar el paciente de la BD: ' + (errData.error || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error al conectar con la API para eliminar:', error);
      alert('Error de conexión con el servidor.');
    }
  }
};

// ABRIR MODAL CITA
const abrirModalCita = (paciente) => {
  pacienteSeleccionadoCita.value = paciente;
  nuevaCita.value = {
    doctor: '',
    fecha: new Date().toISOString().split('T')[0],
    hora: '09:00',
    consultorio: ''
  };
  mostrarModalCita.value = true;
};

// CONFIRMAR CITA EN LA API CENTRAL (INCLUYENDO LA COLUMNA DOCTOR DE FORMA DINÁMICA)
const agendarCita = async () => {
  if (!nuevaCita.value.doctor) {
    alert('Por favor selecciona un médico.');
    return;
  }
  if (!nuevaCita.value.consultorio) {
    alert('Por favor selecciona un consultorio.');
    return;
  }

  // Enviamos tanto el nombre del doctor como el motivo estructurado correctamente
  const citaPayload = {
    paciente_id: pacienteSeleccionadoCita.value?.id || 1,
    nombre: pacienteSeleccionadoCita.value?.nombre || 'Paciente General',
    curp: pacienteSeleccionadoCita.value?.curp || 'SIN CURP',
    doctor: nuevaCita.value.doctor, // <--- Aquí va el nombre dinámico seleccionado
    fecha: nuevaCita.value.fecha,
    hora: nuevaCita.value.hora,
    consultorio: nuevaCita.value.consultorio,
    motivo: `Consulta con ${nuevaCita.value.doctor}`,
    estatus: 'Pendiente'
  };

  try {
    const res = await fetch('https://medisys-uptex.tech/api/citas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(citaPayload)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || errData.message || `Error del servidor (${res.status})`);
    }

    // Respaldo local para mantener la agenda sincronizada en tiempo real en la interfaz
    const masterList = JSON.parse(localStorage.getItem('pacientes_master')) || [];
    const citaObj = {
      id: Date.now(),
      nombre: pacienteSeleccionadoCita.value?.nombre,
      curp: pacienteSeleccionadoCita.value?.curp || 'SIN CURP',
      doctor: nuevaCita.value.doctor,
      fecha: nuevaCita.value.fecha,
      hora: nuevaCita.value.hora,
      consultorio: nuevaCita.value.consultorio,
      total: 500,
      abonado: 0,
      restante: 500,
      metodo: 'Pendiente',
      estatus: 'Pendiente'
    };

    masterList.push(citaObj);
    localStorage.setItem('pacientes_master', JSON.stringify(masterList));

    alert(`¡Cita programada con éxito para ${nuevaCita.value.doctor} en ${nuevaCita.value.consultorio}!`);
    mostrarModalCita.value = false;
    router.push('/recepcion/agenda');

  } catch (err) {
    console.error('Error al registrar la cita en PostgreSQL:', err);
    alert('No se pudo registrar la cita en la base de datos central: ' + err.message);
  }
};

// IR A COBRO / CAJA
const irACobro = (paciente) => {
  const objCaja = {
    id: paciente.id,
    nombre: paciente.nombre,
    curp: paciente.curp || 'SIN CURP',
    hash: `PG-${paciente.id}`,
    total: 500,
    abonado: 0,
    restante: 500,
    metodo: 'Efectivo',
    estatus: 'Pendiente'
  };
  localStorage.setItem('paciente_edicion_caja', JSON.stringify(objCaja));
  router.push('/recepcion/detalle-caja');
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
        <router-link to="/recepcion/agenda">📅 Agenda de Citas</router-link>
        <router-link to="/recepcion/pacientes" class="active">👥 Registro de Pacientes</router-link>
        <router-link to="/recepcion/detalle-caja">💳 Cobro / Caja</router-link>
        <button @click="handleLogout" class="btn-logout">Cerrar Sesión</button>
      </nav>
    </aside>

    <main class="content">
      <header class="main-header no-print">
        <div class="header-title-box">
          <h2>👥 Control y Registro de Pacientes</h2>
        </div>
        <button @click="mostrarModalNuevo = true" class="btn-primary">
          ➕ Registrar Nuevo Paciente
        </button>
      </header>

      <div class="metrics-grid no-print">
        <div class="metric-card">
          <div class="metric-icon">👥</div>
          <div>
            <span class="metric-label">Total Pacientes Registrados</span>
            <h3 class="metric-value text-blue">{{ pacientes.length }}</h3>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon">🔍</div>
          <div>
            <span class="metric-label">Filtrados en Pantalla</span>
            <h3 class="metric-value text-green">{{ pacientesFiltrados.length }}</h3>
          </div>
        </div>
      </div>

      <div class="search-card no-print">
        <div class="search-group">
          <label>🔍 Buscar Paciente:</label>
          <input 
            type="text" 
            v-model="busqueda" 
            placeholder="Ingrese Nombre, CURP, Correo..." 
            class="search-input"
          />
        </div>
      </div>

      <div class="table-container shadow-card">
        <div class="table-header">
          <h3>Listado de Pacientes Registrados</h3>
          <span class="badge-count">{{ pacientesFiltrados.length }} registros</span>
        </div>

        <div v-if="cargando" class="loading-state">Cargando pacientes de PostgreSQL...</div>

        <table v-else class="data-table">
          <thead>
            <tr>
              <th>ID / Exp</th>
              <th>Nombre del Paciente</th>
              <th>CURP / Identificación</th>
              <th>Contacto Directo</th>
              <th>Género</th>
              <th style="text-align: center;">Acciones Rápidas</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in pacientesFiltrados" :key="p.id" class="row-hover">
              <td class="id-cell"><strong>#{{ p.id }}</strong></td>
              <td>
                <p class="pac-name">{{ p.nombre }}</p>
              </td>
              <td>
                <span class="mono-curp">{{ p.curp || 'SIN CURP' }}</span>
              </td>
              <td>
                <p class="contact-text">📱 {{ p.telefono || 'Sin teléfono' }}</p>
                <span class="email-sub">✉️ {{ p.email || 'Sin correo' }}</span>
              </td>
              <td>
                <span class="gender-tag">{{ p.sexo || 'N/I' }}</span>
              </td>
              <td style="text-align: center;">
                <div class="action-buttons-flex">
                  <button @click="abrirModalCita(p)" class="btn-action btn-appointment" title="Agendar Cita">
                    📅 Cita
                  </button>
                  <button @click="irACobro(p)" class="btn-action btn-pay" title="Cobro / Caja">
                    💵 Cobro
                  </button>
                  <button @click="abrirModalEditar(p)" class="btn-action btn-edit" title="Editar Paciente">
                    ✏️ Editar
                  </button>
                  <button @click="eliminarPaciente(p.id, p.nombre)" class="btn-action btn-delete" title="Eliminar Paciente">
                    🗑️
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="pacientesFiltrados.length === 0">
              <td colspan="6" class="empty-table-msg">
                📭 No se encontraron pacientes registrados.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>

    <!-- MODAL NUEVO PACIENTE -->
    <div v-if="mostrarModalNuevo" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <h3>➕ Registrar Nuevo Paciente</h3>
          <button @click="mostrarModalNuevo = false" class="btn-close">×</button>
        </div>
        <form @submit.prevent="guardarPaciente" class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>Nombre(s) *</label>
              <input type="text" v-model="nuevoPaciente.nombre" required placeholder="Ej. Juan" />
            </div>
            <div class="form-group">
              <label>Apellido(s) *</label>
              <input type="text" v-model="nuevoPaciente.apellido" required placeholder="Ej. Pérez" />
            </div>
          </div>

          <div class="form-group">
            <label>CURP (Clave Única de Registro de Población)</label>
            <input type="text" v-model="nuevoPaciente.curp" placeholder="18 caracteres" maxlength="18" class="uppercase-input" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Correo Electrónico</label>
              <input type="email" v-model="nuevoPaciente.email" placeholder="correo@ejemplo.com" />
            </div>
            <div class="form-group">
              <label>Teléfono</label>
              <input type="text" v-model="nuevoPaciente.telefono" placeholder="10 dígitos" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Género</label>
              <select v-model="nuevoPaciente.sexo">
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div class="form-group">
              <label>Dirección</label>
              <input type="text" v-model="nuevoPaciente.direccion" placeholder="Calle, Número, Ciudad" />
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" @click="mostrarModalNuevo = false" class="btn-cancel">Cancelar</button>
            <button type="submit" class="btn-save">Guardar Paciente</button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL EDITAR PACIENTE -->
    <div v-if="mostrarModalEditar" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <h3>✏️ Editar Datos del Paciente (#{{ pacienteEditando.id }})</h3>
          <button @click="mostrarModalEditar = false" class="btn-close">×</button>
        </div>
        <form @submit.prevent="actualizarPaciente" class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>Nombre(s) *</label>
              <input type="text" v-model="pacienteEditando.nombre" required />
            </div>
            <div class="form-group">
              <label>Apellido(s) *</label>
              <input type="text" v-model="pacienteEditando.apellido" required />
            </div>
          </div>

          <div class="form-group">
            <label>CURP</label>
            <input type="text" v-model="pacienteEditando.curp" maxlength="18" class="uppercase-input" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Correo Electrónico</label>
              <input type="email" v-model="pacienteEditando.email" />
            </div>
            <div class="form-group">
              <label>Teléfono</label>
              <input type="text" v-model="pacienteEditando.telefono" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Género</label>
              <select v-model="pacienteEditando.sexo">
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div class="form-group">
              <label>Dirección</label>
              <input type="text" v-model="pacienteEditando.direccion" />
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" @click="mostrarModalEditar = false" class="btn-cancel">Cancelar</button>
            <button type="submit" class="btn-save btn-update">Actualizar Paciente</button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL AGENDAR CITA CON CONSULTORIOS DINÁMICOS DE POSTGRESQL -->
    <div v-if="mostrarModalCita" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <h3>📅 Agendar Cita Médica</h3>
          <button @click="mostrarModalCita = false" class="btn-close">×</button>
        </div>
        <div class="modal-body">
          <p class="patient-selected-label">
            Paciente: <strong>{{ pacienteSeleccionadoCita?.nombre }}</strong>
          </p>

          <div class="form-group">
            <label>Médico Especialista *</label>
            <select v-model="nuevaCita.doctor" required>
              <option value="" disabled selected>-- Seleccionar Médico Registrado --</option>
              <option v-for="m in medicosDisponibles" :key="m.id" :value="m.nombre">
                {{ m.nombre }}
              </option>
            </select>
            <span v-if="medicosDisponibles.length === 0" class="help-text-red">
              No hay médicos activos. Registra uno en el panel de Administrador.
            </span>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Fecha de la Cita *</label>
              <input type="date" v-model="nuevaCita.fecha" required />
            </div>
            <div class="form-group">
              <label>Hora *</label>
              <input type="time" v-model="nuevaCita.hora" required />
            </div>
          </div>

          <div class="form-group">
            <label>Consultorio / Área *</label>
            <select v-model="nuevaCita.consultorio" required>
              <option value="" disabled selected>-- Seleccione Consultorio --</option>
              <option 
                v-for="c in consultoriosDisponibles" 
                v-bind:key="c.id" 
                v-bind:value="c.nombre"
              >
                {{ c.nombre }} - {{ c.piso_ubicacion }} ({{ c.hospital }})
              </option>
            </select>
            <span v-if="consultoriosDisponibles.length === 0" class="help-text-red">
              Cargando consultorios o no hay disponibles en la base de datos.
            </span>
          </div>

          <div class="modal-footer">
            <button type="button" @click="mostrarModalCita = false" class="btn-cancel">Cancelar</button>
            <button type="button" @click="agendarCita" class="btn-save">Confirmar y Agendar</button>
          </div>
        </div>
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

.main-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 2px solid #cbd5e1; padding-bottom: 15px; }
.header-title-box h2 { color: #0f172a; margin: 0; font-size: 22px; }
.btn-primary { background: #065f46; color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; font-size: 14px; cursor: pointer; }

.metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 25px; }
.metric-card { background: white; padding: 18px; border-radius: 12px; display: flex; align-items: center; gap: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); border: 1px solid #e2e8f0; }
.metric-icon { font-size: 28px; background: #f1f5f9; padding: 10px; border-radius: 10px; }
.metric-label { font-size: 12px; color: #64748b; font-weight: 600; display: block; }
.metric-value { font-size: 20px; color: #0f172a; margin: 2px 0 0 0; font-weight: bold; }
.text-green { color: #059669; }
.text-blue { color: #2563eb; }

.search-card { background: white; padding: 16px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); border: 1px solid #e2e8f0; }
.search-group { display: flex; flex-direction: column; gap: 4px; }
.search-group label { font-size: 12px; font-weight: bold; color: #475569; }
.search-input { padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; outline: none; }

.shadow-card { background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); border: 1px solid #e2e8f0; overflow: hidden; }
.table-header { padding: 16px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; }
.table-header h3 { margin: 0; font-size: 15px; color: #0f172a; }
.badge-count { background: #dbeafe; color: #1e40af; font-size: 11px; font-weight: bold; padding: 4px 8px; border-radius: 12px; }

.data-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
.data-table th { background: #f1f5f9; padding: 12px 14px; font-size: 12px; color: #475569; font-weight: bold; border-bottom: 1px solid #cbd5e1; }
.data-table td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; color: #334155; }
.row-hover:hover { background: #f8fafc; }

.pac-name { font-weight: bold; color: #0f172a; margin: 0; font-size: 14px; }
.mono-curp { font-family: monospace; font-size: 12px; color: #475569; font-weight: 600; }
.contact-text { margin: 0; font-weight: 500; color: #1e293b; }
.email-sub { font-size: 11px; color: #64748b; }
.gender-tag { background: #e2e8f0; color: #334155; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }

.action-buttons-flex { display: flex; gap: 6px; justify-content: center; }
.btn-action { border: none; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer; }
.btn-appointment { background: #dbeafe; color: #1e40af; }
.btn-pay { background: #d1fae5; color: #065f46; }
.btn-edit { background: #fef3c7; color: #b45309; }
.btn-delete { background: #fee2e2; color: #991b1b; }

.loading-state, .empty-table-msg { padding: 30px; text-align: center; color: #64748b; font-size: 14px; }

/* ESTILOS MODAL */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.modal-card { background: white; padding: 25px; border-radius: 12px; width: 500px; max-width: 90%; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
.modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 15px; }
.modal-header h3 { margin: 0; color: #0f172a; font-size: 16px; }
.btn-close { background: transparent; border: none; font-size: 20px; cursor: pointer; color: #64748b; }
.form-row { display: flex; gap: 15px; margin-bottom: 12px; }
.form-group { flex: 1; display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
.form-group label { font-size: 12px; font-weight: bold; color: #475569; }
.form-group input, .form-group select { padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; }
.uppercase-input { text-transform: uppercase; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 15px; border-top: 1px solid #e2e8f0; padding-top: 12px; }
.btn-cancel { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px 14px; border-radius: 6px; font-weight: bold; cursor: pointer; color: #475569; }
.btn-save { background: #065f46; color: white; border: none; padding: 8px 14px; border-radius: 6px; font-weight: bold; cursor: pointer; }
.btn-update { background: #d97706; }
.patient-selected-label { background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; color: #0f172a; margin-bottom: 15px; }
.help-text-red { font-size: 11px; color: #dc2626; font-weight: bold; margin-top: 2px; }
</style>
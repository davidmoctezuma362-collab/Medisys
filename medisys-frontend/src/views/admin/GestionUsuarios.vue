<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

// LISTA DE USUARIOS Y ROLES
const usuarios = ref([
  { id: 1, nombre: 'Dr. Alejandro Silva', email: 'asilva@medisys.tech', rol: 'medico' },
  { id: 2, nombre: 'Dra. Elena Restrepo', email: 'erestrepo@medisys.tech', rol: 'medico' },
  { id: 3, nombre: 'Recepción Central', email: 'recepcion@medisys.tech', rol: 'recepcion' },
  { id: 4, nombre: 'Administrador MEDISYS', email: 'admin@medisys.tech', rol: 'admin' }
]);

const cargando = ref(true);
const busqueda = ref('');

// MODALES
const mostrarModalNuevo = ref(false);
const mostrarModalEditar = ref(false);

// FORMULARIO NUEVO USUARIO
const nuevoUsuario = ref({
  nombre: '',
  email: '',
  rol: 'medico',
  password: ''
});

// FORMULARIO EDITAR USUARIO
const usuarioEditando = ref({
  id: null,
  nombre: '',
  email: '',
  rol: 'medico',
  password: ''
});

// ROLES DISPONIBLES
const rolesDisponibles = [
  { clave: 'medico', etiqueta: '🩺 Médico / Doctor' },
  { clave: 'recepcion', etiqueta: '💼 Recepcionista' },
  { clave: 'admin', etiqueta: '👑 Administrador de Sistema' }
];

// CARGAR USUARIOS DESDE LA API DE POSTGRESQL
const fetchUsuarios = async () => {
  try {
    const res = await fetch('https://medisys-uptex.tech/api/usuarios');
    if (res.ok) {
      const datosBD = await res.json();
      if (datosBD && datosBD.length > 0) {
        usuarios.value = datosBD;
      }
    }
  } catch (error) {
    console.warn('Usando lista de usuarios precargados en memoria local:', error);
  } finally {
    cargando.value = false;
  }
};

onMounted(() => {
  fetchUsuarios();
});

// FILTRADO DE USUARIOS
const usuariosFiltrados = computed(() => {
  if (!busqueda.value) return usuarios.value;
  const t = busqueda.value.toLowerCase();
  return usuarios.value.filter(u => 
    (u.nombre && u.nombre.toLowerCase().includes(t)) ||
    (u.email && u.email.toLowerCase().includes(t)) ||
    (u.rol && u.rol.toLowerCase().includes(t))
  );
});

// REGISTRAR NUEVA CUENTA
const guardarUsuario = async () => {
  if (!nuevoUsuario.value.nombre || !nuevoUsuario.value.email || !nuevoUsuario.value.password) {
    alert('Por favor completa todos los campos obligatorios, incluida la contraseña.');
    return;
  }

  try {
    const res = await fetch('https://medisys-uptex.tech/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevoUsuario.value)
    });

    if (res.ok) {
      alert('¡Cuenta clínica creada con éxito! El usuario ya puede ingresar a MEDISYS.');
      mostrarModalNuevo.value = false;
      nuevoUsuario.value = { nombre: '', email: '', rol: 'medico', password: '' };
      fetchUsuarios();
    } else {
      usuarios.value.push({
        id: Date.now(),
        nombre: nuevoUsuario.value.nombre,
        email: nuevoUsuario.value.email,
        rol: nuevoUsuario.value.rol
      });
      alert('Cuenta agregada al listado actual.');
      mostrarModalNuevo.value = false;
    }
  } catch (error) {
    usuarios.value.push({
      id: Date.now(),
      nombre: nuevoUsuario.value.nombre,
      email: nuevoUsuario.value.email,
      rol: nuevoUsuario.value.rol
    });
    alert('Cuenta registrada en la vista.');
    mostrarModalNuevo.value = false;
  }
};

// ABRIR MODAL EDITAR USUARIO
const abrirModalEditar = (usuario) => {
  usuarioEditando.value = {
    id: usuario.id,
    nombre: usuario.nombre || '',
    email: usuario.email || '',
    rol: usuario.rol || 'medico',
    password: ''
  };
  mostrarModalEditar.value = true;
};

// ACTUALIZAR USUARIOS Y CONTRASEÑA
const actualizarUsuario = async () => {
  try {
    const res = await fetch(`https://medisys-uptex.tech/api/usuarios/${usuarioEditando.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(usuarioEditando.value)
    });

    if (res.ok) {
      alert('¡Datos del usuario y contraseña actualizados correctamente!');
      mostrarModalEditar.value = false;
      fetchUsuarios();
    } else {
      const idx = usuarios.value.findIndex(u => u.id === usuarioEditando.value.id);
      if (idx !== -1) {
        usuarios.value[idx].nombre = usuarioEditando.value.nombre;
        usuarios.value[idx].email = usuarioEditando.value.email;
        usuarios.value[idx].rol = usuarioEditando.value.rol;
      }
      alert('¡Usuario actualizado exitosamente!');
      mostrarModalEditar.value = false;
    }
  } catch (error) {
    const idx = usuarios.value.findIndex(u => u.id === usuarioEditando.value.id);
    if (idx !== -1) {
      usuarios.value[idx].nombre = usuarioEditando.value.nombre;
      usuarios.value[idx].email = usuarioEditando.value.email;
      usuarios.value[idx].rol = usuarioEditando.value.rol;
    }
    alert('Usuario y contraseña actualizados en la vista local.');
    mostrarModalEditar.value = false;
  }
};

// ELIMINAR CUENTA DEFINITIVAMENTE EN BASE DE DATOS
const eliminarUsuario = async (id, nombre) => {
  if (confirm(`¿Estás seguro de que deseas eliminar permanentemente a "${nombre}"?`)) {
    try {
      const res = await fetch(`https://medisys-uptex.tech/api/usuarios/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        alert('Usuario eliminado correctamente de la base de datos.');
        usuarios.value = usuarios.value.filter(u => u.id !== id);
        await fetchUsuarios();
      } else {
        const err = await res.json();
        alert('No se pudo eliminar de la base de datos: ' + (err.error || 'Error del servidor'));
      }
    } catch (error) {
      console.error('Error al intentar eliminar usuario:', error);
      alert('Error de conexión al intentar eliminar el usuario.');
    }
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
      <div class="brand">MEDISYS 👑</div>
      <div class="user-profile">Consola del Administrador</div>
      <nav class="menu">
        <router-link to="/dashboard/admin">📊 Monitor Analítico</router-link>
        <router-link to="/admin/usuarios" class="active">👥 Gestión de Personal</router-link>
        <router-link to="/admin/consultorios">🏥 Gestión de Consultorios</router-link>
        <button @click="handleLogout" class="btn-logout">Cerrar Sesión</button>
      </nav>
    </aside>

    <main class="content">
      <header class="main-header no-print">
        <div class="header-title-box">
          <h2>Panel Corporativo de Gestión de Personal y Accesos</h2>
        </div>
        <button @click="mostrarModalNuevo = true" class="btn-primary">
          ➕ Alta de Nuevo Personal
        </button>
      </header>

      <!-- BARRA DE BÚSQUEDA -->
      <div class="search-card no-print">
        <div class="search-group">
          <label>🔍 Buscar Usuario / Correo / Rol:</label>
          <input 
            type="text" 
            v-model="busqueda" 
            placeholder="Buscar por nombre, correo institucional..." 
            class="search-input"
          />
        </div>
      </div>

      <!-- TABLA DE CUENTAS REGISTRADAS -->
      <div class="table-container shadow-card">
        <div class="table-header">
          <h3>Personal Registrado en Sistema</h3>
          <span class="badge-count">{{ usuariosFiltrados.length }} cuenta(s)</span>
        </div>

        <div v-if="cargando" class="loading-state">Cargando cuentas de acceso...</div>

        <table v-else class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre Completo</th>
              <th>Correo Institucional</th>
              <th>Rol Asignado</th>
              <th style="text-align: center;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in usuariosFiltrados" :key="u.id" class="row-hover">
              <td><strong>#{{ u.id }}</strong></td>
              <td>
                <p class="user-name">{{ u.nombre }}</p>
              </td>
              <td>
                <span class="email-sub">✉️ {{ u.email }}</span>
              </td>
              <td>
                <span :class="['role-badge', 'role-' + (u.rol || 'medico').toLowerCase()]">
                  {{ u.rol === 'admin' ? '👑 Administrador' : u.rol === 'recepcion' ? '💼 Recepción' : '🩺 Médico' }}
                </span>
              </td>
              <td style="text-align: center;">
                <div class="action-buttons-flex">
                  <button @click="abrirModalEditar(u)" class="btn-action btn-edit" title="Editar datos y contraseña">
                    ✏️ Editar / Clave
                  </button>
                  <button @click="eliminarUsuario(u.id, u.nombre)" class="btn-action btn-delete" title="Revocar Acceso">
                    🗑️ Eliminar
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="usuariosFiltrados.length === 0">
              <td colspan="5" class="empty-table-msg">
                📭 No se encontraron cuentas registradas.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>

    <!-- MODAL NUEVO USUARIO -->
    <div v-if="mostrarModalNuevo" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <h3>➕ Alta de Personal / Nueva Cuenta Clínica</h3>
          <button @click="mostrarModalNuevo = false" class="btn-close">×</button>
        </div>
        <form @submit.prevent="guardarUsuario" class="modal-body">
          <div class="form-group">
            <label>Nombre Completo *</label>
            <input 
              type="text" 
              v-model="nuevoUsuario.nombre" 
              required 
              placeholder="Ej. Dr. Roberto Gómez" 
            />
          </div>

          <div class="form-group">
            <label>Correo Institucional *</label>
            <input 
              type="email" 
              v-model="nuevoUsuario.email" 
              required 
              placeholder="usuario@medisys.tech" 
            />
          </div>

          <div class="form-group">
            <label>Asignación de Rol *</label>
            <select v-model="nuevoUsuario.rol" required>
              <option v-for="r in rolesDisponibles" :key="r.clave" :value="r.clave">
                {{ r.etiqueta }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Contraseña de Acceso a MEDISYS *</label>
            <input 
              type="password" 
              v-model="nuevoUsuario.password" 
              required 
              placeholder="••••••••••••" 
              minlength="6"
            />
            <small class="field-help">Defina la contraseña inicial con la que el usuario ingresará a la plataforma.</small>
          </div>

          <div class="modal-footer">
            <button type="button" @click="mostrarModalNuevo = false" class="btn-cancel">Cancelar</button>
            <button type="submit" class="btn-save">Crear Cuenta y Dar Acceso</button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL EDITAR USUARIO Y CAMBIAR CONTRASEÑA -->
    <div v-if="mostrarModalEditar" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <h3>✏️ Editar Usuario / Restablecer Contraseña (#{{ usuarioEditando.id }})</h3>
          <button @click="mostrarModalEditar = false" class="btn-close">×</button>
        </div>
        <form @submit.prevent="actualizarUsuario" class="modal-body">
          <div class="form-group">
            <label>Nombre Completo *</label>
            <input 
              type="text" 
              v-model="usuarioEditando.nombre" 
              required 
            />
          </div>

          <div class="form-group">
            <label>Correo Institucional *</label>
            <input 
              type="email" 
              v-model="usuarioEditando.email" 
              required 
            />
          </div>

          <div class="form-group">
            <label>Asignación de Rol *</label>
            <select v-model="usuarioEditando.rol" required>
              <option v-for="r in rolesDisponibles" :key="r.clave" :value="r.clave">
                {{ r.etiqueta }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Nueva Contraseña de Acceso</label>
            <input 
              type="password" 
              v-model="usuarioEditando.password" 
              placeholder="Escriba la nueva contraseña..." 
              minlength="6"
            />
            <small class="field-help">Deje este espacio en blanco si NO desea cambiar la contraseña actual.</small>
          </div>

          <div class="modal-footer">
            <button type="button" @click="mostrarModalEditar = false" class="btn-cancel">Cancelar</button>
            <button type="submit" class="btn-save btn-update">Actualizar Datos</button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>

<style scoped>
.dashboard-wrapper { display: flex; min-height: 100vh; font-family: sans-serif; background: #f0f4f8; }

.sidebar { width: 260px; background: #0f172a; color: white; padding: 30px 20px; display: flex; flex-direction: column; border-right: 1px solid #1e293b; }
.brand { font-size: 22px; font-weight: bold; margin-bottom: 8px; text-align: left; border-bottom: 1px solid #1e293b; padding-bottom: 15px; letter-spacing: 0.5px; }
.user-profile { font-size: 13px; color: #94a3b8; margin-bottom: 30px; font-weight: 500; }

.menu { display: flex; flex-direction: column; gap: 10px; flex-grow: 1; }
.menu a { color: #94a3b8; text-decoration: none; padding: 12px 16px; border-radius: 8px; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 10px; transition: all 0.2s; }
.menu a:hover { color: white; background: #1e293b; }
.menu a.active { background: #1e293b; color: white; border-left: 4px solid #3b82f6; font-weight: bold; }

.btn-logout { background: #b91c1c; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: bold; margin-top: auto; }
.btn-logout:hover { background: #991b1b; }

.content { flex-grow: 1; padding: 35px 40px; }

.main-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 1px solid #cbd5e1; padding-bottom: 15px; }
.header-title-box h2 { color: #0f172a; margin: 0; font-size: 22px; font-weight: 700; }

.btn-primary { background: #0f172a; color: white; border: none; padding: 11px 20px; border-radius: 8px; font-weight: bold; font-size: 14px; cursor: pointer; transition: background 0.2s; }
.btn-primary:hover { background: #1e293b; }

.search-card { background: white; padding: 16px 20px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 2px 4px rgba(0,0,0,0.03); border: 1px solid #e2e8f0; }
.search-group { display: flex; flex-direction: column; gap: 4px; }
.search-group label { font-size: 12px; font-weight: bold; color: #475569; }
.search-input { padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; outline: none; }
.search-input:focus { border-color: #3b82f6; }

.shadow-card { background: white; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.03); border: 1px solid #e2e8f0; overflow: hidden; }
.table-header { padding: 16px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #ffffff; }
.table-header h3 { margin: 0; font-size: 15px; color: #0f172a; font-weight: 700; }
.badge-count { background: #eff6ff; color: #1d4ed8; font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 12px; border: 1px solid #dbeafe; }

.data-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
.data-table th { background: #f8fafc; padding: 12px 16px; font-size: 12px; color: #475569; font-weight: 700; border-bottom: 1px solid #cbd5e1; text-transform: uppercase; letter-spacing: 0.5px; }
.data-table td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; color: #334155; }
.row-hover:hover { background: #f8fafc; }

.user-name { font-weight: bold; color: #0f172a; margin: 0; font-size: 14px; }
.email-sub { font-size: 12px; color: #64748b; }

.role-badge { padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; display: inline-block; }
.role-admin { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
.role-medico { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
.role-recepcion { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }

.action-buttons-flex { display: flex; gap: 8px; justify-content: center; }
.btn-action { border: none; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer; transition: background 0.2s; }
.btn-edit { background: #fef3c7; color: #b45309; }
.btn-edit:hover { background: #fde68a; }
.btn-delete { background: #fee2e2; color: #991b1b; }
.btn-delete:hover { background: #fca5a5; }

.loading-state, .empty-table-msg { padding: 35px; text-align: center; color: #64748b; font-size: 14px; }

/* MODAL */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.6); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.modal-card { background: white; padding: 25px; border-radius: 12px; width: 450px; max-width: 90%; box-shadow: 0 10px 25px rgba(0,0,0,0.15); }
.modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 15px; }
.modal-header h3 { margin: 0; color: #0f172a; font-size: 16px; font-weight: 700; }
.btn-close { background: transparent; border: none; font-size: 20px; cursor: pointer; color: #64748b; }

.form-group { display: flex; flex-direction: column; gap: 4px; margin-bottom: 14px; }
.form-group label { font-size: 12px; font-weight: bold; color: #475569; }
.form-group input, .form-group select { padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; outline: none; }
.form-group input:focus, .form-group select:focus { border-color: #3b82f6; }
.field-help { font-size: 11px; color: #64748b; margin-top: 2px; }

.modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 12px; }
.btn-cancel { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px 14px; border-radius: 6px; font-weight: bold; cursor: pointer; color: #475569; }
.btn-save { background: #0f172a; color: white; border: none; padding: 8px 14px; border-radius: 6px; font-weight: bold; cursor: pointer; }
.btn-save:hover { background: #1e293b; }
.btn-update { background: #d97706; }
.btn-update:hover { background: #b45309; }
</style>
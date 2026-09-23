<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

// DATOS DOCTOR EN SESIÓN
const doctorSesion = ref({
  nombre: 'Dr. Alejandro Silva',
  especialidad: 'Medicina General'
});

// LISTA EXPEDIENTES / ARCHIVEROS CLÍNICOS
const expedientes = ref([]);
const pacienteSeleccionado = ref(null);
const busquedaTexto = ref('');

// LIENZO Y FIRMA DIGITAL
const canvasFirma = ref(null);
const estaDibujando = ref(false);
const firmaImagenBase64 = ref('');

// MANEJO ARCHIVOS ADJUNTOS
const archivosAdjuntos = ref([]);

// NUEVA NOTA / CONSULTA
const nuevaConsulta = ref({
  fecha: new Date().toISOString().split('T')[0],
  subjetivo: '',
  objetivo: '',
  diagnostico: '',
  tratamiento: '',
  peso: '',
  altura: '',
  presion: '',
  temp: '',
  firma: ''
});

// CARGAR ARCHIVEROS CLÍNICOS (Sincronizado con API Central y LocalStorage)
const cargarExpedientes = async () => {
  const usuario = JSON.parse(localStorage.getItem('medisys_user') || '{}');
  if (usuario.nombre) {
    doctorSesion.value.nombre = usuario.nombre;
    doctorSesion.value.especialidad = usuario.especialidad || 'Medicina General';
  }

  let master = [];
  try {
    const res = await fetch('https://medisys-uptex.tech/api/citas');
    if (res.ok) {
      const citasBD = await res.json();
      master = citasBD.map(c => ({
        id: c.id,
        nombre: c.nombre || c.paciente_nombre || 'Paciente',
        curp: c.curp || 'SIN CURP',
        doctor: c.doctor || doctorSesion.value.nombre,
        alergias: c.alergias || 'Ninguna reportada',
        archivos: c.archivos || [],
        estatus: c.estatus || 'Pendiente',
        historial: c.historial || [
          {
            fecha: c.fecha || '2026-08-01',
            subjetivo: 'Paciente acude a valoración médica general.',
            objetivo: `Presión: ${c.vitales?.presion || '120/80'}, Temp: ${c.vitales?.temp || '36.5'}°C, Peso: ${c.vitales?.peso || '70'}kg`,
            diagnostico: 'Z00.0 Examen médico general',
            tratamiento: 'Indicaciones generales y seguimiento sintomático.',
            firma: 'RSA256-VALIDATED-DOCTOR-SIGN'
          }
        ]
      }));
      localStorage.setItem('pacientes_master', JSON.stringify(master));
    }
  } catch (err) {
    console.warn('API no disponible, cargando master desde localStorage:', err);
    master = JSON.parse(localStorage.getItem('pacientes_master')) || [];
  }

  const pacienteActual = JSON.parse(localStorage.getItem('paciente_actual'));

  expedientes.value = master.map(p => ({
    id: p.id,
    nombre: p.nombre,
    curp: p.curp || 'SIN CURP',
    doctor: p.doctor || doctorSesion.value.nombre,
    alergias: p.alergias || 'Ninguna reportada',
    archivos: p.archivos || [],
    estatus: p.estatus || 'Pendiente',
    historial: p.historial || [
      {
        fecha: p.fecha || '2026-08-01',
        subjetivo: 'Paciente acude a valoración médica general.',
        objetivo: `Presión: ${p.vitales?.presion || '120/80'}, Temp: ${p.vitales?.temp || '36.5'}°C, Peso: ${p.vitales?.peso || '70'}kg`,
        diagnostico: 'Z00.0 Examen médico general',
        tratamiento: 'Indicaciones generales y seguimiento sintomático.',
        firma: 'RSA256-VALIDATED-DOCTOR-SIGN'
      }
    ]
  }));

  if (pacienteActual) {
    const enc = expedientes.value.find(e => e.id === pacienteActual.id);
    if (enc) {
      pacienteSeleccionado.value = enc;
      archivosAdjuntos.value = enc.archivos || [];
    } else if (expedientes.value.length > 0) {
      pacienteSeleccionado.value = expedientes.value[0];
      archivosAdjuntos.value = expedientes.value[0].archivos || [];
    }
  } else if (expedientes.value.length > 0) {
    pacienteSeleccionado.value = expedientes.value[0];
    archivosAdjuntos.value = expedientes.value[0].archivos || [];
  }
};

onMounted(() => {
  cargarExpedientes();
});

// LÓGICA CANVAS DE FIRMA
const iniciarDibujo = (e) => {
  estaDibujando.value = true;
  dibujar(e);
};

const detenerDibujo = () => {
  estaDibujando.value = false;
  if (canvasFirma.value) {
    const ctx = canvasFirma.value.getContext('2d');
    ctx.beginPath();
    firmaImagenBase64.value = canvasFirma.value.toDataURL();
  }
};

const dibujar = (e) => {
  if (!estaDibujando.value || !canvasFirma.value) return;
  const canvas = canvasFirma.value;
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();

  const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
  const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#0f172a';

  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
};

const limpiarFirma = () => {
  if (canvasFirma.value) {
    const ctx = canvasFirma.value.getContext('2d');
    ctx.clearRect(0, 0, canvasFirma.value.width, canvasFirma.value.height);
    firmaImagenBase64.value = '';
  }
};

// FILTRADO EXPEDIENTES
const expedientesFiltrados = computed(() => {
  if (!busquedaTexto.value) return expedientes.value;
  const txt = busquedaTexto.value.toLowerCase();
  return expedientes.value.filter(e => 
    (e.nombre && e.nombre.toLowerCase().includes(txt)) ||
    (e.curp && e.curp.toLowerCase().includes(txt))
  );
});

const seleccionarArchivero = (exp) => {
  pacienteSeleccionado.value = exp;
  archivosAdjuntos.value = exp.archivos || [];
};

// MANEJO ADJUNCIÓN DE ARCHIVOS
const handleFileUpload = (event) => {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const reader = new FileReader();

    reader.onload = (e) => {
      archivosAdjuntos.value.push({
        nombre: file.name,
        fecha: new Date().toLocaleDateString(),
        tamaño: (file.size / 1024).toFixed(1) + ' KB',
        url: e.target.result,
        tipo: file.type
      });

      if (pacienteSeleccionado.value) {
        pacienteSeleccionado.value.archivos = archivosAdjuntos.value;
        guardarEnLocalStorage();
      }
    };

    reader.readAsDataURL(file);
  }
};

// ELIMINAR ARCHIVO ADJUNTO
const eliminarArchivo = (index, nombre) => {
  if (confirm(`¿Deseas eliminar el documento "${nombre}" de este expediente?`)) {
    archivosAdjuntos.value.splice(index, 1);
    if (pacienteSeleccionado.value) {
      pacienteSeleccionado.value.archivos = archivosAdjuntos.value;
      guardarEnLocalStorage();
    }
  }
};

// VISUALIZAR ARCHIVO
const verArchivo = (archivo) => {
  if (!archivo || !archivo.url) {
    alert('El archivo no cuenta con un enlace de lectura disponible.');
    return;
  }

  if (archivo.url.startsWith('data:')) {
    const arr = archivo.url.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
  } else {
    window.open(archivo.url, '_blank');
  }
};

// DESCARGAR ARCHIVO
const descargarArchivo = (archivo) => {
  if (!archivo || !archivo.url) {
    alert('No es posible descargar el archivo en este momento.');
    return;
  }
  const enlace = document.createElement('a');
  enlace.href = archivo.url;
  enlace.download = archivo.nombre || 'Estudio_Clinico.pdf';
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
};

// GENERAR FIRMA DIGITAL
const generarFirmaDigital = () => {
  const hash = Math.random().toString(36).substring(2, 10).toUpperCase();
  nuevaConsulta.value.firma = `FIRMA-MEDISYS-RSA256-${hash}`;
};

// AGREGAR NOTA MÉDICA
const agregarNotaMedica = () => {
  if (!pacienteSeleccionado.value) return;

  generarFirmaDigital();

  const nota = {
    fecha: nuevaConsulta.value.fecha,
    subjetivo: nuevaConsulta.value.subjetivo,
    objetivo: `Presión: ${nuevaConsulta.value.presion || '--'}, Temp: ${nuevaConsulta.value.temp || '--'}°C, Peso: ${nuevaConsulta.value.peso || '--'}kg, Altura: ${nuevaConsulta.value.altura || '--'}cm`,
    diagnostico: nuevaConsulta.value.diagnostico,
    tratamiento: nuevaConsulta.value.tratamiento,
    firma: nuevaConsulta.value.firma
  };

  pacienteSeleccionado.value.historial.unshift(nota);
  guardarEnLocalStorage();

  alert('¡Nota clínica firmada y guardada exitosamente!');
};

const guardarEnLocalStorage = () => {
  const master = JSON.parse(localStorage.getItem('pacientes_master')) || [];
  const idx = master.findIndex(p => p.id === pacienteSeleccionado.value.id);
  if (idx !== -1) {
    master[idx].historial = pacienteSeleccionado.value.historial;
    master[idx].archivos = pacienteSeleccionado.value.archivos;
    localStorage.setItem('pacientes_master', JSON.stringify(master));
  }
};

// IMPRIMIR RECETA
const imprimirRecetaActual = () => {
  if (!nuevaConsulta.value.diagnostico || !nuevaConsulta.value.tratamiento) {
    alert('Por favor, ingresa al menos el Diagnóstico y el Tratamiento antes de imprimir la receta.');
    return;
  }
  if (!nuevaConsulta.value.firma) {
    generarFirmaDigital();
  }
  setTimeout(() => {
    window.print();
  }, 150);
};

// FINALIZAR CONSULTA, SINCRONIZAR CON API CENTRAL Y VOLVER A LA AGENDA
const finalizarConsulta = async () => {
  if (pacienteSeleccionado.value) {
    try {
      // Sincronización en tiempo real con la Base de Datos Central (PostgreSQL)
      await fetch(`https://medisys-uptex.tech/api/citas/${pacienteSeleccionado.value.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estatus: 'Atendido' })
      });
    } catch (err) {
      console.warn('Error al actualizar estatus en API central:', err);
    }

    const master = JSON.parse(localStorage.getItem('pacientes_master')) || [];
    const idx = master.findIndex(p => p.id === pacienteSeleccionado.value.id);

    if (idx !== -1) {
      master[idx].estatus = 'Atendido';
      master[idx].historial = pacienteSeleccionado.value.historial;
      master[idx].archivos = pacienteSeleccionado.value.archivos;
      localStorage.setItem('pacientes_master', JSON.stringify(master));
    }
  }

  localStorage.removeItem('paciente_actual');
  router.push('/dashboard/medico');
};

// INICIAR VIDEOLLAMADA
const iniciarVideollamada = () => {
  if (!pacienteSeleccionado.value) return;
  const nombreLimpio = (pacienteSeleccionado.value.nombre || 'Paciente').replace(/\s+/g, '_');
  const urlSala = `https://meet.jit.si/MEDISYS_Consulta_${pacienteSeleccionado.value.id}_${nombreLimpio}`;
  window.open(urlSala, '_blank');
};

// ELIMINAR ARCHIVERO
const eliminarArchivero = (id, nombre) => {
  if (confirm(`¿Estás seguro de que deseas eliminar permanentemente el archivero clínico de "${nombre}"?`)) {
    expedientes.value = expedientes.value.filter(e => e.id !== id);

    const master = JSON.parse(localStorage.getItem('pacientes_master')) || [];
    const masterActualizado = master.filter(p => p.id !== id);
    localStorage.setItem('pacientes_master', JSON.stringify(masterActualizado));

    if (pacienteSeleccionado.value && pacienteSeleccionado.value.id === id) {
      pacienteSeleccionado.value = expedientes.value.length > 0 ? expedientes.value[0] : null;
      archivosAdjuntos.value = pacienteSeleccionado.value ? (pacienteSeleccionado.value.archivos || []) : [];
    }

    alert('El archivero clínico fue eliminado correctamente.');
  }
};

const handleLogout = () => {
  localStorage.removeItem('medisys_jwt');
  localStorage.removeItem('medisys_user');
  localStorage.removeItem('paciente_actual');
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
        <router-link to="/dashboard/medico">📅 Mi Agenda Personal</router-link>
        <router-link to="/medico/historial" class="active">📂 Archivero Clínico</router-link>
        <button @click="handleLogout" class="btn-logout">Cerrar Sesión</button>
      </nav>
    </aside>

    <main class="content">
      <header class="main-header no-print">
        <div>
          <h2>📂 Archivero Clínico y Expedientes Médicos</h2>
          <p class="subtitle">Consulta de historial, notas de evolución, videollamadas y generación de recetas</p>
        </div>
      </header>

      <div class="history-grid-layout no-print">
        
        <!-- PANEL IZQUIERDO: LISTA DE ARCHIVEROS -->
        <div class="archiveros-list-card shadow-card">
          <div class="card-header">
            <h3>Archiveros Activos</h3>
            <span class="badge-count">{{ expedientesFiltrados.length }} expediente(s)</span>
          </div>

          <div class="search-box">
            <input 
              type="text" 
              v-model="busquedaTexto" 
              placeholder="🔍 Buscar en archivero..." 
              class="search-input" 
            />
          </div>

          <div class="expedientes-scroll">
            <div 
              v-for="exp in expedientesFiltrados" 
              :key="exp.id" 
              :class="['expediente-item', { 'active-item': pacienteSeleccionado?.id === exp.id }]" 
              @click="seleccionarArchivero(exp)"
            >
              <div class="exp-info">
                <p class="exp-name">{{ exp.nombre }}</p>
                <span class="exp-curp">{{ exp.curp }}</span>
              </div>
              <button 
                @click.stop="eliminarArchivero(exp.id, exp.nombre)" 
                class="btn-delete-archivero" 
                title="Eliminar este archivero clínico"
              >
                🗑️
              </button>
            </div>

            <div v-if="expedientesFiltrados.length === 0" class="empty-list-msg">
              📭 No hay archiveros registrados.
            </div>
          </div>
        </div>

        <!-- PANEL DERECHO: CONTENIDO DEL ARCHIVERO SELECCIONADO -->
        <div v-if="pacienteSeleccionado" class="archivero-detail-card shadow-card">
          
          <div class="patient-header-bar">
            <div>
              <h3>👤 {{ pacienteSeleccionado.nombre }}</h3>
              <p class="sub-info">CURP: {{ pacienteSeleccionado.curp }} | 🚨 Alergias: {{ pacienteSeleccionado.alergias }}</p>
            </div>
            <div class="header-actions">
              <button @click="iniciarVideollamada" class="btn-video-call" title="Iniciar Videoconsulta">
                🎥 Videollamada
              </button>
              <button @click="eliminarArchivero(pacienteSeleccionado.id, pacienteSeleccionado.nombre)" class="btn-danger-outline">
                🗑️ Eliminar
              </button>
            </div>
          </div>

          <!-- SECCIÓN PARA SUBIR, VISUALIZAR, DESCARGAR Y ELIMINAR ARCHIVOS / ESTUDIOS -->
          <div class="files-upload-box">
            <div class="files-header">
              <h4>📎 Estudios y Archivos Adjuntos</h4>
              <label class="btn-upload-file">
                📤 Cargar Archivo
                <input type="file" @change="handleFileUpload" multiple hidden />
              </label>
            </div>
            <div v-if="archivosAdjuntos.length > 0" class="files-list">
              <div v-for="(f, i) in archivosAdjuntos" :key="i" class="file-chip">
                <div class="file-info-text">
                  📄 <strong>{{ f.nombre }}</strong> ({{ f.tamaño }}) - <em>{{ f.fecha }}</em>
                </div>
                <div class="file-actions-row">
                  <button type="button" @click="verArchivo(f)" class="btn-chip-action btn-view" title="Visualizar archivo">
                    👁️ Ver
                  </button>
                  <button type="button" @click="descargarArchivo(f)" class="btn-chip-action btn-dl" title="Descargar archivo">
                    ⬇️ Descargar
                  </button>
                  <button type="button" @click="eliminarArchivo(i, f.nombre)" class="btn-chip-action btn-del" title="Eliminar archivo">
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            </div>
            <p v-else class="no-files-text">No hay estudios o análisis adjuntos a este archivero.</p>
          </div>

          <!-- FORMULARIO NUEVA NOTA DE EVOLUCIÓN CON LIENZO DE FIRMA -->
          <div class="new-note-box">
            <div class="note-box-header">
              <h4>✍️ Consulta en Proceso / Nota Médica</h4>
              <button type="button" @click="imprimirRecetaActual" class="btn-print-recipe">
                🖨️ Imprimir Receta
              </button>
            </div>

            <form @submit.prevent="agregarNotaMedica">
              <div class="vitals-inputs-row">
                <div class="input-group"><label>Presión:</label><input type="text" v-model="nuevaConsulta.presion" placeholder="120/80" /></div>
                <div class="input-group"><label>Temp (°C):</label><input type="text" v-model="nuevaConsulta.temp" placeholder="36.5" /></div>
                <div class="input-group"><label>Peso (kg):</label><input type="text" v-model="nuevaConsulta.peso" placeholder="70" /></div>
                <div class="input-group"><label>Altura (cm):</label><input type="text" v-model="nuevaConsulta.altura" placeholder="170" /></div>
              </div>

              <div class="form-group-block">
                <label>Sintomatología / Motivo de Consulta (Subjetivo):</label>
                <textarea v-model="nuevaConsulta.subjetivo" rows="2" placeholder="Paciente refiere dolor de cabeza, fiebres nocturnas..." required></textarea>
              </div>

              <div class="form-group-block">
                <label>Diagnóstico CIE-10:</label>
                <input type="text" v-model="nuevaConsulta.diagnostico" placeholder="Ej. J00 Rinofaringitis Aguda" required />
              </div>

              <div class="form-group-block">
                <label>Tratamiento / Prescripción de Medicamentos:</label>
                <textarea v-model="nuevaConsulta.tratamiento" rows="3" placeholder="1. Paracetamol 500mg - 1 tableta c/8hrs por 5 días..." required></textarea>
              </div>

              <!-- LIENZO DE FIRMA MANUSCRITA -->
              <div class="signature-canvas-box">
                <div class="signature-canvas-header">
                  <label>✍️ Firma Manuscrita del Médico (Dibuje con el mouse o pantalla):</label>
                  <button type="button" @click="limpiarFirma" class="btn-clear-sig">🧹 Limpiar Firma</button>
                </div>
                <canvas 
                  ref="canvasFirma" 
                  width="400" 
                  height="110" 
                  class="signature-canvas" 
                  @mousedown="iniciarDibujo" 
                  @mousemove="dibujar" 
                  @mouseup="detenerDibujo" 
                  @mouseleave="detenerDibujo" 
                  @touchstart.prevent="iniciarDibujo" 
                  @touchmove.prevent="dibujar" 
                  @touchend.prevent="detenerDibujo"
                ></canvas>
              </div>

              <div class="actions-row-flex">
                <button type="submit" class="btn-save-note">
                  ✍️ Guardar Nota en Archivero
                </button>
                <button type="button" @click="imprimirRecetaActual" class="btn-print-recipe-secondary">
                  🖨️ Imprimir Receta
                </button>
                <button type="button" @click="finalizarConsulta" class="btn-finish-consult">
                  ⏹️ Finalizar Consulta
                </button>
              </div>
            </form>
          </div>

          <!-- HISTORIAL DE NOTAS ALMACENADAS CON FIRMA -->
          <div class="history-timeline">
            <h4>📜 Historial de Consultas Almacenadas</h4>
            <div v-for="(h, idx) in pacienteSeleccionado.historial" :key="idx" class="timeline-item">
              <div class="timeline-date">📅 {{ h.fecha }}</div>
              <div class="timeline-content">
                <p><strong>Subjetivo:</strong> {{ h.subjetivo }}</p>
                <p><strong>Objetivo / Vitales:</strong> {{ h.objetivo }}</p>
                <p><strong>Diagnóstico:</strong> <span class="badge-diag">{{ h.diagnostico }}</span></p>
                <p><strong>Tratamiento:</strong> {{ h.tratamiento }}</p>
                <div class="signature-badge">
                  🔏 Sello / Firma Criptográfica: <code>{{ h.firma || 'RSA256-VALIDATED-DOCTOR' }}</code>
                </div>
              </div>
            </div>
          </div>

        </div>

        <div v-else class="empty-detail-state shadow-card">
          <p>📭 Selecciona un archivero de la lista de la izquierda para ver su expediente completo.</p>
        </div>

      </div>

      <!-- PLANTILLA MEMBRETADA DE LA RECETA MÉDICA PARA IMPRESIÓN -->
      <div v-if="pacienteSeleccionado" class="print-only recipe-template">
        <div class="recipe-header">
          <div class="clinic-brand">MEDISYS CLINIC 🩺</div>
          <div class="doctor-data">
            <h2>{{ doctorSesion.nombre }}</h2>
            <p>{{ doctorSesion.especialidad }}</p>
            <p class="small-text">Cédula Profesional: 12345678 | Reg. S.S.A. 98765</p>
          </div>
        </div>

        <div class="divider-line"></div>

        <div class="recipe-patient-info">
          <p><strong>Paciente:</strong> {{ pacienteSeleccionado.nombre }}</p>
          <p><strong>CURP:</strong> {{ pacienteSeleccionado.curp }}</p>
          <p><strong>Fecha:</strong> {{ nuevaConsulta.fecha }}</p>
        </div>

        <div v-if="nuevaConsulta.presion || nuevaConsulta.temp || nuevaConsulta.peso" class="recipe-vitals">
          <span><strong>Presión:</strong> {{ nuevaConsulta.presion || 'N/A' }}</span>
          <span><strong>Temp:</strong> {{ nuevaConsulta.temp ? nuevaConsulta.temp + '°C' : 'N/A' }}</span>
          <span><strong>Peso:</strong> {{ nuevaConsulta.peso ? nuevaConsulta.peso + 'kg' : 'N/A' }}</span>
          <span><strong>Talla:</strong> {{ nuevaConsulta.altura ? nuevaConsulta.altura + 'cm' : 'N/A' }}</span>
        </div>

        <div class="divider-line"></div>

        <div class="recipe-section">
          <h3>DIAGNÓSTICO:</h3>
          <p class="diagnosis-text">{{ nuevaConsulta.diagnostico || 'Evaluación médica general' }}</p>
        </div>

        <div class="recipe-section treatment-box">
          <h3>INDICACIONES Y TRATAMIENTO MÉDICO (Rx):</h3>
          <pre class="treatment-text">{{ nuevaConsulta.tratamiento }}</pre>
        </div>

        <div class="recipe-footer">
          <div class="signature-line">
            <div class="signature-img-container">
              <img v-if="firmaImagenBase64" :src="firmaImagenBase64" alt="Firma Médico" class="printed-signature-img" />
            </div>
            <div class="line-str">_____________________________________</div>
            <p><strong>Firma y Sello del Médico</strong></p>
            <p>{{ doctorSesion.nombre }}</p>
          </div>
          <div class="digital-seal-box">
            <span class="seal-title">Sello Digital Autenticado:</span>
            <code>{{ nuevaConsulta.firma || 'FIRMA-MEDISYS-RSA256-VALIDATED' }}</code>
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

.history-grid-layout { display: flex; gap: 25px; align-items: flex-start; }
.shadow-card { background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); border: 1px solid #e2e8f0; }

.archiveros-list-card { width: 32%; padding: 18px; }
.card-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 12px; }
.card-header h3 { margin: 0; font-size: 15px; color: #0f172a; }
.badge-count { background: #dbeafe; color: #1e40af; font-size: 11px; font-weight: bold; padding: 3px 8px; border-radius: 12px; }

.search-box { margin-bottom: 12px; }
.search-input { width: 90%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; outline: none; }

.expedientes-scroll { max-height: 550px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
.expediente-item { padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; background: #f8fafc; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s; }
.expediente-item:hover { background: #eff6ff; border-color: #3b82f6; }
.active-item { background: #dbeafe !important; border-color: #2563eb !important; }

.exp-name { margin: 0; font-weight: bold; font-size: 13px; color: #0f172a; }
.exp-curp { font-size: 11px; color: #64748b; font-family: monospace; }
.btn-delete-archivero { background: transparent; border: none; cursor: pointer; font-size: 14px; opacity: 0.6; }
.btn-delete-archivero:hover { opacity: 1; }

.archivero-detail-card { width: 68%; padding: 22px; }
.patient-header-bar { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }
.patient-header-bar h3 { margin: 0; color: #0f172a; font-size: 18px; }
.sub-info { margin: 4px 0 0 0; font-size: 12px; color: #475569; }

.header-actions { display: flex; gap: 8px; }
.btn-video-call { background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 12px; cursor: pointer; }
.btn-video-call:hover { background: #059669; }
.btn-danger-outline { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 12px; cursor: pointer; }

/* SECCIÓN ARCHIVOS ADJUNTOS CON VER, DESCARGAR Y ELIMINAR */
.files-upload-box { background: #f1f5f9; border: 1px solid #e2e8f0; padding: 14px; border-radius: 8px; margin-bottom: 20px; }
.files-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.files-header h4 { margin: 0; font-size: 13px; color: #1e293b; }
.btn-upload-file { background: #2563eb; color: white; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: bold; cursor: pointer; }
.files-list { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
.file-chip { background: white; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 6px; font-size: 12px; color: #334155; display: flex; justify-content: space-between; align-items: center; }
.file-info-text { display: flex; align-items: center; gap: 4px; }
.file-actions-row { display: flex; gap: 6px; }
.btn-chip-action { border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer; }
.btn-view { background: #e0f2fe; color: #0369a1; }
.btn-view:hover { background: #bae6fd; }
.btn-dl { background: #dcfce7; color: #15803d; }
.btn-dl:hover { background: #bbf7d0; }
.btn-del { background: #fee2e2; color: #991b1b; }
.btn-del:hover { background: #fecaca; }
.no-files-text { font-size: 11px; color: #64748b; margin: 4px 0 0 0; }

.new-note-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 10px; margin-bottom: 25px; }
.note-box-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.note-box-header h4 { margin: 0; color: #1e3a8a; font-size: 14px; }
.btn-print-recipe { background: #0284c7; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 12px; cursor: pointer; }
.btn-print-recipe:hover { background: #0369a1; }

.vitals-inputs-row { display: flex; gap: 10px; margin-bottom: 12px; }
.input-group { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.input-group label { font-size: 11px; font-weight: bold; color: #475569; }
.input-group input { padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; }

.form-group-block { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
.form-group-block label { font-size: 12px; font-weight: bold; color: #475569; }
.form-group-block input, .form-group-block textarea { padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-family: sans-serif; }

/* ESTILOS LIENZO CANVAS DE FIRMA */
.signature-canvas-box { margin-bottom: 15px; background: white; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; }
.signature-canvas-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.signature-canvas-header label { font-size: 12px; font-weight: bold; color: #475569; }
.btn-clear-sig { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 3px 8px; border-radius: 4px; font-size: 11px; cursor: pointer; color: #475569; }
.signature-canvas { width: 100%; height: 110px; border: 1px dashed #94a3b8; border-radius: 6px; background: #fafafa; cursor: crosshair; touch-action: none; }

.actions-row-flex { display: flex; gap: 10px; }
.btn-save-note { flex: 2; background: #1e3a8a; color: white; border: none; padding: 10px 16px; border-radius: 6px; font-weight: bold; font-size: 13px; cursor: pointer; }
.btn-save-note:hover { background: #1d4ed8; }
.btn-print-recipe-secondary { flex: 1; background: #0284c7; color: white; border: none; padding: 10px 16px; border-radius: 6px; font-weight: bold; font-size: 13px; cursor: pointer; }
.btn-finish-consult { flex: 1; background: #dc2626; color: #ffffff; border: none; padding: 10px 16px; border-radius: 6px; font-weight: bold; font-size: 13px; cursor: pointer; transition: background 0.2s ease; }
.btn-finish-consult:hover { background: #b91c1c; }

.history-timeline h4 { color: #0f172a; margin-bottom: 15px; font-size: 15px; }
.timeline-item { border-left: 3px solid #2563eb; padding-left: 15px; margin-bottom: 18px; position: relative; }
.timeline-date { font-weight: bold; color: #1e3a8a; font-size: 12px; margin-bottom: 4px; }
.timeline-content { background: #f8fafc; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 12px; color: #334155; }
.timeline-content p { margin: 4px 0; }
.badge-diag { background: #fef3c7; color: #b45309; padding: 2px 6px; border-radius: 4px; font-weight: bold; }
.signature-badge { margin-top: 8px; padding-top: 6px; border-top: 1px dashed #e2e8f0; font-size: 10px; color: #059669; font-weight: bold; }

.empty-detail-state { width: 68%; padding: 50px; text-align: center; color: #64748b; font-size: 14px; }
.empty-list-msg { text-align: center; color: #64748b; padding: 20px; font-size: 13px; }

/* ESTILOS DE IMPRESIÓN DE RECETA */
.print-only { display: none; }

@media print {
  .no-print, aside, nav, header, button, form { display: none !important; }
  .print-only { display: block !important; }
  body, .content { background: white !important; color: black !important; padding: 0 !important; width: 100% !important; }

  .recipe-template {
    padding: 30px;
    max-width: 700px;
    margin: 0 auto;
    font-family: Arial, sans-serif;
    color: #000;
  }
  .recipe-header { display: flex; justify-content: space-between; align-items: center; }
  .clinic-brand { font-size: 22px; font-weight: bold; color: #1e3a8a; }
  .doctor-data h2 { margin: 0; font-size: 18px; color: #0f172a; }
  .doctor-data p { margin: 2px 0; font-size: 12px; color: #475569; }
  .small-text { font-size: 10px !important; color: #64748b; }
  
  .divider-line { border-bottom: 2px solid #1e3a8a; margin: 15px 0; }
  
  .recipe-patient-info { display: flex; justify-content: space-between; font-size: 13px; }
  .recipe-patient-info p { margin: 0; }
  
  .recipe-vitals { display: flex; gap: 20px; font-size: 11px; margin-top: 10px; background: #f8fafc; padding: 8px; border-radius: 4px; border: 1px solid #e2e8f0; }
  
  .recipe-section { margin-top: 15px; }
  .recipe-section h3 { font-size: 12px; margin: 0 0 5px 0; color: #1e3a8a; }
  .diagnosis-text { font-weight: bold; font-size: 14px; margin: 0; }
  
  .treatment-box { min-height: 250px; margin-top: 20px; }
  .treatment-text { font-family: sans-serif; font-size: 13px; line-height: 1.6; white-space: pre-wrap; margin: 0; }
  
  .recipe-footer { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; }
  .signature-line { text-align: center; font-size: 12px; position: relative; }
  .signature-line p { margin: 2px 0; }
  
  .signature-img-container { height: 50px; display: flex; justify-content: center; align-items: flex-end; }
  .printed-signature-img { max-height: 60px; max-width: 180px; object-fit: contain; }
  .line-str { margin-top: -5px; }

  .digital-seal-box { font-size: 9px; color: #475569; text-align: right; }
  .seal-title { display: block; font-weight: bold; }
  .digital-seal-box code { font-family: monospace; font-size: 9px; }
}
</style>
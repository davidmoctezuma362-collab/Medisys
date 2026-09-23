import { createRouter, createWebHistory } from 'vue-router';
import LandingPage from '../views/LandingPage.vue';
import Login from '../views/Login.vue';
import DashboardMedico from '../views/medico/DashboardMedico.vue';
import HistorialClinico from '../views/medico/HistorialClinico.vue';
import DashboardAdmin from '../views/admin/DashboardAdmin.vue';
import GestionUsuarios from '../views/admin/GestionUsuarios.vue';
import GestionConsultorios from '../views/admin/GestionConsultorios.vue';
import DashboardRecepcion from '../views/recepcion/DashboardRecepcion.vue';
import RegistroPacientes from '../views/recepcion/RegistroPacientes.vue';
import AgendaSemanal from '../views/recepcion/AgendaSemanal.vue';
import DetalleCajaPaciente from '../views/recepcion/DetalleCajaPaciente.vue';
import Forbidden from '../views/errors/403.vue';

const routes = [
  { path: '/', component: LandingPage },
  { path: '/login', component: Login },
  { path: '/dashboard/medico', component: DashboardMedico },
  { path: '/medico/historial', component: HistorialClinico },
  { path: '/dashboard/admin', component: DashboardAdmin },
  { path: '/admin/usuarios', component: GestionUsuarios },
  { path: '/admin/consultorios', component: GestionConsultorios },
  { path: '/dashboard/recepcion', component: DashboardRecepcion },
  { path: '/recepcion/pacientes', component: RegistroPacientes },
  // Agregamos alias para aceptar tanto /recepcion/agenda-semanal como /recepcion/agenda
  { path: '/recepcion/agenda-semanal', alias: '/recepcion/agenda', component: AgendaSemanal },
  { path: '/recepcion/detalle-caja', component: DetalleCajaPaciente }, 
  { path: '/403', component: Forbidden }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const email = ref('');
const password = ref('');
const errorMsg = ref('');
const cargando = ref(false);

const handleLogin = async () => {
  errorMsg.value = '';
  cargando.value = true;

  try {
    const res = await fetch('https://medisys-uptex.tech/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.value.trim().toLowerCase(),
        password: password.value.trim()
      })
    });

    const data = await res.json();

    if (res.ok) {
      // Guardar datos de sesión
      localStorage.setItem('medisys_jwt', data.token);
      localStorage.setItem('medisys_user', JSON.stringify(data.user));

      // Redireccionar según el rol recibido
      const rol = (data.user.rol || '').toLowerCase();
      if (rol === 'admin') {
        router.push('/dashboard/admin');
      } else if (rol === 'recepcion') {
        router.push('/dashboard/recepcion');
      } else {
        router.push('/dashboard/medico');
      }
    } else {
      errorMsg.value = data.error || 'Credenciales incorrectas o acceso no autorizado.';
    }
  } catch (err) {
    console.error('Error al conectar con la API de Login:', err);
    errorMsg.value = 'Error de conexión con el servidor de MEDISYS.';
  } finally {
    cargando.value = false;
  }
};
</script>

<template>
  <div class="login-wrapper">
    <div class="login-box">
      <h2>Iniciar Sesión</h2>
      <p class="subtitle">Ingresa tus credenciales de MEDISYS</p>

      <div v-if="errorMsg" class="alert-danger">⚠️ {{ errorMsg }}</div>

      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label>Correo Electrónico</label>
          <input type="email" v-model="email" required placeholder="usuario@medisys.com" />
        </div>
        <div class="form-group">
          <label>Contraseña</label>
          <input type="password" v-model="password" required placeholder="••••••••" />
        </div>
        <button type="submit" :disabled="isLoading">
          {{ isLoading ? 'Validando Credenciales...' : 'Ingresar al Sistema' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-wrapper { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #e2e8f0; font-family: sans-serif; }
.login-box { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); width: 100%; max-width: 400px; }
h2 { margin-bottom: 5px; color: #1e3a8a; text-align: center; }
.subtitle { color: #64748b; text-align: center; margin-bottom: 25px; font-size: 14px; }
.form-group { margin-bottom: 20px; }
label { display: block; margin-bottom: 6px; font-weight: 600; font-size: 14px; color: #334155; }
input { width: 93%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 15px; }
input:focus { outline: none; border-color: #2563eb; }
button { width: 100%; padding: 12px; background: #2563eb; color: white; border: none; border-radius: 6px; font-size: 16px; font-weight: bold; cursor: pointer; margin-top: 10px; }
button:disabled { background: #93c5fd; cursor: not-allowed; }
.alert-danger { background: #fee2e2; color: #991b1b; padding: 12px; border-radius: 6px; font-size: 14px; margin-bottom: 20px; font-weight: bold; text-align: center; border: 1px solid #fca5a5; }
</style>
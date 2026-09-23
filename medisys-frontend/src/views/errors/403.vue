<template>
  <div class="error-container">
    <div class="error-box">
      <div class="shield-icon">🛡️🛑</div>
      <h1>Error 403 - Acceso Prohibido</h1>
      <p>Tu rol de usuario actual no cuenta con las credenciales criptográficas necesarias para visualizar este módulo técnico.</p>
      <router-link to="/login" class="btn-back">Regresar a un entorno seguro</router-link>
    </div>
  </div>
</template>

<style scoped>
.error-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #0f172a; font-family: sans-serif; color: white; }
.error-box { text-align: center; max-width: 500px; padding: 40px; background: #1e293b; border-radius: 16px; border: 2px solid #ef4444; box-shadow: 0 0 20px rgba(239, 68, 68, 0.2); }
.shield-icon { font-size: 64px; margin-bottom: 20px; }
h1 { color: #f87171; font-size: 28px; margin-bottom: 15px; }
p { color: #94a3b8; line-height: 1.6; margin-bottom: 35px; }
.btn-back { background: #ef4444; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; }
.btn-back:hover { background: #dc2626; }
</style>
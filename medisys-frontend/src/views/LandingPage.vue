<template>
  <div class="landing-container">
    <header class="navbar">
      <div class="logo">🛡️ MEDISYS</div>
      <router-link to="/login" class="btn-login">Acceso al Sistema</router-link>
    </header>

    <main class="hero-section">
      <h1>Plataforma Inteligente de Gestión Médica</h1>
      <p>Optimización clínica, expedientes electrónicos seguros y analítica avanzada para tu consultorio.</p>
      <div class="features-grid">
        <div class="card">🔒 Ciberseguridad Activa</div>
        <div class="card">📅 Agenda con IA</div>
        <div class="card">📑 Expediente Clínico</div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.landing-container { font-family: sans-serif; color: #333; background: #f8fafc; min-height: 100vh; }
.navbar { display: flex; justify-content: space-between; align-items: center; padding: 20px 50px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
.logo { font-size: 24px; font-weight: bold; color: #1e40af; }
.btn-login { background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; }
.hero-section { text-align: center; max-width: 900px; margin: 80px auto; padding: 0 20px; }
h1 { font-size: 48px; color: #1e3a8a; margin-bottom: 20px; }
p { font-size: 18px; color: #64748b; margin-bottom: 40px; }
.features-grid { display: flex; justify-content: space-around; gap: 20px; margin-top: 50px; }
.card { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); width: 30%; font-weight: bold; color: #0f172a; border-top: 4px solid #3b82f6; }
</style>
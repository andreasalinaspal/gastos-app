// Estilos globales compartidos (fuentes, keyframes, resets) — antes `sharedStyle` en GastosApp.
export const sharedStyle = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
    @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
    @keyframes slideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
    @keyframes spin { to{transform:rotate(360deg)} }
    @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
    @keyframes ripple { 0%{opacity:0.6;transform:scale(0.85)} 100%{opacity:0;transform:scale(1.15)} }
    input:focus { border-color: #6C5CE7 !important; outline: none; }
    input[type="number"]::-webkit-inner-spin-button, input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; }
    input[type="number"] { -moz-appearance: textfield; }
    * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; margin: 0; }
    ::-webkit-scrollbar { width: 0; }
  `;

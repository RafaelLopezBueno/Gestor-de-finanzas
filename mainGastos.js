/* =========================================
   VARIABLES GLOBALES
   ========================================= */
let datosApp = JSON.parse(localStorage.getItem('datosFinanzas')) || {};
let graficoDoughnut, graficoEvolucion, graficoDecada;

/* =========================================
   INICIALIZACIÓN
   ========================================= */
function init() {
    // 1. Cargar Tema Guardado
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
    document.getElementById('theme-icon').innerText = savedTheme === 'dark' ? '🌙' : '☀️';

    // 2. Generar Selector de Años (Últimos 10 años)
    const selectYear = document.getElementById('select-year');
    const añoActual = new Date().getFullYear();
    for(let i = 0; i < 10; i++) {
        let año = añoActual - i;
        let opt = document.createElement('option');
        opt.value = año;
        opt.innerText = año;
        selectYear.appendChild(opt);
    }

    // 3. Establecer Mes Actual por defecto
    document.getElementById('select-mes').value = new Date().getMonth();
    
    cargarDatosMes();
}

/* =========================================
   LÓGICA DEL TEMA (MODO CLARO/OSCURO)
   ========================================= */
document.getElementById('theme-toggle').addEventListener('click', () => {
    const theme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    document.getElementById('theme-icon').innerText = theme === 'dark' ? '🌙' : '☀️';
    calcularTotales(); // Recalcular para actualizar colores de gráficos
});

function getChartColors() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    return {
        text: isDark ? '#94a3b8' : '#64748b',
        grid: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
        accent: isDark ? '#00f2ff' : '#0284c7'
    };
}

/* =========================================
   GESTIÓN DE DATOS Y RENDERIZADO
   ========================================= */
function cargarDatosMes() {
    const año = document.getElementById('select-year').value;
    const mes = document.getElementById('select-mes').value;
    document.getElementById('year-label').innerText = año;

    const data = (datosApp[año] && datosApp[año][mes]) ? datosApp[año][mes] : { 
        patrimonio: { banco: 0, efectivo: 0, inversiones: 0 }, 
        ingresos: [], 
        gastos: [] 
    };
    
    // Cargar patrimonio (vaciamos si es 0 para el placeholder)
    document.getElementById('pat-banco').value = data.patrimonio.banco || '';
    document.getElementById('pat-efectivo').value = data.patrimonio.efectivo || '';
    document.getElementById('pat-inversiones').value = data.patrimonio.inversiones || '';

    // Limpiar listas de movimientos
    const listIng = document.getElementById('lista-ingresos');
    const listGas = document.getElementById('lista-gastos');
    listIng.innerHTML = ''; 
    listGas.innerHTML = '';

    // Reconstruir UI
    data.ingresos.forEach(i => crearFilaUI('lista-ingresos', i.concepto, i.valor));
    data.gastos.forEach(g => crearFilaUI('lista-gastos', g.concepto, g.valor));

    calcularTotales();
}

function crearFilaUI(id, concepto = '', valor = '') {
    const div = document.createElement('div');
    div.className = 'fila-transaccion';
    const valorDisplay = (valor === 0 || valor === '') ? '' : valor;

    div.innerHTML = `
        <input type="text" placeholder="Concepto" class="concepto" value="${concepto}" onchange="guardarYCalcular()">
        <input type="number" placeholder="0" class="valor" value="${valorDisplay}" onchange="guardarYCalcular()">
    `;
    document.getElementById(id).appendChild(div);
}

function agregarFila(tipo) {
    crearFilaUI(tipo === 'ingreso' ? 'lista-ingresos' : 'lista-gastos');
}

function guardarYCalcular() {
    const año = document.getElementById('select-year').value;
    const mes = document.getElementById('select-mes').value;
    
    if(!datosApp[año]) datosApp[año] = {};

    const obtenerFilas = (id) => Array.from(document.querySelectorAll(`#${id} .fila-transaccion`)).map(f => ({
        concepto: f.querySelector('.concepto').value,
        valor: parseFloat(f.querySelector('.valor').value) || 0
    }));

    datosApp[año][mes] = {
        patrimonio: {
            banco: parseFloat(document.getElementById('pat-banco').value) || 0,
            efectivo: parseFloat(document.getElementById('pat-efectivo').value) || 0,
            inversiones: parseFloat(document.getElementById('pat-inversiones').value) || 0
        },
        ingresos: obtenerFilas('lista-ingresos'),
        gastos: obtenerFilas('lista-gastos')
    };

    localStorage.setItem('datosFinanzas', JSON.stringify(datosApp));
    calcularTotales();
}

function calcularTotales() {
    const año = document.getElementById('select-year').value;
    const mes = parseInt(document.getElementById('select-mes').value);
    
    const d = (datosApp[año] && datosApp[año][mes]) ? datosApp[año][mes] : { patrimonio: { banco: 0, efectivo: 0, inversiones: 0 }, ingresos: [], gastos: [] };
    const sIng = d.ingresos.reduce((a, b) => a + b.valor, 0);
    const sGas = d.gastos.reduce((a, b) => a + b.valor, 0);
    const sPat = (parseFloat(document.getElementById('pat-banco').value) || 0) + 
                 (parseFloat(document.getElementById('pat-efectivo').value) || 0) + 
                 (parseFloat(document.getElementById('pat-inversiones').value) || 0);

    // Actualizar UI
    document.getElementById('tot-ing').innerText = sIng.toFixed(2);
    document.getElementById('tot-gas').innerText = sGas.toFixed(2);
    document.getElementById('suma-patrimonio').innerText = sPat.toFixed(2) + "€";
    document.getElementById('balance-total').innerText = (sIng - sGas).toFixed(2) + "€";
    
    // Diferencia con mes anterior
    let dif = 0;
    if (mes > 0 && datosApp[año] && datosApp[año][mes - 1]) {
        const pA = datosApp[año][mes - 1].patrimonio;
        dif = sPat - (pA.banco + pA.efectivo + pA.inversiones);
    }
    const elDif = document.getElementById('dif-mes');
    elDif.innerText = (dif >= 0 ? '+' : '') + dif.toFixed(2);
    elDif.style.color = dif >= 0 ? '#10b981' : '#f43f5e';

    actualizarGraficos(sIng, sGas, año);
}

/* =========================================
   GRÁFICOS (Chart.js)
   ========================================= */
function actualizarGraficos(ing, gas, añoSel) {
    const theme = getChartColors();

    // 1. Gráfico Donut (Balance)
    const ctxD = document.getElementById('miGrafico').getContext('2d');
    if (graficoDoughnut) graficoDoughnut.destroy();
    graficoDoughnut = new Chart(ctxD, {
        type: 'doughnut',
        data: { labels: ['Ingresos', 'Gastos'], datasets: [{ data: [ing, gas], backgroundColor: ['#10b981', '#f43f5e'], borderColor: 'transparent' }] },
        options: { maintainAspectRatio: false, plugins: { legend: { labels: { color: theme.text } } } }
    });

    // 2. Gráfico de Líneas (Evolución Anual)
    const ctxL = document.getElementById('graficoEvolucion').getContext('2d');
    if (graficoEvolucion) graficoEvolucion.destroy();
    const valoresMeses = Array.from({length: 12}, (_, i) => {
        const d = (datosApp[añoSel] && datosApp[añoSel][i]) ? datosApp[añoSel][i].patrimonio : null;
        return d ? (d.banco + d.efectivo + d.inversiones) : 0;
    });
    graficoEvolucion = new Chart(ctxL, {
        type: 'line',
        data: { 
            labels: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'], 
            datasets: [{ label: 'Patrimonio', data: valoresMeses, borderColor: theme.accent, tension: 0.4, fill: true, backgroundColor: theme.accent + '15' }] 
        },
        options: { maintainAspectRatio: false, scales: { y: { grid: { color: theme.grid }, ticks: { color: theme.text } }, x: { grid: { display: false }, ticks: { color: theme.text } } }, plugins: { legend: { display: false } } }
    });

    // 3. Gráfico de Barras (Últimos 10 años)
    const ctxDec = document.getElementById('graficoDecada').getContext('2d');
    if (graficoDecada) graficoDecada.destroy();
    const añoActual = new Date().getFullYear();
    const añosLabels = Array.from({length: 10}, (_, i) => (añoActual - 9) + i);
    const valoresAños = añosLabels.map(a => {
        if (!datosApp[a]) return 0;
        for(let m = 11; m >= 0; m--) { // Buscar el último mes registrado del año
            if(datosApp[a][m]) {
                const p = datosApp[a][m].patrimonio;
                return p.banco + p.efectivo + p.inversiones;
            }
        }
        return 0;
    });
    graficoDecada = new Chart(ctxDec, {
        type: 'bar',
        data: { labels: añosLabels, datasets: [{ label: 'Cierre Anual', data: valoresAños, backgroundColor: theme.accent, borderRadius: 5 }] },
        options: { maintainAspectRatio: false, scales: { y: { grid: { color: theme.grid }, ticks: { color: theme.text } }, x: { grid: { display: false }, ticks: { color: theme.text } } }, plugins: { legend: { display: false } } }
    });
}

/* =========================================
   SEGURIDAD
   ========================================= */
function borrarBaseDeDatos() {
    if (confirm("⚠️ ¿Deseas borrar TODOS los datos? Esta acción no se puede deshacer.")) {
        if (confirm("Última advertencia: Perderás todos tus registros históricos. ¿Continuar?")) {
            localStorage.removeItem('datosFinanzas');
            location.reload();
        }
    }
}

window.onload = init;
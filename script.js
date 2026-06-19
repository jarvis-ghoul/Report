/* ==========================================================================
   ImportCalc JavaScript Engine - script.js
   ========================================================================== */

// Global state variables
let indChartInstance = null;

// Document Ready
document.addEventListener("DOMContentLoaded", () => {
    // Check Dark Mode preference
    if (localStorage.getItem("darkMode") === "enabled") {
        document.body.classList.add("dark-mode");
        const icon = document.querySelector("#btnToggleDark i");
        if (icon) icon.className = "fa-solid fa-sun";
    }

    // Client view input IDs
    const clientInputIds = [
        "indCliente", "indProducto", "indValorMercancia", "indPeso", "indVolumen", "indIncoterm", "indTransporte", "indOrigen", "indCantidad", "indMargen"
    ];
    
    // Admin tariff input IDs
    const adminInputIds = [
        "admFleteCbm", "admFleteFcl", "admFleteAereo", "admBlFee", "admPickUp", "admGastosOrigen",
        "admSeguroComercial", "admDocFee", "admDescargaTn", "admVistoBueno",
        "admTransporteInterno", "admAlmacenajeVerde", "admVistoBuenoLinea", 
        "admGateIn", "admDescargaPuerto", "admComisionAduana", "admGastosOperativos",
        "admArancel", "admPercepcion", "admTipoCambio"
    ];

    // Bind event listeners to Client inputs
    clientInputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("input", calculateIndividual);
            el.addEventListener("change", calculateIndividual);
        }
    });

    // Bind event listeners to Admin inputs
    adminInputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("input", calculateIndividual);
            el.addEventListener("change", calculateIndividual);
        }
    });

    // Initialize the calculation
    calculateIndividual();
});

// Tab Switcher
function switchTab(tabName) {
    // Toggle active buttons
    document.getElementById("tabIndividual").classList.toggle("active", tabName === "individual");
    document.getElementById("tabPersonal").classList.toggle("active", tabName === "personal");
    document.getElementById("tabGuia").classList.toggle("active", tabName === "guia");

    // Toggle active content divs
    document.getElementById("contentIndividual").classList.toggle("active", tabName === "individual");
    document.getElementById("contentPersonal").classList.toggle("active", tabName === "personal");
    document.getElementById("contentGuia").classList.toggle("active", tabName === "guia");
    
    // Recalculate on switch
    calculateIndividual();
}

// --------------------------------------------------------------------------
// INDIVIDUAL CALCULATOR LOGIC (LCL Quotation Engine)
// --------------------------------------------------------------------------
function calculateIndividual() {
    // 1. Capture Client Inputs
    const mercancia = parseFloat(document.getElementById("indValorMercancia").value) || 0;
    const peso_kg = parseFloat(document.getElementById("indPeso").value) || 0;
    const cbm = parseFloat(document.getElementById("indVolumen").value) || 0;
    const incoterm = document.getElementById("indIncoterm").value;
    const transporte = document.getElementById("indTransporte").value;
    const origen = document.getElementById("indOrigen").value;
    const cantidad = Math.max(parseFloat(document.getElementById("indCantidad").value) || 1, 1);
    const margen_comercial = parseFloat(document.getElementById("indMargen").value) || 0;

    // 2. Capture Admin Inputs
    const flete_tarifa_cbm = parseFloat(document.getElementById("admFleteCbm").value) || 0;
    const flete_tarifa_fcl = parseFloat(document.getElementById("admFleteFcl").value) || 0;
    const flete_aereo_rate = parseFloat(document.getElementById("admFleteAereo").value) || 0;
    const bl_fee = parseFloat(document.getElementById("admBlFee").value) || 0;
    const pick_up = parseFloat(document.getElementById("admPickUp").value) || 0;
    const gastos_origen = parseFloat(document.getElementById("admGastosOrigen").value) || 0;
    const seguro_comercial = parseFloat(document.getElementById("admSeguroComercial").value) || 0;
    const doc_fee = parseFloat(document.getElementById("admDocFee").value) || 0;
    const descarga_tarifa_tn = parseFloat(document.getElementById("admDescargaTn").value) || 0;
    const visto_bueno = parseFloat(document.getElementById("admVistoBueno").value) || 0;
    const transporte_interno = parseFloat(document.getElementById("admTransporteInterno").value) || 0;
    const almacenaje_verde = parseFloat(document.getElementById("admAlmacenajeVerde").value) || 0;
    const visto_bueno_linea = parseFloat(document.getElementById("admVistoBuenoLinea").value) || 0;
    const gate_in = parseFloat(document.getElementById("admGateIn").value) || 0;
    const descarga_puerto = parseFloat(document.getElementById("admDescargaPuerto").value) || 0;
    const comision_aduana = parseFloat(document.getElementById("admComisionAduana").value) || 0;
    const gastos_operativos = parseFloat(document.getElementById("admGastosOperativos").value) || 0;
    
    const arancel_rate = parseFloat(document.getElementById("admArancel").value) || 0;
    const percepcion_rate = parseFloat(document.getElementById("admPercepcion").value) || 0;
    const tc = parseFloat(document.getElementById("admTipoCambio").value) || 3.78;

    // 3. Flete Internacional Base Calculation (with weight/volume minimums / flat rates)
    let flete_base = 0;
    if (transporte === "maritimo") {
        // Minimums: 1 CBM and 1 Ton (1000 kg)
        const cbm_calculado = Math.max(cbm, 1.0);
        const peso_calculado_tn = Math.max(peso_kg, 1000.0) / 1000.0; // Convert to tons
        flete_base = Math.max(cbm_calculado, peso_calculado_tn) * flete_tarifa_cbm;
        
        // Update info text
        document.getElementById("indTarifaInfo").textContent = `Tarifa LCL: $${flete_tarifa_cbm.toFixed(2)} / CBM o Ton`;
    } else if (transporte === "maritimo_fcl") {
        // Flat rate per container
        flete_base = flete_tarifa_fcl;
        
        // Update info text
        document.getElementById("indTarifaInfo").textContent = `Tarifa FCL Flat: $${flete_tarifa_fcl.toFixed(2)} / Contenedor`;
    } else {
        // Air freight: peso_kg * rate
        flete_base = peso_kg * flete_aereo_rate;
        
        // Update info text
        document.getElementById("indTarifaInfo").textContent = `Tarifa Aérea: $${flete_aereo_rate.toFixed(2)} / kg`;
    }

    // 4. Apply Origin Recargo
    let recargo_factor = 1.0;
    let recargo_text = "Recargo flete: Ninguno (+0%)";
    if (origen === "europa") {
        recargo_factor = 1.2;
        recargo_text = "Recargo flete: +20% (Europa)";
    } else if (origen === "eeuu") {
        recargo_factor = 1.1;
        recargo_text = "Recargo flete: +10% (EEUU)";
    }
    document.getElementById("indOrigenInfo").textContent = recargo_text;
    
    let flete_comercial = flete_base * recargo_factor;

    // 5. FOB Aduanero Calculation
    let fob = mercancia;
    if (incoterm === "EXW") {
        // Under EXW, origin expenses (BL Fee + Pick Up + Origin) are added to FOB
        fob = mercancia + bl_fee + pick_up + gastos_origen;
    }

    // 6. Flete Internacional Aduanero
    let flete_aduanero = 0;
    if (incoterm === "EXW" || incoterm === "FOB") {
        flete_aduanero = flete_comercial;
    } else {
        flete_comercial = 0; // Pre-paid in CIF
    }

    // 7. Seguro de Aduanas (1.5% of FOB)
    let seguro_aduanero = 0;
    if (incoterm === "EXW" || incoterm === "FOB") {
        seguro_aduanero = fob * 0.015;
    }

    // 8. Valor CIF (Base Imponible)
    const cif = fob + flete_aduanero + seguro_aduanero;

    // 9. Impuestos de Aduana (SUNAT)
    const arancel = cif * arancel_rate;
    const igv = (cif + arancel) * 0.16;
    const ipm = (cif + arancel) * 0.02;
    const derechos_aduaneros = arancel + igv + ipm;
    
    const base_percepcion = cif + derechos_aduaneros;
    const percepcion = base_percepcion * percepcion_rate;
    const impuestos_totales = derechos_aduaneros + percepcion;

    // 10. Servicios Logísticos MSI
    const bl_fee_comercial = (incoterm === "EXW") ? bl_fee : 0;
    const pick_up_comercial = (incoterm === "EXW") ? pick_up : 0;
    const gastos_origen_comercial = (incoterm === "EXW") ? gastos_origen : 0;

    // Conditional local services depending on transport
    let doc_fee_comercial = 0;
    let descarga_comercial = 0;
    let visto_bueno_lcl_comercial = 0;
    let almacenaje_lcl_comercial = 0;
    
    let visto_bueno_fcl_comercial = 0;
    let gate_in_fcl_comercial = 0;
    let descarga_puerto_fcl_comercial = 0;

    if (transporte === "maritimo") {
        doc_fee_comercial = doc_fee;
        const peso_tn = peso_kg / 1000.0;
        descarga_comercial = descarga_tarifa_tn * Math.max(peso_tn, 1.0);
        visto_bueno_lcl_comercial = visto_bueno;
        almacenaje_lcl_comercial = almacenaje_verde;
    } else if (transporte === "maritimo_fcl") {
        doc_fee_comercial = doc_fee;
        visto_bueno_fcl_comercial = visto_bueno_linea;
        gate_in_fcl_comercial = gate_in;
        descarga_puerto_fcl_comercial = descarga_puerto;
    }

    // Separate services by taxability (under Peruvian law)
    const servicios_origen_total = bl_fee_comercial + pick_up_comercial + gastos_origen_comercial;
    
    // Services gravados (local in Peru)
    const servicios_destino_gravados = seguro_comercial + doc_fee_comercial + descarga_comercial + visto_bueno_lcl_comercial +
                                      transporte_interno + comision_aduana + gastos_operativos +
                                      almacenaje_lcl_comercial + visto_bueno_fcl_comercial + gate_in_fcl_comercial + descarga_puerto_fcl_comercial;
                                      
    const igv_servicios = servicios_destino_gravados * 0.18;
    const total_servicios_sin_igv = flete_comercial + servicios_origen_total + servicios_destino_gravados;
    const servicios_logicos_totales = total_servicios_sin_igv + igv_servicios;

    const costo_total = mercancia + impuestos_totales + servicios_logicos_totales;

    // 11b. Costo Unitario & Precio Sugerido
    const unit_landed = costo_total / cantidad;
    const price_net = margen_comercial < 100 ? (unit_landed / (1 - (margen_comercial / 100))) : unit_landed;

    // Update unit analysis elements
    document.getElementById("resUnitLandedUsd").textContent = formatCurrency(unit_landed, "USD");
    document.getElementById("resUnitLandedPen").textContent = formatCurrency(unit_landed * tc, "PEN");
    document.getElementById("resUnitPriceUsd").textContent = formatCurrency(price_net, "USD");
    document.getElementById("resUnitPricePen").textContent = formatCurrency(price_net * tc, "PEN");

    // 12. Update UI Summary Card and Pills
    document.getElementById("resTotalImportacionUsd").textContent = formatCurrency(costo_total, "USD");
    document.getElementById("resTotalImportacionPen").textContent = formatCurrency(costo_total * tc, "PEN");

    document.getElementById("resPillMercancia").textContent = formatCurrency(mercancia, "USD");
    document.getElementById("resPillImpuestos").textContent = formatCurrency(impuestos_totales, "USD");
    document.getElementById("resPillServicios").textContent = formatCurrency(servicios_logicos_totales, "USD");

    // 13. Update Detailed Breakdown list
    document.getElementById("resIndFob").textContent = formatCurrency(fob, "USD");
    document.getElementById("resIndFlete").textContent = formatCurrency(flete_aduanero, "USD");
    document.getElementById("resIndSeguro").textContent = formatCurrency(seguro_aduanero, "USD");
    document.getElementById("resIndCif").textContent = formatCurrency(cif, "USD");
    document.getElementById("resIndAdvalorem").textContent = formatCurrency(arancel, "USD");
    document.getElementById("resIndIgvIpm").textContent = formatCurrency(igv + ipm, "USD");
    document.getElementById("resIndPercepcionVal").textContent = formatCurrency(percepcion, "USD");
    
    // Services details
    document.getElementById("resIndServiciosOrigen").textContent = formatCurrency(servicios_origen_total, "USD");
    document.getElementById("resIndServiciosFlete").textContent = formatCurrency(flete_comercial, "USD");
    document.getElementById("resIndServiciosDestino").textContent = formatCurrency(servicios_destino_gravados, "USD");
    document.getElementById("resIndServiciosIgv").textContent = formatCurrency(igv_servicios, "USD");
    document.getElementById("resIndServiciosTotal").textContent = formatCurrency(servicios_logicos_totales, "USD");

    // 14. Populate Printable PDF Proforma
    document.getElementById("pdfClienteNombre").textContent = document.getElementById("indCliente").value || "Raúl Bardales";
    document.getElementById("pdfProducto").textContent = document.getElementById("indProducto").value || "Motor Eléctrico Industrial + Accesorios";
    
    // Format transport text
    let transportText = "Marítimo LCL";
    if (transporte === "maritimo_fcl") {
        transportText = "Marítimo FCL";
    } else if (transporte === "aereo") {
        transportText = "Aéreo (Carga)";
    }
    document.getElementById("pdfTransporte").textContent = transportText;
    document.getElementById("pdfIncoterm").textContent = incoterm;
    
    // Format origin text
    let originText = "Qingdao / Callao";
    if (origen === "eeuu") originText = "Miami (EEUU) / Callao";
    else if (origen === "europa") originText = "Rotterdam (Europa) / Callao";
    else if (origen === "otros") originText = "Origen Internacional / Callao";
    document.getElementById("pdfOrigen").textContent = originText;
    
    document.getElementById("pdfPeso").textContent = `${peso_kg.toFixed(1)} kg`;
    document.getElementById("pdfVolumen").textContent = `${cbm.toFixed(2)} CBM`;
    
    // Tax details (SUNAT)
    document.getElementById("pdfValorFob").textContent = formatCurrency(fob, "USD");
    document.getElementById("pdfFleteAduanero").textContent = formatCurrency(flete_aduanero, "USD");
    document.getElementById("pdfSeguroAduanero").textContent = formatCurrency(seguro_aduanero, "USD");
    document.getElementById("pdfValorCif").textContent = formatCurrency(cif, "USD");
    document.getElementById("pdfAdvalorem").textContent = formatCurrency(arancel, "USD");
    document.getElementById("pdfIgv").textContent = formatCurrency(igv, "USD");
    document.getElementById("pdfIpm").textContent = formatCurrency(ipm, "USD");
    document.getElementById("pdfTotalDerechosAduana").textContent = formatCurrency(derechos_aduaneros, "USD");
    document.getElementById("pdfPercepcion").textContent = formatCurrency(percepcion, "USD");
    document.getElementById("pdfTotalAduana").textContent = formatCurrency(impuestos_totales, "USD");
    
    // Services details (MSI)
    document.getElementById("pdfServFlete").textContent = formatCurrency(flete_comercial, "USD");
    document.getElementById("pdfServBl").textContent = formatCurrency(bl_fee_comercial, "USD");
    document.getElementById("pdfServPickUp").textContent = formatCurrency(pick_up_comercial, "USD");
    document.getElementById("pdfServOrigen").textContent = formatCurrency(gastos_origen_comercial, "USD");
    document.getElementById("pdfServSeguro").textContent = formatCurrency(seguro_comercial, "USD");
    document.getElementById("pdfServDoc").textContent = formatCurrency(doc_fee_comercial, "USD");
    document.getElementById("pdfServDescargaLcl").textContent = formatCurrency(descarga_comercial, "USD");
    document.getElementById("pdfServVbLcl").textContent = formatCurrency(visto_bueno_lcl_comercial, "USD");
    document.getElementById("pdfServTranspInterno").textContent = formatCurrency(transporte_interno, "USD");
    document.getElementById("pdfServAlmacenaje").textContent = formatCurrency(almacenaje_lcl_comercial, "USD");
    document.getElementById("pdfServVbFcl").textContent = formatCurrency(visto_bueno_fcl_comercial, "USD");
    document.getElementById("pdfServGateIn").textContent = formatCurrency(gate_in_fcl_comercial, "USD");
    document.getElementById("pdfServDescargaPuerto").textContent = formatCurrency(descarga_puerto_fcl_comercial, "USD");
    document.getElementById("pdfServComision").textContent = formatCurrency(comision_aduana, "USD");
    document.getElementById("pdfServGastosOp").textContent = formatCurrency(gastos_operativos, "USD");
    document.getElementById("pdfServIgv").textContent = formatCurrency(igv_servicios, "USD");
    document.getElementById("pdfServTotal").textContent = formatCurrency(servicios_logicos_totales, "USD");
    
    // Grand summary
    document.getElementById("pdfResumenMercancia").textContent = formatCurrency(mercancia, "USD");
    document.getElementById("pdfResumenImpuestos").textContent = formatCurrency(impuestos_totales, "USD");
    document.getElementById("pdfResumenServicios").textContent = formatCurrency(servicios_logicos_totales, "USD");
    document.getElementById("pdfResumenTotalUsd").textContent = formatCurrency(costo_total, "USD");
    document.getElementById("pdfResumenTotalPen").textContent = formatCurrency(costo_total * tc, "PEN");

    // 15. Refresh visual Chart
    updateIndividualChart(mercancia, impuestos_totales, servicios_logicos_totales);
}

// --------------------------------------------------------------------------
// PRINT PDF TRIGGER
// --------------------------------------------------------------------------
function printPdf() {
    // Generate dates dynamically
    const today = new Date();
    const expiry = new Date();
    expiry.setDate(today.getDate() + 15);
    
    const formatDate = (date) => {
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yyyy = date.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    };
    
    document.getElementById("pdfFecha").textContent = formatDate(today);
    document.getElementById("pdfVence").textContent = formatDate(expiry);
    
    // Generate random quote number if not set or just a new one for unique printouts
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    document.getElementById("pdfCotizacionNum").textContent = `MSI-${today.getFullYear()}-J${randomNum}`;
    
    // Trigger print dialog
    window.print();
}

// --------------------------------------------------------------------------
// TOGGLE DARK MODE
// --------------------------------------------------------------------------
function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("darkMode", isDark ? "enabled" : "disabled");
    
    // Update toggle icon
    const icon = document.querySelector("#btnToggleDark i");
    if (icon) {
        if (isDark) {
            icon.className = "fa-solid fa-sun";
        } else {
            icon.className = "fa-solid fa-moon";
        }
    }
    
    // Recalculate to redraw chart with dynamic colors
    calculateIndividual();
}

// --------------------------------------------------------------------------
// CHART RENDERER
// --------------------------------------------------------------------------
function updateIndividualChart(mercancia, impuestos, servicios) {
    const canvas = document.getElementById("indChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    const chartData = [mercancia, impuestos, servicios];
    const chartLabels = ["Mercadería", "Impuestos SUNAT", "Servicios MSI"];
    
    const isDark = document.body.classList.contains("dark-mode");
    const mercaderiaColor = isDark ? "#3b82f6" : "#111827"; // Light Blue in dark mode, charcoal in light mode
    const chartBorderColor = isDark ? "#111827" : "#ffffff";
    const legendColor = isDark ? "#f3f4f6" : "#4b5563";
    
    if (indChartInstance) {
        indChartInstance.data.datasets[0].data = chartData;
        indChartInstance.data.datasets[0].backgroundColor[0] = mercaderiaColor;
        indChartInstance.data.datasets[0].borderColor = chartBorderColor;
        indChartInstance.options.plugins.legend.labels.color = legendColor;
        indChartInstance.update();
    } else {
        indChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: chartLabels,
                datasets: [{
                    data: chartData,
                    backgroundColor: [
                        mercaderiaColor,
                        '#dc2626', // Impuestos SUNAT (MSI/SUNAT Crimson Red)
                        '#ecc94b'  // Servicios MSI (Gold/Yellow)
                    ],
                    borderWidth: 2,
                    borderColor: chartBorderColor
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: legendColor,
                            font: {
                                family: "'Outfit', sans-serif",
                                size: 11,
                                weight: '600'
                            },
                            boxWidth: 12,
                            padding: 8
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += formatCurrency(context.raw, "USD");
                                return label;
                            }
                        }
                    }
                },
                cutout: '65%'
            }
        });
    }
}

// --------------------------------------------------------------------------
// HELPER UTILITIES
// --------------------------------------------------------------------------
function formatCurrency(val, currency = "USD") {
    const formatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(val);
    
    if (currency === "USD") {
        return `$ ${formatted}`;
    } else {
        return `S/ ${formatted}`;
    }
}

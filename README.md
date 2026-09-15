# VeroLED — LEDwall Energy Simulator (DOOH & Outdoor)

Tool web ad alte prestazioni front-end per la stima in tempo reale dei consumi e costi energetici di un **LEDwall outdoor di massima qualità**, con dimostrazione comparativa del risparmio economico certificato garantito da **Fleet Monitor VeroLED**.

Target: Clienti finali, agenzie media DOOH e installatori di maxischermi.  
Obiettivo: Consapevolezza consumi, dimensionamento fotometrico e Lead Generation B2B VeroLED.

---

## 🚀 Avvio Rapido su Localhost

L'applicazione gira al 100% in locale, senza necessità di backend o chiavi API esterne.

### 1. Installazione Dipendenze
```bash
npm install
```

### 2. Avvio Server di Sviluppo
```bash
npm run dev
```
Apri il browser su: [http://localhost:3000](http://localhost:3000)

### 3. Esecuzione Test Unitari
Esegue la suite Vitest per il motore fisico-matematico e i test di accettazione (a–e):
```bash
npm test
```

### 4. Build di Produzione
```bash
npm run build
npm run start
```

### 5. Come Resettare lo Stato della Simulazione
Lo stato dell'applicazione viene memorizzato automaticamente in `localStorage` ad ogni interazione.
Per resettarlo puoi:
1. Cliccare su **"Azzera e ricomincia simulazione"** nella schermata finale S9 (Report).
2. Oppure eseguire nella Console di Chrome:
   ```js
   localStorage.removeItem('ledwall-energy-simulator-storage'); location.reload();
   ```

---

## 📐 Motore Fisico & Formule Ingegneristiche

### Formula di Potenza Assorbita
$$P = P_{standby} + APL \times P_{max} \times L$$

- $P_{max} = 500\text{ W/m}^2$ (default nominale a bianco 255,255,255, APL 100%, L 100%).
- $P_{standby} = 50\text{ W/m}^2$ (display oscurato via software, alimentatori e receiver card attivi).
- Se relè smart attivo (S4=No o Fleet Monitor): $P_{standby} = 0\text{ W/m}^2$.
- $APL$ (*Average Picture Level*): percentuale media di bianco estratta tramite lo standard fotometrico ITU-R BT.709:
  $$\text{Luminanza} = \frac{0.2126 R + 0.7152 G + 0.0722 B}{255}$$
- $L$: livello di dimmerazione (giorno $100\%$ o adattivo lux, notte $10\%$).

### Test di Accettazione Certificati (`test/physics.test.ts`)
- **a)** $APL=100\%, L=100\% \implies 500\text{ W/m}^2$
- **b)** $APL \approx 0\%, L=100\% \implies 50\text{ W/m}^2$
- **c)** $L=10\%, APL=100\% \implies 100\text{ W/m}^2$ ($50 + 1.0 \times 500 \times 0.10$)
- **d)** Sera senza dimmer $\implies$ potenza identica al giorno
- **e)** Standby notte $\implies 50\text{ W/m}^2$ piatti (o $0$ se escluso)
- **Scenari**: Scenario B $\ge 50\%$ di risparmio rispetto a Scenario A sui default di massima qualità con breakdown additivo coerente.

---

## 🛠️ Struttura del Progetto

```
src/
├── app/
│   ├── globals.css          # Dark theme OLED, neon glow utilities, custom sliders
│   ├── layout.tsx           # Layout con font Inter e JetBrains Mono
│   └── page.tsx             # Coordinatore wizard reattivo con AnimatePresence
├── components/
│   ├── canvas/
│   │   └── CabinetCanvas.tsx # Configuratore 2D interattivo cabinet modulari
│   ├── charts/
│   │   ├── LoadCurveChart.tsx        # Curva di carico 24h Recharts
│   │   └── SavingsBreakdownChart.tsx # Grafico a barre del risparmio impilato
│   ├── ui/
│   │   └── CircularGauge.tsx # Gauge circolare SVG animata kW
│   └── wizard/              # Le 10 schermate del wizard S0–S9:
│       ├── S0Landing.tsx
│       ├── S1DataSource.tsx
│       ├── S2Dimensions.tsx
│       ├── S3AplEngine.tsx
│       ├── S4Standby.tsx
│       ├── S5NightDimming.tsx
│       ├── S6ScheduleTariff.tsx
│       ├── S7Dashboard.tsx
│       ├── S8ScenarioComparison.tsx
│       └── S9ReportExport.tsx
├── config/
│   └── config.ts            # Costanti fisiche, CLAIM_SAVINGS_PERCENT, preset
├── core/
│   ├── apl-engine.ts        # Campionamento video 30 frame e formula ITU-R BT.709
│   ├── export-pdf.ts        # Generazione vettoriale Report PDF con jsPDF
│   ├── pdf-parser.ts        # Estrazione dati tecnici con pdfjs-dist
│   └── physics.ts           # Formule energetiche ed economiche
└── store/
    └── useSimulatorStore.ts # Store Zustand globale con persistenza
```

---

## 📋 TODO & Roadmap (Fase 2 / Evoluzioni Future)

1. [ ] **Integrazione WebGL 3D**: Rendering tridimensionale fotorealistico del maxischermo inserito in contesto urbano reale (edificio, palo DOOH o totem).
2. [ ] **API Meteo Solare Live**: Integrazione con API fotometriche per simulare l'irraggiamento solare reale e la curva di lux annuale della città del cliente (es. Milano vs Palermo).
3. [ ] **Webhook CRM Automatico**: Invio asincrono dei lead catturati in S9 al CRM VeroLED (es. VeroCRM / HubSpot) con allegato l'Audit Energetico in PDF.
4. [ ] **Simulatore Calore Dissipato**: Calcolo dei BTU/ora e dimensionamento del sistema di condizionamento HVAC necessario per la cabina di controllo o la cassa del display.

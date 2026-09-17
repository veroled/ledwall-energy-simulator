import { describe, it, expect } from 'vitest';
import catalogoNit from '../src/config/catalogo-nit.json';
import { datoCatalogo, combinazioneRaggiungeNit, passiDelTier, PASSI_CATALOGO, TIERS, type TierId, standbyWmqPerPasso, calcolaPotenzaWmq, calcolaProfiloEnergetico, stimaPotenzaDaPassoNit, calcolaPowerQuality, calcolaConsulenzaOttica, suggerisciAlternativa } from '../src/core/physics';

describe('Motore Fisico LEDwall — Test di Accettazione Obbligatori (a–e)', () => {
  const P_MAX = 500;
  const P_STANDBY = 50;

  // a) APL=100%, L=100% → 500 W/mq
  it('a) APL=100%, L=100% → restituisce 500 W/m²', () => {
    const p = calcolaPotenzaWmq({
      apl: 1.0,
      lum: 1.0,
      pMax: P_MAX,
      pStandby: P_STANDBY,
    });
    expect(p).toBe(500);
  });

  // b) APL≈0%, L=100% → 50 W/mq
  it('b) APL≈0%, L=100% → restituisce 50 W/m²', () => {
    const p = calcolaPotenzaWmq({
      apl: 0.0,
      lum: 1.0,
      pMax: P_MAX,
      pStandby: P_STANDBY,
    });
    expect(p).toBe(50);
  });

  // c) L=10%, APL=100% → 100 W/mq (50 + 1.0 * 500 * 0.10 = 100)
  it('c) L=10%, APL=100% → restituisce 100 W/m²', () => {
    const p = calcolaPotenzaWmq({
      apl: 1.0,
      lum: 0.10,
      pMax: P_MAX,
      pStandby: P_STANDBY,
    });
    expect(p).toBe(100);
  });

  // d) sera senza dimmer → identico al giorno
  it('d) sera senza dimmer → potenza serale identica a quella diurna', () => {
    const apl = 0.35;
    const lumGiorno = 0.80;
    const lumSera = lumGiorno; // nessun dimmer

    const pGiorno = calcolaPotenzaWmq({ apl, lum: lumGiorno, pMax: P_MAX, pStandby: P_STANDBY });
    const pSera = calcolaPotenzaWmq({ apl, lum: lumSera, pMax: P_MAX, pStandby: P_STANDBY });

    expect(pSera).toBe(pGiorno);

    // Verifica tramite calcolaProfiloEnergetico con hasDimmingNotturno=false
    const profilo = calcolaProfiloEnergetico(15, apl, lumGiorno, 0.10, 18, true, false, 0.35);
    expect(profilo.nightPowerWmq).toBe(profilo.dayPowerWmq);
  });

  // e) standby notte → 50 W/mq piatti
  it('e) standby notte con S4=Sì → 50 W/m² piatti a display spento', () => {
    const pStandbyNotte = calcolaPotenzaWmq({
      apl: 0,
      lum: 0,
      pMax: P_MAX,
      pStandby: P_STANDBY,
    });
    expect(pStandbyNotte).toBe(50);
  });

  // Caso S4 = No → P_standby = 0 (spegnimento relè)
  it('Se S4=No → P_standby=0 e consumi standby azzerati', () => {
    const pStandbyZero = calcolaPotenzaWmq({
      apl: 0,
      lum: 0,
      pMax: P_MAX,
      pStandby: 0,
    });
    expect(pStandbyZero).toBe(0);

    const pFullSenzaStandby = calcolaPotenzaWmq({
      apl: 1.0,
      lum: 1.0,
      pMax: P_MAX,
      pStandby: 0,
    });
    expect(pFullSenzaStandby).toBe(500);

    const p10PctSenzaStandby = calcolaPotenzaWmq({
      apl: 1.0,
      lum: 0.10,
      pMax: P_MAX,
      pStandby: 0,
    });
    expect(p10PctSenzaStandby).toBe(50);
  });

  it('Sovrascrittura valori da scheda tecnica se presenti', () => {
    const pCustomScheda = calcolaPotenzaWmq({
      apl: 1.0,
      lum: 1.0,
      pMax: 650, // Scheda tecnica ad altissima luminosità
      pStandby: 60,
    });
    expect(pCustomScheda).toBe(650);
  });

  it('Confronto Ingegneristico: P3.91 @ 6500 nit consuma PIÙ di P6.67 @ 10000 nit', () => {
    const screenA = stimaPotenzaDaPassoNit(3.91, 6500, 32, 0.35, 18);
    const screenB = stimaPotenzaDaPassoNit(6.67, 10000, 32, 0.35, 18);

    // Il P3.91 ha quasi il triplo dei pixel e maggiori perdite logiche/termiche
    expect(screenA.pixelM2).toBeGreaterThan(screenB.pixelM2 * 2.8);
    expect(screenA.pMaxWmq).toBeGreaterThan(screenB.pMaxWmq);
    expect(screenA.annualCostEur).toBeGreaterThan(screenB.annualCostEur);
  });

  it('Vincoli Fisici: P3.91 ha un limite fisico invalicabile di 6.500 nit', () => {
    const screen391 = stimaPotenzaDaPassoNit(3.91, 10000, 32);
    // Anche richiedendo 10.000 nit, il motore deve bloccarlo al tetto fisico
    expect(screen391.maxPhysicalNits).toBe(6500);
    expect(screen391.isAtPhysicalLimit).toBe(true);
    expect(screen391.tecnologiaChip).toContain('SMD1921');

    const screen8 = stimaPotenzaDaPassoNit(8.0, 12000, 32);
    expect(screen8.maxPhysicalNits).toBe(12000);
    expect(screen8.tecnologiaChip).toContain('Gold Wire');
  });

  describe('Power Quality & Fattore di Potenza (Delibera ARERA 232/2022)', () => {
    it('Impianto 6x3m (18 cabinet, 36 alimentatori) a basso carico: PF crolla a ~0.50 in Scenario A, protetto a 0.98 in Scenario B', () => {
      // 18 cabinet, carico attivo 1.2 kW (basso APL ~15%)
      const pq = calcolaPowerQuality(18, 1.2, 0.7, 18, true);

      // In Scenario A (singola fase UHP-200), il PF crolla
      expect(pq.totalPowerSupplies).toBe(36);
      expect(pq.powerFactorA).toBeLessThanOrEqual(0.60);
      expect(pq.apparentPowerKvaA).toBeGreaterThan(pq.apparentPowerKvaB);

      // In Scenario B (Smart Power Guard SVG o Serie Diamond), il PF rimane elevato
      expect(pq.powerFactorB).toBe(0.98);
      expect(pq.penaleAreraEurAnnoB).toBe(0);
      expect(pq.penaleAreraEurAnnoA).toBeGreaterThan(0);
      expect(pq.totaleRisparmioReteEurAnno).toBeGreaterThan(0);
    });
  });

  describe('Consulenza Ottica & Confronto Passo (Cliente vs Sistema)', () => {
    it('Caso Barbecue S.r.l. (6x3m, quota 5m, vista 10m): P2.6 è overkill, P3.91 è ottimale con canone ~1200€/mese e oltre 20.000€ risparmiati in 24 mesi', () => {
      const consulenza = calcolaConsulenzaOttica(5, 10, 2.6, 18, 6000);

      expect(consulenza.lineOfSightDistM).toBeCloseTo(11.2, 1);
      expect(consulenza.recommendedPitchMm).toBe(3.91);
      expect(consulenza.isClientPitchOverkill).toBe(true);
      expect(consulenza.wastedPixelsCount).toBeGreaterThan(1400000);
      expect(consulenza.hardwareClient.sforzoPercent).toBe(100);
      expect(consulenza.hardwareClient.isAtPhysicalLimit).toBe(true); // P2.6 max è 4.500 nit!
      expect(consulenza.hardwareRecommended.sforzoPercent).toBeLessThanOrEqual(92);
      expect(consulenza.hardwareRecommended.isAtPhysicalLimit).toBe(false); // P3.91 supporta 6.000 nit (tetto 6.500)
      expect(consulenza.recommendedMonthlyRentalEur).toBeCloseTo(1200, -2); // ~1.200 €/mese
      expect(consulenza.total24MonthSavingsEur).toBeGreaterThan(19000); // ~19.700 € risparmiati in 24 mesi
      expect(consulenza.scientificVerdict).toContain('acuità visiva');
    });
  });

  describe('Gate di validazione per combinazione Selection × passo (dati di listino)', () => {
    // Oracolo indipendente dal motore: le righe del listino così come sono nel file sincronizzato
    const RIGHE = catalogoNit.rows as { tier: TierId; pitchMm: number; maxNits: number; chip: string }[];
    const tettoListino = (tier: TierId, p: number) => RIGHE.find((r) => r.tier === tier && Math.abs(r.pitchMm - p) <= 0.035)?.maxNits ?? null;
    const TIER_IDS = TIERS.map((t) => t.id);
    const alt = (tier: TierId, p: number, nits: number, dist: number, h = 5, H = 0) =>
      suggerisciAlternativa(p, nits, 32, 0.30, 18, 0.35, h, dist, H, tier);

    it('il catalogo è quello del listino: 6 Selection, nessun valore inventato per le combinazioni assenti', () => {
      expect(RIGHE.length).toBeGreaterThan(50);
      expect(datoCatalogo('silver', 4.81)).toBeNull();
      expect(datoCatalogo('essential', 16)).toBeNull();
      expect(combinazioneRaggiungeNit('silver', 4.81, 3000)).toBeNull();
      // 3.9 e 3.91 sono lo stesso prodotto; 2.6 non è il 2.5 e non ne eredita il dato
      expect(datoCatalogo('gold', 3.9)?.pitchMm).toBe(3.91);
      expect(datoCatalogo('gold', 2.6)).toBeNull();
    });

    it('a parità di passo il tetto cambia con la Selection: P3.91 a 6.500 nit', () => {
      expect(tettoListino('diamond', 3.91)).toBe(9000);
      expect(tettoListino('platinum', 3.91)).toBe(6800);
      expect(tettoListino('gold', 3.91)).toBe(6000);
      expect(alt('diamond', 3.91, 6500, 10).currentIsValid).toBe(true);
      expect(alt('platinum', 3.91, 6500, 10).currentIsValid).toBe(true);
      for (const t of ['gold', 'silver', 'bronze'] as TierId[]) {
        const a = alt(t, 3.91, 6500, 10);
        expect(a.currentMeetsBrightness, t).toBe(false);
        expect(['fleet', 'none', 'pitch'], t).not.toContain(a.kind);
      }
    });

    it('lo sforzo è il rapporto con il tetto reale della combinazione, quindi cambia con la Selection', () => {
      const d = stimaPotenzaDaPassoNit(3.91, 4500, 32, 0.35, 18, true, datoCatalogo('diamond', 3.91));
      const b = stimaPotenzaDaPassoNit(3.91, 4500, 32, 0.35, 18, true, datoCatalogo('bronze', 3.91));
      expect(d.sforzoPercent).toBe(50);
      expect(b.sforzoPercent).toBe(100);
      expect(d.maxPhysicalNits).toBe(9000);
      expect(b.maxPhysicalNits).toBe(4500);
    });

    it('P2.9 a 8.000 nit non è mai "il passo giusto", in nessuna Selection e a nessuna distanza', () => {
      for (const t of TIER_IDS) {
        for (const dist of [5, 10, 20, 40]) {
          const a = alt(t, 2.9, 8000, dist);
          expect(a.currentIsValid, t).toBe(false);
          expect(['fleet', 'none', 'pitch'], t).not.toContain(a.kind);
          expect(a.headline, t).not.toContain('passo giusto');
        }
      }
    });

    it('dato non disponibile: Silver P4.81 non è validabile e non eredita il valore di nessun altro', () => {
      const a = alt('silver', 4.81, 5000, 10);
      expect(a.kind).toBe('nodata');
      expect(a.currentHasData).toBe(false);
      expect(a.currentMaxNits).toBeNull();
      expect(a.currentIsValid).toBe(false);
      expect(a.headline).toContain('Dato non disponibile');
      // l'eventuale proposta è solo tra le combinazioni che il listino Silver copre davvero
      expect(passiDelTier('silver').map((r) => r.pitchMm)).toContain(a.proposed.pitchMm === 4.81 ? 3.91 : a.proposed.pitchMm);
      for (const v of a.validPitchesMm) expect(tettoListino('silver', v)).not.toBeNull();
    });

    it('Gold a 8.000 nit da 11 m: nessun passo Gold soddisfa entrambi, lo dice, propone il compromesso e indica la Selection in cui torna', () => {
      const a = alt('gold', 2.9, 8000, 10);
      expect(a.validPitchesMm).toEqual([]);
      expect(a.kind).toBe('compromise');
      expect(a.headline).toContain('Nessun passo disponibile');
      expect(a.headline).toContain('soddisfa entrambi i requisiti');
      // compromesso: il passo Gold più fitto che arriva davvero a 8.000 nit
      expect(a.proposed.pitchMm).toBe(7.81);
      expect(tettoListino('gold', a.proposed.pitchMm)).toBeGreaterThanOrEqual(8000);
      // Diamond P3.91 (9.000 nit) soddisfa entrambi: viene indicato, con il SUO dato
      expect(a.validInOtherTiers.map((r) => `${r.tier} ${r.pitchMm} ${r.maxNits}`)).toContain('diamond 3.91 9000');
      // applicando il compromesso il verdetto NON diventa positivo
      const dopo = alt('gold', 7.81, 8000, 10);
      expect(dopo.kind).toBe('compromise');
      expect(dopo.currentIsValid).toBe(false);
    });

    it('su ogni Selection × passo × nit × distanza: mai un verdetto positivo o una proposta che violi un requisito', () => {
      const passiProva = [...PASSI_CATALOGO, 2.6, 8, 10];
      for (const t of TIER_IDS) {
        for (const p of passiProva) {
          for (let nits = 2500; nits <= 20000; nits += 1250) {
            for (const dist of [3, 5, 10, 20, 25, 30, 40, 60, 100]) {
              const a = alt(t, p, nits, dist, 5, 4);
              const ctx = `${t} P${p} · ${nits} nit · ${dist} m → ${a.kind}`;
              const tetto = tettoListino(t, p);
              const positivo = a.kind === 'fleet' || a.kind === 'none' || a.kind === 'pitch';
              // 1. verdetto positivo solo se la combinazione scelta ha il dato e soddisfa tutto
              expect(positivo, ctx).toBe(a.currentIsValid);
              if (positivo) {
                expect(tetto, ctx).not.toBeNull();
                expect(nits, ctx).toBeLessThanOrEqual(tetto as number);
              }
              // 2. senza dato di listino non esiste verdetto diverso da "dato non disponibile"
              expect(a.kind === 'nodata', ctx).toBe(tetto === null);
              // 3. i passi validi sono solo combinazioni a listino di QUELLA Selection che arrivano ai nit
              for (const v of a.validPitchesMm) {
                expect(tettoListino(t, v), ctx).not.toBeNull();
                expect(nits, ctx).toBeLessThanOrEqual(tettoListino(t, v) as number);
              }
              // 4. una proposta diversa dalla scelta è sempre una combinazione a listino della stessa Selection,
              //    e fuori dal compromesso soddisfa entrambi i requisiti
              if (a.proposed.pitchMm !== a.current.pitchMm) {
                expect(tettoListino(t, a.proposed.pitchMm), ctx).not.toBeNull();
                if (a.kind !== 'compromise') expect(a.validPitchesMm, ctx).toContain(a.proposed.pitchMm);
              }
              // 5. il compromesso compare solo se nessun passo della Selection è valido, e lo dichiara
              if (a.kind === 'compromise') {
                expect(a.validPitchesMm.length, ctx).toBe(0);
                expect(a.headline, ctx).toContain('Nessun passo disponibile');
              }
              // 6. le altre Selection indicate soddisfano i nit con il PROPRIO dato
              for (const r of a.validInOtherTiers) {
                expect(r.tier, ctx).not.toBe(t);
                expect(tettoListino(r.tier, r.pitchMm), ctx).toBe(r.maxNits);
                expect(nits, ctx).toBeLessThanOrEqual(r.maxNits);
              }
            }
          }
        }
      }
    });
  });

  describe('Spento da software e Aegis Hink Premium P16', () => {
    it('assorbimento a schermo nero: 50 W/m² al P2.9, 25 W/m² dal P10 in su; 3 W/m² solo Aegis Hink (Diamond P16)', () => {
      expect(standbyWmqPerPasso(2.6)).toBe(50);
      expect(standbyWmqPerPasso(2.9)).toBe(50);
      expect(standbyWmqPerPasso(10)).toBe(25);
      // il dato di targa vale per la sola combinazione Diamond P16, non per il P16 delle altre Selection
      expect(standbyWmqPerPasso(16, 'diamond')).toBe(3);
      expect(standbyWmqPerPasso(16)).toBe(25);
      for (const t of ['platinum', 'gold', 'silver', 'bronze', 'essential'] as TierId[]) {
        expect(standbyWmqPerPasso(16, t), t).toBe(25);
      }
      expect(standbyWmqPerPasso(10.81, 'diamond')).toBe(25);
      const medi = [3.9, 4.8, 6.7, 8].map((p) => standbyWmqPerPasso(p));
      expect(medi).toEqual([...medi].sort((x, y) => y - x));
      expect(medi[0]).toBeLessThan(50);
      expect(medi[3]).toBeGreaterThan(25);
    });

    it('spento da software consuma solo l\'elettronica, giorno e notte', () => {
      const p = calcolaProfiloEnergetico(50, 0, 0, 0, 18, true, true, 0.35, 361, 50);
      expect(p.dayPowerWmq).toBe(50);
      expect(p.nightPowerWmq).toBe(50);
      expect(p.totalDailyKwh).toBeCloseTo((50 * 50 * 24) / 1000, 5);
    });

    it('Aegis Hink Premium (Diamond P16): 300 W/m² massimi a 20.000 nit, dato di targa', () => {
      const dato = datoCatalogo('diamond', 16);
      expect(dato?.maxNits).toBe(20000);
      const pieno = stimaPotenzaDaPassoNit(16, 20000, 32, 0.35, 18, true, dato);
      expect(pieno.pMaxWmq).toBe(300);
      expect(pieno.sforzoPercent).toBe(100);
      // a luminosità ridotta scala la sola parte LED: 12 W/m² di logica + 288 × 5.000/20.000
      const a5000 = stimaPotenzaDaPassoNit(16, 5000, 32, 0.35, 18, true, dato);
      expect(a5000.pMaxWmq).toBe(84);
      expect(a5000.sforzoPercent).toBe(25);
      // coerente con la scheda prodotto (~100 W/m² medi): a 20.000 nit con APL 30% → 3 + 0,30 × 300
      expect(calcolaPotenzaWmq({ apl: 0.30, lum: 1, pMax: pieno.pMaxWmq, pStandby: 3 })).toBeCloseTo(93, 0);
      // il P16 delle altre Selection NON eredita il dato di targa
      const gold = stimaPotenzaDaPassoNit(16, 9000, 32, 0.35, 18, true, datoCatalogo('gold', 16));
      expect(gold.pMaxWmq).not.toBe(300);
    });

    it('da 60 m di linea di vista il passo giusto è il P16, se la Selection ci arriva ai nit richiesti', () => {
      const alt = suggerisciAlternativa(9.81, 8000, 96, 0.30, 18, 0.35, 20, 57, 0, 'gold');
      expect(alt.recommendedPitchMm).toBe(16);
      expect(alt.kind).toBe('pitch');
      expect(alt.proposed.pitchMm).toBe(16);
    });
  });

  describe('Modalità Express · Proposta Alternativa', () => {
    it('P2.5 Gold a 6.000 nit visto da 10m: il P2.5 Gold si ferma a 4.500, propone il P3.91 Gold', () => {
      const alt = suggerisciAlternativa(2.5, 6000, 18, 0.30, 18, 0.35, 5, 10, 0, 'gold');
      expect(alt.hasAlternative).toBe(true);
      expect(alt.kind).toBe('brightness');
      expect(alt.currentIsValid).toBe(false);
      expect(alt.currentMeetsBrightness).toBe(false);
      expect(alt.currentMaxNits).toBe(4500);
      expect(alt.recommendedPitchMm).toBe(3.91);
      expect(alt.proposed.pitchMm).toBe(3.91);
      expect(alt.fleetMonitorExtraEur).toBeGreaterThan(0);
      expect(alt.reasons.length).toBeGreaterThanOrEqual(3);
      expect(alt.headline).toContain('P3.91');
      expect(alt.headline).toContain('Gold');
    });

    it('P3.91 Gold già ottimale per 10m a 5.000 nit: nessun cambio passo, propone solo Fleet Monitor', () => {
      const alt = suggerisciAlternativa(3.91, 5000, 18, 0.30, 18, 0.35, 5, 10, 0, 'gold');
      expect(alt.kind).toBe('fleet');
      expect(alt.currentIsValid).toBe(true);
      expect(alt.proposed.pitchMm).toBe(3.91);
      expect(alt.savingsEur).toBe(0);
      expect(alt.fleetMonitorExtraPercent).toBeGreaterThanOrEqual(50);
      // Percentuale, risparmio e bolletta residua devono tornare tra loro sulla bolletta mostrata
      expect(alt.fleetMonitorCostEur).toBe(alt.proposed.annualCostEur - alt.fleetMonitorExtraEur);
      expect(alt.fleetMonitorExtraPercent).toBe(Math.round((alt.fleetMonitorExtraEur / alt.proposed.annualCostEur) * 100));
    });

    it('P10.81 Gold visto da 5m: passo troppo largo, propone il P2.5 Gold dichiarando l\'energia in più', () => {
      const alt = suggerisciAlternativa(10.81, 4500, 18, 0.30, 18, 0.35, 3, 4, 0, 'gold');
      expect(alt.kind).toBe('coarse');
      expect(alt.proposed.pitchMm).toBe(2.5);
      expect(alt.savingsEur).toBe(0);
      expect(alt.extraCostEur).toBe(alt.proposed.annualCostEur - alt.current.annualCostEur);
      expect(alt.extraCostEur).toBeGreaterThan(0);
    });

    it('P10.81 Gold visto da 11m: non è "il passo giusto", serve il P3.91', () => {
      const alt = suggerisciAlternativa(10.81, 5000, 4, 0.30, 18, 0.35, 5, 10, 0, 'gold');
      expect(alt.kind).toBe('coarse');
      expect(alt.proposed.pitchMm).toBe(3.91);
      expect(alt.headline).toContain('troppo largo');
    });

    it('P9.81 Gold da autostrada (40m): sotto 1 arcminuto i diodi si fondono, il passo resta giusto', () => {
      const alt = suggerisciAlternativa(9.81, 5000, 32, 0.30, 18, 0.35, 8, 40, 0, 'gold');
      expect(alt.kind).toBe('fleet');
      expect(alt.proposed.pitchMm).toBe(9.81);
    });

    it('Distanza lunga (40m): dal P3.91 Gold propone il passo Gold più largo che resta pulito e regge i nit', () => {
      const alt = suggerisciAlternativa(3.91, 6000, 32, 0.30, 18, 0.35, 8, 40, 0, 'gold');
      expect(alt.kind).toBe('pitch');
      expect(alt.proposed.pitchMm).toBe(9.81);
      expect(alt.savingsPercent).toBeGreaterThan(30);
    });

    it('Distanza media (25m): dal P3.91 Gold propone il P6.67', () => {
      const alt = suggerisciAlternativa(3.91, 6000, 32, 0.30, 18, 0.35, 5, 24.5, 0, 'gold');
      expect(alt.lineOfSightDistM).toBeCloseTo(25, 0);
      expect(alt.proposed.pitchMm).toBe(6.67);
    });

    it('5x10 m con la base a 10 m, visto da 20 m a terra: la linea di vista si misura al centro (25 m), non alla base (22,4 m)', () => {
      const alt = suggerisciAlternativa(10.81, 5000, 50, 0.30, 18, 0.35, 10, 20, 10, 'gold');
      expect(alt.centerHeightM).toBe(15);
      expect(alt.lineOfSightDistM).toBeCloseTo(25.0, 1);
      expect(alt.lineOfSightBaseM).toBeCloseTo(22.4, 1);
      expect(alt.lineOfSightTopM).toBeCloseTo(28.3, 1);
      expect(alt.kind).toBe('coarse');
      expect(alt.proposed.pitchMm).toBe(6.67);
    });

    it('5x10 m con la base a 20 m di quota: il P10.81 Gold è largo visto da 10 m a terra, giusto da 30 m', () => {
      const vicino = suggerisciAlternativa(10.81, 5000, 50, 0.30, 18, 0.35, 20, 10, 10, 'gold');
      expect(vicino.lineOfSightDistM).toBeCloseTo(26.9, 1);
      expect(vicino.kind).toBe('coarse');
      // a 26,9 m l'occhio fonde fino a 7,83 mm: il P7.81 è il più largo che resta pulito
      expect(vicino.proposed.pitchMm).toBe(7.81);

      const lontano = suggerisciAlternativa(10.81, 5000, 50, 0.30, 18, 0.35, 20, 30, 10, 'gold');
      expect(lontano.lineOfSightDistM).toBeCloseTo(39.1, 1);
      expect(lontano.kind).toBe('fleet');
      expect(lontano.proposed.pitchMm).toBe(10.81);
    });
  });
});

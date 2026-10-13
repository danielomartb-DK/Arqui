/**
 * ARQ LAB — Motor de Modo Real x86
 * Implementa el cálculo de dirección física en modo real.
 * Dirección física = Segmento × 10h + Offset
 * 
 * Modelos soportados:
 *   '8086'  → 20 bits, desbordamiento con wrapping
 *   'a20'   → línea A20 habilitada, sin truncar
 */

'use strict';

const RealModeEngine = (() => {

  const MAX_SEG    = 0xFFFFn;   // 16-bit
  const MAX_OFFSET = 0xFFFFn;   // 16-bit
  const MASK_20    = 0xFFFFFn;  // 20 bits

  /**
   * Valida el segmento.
   * @param {BigInt} seg
   */
  function validateSegment(seg) {
    if (seg < 0n) throw { field: 'segmento', message: 'El segmento no puede ser negativo.' };
    if (seg > MAX_SEG) throw { field: 'segmento', message: `El segmento (${Utils.bigIntToHex(seg)}h) supera el máximo permitido (FFFFh).` };
  }

  /**
   * Valida el offset.
   * @param {BigInt} offset
   */
  function validateOffset(offset) {
    if (offset < 0n) throw { field: 'offset', message: 'El offset no puede ser negativo.' };
    if (offset > MAX_OFFSET) throw { field: 'offset', message: `El offset (${Utils.bigIntToHex(offset)}h) supera el máximo permitido (FFFFh).` };
  }

  /**
   * Calcula la dirección física en modo real.
   * @param {BigInt} seg      Segmento 0–FFFFh
   * @param {BigInt} offset   Offset 0–FFFFh
   * @param {string} model    '8086' | 'a20'
   * @returns {object}        Resultado con todos los pasos
   */
  function calculate(seg, offset, model = '8086') {
    validateSegment(seg);
    validateOffset(offset);

    const shifted  = seg << 4n;          // × 16 = desplazamiento izquierdo 4 bits
    const physical = shifted + offset;   // suma aritmética

    const over20   = physical > MASK_20;
    let   finalAddr;
    let   warning = null;

    if (model === '8086') {
      finalAddr = physical & MASK_20;   // wrapping de 20 bits
      if (over20) {
        warning = `La dirección aritmética (${Utils.bigIntToHex(physical, 5)}h) supera 1 MiB (20 bits). ` +
                  `En el modelo 8086 clásico se aplica desbordamiento: la dirección física resultante ` +
                  `usa solo los 20 bits inferiores (${Utils.bigIntToHex(finalAddr, 5)}h).`;
      }
    } else {
      // A20 habilitada
      finalAddr = physical;
      if (over20) {
        warning = `La dirección aritmética (${Utils.bigIntToHex(physical, 6)}h) supera 1 MiB. ` +
                  `Con la línea A20 habilitada, el acceso puede alcanzar la zona superior a 1 MiB ` +
                  `según la configuración de la plataforma. Esto no es una limitación universal.`;
      }
    }

    return {
      seg,
      offset,
      model,
      shifted,
      physicalArith: physical,
      finalAddr,
      over20,
      warning,
      // Cadenas formateadas
      segHex:          Utils.bigIntToHex(seg, 4),
      offsetHex:       Utils.bigIntToHex(offset, 4),
      shiftedHex:      Utils.bigIntToHex(shifted, 5),
      physicalArithHex:Utils.bigIntToHex(physical, 5),
      finalAddrHex:    Utils.bigIntToHex(finalAddr, 5),
      finalAddrDec:    Utils.bigIntToDec(finalAddr),
      // Binarios (20 bits para visualización)
      segBin:          Utils.bigIntToBin(seg, 16),
      offsetBin:       Utils.bigIntToBin(offset, 16),
      shiftedBin:      Utils.bigIntToBin(shifted, 20),
      finalAddrBin:    Utils.bigIntToBin(finalAddr, 20),
    };
  }

  /**
   * Pasos del modo aprendizaje.
   * @param {BigInt} seg
   * @param {BigInt} offset
   * @param {string} model
   * @returns {Array} Lista de pasos {titulo, descripcion, valorResaltado}
   */
  function getSteps(seg, offset, model = '8086') {
    const result = calculate(seg, offset, model);
    const steps  = [
      {
        titulo: 'Paso 1 — Identificar el segmento',
        descripcion: `El registro de segmento contiene el valor <code>${result.segHex}h</code> ` +
          `(${Utils.bigIntToDec(seg)} en decimal). En el modelo de memoria del 8086, ` +
          `este valor es la <strong>base del segmento en unidades de 16 bytes (párrafos)</strong>.`,
        valor: result.segHex,
        tipo: 'segmento',
      },
      {
        titulo: 'Paso 2 — Identificar el offset',
        descripcion: `El desplazamiento (offset) es <code>${result.offsetHex}h</code> ` +
          `(${Utils.bigIntToDec(offset)} en decimal). Indica la posición dentro del segmento ` +
          `a partir de la base calculada.`,
        valor: result.offsetHex,
        tipo: 'offset',
      },
      {
        titulo: 'Paso 3 — Multiplicar el segmento por 16 (desplazamiento de 4 bits)',
        descripcion: `<code>${result.segHex}h × 10h = ${result.shiftedHex}h</code><br>` +
          `Equivale a desplazar el valor del segmento 4 posiciones a la izquierda. ` +
          `El resultado (<code>${result.shiftedHex}h</code>) es la <strong>dirección base del segmento</strong> en el espacio de direcciones de 20 bits.`,
        valor: result.shiftedHex,
        tipo: 'base',
      },
      {
        titulo: 'Paso 4 — Sumar el offset',
        descripcion: `<code>${result.shiftedHex}h + ${result.offsetHex}h = ${result.physicalArithHex}h</code><br>` +
          `Se suma el desplazamiento a la base del segmento para obtener la dirección aritmética.`,
        valor: result.physicalArithHex,
        tipo: 'suma',
      },
    ];

    if (result.over20 && model === '8086') {
      steps.push({
        titulo: 'Paso 5 — Desbordamiento de 20 bits (wrapping)',
        descripcion: `La dirección aritmética <code>${result.physicalArithHex}h</code> supera los 20 bits (límite de 1 MiB). ` +
          `El procesador 8086 usa solo las 20 líneas de dirección inferiores: ` +
          `<code>${result.physicalArithHex}h AND FFFFFh = ${result.finalAddrHex}h</code>.`,
        valor: result.finalAddrHex,
        tipo: 'wrap',
      });
    } else if (result.over20 && model === 'a20') {
      steps.push({
        titulo: 'Paso 5 — Acceso por encima de 1 MiB',
        descripcion: `Con la línea A20 habilitada, la dirección <code>${result.physicalArithHex}h</code> puede ` +
          `acceder a regiones por encima de 1 MiB según la plataforma.`,
        valor: result.physicalArithHex,
        tipo: 'info',
      });
    }

    steps.push({
      titulo: result.over20 && model === '8086' ? 'Paso 6 — Dirección física final' : 'Paso 5 — Dirección física final',
      descripcion: `<strong>Dirección física = ${result.finalAddrHex}h</strong> (${result.finalAddrDec} en decimal).<br>` +
        `Esta es la dirección que el procesador presenta en sus líneas de bus para acceder a la memoria.`,
      valor: result.finalAddrHex,
      tipo: 'resultado',
    });

    return { steps, result };
  }

  return { calculate, getSteps, MAX_SEG, MAX_OFFSET };
})();

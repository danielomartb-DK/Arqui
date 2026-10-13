/**
 * ARQ LAB — Decodificador de Selectores x86
 * Implementa la estructura de 16 bits del selector de segmento.
 *
 *  15        3   2    1 0
 * [ ÍNDICE    | TI | RPL ]
 *
 * TI=0 → GDT, TI=1 → LDT
 * RPL = Requested Privilege Level (0–3)
 * Offset en tabla = Índice × 8
 */

'use strict';

const SelectorDecoder = (() => {

  /**
   * Decodifica un selector de 16 bits.
   * @param {BigInt} selectorVal  0n – FFFFn
   * @returns {object}
   */
  function decode(selectorVal) {
    if (selectorVal < 0n || selectorVal > 0xFFFFn) {
      throw new Error(`El selector (${Utils.bigIntToHex(selectorVal)}h) debe ser un valor de 16 bits (0000h–FFFFh).`);
    }

    const index  = Number(Utils.extractBits(selectorVal, 15, 3));   // bits 15–3
    const ti     = Number(Utils.getBit(selectorVal, 2));             // bit 2
    const rpl    = Number(Utils.extractBits(selectorVal, 1, 0));     // bits 1–0
    const offset = index * 8;                                        // bytes en la tabla
    const table  = ti === 0 ? 'GDT' : 'LDT';
    const isNull = selectorVal === 0n;

    return {
      raw:      selectorVal,
      rawHex:   Utils.bigIntToHex(selectorVal, 4),
      rawBin:   Utils.bigIntToBin(selectorVal, 16),
      index,
      ti,
      rpl,
      offset,
      table,
      isNull,
      // Representaciones
      indexHex: index.toString(16).toUpperCase().padStart(4, '0'),
      rplDesc:  rplDescription(rpl),
      tiDesc:   ti === 0 ? 'GDT (Global Descriptor Table)' : 'LDT (Local Descriptor Table)',
    };
  }

  function rplDescription(rpl) {
    const descs = [
      'Nivel 0 — Kernel (máximo privilegio)',
      'Nivel 1 — Servicios del SO',
      'Nivel 2 — Servicios adicionales',
      'Nivel 3 — Usuario (mínimo privilegio)',
    ];
    return descs[rpl] || 'Desconocido';
  }

  /**
   * Valida que el índice exista en una tabla (array de descriptores).
   * @param {object} sel   Resultado de decode()
   * @param {Array}  table Array de descriptores (objetos o null para entradas vacías)
   */
  function resolveInTable(sel, tableArr) {
    if (sel.isNull) {
      throw { type: 'null_selector', message: 'El selector nulo (0000h) no puede usarse para cargar la mayoría de los registros de segmento.' };
    }
    if (sel.index >= tableArr.length) {
      throw { type: 'out_of_table', message: `El índice ${sel.index} (${sel.indexHex}h) está fuera de la tabla ${sel.table} (${tableArr.length} entradas).` };
    }
    const entry = tableArr[sel.index];
    if (!entry) {
      throw { type: 'missing_entry', message: `La entrada ${sel.index} de la ${sel.table} no existe o está vacía.` };
    }
    return entry;
  }

  return { decode, resolveInTable };
})();

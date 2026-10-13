/**
 * ARQ LAB — Decodificador de Descriptores de Segmento x86
 *
 * Formato clásico de 64 bits (8 bytes):
 *   Bits  0–15 : Límite bajo        (limit_low)
 *   Bits 16–31 : Base baja          (base_low)
 *   Bits 32–39 : Base intermedia    (base_mid)
 *   Bits 40–43 : Tipo               (type)
 *   Bit     44 : S                  (descriptor type: 0=sistema, 1=código/datos)
 *   Bits 45–46 : DPL
 *   Bit     47 : P                  (presente)
 *   Bits 48–51 : Límite alto        (limit_high)
 *   Bit     52 : AVL
 *   Bit     53 : L                  (modo 64 bits)
 *   Bit     54 : D/B
 *   Bit     55 : G                  (granularidad)
 *   Bits 56–63 : Base alta          (base_high)
 */

'use strict';

const DescriptorDecoder = (() => {

  // Tipos para S=1 (código/datos)
  const DATA_TYPES = {
    0b0000: { name: 'Datos — Solo lectura',                    rw: false, exec: false, expand_down: false, accessed: false },
    0b0001: { name: 'Datos — Solo lectura, accedido',          rw: false, exec: false, expand_down: false, accessed: true  },
    0b0010: { name: 'Datos — Lectura/Escritura',               rw: true,  exec: false, expand_down: false, accessed: false },
    0b0011: { name: 'Datos — Lectura/Escritura, accedido',     rw: true,  exec: false, expand_down: false, accessed: true  },
    0b0100: { name: 'Datos — Solo lectura, expansión abajo',   rw: false, exec: false, expand_down: true,  accessed: false },
    0b0101: { name: 'Datos — Solo lectura, exp. abajo, acc.',  rw: false, exec: false, expand_down: true,  accessed: true  },
    0b0110: { name: 'Datos — Lect./Escr., expansión abajo',    rw: true,  exec: false, expand_down: true,  accessed: false },
    0b0111: { name: 'Datos — Lect./Escr., exp. abajo, acc.',   rw: true,  exec: false, expand_down: true,  accessed: true  },
    0b1000: { name: 'Código — Solo ejecución',                 rw: false, exec: true,  conform: false,     accessed: false },
    0b1001: { name: 'Código — Solo ejecución, accedido',       rw: false, exec: true,  conform: false,     accessed: true  },
    0b1010: { name: 'Código — Ejecución/Lectura',              rw: true,  exec: true,  conform: false,     accessed: false },
    0b1011: { name: 'Código — Ejecución/Lectura, accedido',    rw: true,  exec: true,  conform: false,     accessed: true  },
    0b1100: { name: 'Código — Solo eje., conforme',            rw: false, exec: true,  conform: true,      accessed: false },
    0b1101: { name: 'Código — Solo eje., conf., accedido',     rw: false, exec: true,  conform: true,      accessed: true  },
    0b1110: { name: 'Código — Eje./Lect., conforme',           rw: true,  exec: true,  conform: true,      accessed: false },
    0b1111: { name: 'Código — Eje./Lect., conf., accedido',    rw: true,  exec: true,  conform: true,      accessed: true  },
  };

  // Tipos para S=0 (sistema/puertas) — descripción simplificada para 32 bits
  const SYSTEM_TYPES = {
    0b0000: 'Reservado',
    0b0001: 'Descriptor TSS de 16 bits (disponible)',
    0b0010: 'Descriptor LDT',
    0b0011: 'Descriptor TSS de 16 bits (ocupado)',
    0b0100: 'Puerta de llamada de 16 bits',
    0b0101: 'Puerta de tarea',
    0b0110: 'Puerta de interrupción de 16 bits',
    0b0111: 'Puerta de trampa de 16 bits',
    0b1000: 'Reservado',
    0b1001: 'Descriptor TSS de 32 bits (disponible)',
    0b1010: 'Reservado',
    0b1011: 'Descriptor TSS de 32 bits (ocupado)',
    0b1100: 'Puerta de llamada de 32 bits',
    0b1101: 'Reservado',
    0b1110: 'Puerta de interrupción de 32 bits',
    0b1111: 'Puerta de trampa de 32 bits',
  };

  /**
   * Decodifica un descriptor de 64 bits.
   * @param {BigInt} raw64  Valor de 64 bits del descriptor
   * @returns {object}
   */
  function decode(raw64) {
    if (raw64 < 0n || raw64 > 0xFFFFFFFFFFFFFFFFn) {
      throw new Error('El descriptor debe ser un valor de 64 bits.');
    }

    // Extraer campos
    const limit_low  = Utils.extractBits(raw64,  15,  0);  // bits  0–15
    const base_low   = Utils.extractBits(raw64,  31, 16);  // bits 16–31
    const base_mid   = Utils.extractBits(raw64,  39, 32);  // bits 32–39
    const type       = Utils.extractBits(raw64,  43, 40);  // bits 40–43
    const S          = Utils.getBit(raw64,  44);            // bit  44
    const DPL        = Utils.extractBits(raw64,  46, 45);  // bits 45–46
    const P          = Utils.getBit(raw64,  47);            // bit  47
    const limit_high = Utils.extractBits(raw64,  51, 48);  // bits 48–51
    const AVL        = Utils.getBit(raw64,  52);            // bit  52
    const L          = Utils.getBit(raw64,  53);            // bit  53
    const DB         = Utils.getBit(raw64,  54);            // bit  54
    const G          = Utils.getBit(raw64,  55);            // bit  55
    const base_high  = Utils.extractBits(raw64,  63, 56);  // bits 56–63

    // Reconstruir base de 32 bits
    const base32 = (base_high << 24n) | (base_mid << 16n) | base_low;

    // Reconstruir límite de 20 bits
    const limit20 = (limit_high << 16n) | limit_low;

    // Calcular límite efectivo
    let effectiveLimit;
    if (G === 0n) {
      effectiveLimit = limit20;
    } else {
      effectiveLimit = (limit20 << 12n) | 0xFFFn;  // × 4096 + 4095
    }

    // Clasificar descriptor
    const typeNum = Number(type);
    const Snum    = Number(S);
    let classification, typeInfo;

    if (Snum === 1) {
      typeInfo = DATA_TYPES[typeNum] || { name: `Tipo desconocido (${typeNum})`, rw: false, exec: false };
      const isCode = (typeNum & 0b1000) !== 0;
      classification = isCode ? 'code' : 'data';
    } else {
      typeInfo = { name: SYSTEM_TYPES[typeNum] || `Tipo de sistema desconocido (${typeNum})` };
      classification = 'system';
    }

    const isPresent = P === 1n;

    return {
      raw64,
      rawHex:       Utils.bigIntToHex(raw64, 16),
      rawBin:       Utils.bigIntToBin(raw64, 64),
      // Campos crudos (BigInt)
      limit_low, base_low, base_mid,
      type, S, DPL, P,
      limit_high, AVL, L, DB, G,
      base_high,
      // Reconstruidos
      base32,
      limit20,
      effectiveLimit,
      // Interpretados
      typeNum,
      Snum,
      DPLnum:   Number(DPL),
      Pnum:     Number(P),
      AVLnum:   Number(AVL),
      Lnum:     Number(L),
      DBnum:    Number(DB),
      Gnum:     Number(G),
      // Cadenas
      base32Hex:          Utils.bigIntToHex(base32, 8),
      limit20Hex:         Utils.bigIntToHex(limit20, 5),
      effectiveLimitHex:  Utils.bigIntToHex(effectiveLimit, 8),
      effectiveLimitDec:  Utils.bigIntToDec(effectiveLimit),
      // Clasificación
      classification,   // 'code' | 'data' | 'system'
      typeInfo,
      isPresent,
      isCode:     classification === 'code',
      isData:     classification === 'data',
      isSystem:   classification === 'system',
      isExpandDown: classification === 'data' && typeInfo.expand_down,
      isConforming: classification === 'code' && typeInfo.conform,
      allowRead:   typeInfo.rw === true || (typeInfo.exec && typeInfo.rw),
      allowWrite:  classification === 'data' && typeInfo.rw === true,
      allowExec:   typeInfo.exec === true,
    };
  }

  /**
   * Comprueba si un offset es accesible dentro del descriptor para el registro indicado.
   * @param {object} desc    Resultado de decode()
   * @param {BigInt} offset  Desplazamiento a validar
   * @param {string} reg     'DS' | 'CS' | 'SS'
   * @returns {object}       { ok, error }
   */
  function checkAccess(desc, offset, reg) {
    if (!desc.isPresent) {
      return { ok: false, error: 'El segmento no está presente (P = 0). No se puede acceder.' };
    }

    if (desc.isSystem) {
      return { ok: false, error: `Un descriptor de sistema (S = 0, tipo: ${desc.typeInfo.name}) no puede cargarse en ${reg} como segmento ordinario.` };
    }

    // Comprobaciones según registro
    if (reg === 'CS') {
      if (!desc.isCode) return { ok: false, error: 'CS requiere un descriptor de segmento de código (bit 3 del tipo = 1).' };
    } else if (reg === 'SS') {
      if (!desc.isData) return { ok: false, error: 'SS requiere un descriptor de segmento de datos.' };
      if (!desc.allowWrite) return { ok: false, error: 'SS requiere un segmento de datos con permiso de escritura (tipo W = 1).' };
    } else if (reg === 'DS') {
      // DS puede cargar datos o código legible
      if (desc.isCode && !desc.allowRead) {
        return { ok: false, error: 'DS puede cargar un segmento de código solo si es legible (tipo R = 1).' };
      }
    }

    // Comprobación de límite
    const effLim = desc.effectiveLimit;
    if (desc.isExpandDown) {
      // Expansión hacia abajo: offset debe ser MAYOR que el límite y menor/igual al máximo
      const maxOffset = desc.DBnum === 1 ? 0xFFFFFFFFn : 0xFFFFn;
      if (offset <= effLim) {
        return { ok: false, error: `Acceso rechazado: en un segmento de datos expandible hacia abajo, el offset (${Utils.bigIntToHex(offset)}h) debe ser mayor que el límite efectivo (${desc.effectiveLimitHex}h).` };
      }
      if (offset > maxOffset) {
        return { ok: false, error: `Acceso rechazado: el offset (${Utils.bigIntToHex(offset)}h) supera el máximo (${Utils.bigIntToHex(maxOffset)}h) definido por D/B.` };
      }
    } else {
      // Expansión hacia arriba: offset debe ser ≤ límite efectivo
      if (offset > effLim) {
        return { ok: false, error: `Acceso rechazado: el offset (${Utils.bigIntToHex(offset)}h) supera el límite efectivo del segmento (${desc.effectiveLimitHex}h).` };
      }
    }

    return { ok: true, error: null };
  }

  /**
   * Calcula la dirección lineal.
   * @param {object} desc    decode()
   * @param {BigInt} offset
   * @param {string} reg     DS|CS|SS
   * @returns {object}
   */
  function calcLinear(desc, offset, reg) {
    const access = checkAccess(desc, offset, reg);
    if (!access.ok) throw { type: 'access_error', message: access.error };
    const linearAddr = desc.base32 + offset;
    return {
      desc,
      offset,
      reg,
      linearAddr,
      linearAddrHex: Utils.bigIntToHex(linearAddr, 8),
      linearAddrDec: Utils.bigIntToDec(linearAddr),
    };
  }

  return { decode, checkAccess, calcLinear, DATA_TYPES, SYSTEM_TYPES };
})();

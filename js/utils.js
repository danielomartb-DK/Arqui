/**
 * ARQ LAB — Utilidades de conversión y operaciones auxiliares
 * Usa BigInt para aritmética exacta en valores de 32+ bits
 */

'use strict';

const Utils = (() => {

  /**
   * Elimina prefijos/sufijos hex y espacios, normaliza a mayúsculas
   * Admite: 1000, 0x1000, 1000h
   */
  function normalizeHexStr(raw) {
    let s = raw.trim().toUpperCase();
    if (s.startsWith('0X')) s = s.slice(2);
    if (s.endsWith('H'))   s = s.slice(0, -1);
    return s;
  }

  /**
   * Convierte string hex (con o sin 0x/h) a BigInt.
   * Lanza Error con mensaje descriptivo si el formato es inválido.
   */
  function hexToBigInt(raw) {
    const s = normalizeHexStr(raw);
    if (s.length === 0) throw new Error('El valor hexadecimal está vacío.');
    if (!/^[0-9A-F]+$/.test(s)) throw new Error(`Caracteres no hexadecimales en "${raw}".`);
    return BigInt('0x' + s);
  }

  /**
   * Convierte string decimal a BigInt.
   * No acepta negativos, decimales ni caracteres extra.
   */
  function decToBigInt(raw) {
    const s = raw.trim();
    if (s.length === 0) throw new Error('El valor decimal está vacío.');
    if (!/^\d+$/.test(s)) throw new Error(`"${raw}" no es un número decimal válido.`);
    return BigInt(s);
  }

  /**
   * Convierte un BigInt a string hexadecimal en mayúsculas, relleno a `padLen` dígitos.
   */
  function bigIntToHex(n, padLen = 1) {
    if (n < 0n) throw new Error('No se admiten valores negativos para mostrar en hex.');
    return n.toString(16).toUpperCase().padStart(padLen, '0');
  }

  /**
   * Convierte un BigInt a string decimal.
   */
  function bigIntToDec(n) {
    return n.toString(10);
  }

  /**
   * Convierte un BigInt a string binario, relleno a `padLen` dígitos.
   */
  function bigIntToBin(n, padLen = 1) {
    return n.toString(2).padStart(padLen, '0');
  }

  /**
   * Convierte string binario (solo '0' y '1') a BigInt.
   * Lanza Error si la entrada contiene caracteres inválidos.
   */
  function binToBigInt(raw) {
    const s = raw.replace(/[\s\n\r]+/g, '');
    if (s.length === 0) throw new Error('La cadena binaria está vacía.');
    if (!/^[01]+$/.test(s)) throw new Error(`La entrada contiene caracteres distintos de 0 y 1: "${raw}".`);
    return BigInt('0b' + s);
  }

  /**
   * Parsea un valor según el formato indicado ('hex' | 'dec').
   * Retorna BigInt o lanza Error con mensaje.
   */
  function parseValue(raw, format) {
    if (!raw || raw.trim() === '') throw new Error('El campo no puede estar vacío.');
    return format === 'hex' ? hexToBigInt(raw) : decToBigInt(raw);
  }

  /**
   * Comprueba que n esté en [0, max] (BigInt).
   */
  function assertRange(n, max, label) {
    if (n < 0n) throw new Error(`${label} no puede ser negativo.`);
    if (n > max) throw new Error(`${label} (${bigIntToHex(n)}h) supera el máximo permitido (${bigIntToHex(max)}h).`);
  }

  /**
   * Extrae bits [hi..lo] de un BigInt (ambos inclusive).
   */
  function extractBits(value, hi, lo) {
    const mask = (1n << BigInt(hi - lo + 1)) - 1n;
    return (value >> BigInt(lo)) & mask;
  }

  /**
   * Bit único en posición pos de un BigInt.
   */
  function getBit(value, pos) {
    return (value >> BigInt(pos)) & 1n;
  }

  return {
    normalizeHexStr,
    hexToBigInt,
    decToBigInt,
    binToBigInt,
    bigIntToHex,
    bigIntToDec,
    bigIntToBin,
    parseValue,
    assertRange,
    extractBits,
    getBit,
  };
})();

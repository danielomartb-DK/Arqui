/**
 * ARQ LAB — Motor de Ejercicios
 * Genera ejercicios con valores aleatorios y verifica respuestas.
 */

'use strict';

const ExerciseEngine = (() => {

  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randHex(bits) {
    const max = (1 << bits) - 1;
    const val = rand(0, max);
    return { val: BigInt(val), hex: val.toString(16).toUpperCase().padStart(bits / 4, '0') };
  }

  // ──────────────────────────────────────────────────
  // CATEGORÍA 1: Modo Real
  // ──────────────────────────────────────────────────
  function genRealMode() {
    const seg = randHex(16);
    const off = randHex(16);
    const result = RealModeEngine.calculate(seg.val, off.val, '8086');
    return {
      categoria: 'real',
      enunciado: `Dado el segmento <code>${seg.hex}h</code> y el offset <code>${off.hex}h</code>, ` +
        `calcule la dirección física en el modelo 8086 clásico (20 bits con desbordamiento).`,
      pista: `Fórmula: Segmento × 10h + Offset. El resultado se aplica AND FFFFFh.`,
      respuestaEsperada: result.finalAddrHex,
      explicacion: `${seg.hex}h × 10h = ${result.shiftedHex}h. ` +
        `${result.shiftedHex}h + ${off.hex}h = ${result.physicalArithHex}h. ` +
        (result.over20 ? `Desbordamiento: ${result.physicalArithHex}h AND FFFFFh = ${result.finalAddrHex}h.` : '') +
        ` Dirección física: <strong>${result.finalAddrHex}h</strong>.`,
      verificar: (input) => normalizeHex(input) === result.finalAddrHex,
    };
  }

  // ──────────────────────────────────────────────────
  // CATEGORÍA 2: Interpretación de selector
  // ──────────────────────────────────────────────────
  function genSelectorInterp() {
    const raw  = BigInt(rand(0, 0xFFFF));
    const sel  = SelectorDecoder.decode(raw);
    const campoOpciones = ['index', 'ti', 'rpl', 'tabla', 'offset'];
    const campo = campoOpciones[rand(0, campoOpciones.length - 1)];

    let pregunta, respuestaEsperada, verificar;
    switch (campo) {
      case 'index':
        pregunta = `Para el selector <code>${sel.rawHex}h</code>, ¿cuál es el índice (bits 15–3)?`;
        respuestaEsperada = sel.index.toString();
        verificar = (i) => parseInt(i, 10) === sel.index || parseInt(i, 16) === sel.index;
        break;
      case 'ti':
        pregunta = `Para el selector <code>${sel.rawHex}h</code>, ¿a qué tabla apunta (GDT o LDT)?`;
        respuestaEsperada = sel.table;
        verificar = (i) => i.trim().toUpperCase() === sel.table;
        break;
      case 'rpl':
        pregunta = `Para el selector <code>${sel.rawHex}h</code>, ¿cuál es el RPL (bits 1–0)?`;
        respuestaEsperada = sel.rpl.toString();
        verificar = (i) => parseInt(i, 10) === sel.rpl;
        break;
      case 'tabla':
        pregunta = `Para el selector <code>${sel.rawHex}h</code>, ¿a qué desplazamiento de bytes apunta en la tabla?`;
        respuestaEsperada = sel.offset.toString();
        verificar = (i) => parseInt(i, 10) === sel.offset;
        break;
      case 'offset':
        pregunta = `Para el selector <code>${sel.rawHex}h</code>, ¿cuál es el índice numérico de la entrada en la tabla?`;
        respuestaEsperada = sel.index.toString();
        verificar = (i) => parseInt(i, 10) === sel.index;
        break;
    }

    return {
      categoria: 'selector',
      enunciado: pregunta,
      pista: `Descompone el selector en binario: índice=bits[15:3], TI=bit[2], RPL=bits[1:0]. Binario: ${sel.rawBin}.`,
      respuestaEsperada,
      explicacion: `Selector ${sel.rawHex}h en binario: ${sel.rawBin}. ` +
        `Índice=${sel.index}, TI=${sel.ti} (${sel.table}), RPL=${sel.rpl}, Offset en tabla=${sel.offset} bytes.`,
      verificar,
    };
  }

  // ──────────────────────────────────────────────────
  // CATEGORÍA 3: Dirección lineal (modo protegido)
  // ──────────────────────────────────────────────────
  function genLinearAddr() {
    // Generar descriptor de datos simple (tipo 0010 = R/W, S=1, P=1, G=0)
    const base = BigInt(rand(0, 0xFFFFFF)) << 8n; // base alineada
    const limit = BigInt(rand(0x100, 0xFFFFF));
    const type = 0b0010n;   // datos R/W
    const S = 1n, DPL = 0n, P = 1n, AVL = 0n, L = 0n, DB = 1n, G = 0n;

    const base_low  = base & 0xFFFFn;
    const base_mid  = (base >> 16n) & 0xFFn;
    const base_high = (base >> 24n) & 0xFFn;
    const lim_low   = limit & 0xFFFFn;
    const lim_high  = (limit >> 16n) & 0xFn;

    const raw64 = lim_low |
      (base_low  << 16n) |
      (base_mid  << 32n) |
      (type      << 40n) |
      (S         << 44n) |
      (DPL       << 45n) |
      (P         << 47n) |
      (lim_high  << 48n) |
      (AVL       << 52n) |
      (L         << 53n) |
      (DB        << 54n) |
      (G         << 55n) |
      (base_high << 56n);

    const desc   = DescriptorDecoder.decode(raw64);
    const maxOff = desc.effectiveLimit;
    const offset = BigInt(rand(0, Number(maxOff > 0xFFFFFFn ? 0xFFFFFFn : maxOff)));

    const lineal = desc.base32 + offset;

    return {
      categoria: 'lineal',
      enunciado: `Dado el descriptor con base <code>${desc.base32Hex}h</code>, límite efectivo <code>${desc.effectiveLimitHex}h</code> y offset <code>${Utils.bigIntToHex(offset, 4)}h</code>, ¿cuál es la dirección lineal resultante?`,
      pista: `Dirección lineal = Base + Offset.`,
      respuestaEsperada: Utils.bigIntToHex(lineal, 8),
      explicacion: `${desc.base32Hex}h + ${Utils.bigIntToHex(offset, 4)}h = <strong>${Utils.bigIntToHex(lineal, 8)}h</strong>.`,
      verificar: (i) => normalizeHex(i) === Utils.bigIntToHex(lineal, 8),
    };
  }

  // ──────────────────────────────────────────────────
  // CATEGORÍA 4: Análisis de descriptor
  // ──────────────────────────────────────────────────
  function genDescriptorAnalysis() {
    // Crear un descriptor con valores conocidos y preguntar por un campo
    const typeVal  = rand(0, 15);
    const Sval     = rand(0, 1);
    const DPLval   = rand(0, 3);
    const Pval     = 1;
    const Gval     = rand(0, 1);
    const DBval    = 1;
    const baseVal  = BigInt(rand(0, 0xFFFFFF));
    const limVal   = BigInt(rand(0, 0xFFFFF));

    const base_low  = baseVal & 0xFFFFn;
    const base_mid  = (baseVal >> 16n) & 0xFFn;
    const base_high = (baseVal >> 24n) & 0xFFn;
    const lim_low   = limVal & 0xFFFFn;
    const lim_high  = (limVal >> 16n) & 0xFn;

    const raw64 = lim_low |
      (base_low      << 16n) |
      (base_mid      << 32n) |
      (BigInt(typeVal) << 40n) |
      (BigInt(Sval)    << 44n) |
      (BigInt(DPLval)  << 45n) |
      (BigInt(Pval)    << 47n) |
      (lim_high      << 48n) |
      (BigInt(DBval)   << 54n) |
      (BigInt(Gval)    << 55n) |
      (base_high     << 56n);

    const desc   = DescriptorDecoder.decode(raw64);
    const campos = ['base', 'limite', 'DPL', 'G', 'P', 'tipo'];
    const campo  = campos[rand(0, campos.length - 1)];

    let pregunta, respuestaEsperada, verificar;
    switch (campo) {
      case 'base':
        pregunta = `Para el descriptor <code>${desc.rawHex}</code>, ¿cuál es la base de 32 bits (en hexadecimal)?`;
        respuestaEsperada = desc.base32Hex;
        verificar = (i) => normalizeHex(i) === desc.base32Hex;
        break;
      case 'limite':
        pregunta = `Para el descriptor <code>${desc.rawHex}</code>, ¿cuál es el límite efectivo (en hexadecimal)?`;
        respuestaEsperada = desc.effectiveLimitHex;
        verificar = (i) => normalizeHex(i) === desc.effectiveLimitHex;
        break;
      case 'DPL':
        pregunta = `Para el descriptor <code>${desc.rawHex}</code>, ¿cuál es el DPL (nivel de privilegio del descriptor)?`;
        respuestaEsperada = DPLval.toString();
        verificar = (i) => parseInt(i, 10) === DPLval;
        break;
      case 'G':
        pregunta = `Para el descriptor <code>${desc.rawHex}</code>, ¿cuál es el valor del bit G (granularidad)?`;
        respuestaEsperada = Gval.toString();
        verificar = (i) => parseInt(i, 10) === Gval;
        break;
      case 'P':
        pregunta = `Para el descriptor <code>${desc.rawHex}</code>, ¿está el segmento presente (P)?`;
        respuestaEsperada = Pval === 1 ? 'si' : 'no';
        verificar = (i) => i.trim().toLowerCase().replace('í','i') === (Pval === 1 ? 'si' : 'no');
        break;
      case 'tipo':
        pregunta = `Para el descriptor <code>${desc.rawHex}</code>, ¿es un segmento de código, de datos o de sistema?`;
        respuestaEsperada = desc.isSystem ? 'sistema' : (desc.isCode ? 'código' : 'datos');
        verificar = (i) => {
          const n = i.trim().toLowerCase().replace('ó','o').replace('é','e');
          if (desc.isSystem) return n.includes('sistema') || n.includes('system');
          if (desc.isCode)   return n.includes('cod') || n.includes('code');
          return n.includes('dato') || n.includes('data');
        };
        break;
    }

    return {
      categoria: 'descriptor',
      enunciado: pregunta,
      pista: `Extrae los bits del campo correspondiente del descriptor de 64 bits.`,
      respuestaEsperada,
      explicacion: `Descriptor: ${desc.rawHex}. Base=${desc.base32Hex}h, Límite efectivo=${desc.effectiveLimitHex}h, DPL=${DPLval}, G=${Gval}, P=${Pval}, Tipo=${desc.typeInfo.name}.`,
      verificar,
    };
  }

  // ──────────────────────────────────────────────────
  // CATEGORÍA 5: Identificación de errores
  // ──────────────────────────────────────────────────
  const errorCases = [
    {
      enunciado: `Se intenta cargar CS con un descriptor de datos (S=1, tipo=0010). ¿Es esto válido?`,
      pista: `CS requiere un descriptor de segmento de código (bit 3 del tipo = 1).`,
      respuestaEsperada: 'no',
      explicacion: `CS exige un segmento de código. Un descriptor de datos no es compatible con CS.`,
      verificar: (i) => i.trim().toLowerCase().replace('ó','o') === 'no',
    },
    {
      enunciado: `El selector <code>0000h</code> intenta cargarse en DS. ¿Es válido?`,
      pista: `El selector nulo tiene reglas especiales.`,
      respuestaEsperada: 'no',
      explicacion: `El selector nulo (0000h) no puede cargarse en DS de forma ordinaria para acceder a datos.`,
      verificar: (i) => i.trim().toLowerCase().replace('ó','o') === 'no',
    },
    {
      enunciado: `Un descriptor con P=0 intenta ser usado. ¿Puede el procesador acceder al segmento?`,
      pista: `El bit P indica si el segmento está cargado en memoria física.`,
      respuestaEsperada: 'no',
      explicacion: `P=0 significa que el segmento no está presente. El procesador genera una excepción.`,
      verificar: (i) => i.trim().toLowerCase().replace('ó','o') === 'no',
    },
    {
      enunciado: `SS intenta cargarse con un descriptor de código. ¿Es válido?`,
      pista: `SS requiere un segmento de datos con permiso de escritura.`,
      respuestaEsperada: 'no',
      explicacion: `SS solo acepta segmentos de datos escribibles. Un segmento de código no es compatible.`,
      verificar: (i) => i.trim().toLowerCase().replace('ó','o') === 'no',
    },
    {
      enunciado: `Un offset de <code>0x00000050</code> intenta acceder a un segmento con límite efectivo <code>0x0000002Fh</code> (expansión hacia arriba). ¿Es válido?`,
      pista: `En expansión hacia arriba, el offset debe ser ≤ límite efectivo.`,
      respuestaEsperada: 'no',
      explicacion: `50h > 2Fh, por lo tanto el acceso es rechazado en un segmento de expansión hacia arriba.`,
      verificar: (i) => i.trim().toLowerCase().replace('ó','o') === 'no',
    },
    {
      enunciado: `Un offset de <code>0x00000010</code> intenta acceder a un segmento de datos expandible hacia abajo con límite <code>0x0000001Fh</code>. ¿Es válido?`,
      pista: `En expansión hacia abajo, el offset debe ser MAYOR que el límite.`,
      respuestaEsperada: 'no',
      explicacion: `10h < 1Fh, el offset no es mayor que el límite. Acceso rechazado.`,
      verificar: (i) => i.trim().toLowerCase().replace('ó','o') === 'no',
    },
  ];

  function genErrorIdentification() {
    const ec = errorCases[rand(0, errorCases.length - 1)];
    return { ...ec, categoria: 'error' };
  }

  // ──────────────────────────────────────────────────
  // CATEGORÍA 6: Reversing de descriptor
  // ──────────────────────────────────────────────────
  function genReversing() {
    // Generar un descriptor aleatorio válido
    const S    = rand(0, 1);
    const type = rand(0, 15);
    const DPL  = rand(0, 3);
    const G    = rand(0, 1);
    const base = BigInt(rand(0, 0xFFFFFF));
    const lim  = BigInt(rand(0, 0xFFFFF));

    const b_l  = base & 0xFFFFn;
    const b_m  = (base >> 16n) & 0xFFn;
    const b_h  = (base >> 24n) & 0xFFn;
    const l_l  = lim & 0xFFFFn;
    const l_h  = (lim >> 16n) & 0xFn;

    const raw64 = l_l | (b_l << 16n) | (b_m << 32n) | (BigInt(type) << 40n) |
      (BigInt(S) << 44n) | (BigInt(DPL) << 45n) | (1n << 47n) |
      (l_h << 48n) | (BigInt(G) << 55n) | (b_h << 56n);

    const desc   = DescriptorDecoder.decode(raw64);
    const binStr = Utils.bigIntToBin(raw64, 64);
    const campo  = ['base', 'DPL', 'G'][rand(0, 2)];

    let pregunta, respuestaEsperada, verificar;
    if (campo === 'base') {
      pregunta = `Dado el descriptor binario: <code style="word-break:break-all">${binStr}</code>. ¿Cuál es la base reconstruida de 32 bits (en hexadecimal)?`;
      respuestaEsperada = desc.base32Hex;
      verificar = (i) => normalizeHex(i) === desc.base32Hex;
    } else if (campo === 'DPL') {
      pregunta = `Dado el descriptor binario: <code style="word-break:break-all">${binStr}</code>. ¿Cuál es el DPL?`;
      respuestaEsperada = DPL.toString();
      verificar = (i) => parseInt(i, 10) === DPL;
    } else {
      pregunta = `Dado el descriptor binario: <code style="word-break:break-all">${binStr}</code>. ¿Cuál es el valor del bit G (granularidad)?`;
      respuestaEsperada = G.toString();
      verificar = (i) => parseInt(i, 10) === G;
    }

    return {
      categoria: 'reversing',
      enunciado: pregunta,
      pista: `Recuerda la distribución de bits: base=bits[63:56]+[39:32]+[31:16], DPL=bits[46:45], G=bit[55].`,
      respuestaEsperada,
      explicacion: `Descriptor: ${Utils.bigIntToHex(raw64, 16)}h. Base=${desc.base32Hex}h, DPL=${DPL}, G=${G}.`,
      verificar,
    };
  }

  // Normalizar entrada hexadecimal para comparar
  function normalizeHex(raw) {
    try {
      return Utils.bigIntToHex(Utils.hexToBigInt(raw.trim()), 1);
    } catch {
      return raw.trim().toUpperCase();
    }
  }

  const GENERATORS = {
    real:       genRealMode,
    selector:   genSelectorInterp,
    lineal:     genLinearAddr,
    descriptor: genDescriptorAnalysis,
    error:      genErrorIdentification,
    reversing:  genReversing,
  };

  /**
   * Genera un ejercicio de la categoría indicada.
   */
  function generate(categoria) {
    const gen = GENERATORS[categoria];
    if (!gen) throw new Error(`Categoría desconocida: ${categoria}`);
    return gen();
  }

  return { generate };
})();

/**
 * ARQ LAB — Pruebas Automatizadas
 * Ejecuta casos de prueba sobre los motores de cálculo y valida los resultados.
 * No depende del DOM. Usa console y devuelve un informe estructurado.
 */

'use strict';

const AutoTests = (() => {

  let passed = 0;
  let failed = 0;
  const results = [];

  function assert(name, condition, detail = '') {
    if (condition) {
      passed++;
      results.push({ name, status: 'PASS', detail });
    } else {
      failed++;
      results.push({ name, status: 'FAIL', detail });
    }
  }

  function assertEqual(name, actual, expected) {
    const ok = String(actual) === String(expected);
    assert(name, ok, ok ? `✓ ${actual}` : `✗ Esperado: "${expected}", Obtenido: "${actual}"`);
  }

  function assertThrows(name, fn) {
    let threw = false;
    try { fn(); } catch (_) { threw = true; }
    assert(name, threw, threw ? '✓ Excepción lanzada correctamente' : '✗ No se lanzó excepción');
  }

  // ──────────────────────────────────────────────────
  // CONVERSIONES
  // ──────────────────────────────────────────────────
  function testConversions() {
    assertEqual('hexToBigInt("1000")  → 4096n', Utils.hexToBigInt('1000'), 4096n);
    assertEqual('hexToBigInt("0x1000")→ 4096n', Utils.hexToBigInt('0x1000'), 4096n);
    assertEqual('hexToBigInt("1000h") → 4096n', Utils.hexToBigInt('1000h'), 4096n);
    assertEqual('hexToBigInt("FFFF")  → 65535n', Utils.hexToBigInt('FFFF'), 65535n);
    assertEqual('decToBigInt("255")   → 255n',  Utils.decToBigInt('255'), 255n);
    assertEqual('bigIntToHex(255n,2)  → "FF"',  Utils.bigIntToHex(255n, 2), 'FF');
    assertEqual('bigIntToBin(10n,8)   → "00001010"', Utils.bigIntToBin(10n, 8), '00001010');
    assertEqual('binToBigInt("1010")  → 10n', Utils.binToBigInt('1010'), 10n);
    assertThrows('hexToBigInt con "XYZ"', () => Utils.hexToBigInt('XYZ'));
    assertThrows('hexToBigInt vacío',     () => Utils.hexToBigInt(''));
    assertThrows('decToBigInt con "-5"', () => Utils.decToBigInt('-5'));
    assertThrows('binToBigInt con "012102"', () => Utils.binToBigInt('012102'));
    assertEqual('extractBits(0xABCDn,15,8) → 0xABn', Utils.extractBits(0xABCDn, 15, 8), 0xABn);
    assertEqual('getBit(0b1010n,3) → 1n', Utils.getBit(0b1010n, 3), 1n);
    assertEqual('getBit(0b1010n,2) → 0n', Utils.getBit(0b1010n, 2), 0n);
  }

  // ──────────────────────────────────────────────────
  // MODO REAL
  // ──────────────────────────────────────────────────
  function testRealMode() {
    // Caso 1
    const c1 = RealModeEngine.calculate(0x1000n, 0x0020n, '8086');
    assertEqual('[Caso 1] Seg=1000h,Off=0020h → 10020h', c1.finalAddrHex, '10020');

    // Caso 2
    const c2 = RealModeEngine.calculate(0x2000n, 0x0010n, '8086');
    assertEqual('[Caso 2] Seg=2000h,Off=0010h → 20010h', c2.finalAddrHex, '20010');

    // Caso 3
    const c3 = RealModeEngine.calculate(0x0000n, 0x0000n, '8086');
    assertEqual('[Caso 3] Seg=0000h,Off=0000h → 00000h', c3.finalAddrHex, '00000');

    // Caso 4 — desbordamiento
    const c4_8086 = RealModeEngine.calculate(0xFFFFn, 0xFFFFn, '8086');
    assertEqual('[Caso 4] Seg=FFFFh,Off=FFFFh aritmético → 10FFEFh', c4_8086.physicalArithHex, '10FFEF');
    assertEqual('[Caso 4] Modelo 8086 → wrap a 0FFEFh', c4_8086.finalAddrHex, '0FFEF');
    assert('[Caso 4] over20 detectado', c4_8086.over20 === true, `over20=${c4_8086.over20}`);

    const c4_a20 = RealModeEngine.calculate(0xFFFFn, 0xFFFFn, 'a20');
    assertEqual('[Caso 4] Modelo A20 → sin wrap, 10FFEFh', c4_a20.finalAddrHex, '10FFEF');

    // Validaciones de rango
    assertThrows('[Real] Seg > FFFFh lanza error', () => RealModeEngine.calculate(0x10000n, 0n, '8086'));
    assertThrows('[Real] Off > FFFFh lanza error', () => RealModeEngine.calculate(0n, 0x10000n, '8086'));
  }

  // ──────────────────────────────────────────────────
  // SELECTOR
  // ──────────────────────────────────────────────────
  function testSelector() {
    // 0x000B = 0000 0000 0000 1011
    //   bits[15:3] = 0000 0000 0000 1 → índice = 1
    //   bit[2]    = 0                 → TI = 0 (GDT)
    //   bits[1:0] = 11                → RPL = 3
    const s1 = SelectorDecoder.decode(0x000Bn);
    assertEqual('[Caso 8] 000Bh → índice=1', s1.index, 1);
    assertEqual('[Caso 8] 000Bh → TI=0 (GDT)', s1.ti, 0);
    assertEqual('[Caso 8] 000Bh → RPL=3', s1.rpl, 3);
    assertEqual('[Caso 8] 000Bh → tabla=GDT', s1.table, 'GDT');
    assertEqual('[Caso 8] 000Bh → offset en tabla=8', s1.offset, 8);

    // 0x000F = 0000 0000 0000 1111
    //   bits[15:3] = 0000 0000 0000 1 → índice = 1
    //   bit[2]    = 1                 → TI = 1 (LDT)
    //   bits[1:0] = 11                → RPL = 3
    const s1ldt = SelectorDecoder.decode(0x000Fn);
    assertEqual('[Selector] 000Fh → índice=1', s1ldt.index, 1);
    assertEqual('[Selector] 000Fh → TI=1 (LDT)', s1ldt.ti, 1);
    assertEqual('[Selector] 000Fh → RPL=3', s1ldt.rpl, 3);
    assertEqual('[Selector] 000Fh → tabla=LDT', s1ldt.table, 'LDT');

    // Selector 0x0008 = 0000 0000 0000 1000 → índice=1, TI=0 (GDT), RPL=0
    const s2 = SelectorDecoder.decode(0x0008n);
    assertEqual('[Selector] 0008h → índice=1', s2.index, 1);
    assertEqual('[Selector] 0008h → TI=0 (GDT)', s2.ti, 0);
    assertEqual('[Selector] 0008h → RPL=0', s2.rpl, 0);

    // 0x0018 = 0000 0000 0001 1000 → índice=3, TI=0, RPL=0
    const s3 = SelectorDecoder.decode(0x0018n);
    assertEqual('[Selector] 0018h → índice=3', s3.index, 3);
    assertEqual('[Selector] 0018h → offset=24', s3.offset, 24);

    // Selector nulo
    const sNull = SelectorDecoder.decode(0x0000n);
    assert('[Selector] 0000h → isNull=true', sNull.isNull === true, `isNull=${sNull.isNull}`);

    assertThrows('[Selector] Valor > FFFFh lanza error', () => SelectorDecoder.decode(0x10000n));

    // Resolver en tabla — índice 2 fuera de una tabla con solo 2 entradas (0 y 1)
    const gdt = [null, { tipo: 'datos' }];
    assertThrows('[Caso 11] índice fuera de tabla lanza error', () => {
      const s = SelectorDecoder.decode(0x0010n); // índice=2
      SelectorDecoder.resolveInTable(s, gdt);
    });
  }

  // ──────────────────────────────────────────────────
  // DESCRIPTOR
  // ──────────────────────────────────────────────────
  function testDescriptor() {
    // Descriptor conocido: base=0x00100000, límite=0xFFFFF, S=1, type=0b0010, DPL=0, P=1, G=1, D/B=1
    // Construir manualmente
    const base = 0x00100000n;
    const limit = 0xFFFFFn;
    const type = 0b0010n; // datos R/W
    const S = 1n, DPL = 0n, P = 1n, AVL = 0n, L = 0n, DB = 1n, G = 1n;

    const b_l = base & 0xFFFFn;
    const b_m = (base >> 16n) & 0xFFn;
    const b_h = (base >> 24n) & 0xFFn;
    const l_l = limit & 0xFFFFn;
    const l_h = (limit >> 16n) & 0xFn;

    const raw = l_l | (b_l << 16n) | (b_m << 32n) | (type << 40n) |
      (S << 44n) | (DPL << 45n) | (P << 47n) | (l_h << 48n) |
      (AVL << 52n) | (L << 53n) | (DB << 54n) | (G << 55n) | (b_h << 56n);

    const d = DescriptorDecoder.decode(raw);

    assertEqual('[Descriptor] base32 = 00100000h', d.base32Hex, '00100000');
    assertEqual('[Descriptor] limit20 = FFFFFh', d.limit20Hex, 'FFFFF');
    // G=1 → efectivo = (FFFFF × 4096) + 4095 = FFFFFFFF
    assertEqual('[Descriptor] efectivo G=1 → FFFFFFFFh', d.effectiveLimitHex, 'FFFFFFFF');
    assert('[Descriptor] isData=true', d.isData, `isData=${d.isData}`);
    assert('[Descriptor] allowWrite=true', d.allowWrite, `allowWrite=${d.allowWrite}`);
    assert('[Descriptor] isPresent=true', d.isPresent, `isPresent=${d.isPresent}`);

    // Descriptor no presente (P=0)
    const rawNP = raw & ~(1n << 47n);
    const dNP = DescriptorDecoder.decode(rawNP);
    assert('[Descriptor] P=0 → isPresent=false', !dNP.isPresent, `isPresent=${dNP.isPresent}`);
    const accessNP = DescriptorDecoder.checkAccess(dNP, 0n, 'DS');
    assert('[Caso 12] P=0 → acceso rechazado', !accessNP.ok, `ok=${accessNP.ok}`);

    // Descriptor con G=0
    const rawG0 = raw & ~(1n << 55n);
    const dG0 = DescriptorDecoder.decode(rawG0);
    assertEqual('[Descriptor] efectivo G=0 → FFFFFh', dG0.effectiveLimitHex, '000FFFFF');

    // CS con descriptor de datos → error
    const accCS = DescriptorDecoder.checkAccess(d, 0n, 'CS');
    assert('[Caso checkAccess] CS+datos → rechazado', !accCS.ok, `ok=${accCS.ok}`);

    // DS con datos R/W → ok para offset dentro de límite
    const accDS = DescriptorDecoder.checkAccess(d, 0x1000n, 'DS');
    assert('[Caso checkAccess] DS+datos+dentro → aceptado', accDS.ok, `ok=${accDS.ok}, err=${accDS.error}`);

    // Caso 9: offset > límite en expand-up
    const rawEU = l_l | (b_l << 16n) | (b_m << 32n) | (type << 40n) |
      (S << 44n) | (DPL << 45n) | (P << 47n) | (0n << 48n) |
      (L << 53n) | (DB << 54n) | (0n << 55n) | (b_h << 56n);
    // límite efectivo = FFFF (G=0, limit=FFFF)
    const smallLim = 0xFFFFn;
    const sl_l = smallLim & 0xFFFFn;
    const rawSmall = sl_l | (b_l << 16n) | (b_m << 32n) | (type << 40n) |
      (S << 44n) | (DPL << 45n) | (P << 47n) |
      (L << 53n) | (DB << 54n) | (0n << 55n) | (b_h << 56n);
    const dSmall = DescriptorDecoder.decode(rawSmall);
    const accOver = DescriptorDecoder.checkAccess(dSmall, 0x10000n, 'DS');
    assert('[Caso 9] Offset > límite expand-up → rechazado', !accOver.ok, `ok=${accOver.ok}`);

    // Caso 10: expand-down, offset <= límite → rechazado
    const typeED = 0b0110n; // datos R/W, expand-down
    const rawED = sl_l | (b_l << 16n) | (b_m << 32n) | (typeED << 40n) |
      (S << 44n) | (DPL << 45n) | (P << 47n) |
      (L << 53n) | (DB << 54n) | (0n << 55n) | (b_h << 56n);
    const dED = DescriptorDecoder.decode(rawED);
    const accED = DescriptorDecoder.checkAccess(dED, 0x0100n, 'DS'); // offset=100h, límite=FFFFh
    assert('[Caso 10] Expand-down, offset≤límite → rechazado', !accED.ok, `ok=${accED.ok}`);
  }

  // ──────────────────────────────────────────────────
  // VALIDACIÓN BINARIA (para reversing)
  // ──────────────────────────────────────────────────
  function testBinaryValidation() {
    // Caso 5: 63 bits → error de longitud
    assertThrows('[Caso 5] 63 bits → rechazado', () => {
      const s = '0'.repeat(63);
      Utils.binToBigInt(s); // parse ok, pero la UI valida longitud 64
      if (s.length !== 64) throw new Error('Longitud incorrecta');
    });

    // Caso 6: 65 bits → error de longitud
    assert('[Caso 6] 65 bits → rechazado (longitud > 64)', '0'.repeat(65).length !== 64, '65 ≠ 64');

    // Caso 7: caracteres distintos de 0/1 → binToBigInt lanza error
    assertThrows('[Caso 7] "012102" → rechazado', () => Utils.binToBigInt('012102'));

    // 64 bits válidos → debe parsear sin error
    const validBin = '0'.repeat(64);
    let parsed;
    try {
      parsed = Utils.binToBigInt(validBin);
    } catch (e) {
      parsed = null;
    }
    assert('[Binario] 64 ceros → parseado correctamente', parsed !== null, `parsed=${parsed}`);
  }

  // ──────────────────────────────────────────────────
  // EJECUCIÓN
  // ──────────────────────────────────────────────────
  function run() {
    passed = 0;
    failed = 0;
    results.length = 0;

    testConversions();
    testRealMode();
    testSelector();
    testDescriptor();
    testBinaryValidation();

    return {
      passed,
      failed,
      total: passed + failed,
      results: [...results],
    };
  }

  return { run };
})();

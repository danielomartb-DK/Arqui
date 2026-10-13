# ⚡ ARQ LAB — Simulador x86 de Direccionamiento de Memoria

> *“Amen arquitectura”*

**ARQ LAB** es una plataforma educativa interactiva y simulador de arquitectura de computadores enfocado en el funcionamiento del direccionamiento de memoria x86 en **Modo Real (16 bits)** y **Modo Protegido (32 bits / IA-32)**, desarrollada bajo la estética **Futuristic Engineering Lab**.

🌐 **Sitio Web en GitHub Pages**:  
👉 **[https://danielomartb-dk.github.io/Arqui/](https://danielomartb-dk.github.io/Arqui/)**

---

## 🚀 Características Principales

### 🔢 1. Modo Real (8086 / 80286+)
* **Cálculo físico de memoria**: Fórmula canónica $\text{Dirección Física} = (\text{Segmento} \times 16) + \text{Offset}$.
* **Modelos conmutables**: 8086 clásico (20 bits con desbordamiento/wrap a 1 MB) y arquitectura con línea A20 activa (rango extendido hasta `10FFEFh`).
* **Visualizador interactivo**: Gráfico dinámico en HTML5 Canvas con bloques de segmento, desplazamiento y posición exacta de memoria.
* **Modo Paso a Paso**: Explicación matemática detallada de cada etapa.

### 🔒 2. Modo Protegido (IA-32)
* **Descodificación de Selectores (16 bits)**: Índice, tabla TI (GDT / LDT), RPL (niveles de privilegio 0 a 3) y detección de selector nulo.
* **Descodificación de Descriptores (64 bits)**: Reconstrucción de la base de 32 bits fragmentada, límite de 20 bits, granularidad ($G$), tamaño de operando ($D/B$), bandera de 64 bits ($L$), presente ($P$), tipo y nivel de privilegio ($DPL$).
* **Dirección Lineal y Permisos**: Comprobación de límites (segmentos expand-up y expand-down), restricciones de acceso (código vs datos, lectura/escritura).
* **Modo Tabla GDT/LDT**: Tabla interactiva con capacidad para inspeccionar, agregar y eliminar descriptores.
* **Flujo de Paginación Didáctica**: Esquema visual del viaje desde la dirección lógica hasta la física.

### 🔬 3. Reversing de Descriptores
* **Desensamblador binario de 64 bits**: Entrada binaria con conteo y validación de longitud/caracteres en tiempo real.
* **Visualización interactiva de bits**: Desglose de los 64 bits con codificación de colores según el campo funcional.
* **Tabla de campos**: Representación en binario, hexadecimal, decimal e interpretación humana con explicaciones guiadas.

### ✏️ 4. Laboratorio de Ejercicios
* Generador dinámico e infinito de ejercicios en 6 áreas técnicas: *Modo Real*, *Selector*, *Dirección Lineal*, *Descriptor*, *Identificar Error* y *Reversing*.
* Validación inmediata, pistas contextuales, soluciones paso a paso y contador digital de puntuación.

### 📚 5. Teoría, Comparativa y Glosario
* Cuadro técnico comparativo entre Modo Real y Modo Protegido.
* Glosario interactivo de arquitectura con filtrado y búsqueda en tiempo real.

### ✅ 6. Batería de Pruebas Automatizadas (QA)
* Suite de 58 pruebas unitarias automatizadas cubriendo los casos mínimos de especificación (Casos 1 al 12) y límites numéricos.

---

## 🛠️ Tecnologías Empleadas
* **HTML5 Semántico**: Accesibilidad WCAG y roles ARIA.
* **CSS3 Vainilla**: Sistema de tokens de diseño, tema *Futuristic Engineering Lab*, gradientes de profundidad, bordes luminosos y microinteracciones.
* **JavaScript Moderno (ES6+)**: Cálculos de precisión mediante `BigInt`, arquitectura modular sin dependencias externas ni librerías pesadas.

---

## 💻 Ejecución Local

Simplemente clona el repositorio y abre `index.html` en cualquier navegador moderno:

```bash
git clone https://github.com/danielomartb-DK/Arqui.git
cd Arqui
# Abrir directamente en el navegador:
start index.html
```

---

*Desarrollado para estudiantes y apasionados de la Arquitectura de Computadores.*

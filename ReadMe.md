# 🏦 Simulador de Economía Multiplayer


Un simulador económico en tiempo real que permite a jugadores humanos y bots con IA competir en un mercado virtual dinámico. Incluye conceptos avanzados de economía comportamental, ciclos económicos, y estrategias de trading automatizadas.


## 🌟 Características Principales

### 🎯 **Nivel Básico**
- ✅ **Comercio Multiplayer**: Hasta 20+ jugadores simultáneos
- ✅ **Mercado Dinámico**: 4 recursos (agua, comida, energía, materiales)
- ✅ **Bots Inteligentes**: 5 estrategias diferentes de trading
- ✅ **Leaderboard en Tiempo Real**: Rankings actualizados automáticamente
- ✅ **Sistema de Precios**: Algoritmo de oferta y demanda

### 📊 **Nivel Intermedio**
- ✅ **Ciclos Económicos**: Expansión → Pico → Contracción → Valle
- ✅ **Eventos de Mercado**: Sequías, cosechas, descubrimientos, etc.
- ✅ **Behavioral Economics**: Bots con personalidades y sesgos cognitivos
- ✅ **Estrategias de IA**: Momentum, Contrarian, Value, Arbitrage, Hoarder
- ✅ **Análisis Técnico**: Gráficas de precios en tiempo real

### 🔬 **Nivel Avanzado** (En Desarrollo)
- 🚧 **Detección de Carteles**: Algoritmos para identificar manipulación
- 🚧 **Política Monetaria**: Banco central automatizado
- 🚧 **Modelos Macroeconómicos**: Simulación de PIB, inflación, empleo
- 🚧 **Game Theory**: Teoría de juegos aplicada a política fiscal
- 🚧 **Crisis Económicas**: Simulación de recesiones y burbujas

## 🚀 Instalación Rápida

### Prerrequisitos
- Node.js 18+ 
- npm o yarn
- Navegador web moderno

### Configuración
```bash
# Clonar repositorio
git clone https://github.com/tuusuario/simulador-economia.git
cd simulador-economia

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev
```

### Acceso
- **Servidor**: http://localhost:3000
- **API**: http://localhost:3000/api/game-info

## 📁 Estructura del Proyecto

```
simulador-economia/
├── 📂 server/              # Backend Node.js
│   ├── app.js             # Servidor principal con Socket.io
│   ├── bots.js            # Sistema de bots con IA
│   ├── models.js          # Modelos de base de datos
│   └── analytics.js       # Sistema de métricas avanzadas
├── 📂 client/             # Frontend web
│   └── index.html         # Interfaz de usuario completa
├── 📂 shared/             # Código compartido
│   └── constants.js       # Constantes del juego
├── package.json           # Configuración y dependencias
├── database.sqlite        # Base de datos (auto-generada)
└── README.md             # Esta documentación
```

## 🎮 Cómo Jugar

### Para Jugadores Humanos
1. **Únete**: Ingresa tu nombre y entra al juego
2. **Observa**: Analiza precios, oferta y demanda de recursos
3. **Comercia**: Compra bajo, vende alto
4. **Estrategia**: Considera ciclos económicos y eventos de mercado
5. **Compite**: Alcanza el #1 en valor neto total

### Controles
- **Comprar**: Selecciona cantidad → Botón "Comprar"
- **Vender**: Selecciona cantidad → Botón "Vender"  
- **Actualizar Leaderboard**: Botón "Actualizar"
- **Gráficas**: Visualización automática de tendencias

## 🤖 Sistema de Bots

### Estrategias Implementadas

| Bot | Estrategia | Descripción |
|-----|-----------|-------------|
| **Conservative** | Value Investing | Compra barato, vende caro, bajo riesgo |
| **Aggressive** | Momentum Trading | Sigue tendencias, alto riesgo/recompensa |
| **Contrarian** | Counter-Trend | Va contra la multitud, oportunista |
| **Arbitrageur** | Market Efficiency | Explota desequilibrios de precio |
| **Hoarder** | Resource Accumulation | Acumula recursos específicos |

### Características de los Bots
- **Personalidad Única**: Cada bot tiene tolerancia al riesgo diferente
- **Memoria de Precios**: Recuerdan historial para tomar decisiones
- **Sesgos Cognitivos**: Simulan overconfidence, loss aversion, etc.
- **Adaptabilidad**: Ajustan estrategia según condiciones de mercado

## 📈 Conceptos Económicos

### Microeconomía
- **Ley de Oferta y Demanda**: Los precios se ajustan automáticamente
- **Elasticidad**: Diferentes recursos reaccionan de forma distinta
- **Arbitraje**: Oportunidades de ganancia por diferencias de precio

### Macroeconomía  
- **Ciclos Económicos**: Simulación de fases económicas reales
- **Eventos Exógenos**: Shocks externos que afectan mercados
- **Política Monetaria**: (Próximamente) Banco central automatizado

### Behavioral Economics
- **Racionalidad Limitada**: Los bots no siempre toman decisiones óptimas
- **Herding Behavior**: Tendencia a seguir al grupo
- **Anchoring Bias**: Influencia de precios históricos en decisiones

## 🛠️ Tecnologías Utilizadas

### Backend
- **Node.js** + **Express**: Servidor HTTP
- **Socket.io**: Comunicación en tiempo real
- **SQLite** + **Sequelize**: Base de datos y ORM
- **Lodash**: Utilidades funcionales

### Frontend
- **HTML5/CSS3/JavaScript**: Interfaz nativa
- **Chart.js**: Visualización de datos
- **Socket.io Client**: Comunicación con servidor

### DevOps
- **Nodemon**: Desarrollo en hot-reload
- **Concurrently**: Ejecutar múltiples procesos

## 📊 API Endpoints

### REST API
```bash
GET /api/game-info          # Información general del juego
GET /api/market-analytics   # Métricas de mercado
GET /api/player/{id}/stats  # Estadísticas de jugador
```

### WebSocket Events
```javascript
// Cliente → Servidor
socket.emit('register', { name: 'Player1' })
socket.emit('trade', { action: 'buy', resource: 'agua', quantity: 10 })
socket.emit('get_leaderboard')

// Servidor → Cliente  
socket.on('market_update', (marketData) => {})
socket.on('bot_action', (botAction) => {})
socket.on('economic_tick', (tickData) => {})
```

## 🎯 Roadmap de Desarrollo

### Versión 1.0 (Actual)
- [x] Sistema básico de comercio
- [x] Bots con IA básica
- [x] Ciclos económicos
- [x] Interface web responsive

### Versión 1.5 (Próximamente)
- [ ] Sistema de carteles y detección
- [ ] Política monetaria automatizada
- [ ] Análisis técnico avanzado
- [ ] Sistema de reputación

### Versión 2.0 (Futuro)
- [ ] Modelos macroeconómicos completos
- [ ] Machine Learning para predicciones
- [ ] Modo torneo competitivo
- [ ] API pública para desarrolladores

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Aquí hay varias formas de ayudar:

### 💡 Ideas de Contribución
- **Nuevas estrategias de bots** con diferentes algoritmos
- **Eventos de mercado** más realistas y complejos
- **Indicadores técnicos** adicionales (MACD, Fibonacci, etc.)
- **Mejoras de UI/UX** para la experiencia de usuario
- **Tests automatizados** para garantizar calidad
- **Documentación** y tutoriales

### 🔧 Proceso de Desarrollo
1. Fork el repositorio
2. Crea una rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

### 🐛 Reportar Bugs
Usa GitHub Issues con:
- Descripción clara del problema
- Pasos para reproducir
- Comportamiento esperado vs actual
- Screenshots si aplica

## 📚 Recursos Educativos

### Economía
- [Principles of Economics - Mankiw](https://www.cengage.com/c/principles-of-economics-8e-mankiw)
- [Behavioral Economics - Thaler](https://www.amazon.com/Nudge-Improving-Decisions-Health-Happiness/dp/014311526X)
- [Technical Analysis - Murphy](https://www.amazon.com/Technical-Analysis-Financial-Markets-Comprehensive/dp/0735200661)

### Programación
- [Node.js Documentation](https://nodejs.org/docs/)
- [Socket.io Guide](https://socket.io/docs/v4/)
- [Chart.js Documentation](https://www.chartjs.org/docs/)

## 👥 Equipo

- **Desarrollador Principal**: [ErozDilan](https://github.com/EroZDilan/)



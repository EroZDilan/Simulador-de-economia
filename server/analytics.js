// server/analytics.js
const { PriceHistory, Transaction, Player, MarketEvent } = require('./models');
const { Sequelize, Op } = require('sequelize');

class MarketAnalytics {
    constructor() {
        this.indicators = {};
        this.predictions = {};
        this.riskMetrics = {};
        this.cartelDetection = {};
    }

    // Calcular indicadores técnicos
    async calculateTechnicalIndicators(resource, periods = 20) {
        try {
            const priceData = await PriceHistory.findAll({
                where: { resource: resource },
                order: [['tick', 'DESC']],
                limit: periods
            });

            if (priceData.length < 10) return null;

            const prices = priceData.map(p => p.price).reverse();
            const volumes = priceData.map(p => p.supply + p.demand).reverse();

            const indicators = {
                resource: resource,
                currentPrice: prices[prices.length - 1],
                sma: this.calculateSMA(prices, 10),
                ema: this.calculateEMA(prices, 10),
                rsi: this.calculateRSI(prices, 14),
                bollinger: this.calculateBollingerBands(prices, 20),
                macd: this.calculateMACD(prices),
                momentum: this.calculateMomentum(prices, 10),
                volatility: this.calculateVolatility(prices),
                trendStrength: this.calculateTrendStrength(prices),
                supportResistance: this.calculateSupportResistance(prices),
                volume: volumes[volumes.length - 1],
                volumeMA: this.calculateSMA(volumes, 10)
            };

            this.indicators[resource] = indicators;
            return indicators;
        } catch (error) {
            console.error('Error calculando indicadores técnicos:', error);
            return null;
        }
    }

    // Media Móvil Simple
    calculateSMA(prices, period) {
        if (prices.length < period) return null;
        const slice = prices.slice(-period);
        return slice.reduce((sum, price) => sum + price, 0) / period;
    }

    // Media Móvil Exponencial
    calculateEMA(prices, period) {
        if (prices.length < period) return null;
        
        const multiplier = 2 / (period + 1);
        let ema = prices[0];
        
        for (let i = 1; i < prices.length; i++) {
            ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
        }
        
        return ema;
    }

    // Índice de Fuerza Relativa
    calculateRSI(prices, period = 14) {
        if (prices.length <= period) return 50;
        
        let gains = 0, losses = 0;
        
        for (let i = 1; i <= period; i++) {
            const change = prices[prices.length - i] - prices[prices.length - i - 1];
            if (change > 0) gains += change;
            else losses -= change;
        }
        
        const avgGain = gains / period;
        const avgLoss = losses / period;
        
        if (avgLoss === 0) return 100;
        
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    // Bandas de Bollinger
    calculateBollingerBands(prices, period = 20, stdDev = 2) {
        if (prices.length < period) return null;
        
        const sma = this.calculateSMA(prices, period);
        const slice = prices.slice(-period);
        
        const variance = slice.reduce((sum, price) => {
            return sum + Math.pow(price - sma, 2);
        }, 0) / period;
        
        const standardDeviation = Math.sqrt(variance);
        
        return {
            upper: sma + (standardDeviation * stdDev),
            middle: sma,
            lower: sma - (standardDeviation * stdDev)
        };
    }

    // MACD (Moving Average Convergence Divergence)
    calculateMACD(prices) {
        const ema12 = this.calculateEMA(prices, 12);
        const ema26 = this.calculateEMA(prices, 26);
        
        if (!ema12 || !ema26) return null;
        
        const macdLine = ema12 - ema26;
        
        // Calcular signal line (EMA 9 del MACD)
        const macdHistory = [];
        for (let i = 26; i < prices.length; i++) {
            const slice = prices.slice(0, i + 1);
            const ema12 = this.calculateEMA(slice, 12);
            const ema26 = this.calculateEMA(slice, 26);
            if (ema12 && ema26) {
                macdHistory.push(ema12 - ema26);
            }
        }
        
        const signalLine = this.calculateEMA(macdHistory, 9);
        const histogram = signalLine ? macdLine - signalLine : 0;
        
        return {
            macd: macdLine,
            signal: signalLine,
            histogram: histogram
        };
    }

    // Momentum
    calculateMomentum(prices, period = 10) {
        if (prices.length <= period) return 0;
        
        const current = prices[prices.length - 1];
        const past = prices[prices.length - 1 - period];
        
        return ((current - past) / past) * 100;
    }

    // Volatilidad
    calculateVolatility(prices, period = 20) {
        if (prices.length < period) return 0;
        
        const slice = prices.slice(-period);
        const returns = [];
        
        for (let i = 1; i < slice.length; i++) {
            returns.push((slice[i] - slice[i - 1]) / slice[i - 1]);
        }
        
        const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const variance = returns.reduce((sum, ret) => {
            return sum + Math.pow(ret - avgReturn, 2);
        }, 0) / returns.length;
        
        return Math.sqrt(variance) * Math.sqrt(period); // Anualizada
    }

    // Fuerza de tendencia
    calculateTrendStrength(prices) {
        if (prices.length < 10) return 0;
        
        const recent = prices.slice(-10);
        let upMoves = 0, downMoves = 0;
        
        for (let i = 1; i < recent.length; i++) {
            if (recent[i] > recent[i - 1]) upMoves++;
            else if (recent[i] < recent[i - 1]) downMoves++;
        }
        
        return (upMoves - downMoves) / (recent.length - 1);
    }

    // Soporte y Resistencia
    calculateSupportResistance(prices) {
        if (prices.length < 20) return { support: 0, resistance: 0 };
        
        const recentPrices = prices.slice(-20);
        const localMaxima = [];
        const localMinima = [];
        
        for (let i = 1; i < recentPrices.length - 1; i++) {
            if (recentPrices[i] > recentPrices[i - 1] && recentPrices[i] > recentPrices[i + 1]) {
                localMaxima.push(recentPrices[i]);
            }
            if (recentPrices[i] < recentPrices[i - 1] && recentPrices[i] < recentPrices[i + 1]) {
                localMinima.push(recentPrices[i]);
            }
        }
        
        const resistance = localMaxima.length > 0 ? 
            localMaxima.reduce((sum, max) => sum + max, 0) / localMaxima.length : 
            Math.max(...recentPrices);
            
        const support = localMinima.length > 0 ? 
            localMinima.reduce((sum, min) => sum + min, 0) / localMinima.length : 
            Math.min(...recentPrices);
        
        return { support, resistance };
    }

    // Detección de carteles y manipulación
    async detectCartelActivity(timeWindow = 50) {
        try {
            const recentTransactions = await Transaction.findAll({
                where: {
                    tick: {
                        [Op.gte]: timeWindow
                    }
                },
                include: [{ model: Player }],
                order: [['tick', 'DESC']]
            });

            const cartelSignals = {};
            const resources = ['agua', 'comida', 'energia', 'materiales'];

            for (let resource of resources) {
                const resourceTransactions = recentTransactions.filter(t => t.resource === resource);
                
                const signals = {
                    priceManipulation: this.detectPriceManipulation(resourceTransactions),
                    coordinatedTrading: this.detectCoordinatedTrading(resourceTransactions),
                    volumeAnomalies: this.detectVolumeAnomalies(resourceTransactions),
                    timingPatterns: this.detectSuspiciousTimingPatterns(resourceTransactions),
                    riskScore: 0
                };

                // Calcular score de riesgo total
                signals.riskScore = (
                    signals.priceManipulation.score * 0.3 +
                    signals.coordinatedTrading.score * 0.4 +
                    signals.volumeAnomalies.score * 0.2 +
                    signals.timingPatterns.score * 0.1
                );

                cartelSignals[resource] = signals;
            }

            this.cartelDetection = cartelSignals;
            return cartelSignals;
        } catch (error) {
            console.error('Error detectando carteles:', error);
            return {};
        }
    }

    // Detectar manipulación de precios
    detectPriceManipulation(transactions) {
        if (transactions.length < 10) return { detected: false, score: 0, details: [] };

        const priceChanges = [];
        const volumeSpikes = [];
        
        for (let i = 1; i < transactions.length; i++) {
            const priceChange = Math.abs(
                (transactions[i].price - transactions[i-1].price) / transactions[i-1].price
            );
            priceChanges.push(priceChange);
            
            if (transactions[i].quantity > transactions[i-1].quantity * 3) {
                volumeSpikes.push(i);
            }
        }

        const avgPriceChange = priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length;
        const extremeChanges = priceChanges.filter(change => change > avgPriceChange * 3).length;
        
        const manipulationScore = Math.min(
            (extremeChanges / priceChanges.length) + (volumeSpikes.length / transactions.length),
            1
        );

        return {
            detected: manipulationScore > 0.3,
            score: manipulationScore,
            details: {
                extremePriceChanges: extremeChanges,
                volumeSpikes: volumeSpikes.length,
                avgPriceChange: avgPriceChange
            }
        };
    }

    // Detectar trading coordinado
    detectCoordinatedTrading(transactions) {
        if (transactions.length < 5) return { detected: false, score: 0, details: [] };

        const playerGroups = {};
        const timeWindows = {};

        transactions.forEach(tx => {
            if (!playerGroups[tx.playerId]) {
                playerGroups[tx.playerId] = [];
            }
            playerGroups[tx.playerId].push(tx);

            const timeKey = Math.floor(tx.tick / 5) * 5; // Ventanas de 5 ticks
            if (!timeWindows[timeKey]) {
                timeWindows[timeKey] = [];
            }
            timeWindows[timeKey].push(tx);
        });

        let coordinationScore = 0;
        const suspiciousPatterns = [];

        // Buscar patrones de trading simultáneo
        Object.values(timeWindows).forEach(window => {
            if (window.length >= 3) {
                const sameAction = window.filter(tx => tx.type === window[0].type).length;
                if (sameAction / window.length > 0.8) {
                    coordinationScore += 0.2;
                    suspiciousPatterns.push({
                        type: 'simultaneous_trading',
                        tick: window[0].tick,
                        participants: window.length
                    });
                }
            }
        });

        return {
            detected: coordinationScore > 0.4,
            score: Math.min(coordinationScore, 1),
            details: suspiciousPatterns
        };
    }

    // Detectar anomalías de volumen
    detectVolumeAnomalies(transactions) {
        if (transactions.length < 10) return { detected: false, score: 0, details: [] };

        const volumes = transactions.map(tx => tx.quantity);
        const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
        const volumeStdDev = Math.sqrt(
            volumes.reduce((sum, vol) => sum + Math.pow(vol - avgVolume, 2), 0) / volumes.length
        );

        const anomalies = transactions.filter(tx => {
            return Math.abs(tx.quantity - avgVolume) > volumeStdDev * 2;
        });

        const anomalyScore = anomalies.length / transactions.length;

        return {
            detected: anomalyScore > 0.2,
            score: anomalyScore,
            details: {
                totalAnomalies: anomalies.length,
                avgVolume: avgVolume,
                anomalyThreshold: volumeStdDev * 2
            }
        };
    }

    // Detectar patrones de tiempo sospechosos
    detectSuspiciousTimingPatterns(transactions) {
        if (transactions.length < 5) return { detected: false, score: 0, details: [] };

        const timingGaps = [];
        for (let i = 1; i < transactions.length; i++) {
            timingGaps.push(transactions[i].tick - transactions[i-1].tick);
        }

        // Buscar patrones muy regulares (posible automatización)
        const gapCounts = {};
        timingGaps.forEach(gap => {
            gapCounts[gap] = (gapCounts[gap] || 0) + 1;
        });

        const mostCommonGap = Object.keys(gapCounts).reduce((a, b) => 
            gapCounts[a] > gapCounts[b] ? a : b
        );

        const regularityScore = gapCounts[mostCommonGap] / timingGaps.length;

        return {
            detected: regularityScore > 0.6,
            score: regularityScore,
            details: {
                mostCommonGap: parseInt(mostCommonGap),
                frequency: gapCounts[mostCommonGap],
                totalGaps: timingGaps.length
            }
        };
    }

    // Predicciones de mercado usando regresión lineal simple
    async generateMarketPredictions(resource, periods = 5) {
        try {
            const priceData = await PriceHistory.findAll({
                where: { resource: resource },
                order: [['tick', 'ASC']],
                limit: 50
            });

            if (priceData.length < 10) return null;

            const prices = priceData.map(p => p.price);
            const ticks = priceData.map((p, i) => i);

            // Regresión lineal simple
            const n = prices.length;
            const sumX = ticks.reduce((a, b) => a + b, 0);
            const sumY = prices.reduce((a, b) => a + b, 0);
            const sumXY = ticks.reduce((sum, x, i) => sum + x * prices[i], 0);
            const sumXX = ticks.reduce((sum, x) => sum + x * x, 0);

            const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
            const intercept = (sumY - slope * sumX) / n;

            // Generar predicciones
            const predictions = [];
            const lastTick = Math.max(...ticks);
            
            for (let i = 1; i <= periods; i++) {
                const predictedPrice = intercept + slope * (lastTick + i);
                predictions.push({
                    tick: lastTick + i,
                    predictedPrice: Math.max(1, predictedPrice),
                    confidence: Math.max(0.1, 1 - (i * 0.15)) // Confianza decrece con el tiempo
                });
            }

            const trend = slope > 0 ? 'bullish' : slope < 0 ? 'bearish' : 'neutral';
            const strength = Math.abs(slope) > 1 ? 'strong' : Math.abs(slope) > 0.5 ? 'moderate' : 'weak';

            this.predictions[resource] = {
                trend: trend,
                strength: strength,
                slope: slope,
                predictions: predictions,
                lastUpdate: new Date()
            };

            return this.predictions[resource];
        } catch (error) {
            console.error('Error generando predicciones:', error);
            return null;
        }
    }

    // Métricas de riesgo del mercado
    async calculateRiskMetrics() {
        try {
            const resources = ['agua', 'comida', 'energia', 'materiales'];
            const riskMetrics = {};

            for (let resource of resources) {
                const indicators = await this.calculateTechnicalIndicators(resource);
                if (!indicators) continue;

                // VaR (Value at Risk) simplificado
                const var95 = this.calculateVaR(resource, 0.95);
                const var99 = this.calculateVaR(resource, 0.99);

                // Beta del recurso (correlación con mercado general)
                const beta = await this.calculateBeta(resource);

                // Sharpe Ratio simplificado
                const sharpeRatio = this.calculateSharpeRatio(resource);

                riskMetrics[resource] = {
                    volatility: indicators.volatility,
                    var95: var95,
                    var99: var99,
                    beta: beta,
                    sharpeRatio: sharpeRatio,
                    riskLevel: this.categorizeRisk(indicators.volatility)
                };
            }

            this.riskMetrics = riskMetrics;
            return riskMetrics;
        } catch (error) {
            console.error('Error calculando métricas de riesgo:', error);
            return {};
        }
    }

    // Calcular VaR simplificado
    async calculateVaR(resource, confidence) {
        try {
            const priceData = await PriceHistory.findAll({
                where: { resource: resource },
                order: [['tick', 'DESC']],
                limit: 50
            });

            if (priceData.length < 10) return 0;

            const returns = [];
            for (let i = 1; i < priceData.length; i++) {
                const returnRate = (priceData[i-1].price - priceData[i].price) / priceData[i].price;
                returns.push(returnRate);
            }

            returns.sort((a, b) => a - b);
            const index = Math.floor((1 - confidence) * returns.length);
            
            return returns[index] || 0;
        } catch (error) {
            console.error('Error calculando VaR:', error);
            return 0;
        }
    }

    // Calcular Beta (correlación con mercado)
    async calculateBeta(resource) {
        try {
            // Simplificado: comparar con precio promedio de todos los recursos
            const allPrices = await PriceHistory.findAll({
                order: [['tick', 'DESC']],
                limit: 200
            });

            const resourcePrices = allPrices.filter(p => p.resource === resource);
            if (resourcePrices.length < 10) return 1;

            // Calcular correlación básica (simplificada)
            const resourceReturns = [];
            const marketReturns = [];

            for (let i = 1; i < Math.min(resourcePrices.length, 20); i++) {
                const resourceReturn = (resourcePrices[i-1].price - resourcePrices[i].price) / resourcePrices[i].price;
                resourceReturns.push(resourceReturn);

                // Market return como promedio de todos los recursos en ese tick
                const tickPrices = allPrices.filter(p => p.tick === resourcePrices[i].tick);
                if (tickPrices.length >= 2) {
                    const avgPrice = tickPrices.reduce((sum, p) => sum + p.price, 0) / tickPrices.length;
                    const prevTickPrices = allPrices.filter(p => p.tick === resourcePrices[i-1].tick);
                    if (prevTickPrices.length >= 2) {
                        const prevAvgPrice = prevTickPrices.reduce((sum, p) => sum + p.price, 0) / prevTickPrices.length;
                        const marketReturn = (avgPrice - prevAvgPrice) / prevAvgPrice;
                        marketReturns.push(marketReturn);
                    }
                }
            }

            if (resourceReturns.length < 5 || marketReturns.length < 5) return 1;

            // Calcular covarianza y varianza del mercado
            const resourceMean = resourceReturns.reduce((a, b) => a + b, 0) / resourceReturns.length;
            const marketMean = marketReturns.reduce((a, b) => a + b, 0) / marketReturns.length;

            let covariance = 0;
            let marketVariance = 0;

            for (let i = 0; i < Math.min(resourceReturns.length, marketReturns.length); i++) {
                covariance += (resourceReturns[i] - resourceMean) * (marketReturns[i] - marketMean);
                marketVariance += Math.pow(marketReturns[i] - marketMean, 2);
            }

            covariance /= Math.min(resourceReturns.length, marketReturns.length);
            marketVariance /= marketReturns.length;

            return marketVariance === 0 ? 1 : covariance / marketVariance;
        } catch (error) {
            console.error('Error calculando Beta:', error);
            return 1;
        }
    }

    // Calcular Sharpe Ratio simplificado
    calculateSharpeRatio(resource) {
        // Simplificado: usar momentum como proxy del retorno
        const indicators = this.indicators[resource];
        if (!indicators) return 0;

        const returnProxy = indicators.momentum || 0;
        const volatility = indicators.volatility || 1;
        const riskFreeRate = 0.02; // 2% anual como proxy

        return (returnProxy - riskFreeRate) / volatility;
    }

    // Categorizar nivel de riesgo
    categorizeRisk(volatility) {
        if (volatility < 0.1) return 'low';
        if (volatility < 0.3) return 'medium';
        if (volatility < 0.6) return 'high';
        return 'extreme';
    }

    // Generar reporte completo de mercado
    async generateMarketReport() {
        try {
            const resources = ['agua', 'comida', 'energia', 'materiales'];
            const report = {
                timestamp: new Date(),
                resources: {},
                marketOverview: {},
                cartelDetection: {},
                riskAssessment: {},
                predictions: {}
            };

            // Calcular indicadores para cada recurso
            for (let resource of resources) {
                report.resources[resource] = await this.calculateTechnicalIndicators(resource);
                report.predictions[resource] = await this.generateMarketPredictions(resource);
            }

            // Detección de carteles
            report.cartelDetection = await this.detectCartelActivity();

            // Métricas de riesgo
            report.riskAssessment = await this.calculateRiskMetrics();

            // Overview del mercado
            report.marketOverview = {
                totalVolatility: Object.values(report.riskAssessment)
                    .reduce((sum, risk) => sum + (risk.volatility || 0), 0) / resources.length,
                highRiskResources: Object.entries(report.riskAssessment)
                    .filter(([_, risk]) => risk.riskLevel === 'high' || risk.riskLevel === 'extreme')
                    .map(([resource, _]) => resource),
                cartelAlerts: Object.entries(report.cartelDetection)
                    .filter(([_, signals]) => signals.riskScore > 0.5)
                    .map(([resource, _]) => resource),
                marketTrend: this.determineOverallMarketTrend(report.predictions)
            };

            return report;
        } catch (error) {
            console.error('Error generando reporte de mercado:', error);
            return null;
        }
    }

    // Determinar tendencia general del mercado
    determineOverallMarketTrend(predictions) {
        const trends = Object.values(predictions)
            .filter(p => p && p.trend)
            .map(p => p.trend);

        if (trends.length === 0) return 'neutral';

        const bullishCount = trends.filter(t => t === 'bullish').length;
        const bearishCount = trends.filter(t => t === 'bearish').length;

        if (bullishCount > bearishCount) return 'bullish';
        if (bearishCount > bullishCount) return 'bearish';
        return 'neutral';
    }
}

module.exports = { MarketAnalytics };
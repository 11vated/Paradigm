/**
 * Paradigm Infinite - Analytics Collector
 * Phase 10: Post-Launch Monitoring and Ecosystem Evolution
 * 
 * Collects and analyzes creator activity and seed economy data
 * for ecosystem evolution insights and scaling recommendations.
 */

import { pinoLogger } from '../src/lib/logger';

interface CreatorActivity {
  creatorId: string;
  seedsCreated: number;
  seedsMutated: number;
  artifactsPublished: number;
  totalRevenue: string;
  lastActive: number;
  sensoryProfile: {
    visual: number;
    tactile: number;
    harmonic: number;
  };
}

interface SeedEconomyData {
  totalSeeds: number;
  totalArtifacts: number;
  totalTransactions: number;
  totalVolume: string;
  averagePrice: string;
  activeListings: number;
  priceDistribution: {
    low: number;
    medium: number;
    high: number;
  };
}

interface AnalyticsReport {
  timestamp: number;
  creatorMetrics: {
    totalCreators: number;
    activeCreators: number;
    averageSeedsPerCreator: number;
    averageRevenuePerCreator: string;
    topCreators: Array<{ id: string; revenue: string }>;
  };
  economyMetrics: {
    totalVolume: string;
    transactionGrowthRate: number;
    averagePrice: string;
    marketHealth: number;
  };
  qualityMetrics: {
    averageReproducibility: number;
    averageSignatureValidity: number;
    artifactQualityScore: number;
  };
  trends: {
    creatorEngagement: number;
    marketActivity: number;
    innovationRate: number;
  };
  recommendations: string[];
}

export class AnalyticsCollector {
  private creatorActivity: Map<string, CreatorActivity> = new Map();
  private economyData: SeedEconomyData | null = null;
  private historicalReports: AnalyticsReport[] = [];

  /**
   * Collect creator activity data
   */
  async collectCreatorActivity(): Promise<void> {
    pinoLogger.info('Collecting creator activity data');

    // In production, this would query the database
    // For now, we'll use placeholder data collection
    const creators = await this.getActiveCreators();

    for (const creator of creators) {
      const activity: CreatorActivity = {
        creatorId: creator.id,
        seedsCreated: creator.seedsCreated || 0,
        seedsMutated: creator.seedsMutated || 0,
        artifactsPublished: creator.artifactsPublished || 0,
        totalRevenue: creator.totalRevenue || '0',
        lastActive: creator.lastActive || Date.now(),
        sensoryProfile: creator.sensoryProfile || {
          visual: 0.5,
          tactile: 0.5,
          harmonic: 0.5,
        },
      };

      this.creatorActivity.set(creator.id, activity);
    }

    pinoLogger.info(`Collected activity for ${this.creatorActivity.size} creators`);
  }

  /**
   * Collect seed economy data
   */
  async collectEconomyData(): Promise<void> {
    pinoLogger.info({ economyData: this.economyData }, 'Collected seed economy data');

    // In production, this would query the marketplace database
    // For now, we'll use placeholder data collection
    this.economyData = {
      totalSeeds: await this.getTotalSeeds(),
      totalArtifacts: await this.getTotalArtifacts(),
      totalTransactions: await this.getTotalTransactions(),
      totalVolume: await this.getTotalVolume(),
      averagePrice: await this.getAveragePrice(),
      activeListings: await this.getActiveListings(),
      priceDistribution: {
        low: await this.getPriceDistribution('low'),
        medium: await this.getPriceDistribution('medium'),
        high: await this.getPriceDistribution('high'),
      },
    };
  }

  /**
   * Generate comprehensive analytics report
   */
  async generateAnalyticsReport(): Promise<AnalyticsReport> {
    pinoLogger.info('Generating analytics report');

    const creatorMetrics = this.calculateCreatorMetrics();
    const economyMetrics = this.calculateEconomyMetrics();
    const qualityMetrics = this.calculateQualityMetrics();
    const trends = this.calculateTrends();
    const recommendations = this.generateRecommendations(creatorMetrics, economyMetrics, qualityMetrics, trends);

    const report: AnalyticsReport = {
      timestamp: Date.now(),
      creatorMetrics,
      economyMetrics,
      qualityMetrics,
      trends,
      recommendations,
    };

    this.historicalReports.push(report);
    
    // Keep only last 30 days of reports
    if (this.historicalReports.length > 30) {
      this.historicalReports = this.historicalReports.slice(-30);
    }

    pinoLogger.info({ 
      totalCreators: creatorMetrics.totalCreators,
      totalVolume: economyMetrics.totalVolume,
      marketHealth: economyMetrics.marketHealth,
    }, 'Analytics report generated');

    return report;
  }

  /**
   * Calculate creator metrics
   */
  private calculateCreatorMetrics() {
    const creators = Array.from(this.creatorActivity.values());
    const totalCreators = creators.length;
    const activeCreators = creators.filter(c => Date.now() - c.lastActive < 7 * 24 * 60 * 60 * 1000).length;
    
    const totalSeeds = creators.reduce((sum, c) => sum + c.seedsCreated, 0);
    const totalRevenue = creators.reduce((sum, c) => sum + BigInt(c.totalRevenue), BigInt(0));
    
    const averageSeedsPerCreator = totalCreators > 0 ? totalSeeds / totalCreators : 0;
    const averageRevenuePerCreator = totalCreators > 0 
      ? (totalRevenue / BigInt(totalCreators)).toString() 
      : '0';

    const topCreators = creators
      .sort((a, b) => Number(BigInt(b.totalRevenue) - BigInt(a.totalRevenue)))
      .slice(0, 10)
      .map(c => ({ id: c.creatorId, revenue: c.totalRevenue }));

    return {
      totalCreators,
      activeCreators,
      averageSeedsPerCreator,
      averageRevenuePerCreator,
      topCreators,
    };
  }

  /**
   * Calculate economy metrics
   */
  private calculateEconomyMetrics() {
    if (!this.economyData) {
      return {
        totalVolume: '0',
        transactionGrowthRate: 0,
        averagePrice: '0',
        marketHealth: 0,
      };
    }

    const transactionGrowthRate = this.calculateTransactionGrowthRate();
    const marketHealth = this.calculateMarketHealth();

    return {
      totalVolume: this.economyData.totalVolume,
      transactionGrowthRate,
      averagePrice: this.economyData.averagePrice,
      marketHealth,
    };
  }

  /**
   * Calculate quality metrics
   */
  private calculateQualityMetrics() {
    // In production, this would query the artifact validation system
    return {
      averageReproducibility: 0.99, // 99% reproducibility rate
      averageSignatureValidity: 0.98, // 98% signature validity
      artifactQualityScore: 0.97, // 97% quality score
    };
  }

  /**
   * Calculate trends
   */
  private calculateTrends() {
    if (this.historicalReports.length < 2) {
      return {
        creatorEngagement: 0,
        marketActivity: 0,
        innovationRate: 0,
      };
    }

    const current = this.historicalReports[this.historicalReports.length - 1];
    const previous = this.historicalReports[this.historicalReports.length - 2];

    const creatorEngagement = this.calculateGrowthRate(
      previous.creatorMetrics.activeCreators,
      current.creatorMetrics.activeCreators
    );

    const marketActivity = this.calculateGrowthRate(
      BigInt(previous.economyMetrics.totalVolume),
      BigInt(current.economyMetrics.totalVolume)
    );

    const innovationRate = this.calculateGrowthRate(
      previous.creatorMetrics.averageSeedsPerCreator,
      current.creatorMetrics.averageSeedsPerCreator
    );

    return {
      creatorEngagement,
      marketActivity,
      innovationRate,
    };
  }

  /**
   * Generate recommendations based on metrics
   */
  private generateRecommendations(
    creatorMetrics: any,
    economyMetrics: any,
    qualityMetrics: any,
    trends: any
  ): string[] {
    const recommendations: string[] = [];

    // Creator engagement recommendations
    if (trends.creatorEngagement < 0.05) {
      recommendations.push('Creator engagement growth is low - consider engagement initiatives');
    }

    // Market health recommendations
    if (economyMetrics.marketHealth < 0.7) {
      recommendations.push('Market health is declining - consider marketplace optimization');
    }

    // Quality recommendations
    if (qualityMetrics.averageReproducibility < 0.95) {
      recommendations.push('Reproducibility rate is below target - investigate determinism violations');
    }

    // Innovation recommendations
    if (trends.innovationRate < 0.02) {
      recommendations.push('Innovation rate is low - consider new features or tools');
    }

    if (recommendations.length === 0) {
      recommendations.push('System is performing well - continue current strategy');
    }

    return recommendations;
  }

  /**
   * Calculate growth rate between two values
   */
  private calculateGrowthRate(previous: number | bigint, current: number | bigint): number {
    if (typeof previous === 'bigint') previous = Number(previous);
    if (typeof current === 'bigint') current = Number(current);

    if (previous === 0) return 0;
    return (current - previous) / previous;
  }

  /**
   * Calculate transaction growth rate
   */
  private calculateTransactionGrowthRate(): number {
    if (this.historicalReports.length < 2) return 0;

    const current = this.historicalReports[this.historicalReports.length - 1];
    const previous = this.historicalReports[this.historicalReports.length - 2];

    return this.calculateGrowthRate(
      BigInt(previous.economyMetrics.totalVolume),
      BigInt(current.economyMetrics.totalVolume)
    );
  }

  /**
   * Calculate market health score
   */
  private calculateMarketHealth(): number {
    if (!this.economyData) return 0;

    const factors = [
      this.economyData.totalTransactions > 0 ? 1 : 0,
      this.economyData.activeListings > 0 ? 1 : 0,
      this.economyData.priceDistribution.low > 0 ? 1 : 0,
      this.economyData.priceDistribution.medium > 0 ? 1 : 0,
      this.economyData.priceDistribution.high > 0 ? 1 : 0,
    ];

    return factors.reduce((sum, f) => sum + f, 0) / factors.length;
  }

  /**
   * Get historical reports
   */
  getHistoricalReports(): AnalyticsReport[] {
    return [...this.historicalReports];
  }

  /**
   * Get current creator activity
   */
  getCreatorActivity(): CreatorActivity[] {
    return Array.from(this.creatorActivity.values());
  }

  /**
   * Get current economy data
   */
  getEconomyData(): SeedEconomyData | null {
    return this.economyData;
  }

  // Placeholder methods for data collection
  // In production, these would query actual databases and APIs
  private async getActiveCreators(): Promise<any[]> { return []; }
  private async getTotalSeeds(): Promise<number> { return 0; }
  private async getTotalArtifacts(): Promise<number> { return 0; }
  private async getTotalTransactions(): Promise<number> { return 0; }
  private async getTotalVolume(): Promise<string> { return '0'; }
  private async getAveragePrice(): Promise<string> { return '0'; }
  private async getActiveListings(): Promise<number> { return 0; }
  private async getPriceDistribution(tier: string): Promise<number> { return 0; }
}

// Export singleton instance
export const analyticsCollector = new AnalyticsCollector();

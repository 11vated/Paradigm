import { UniversalSeed, GeneType } from '../seeds';
import { GSPLAgent } from '../intelligence';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'creator' | 'enterprise' | 'admin';
  createdAt: number;
  permissions: string[];
}

export interface SeedListing {
  id: string;
  seedId: string;
  sellerId: string;
  price: number;
  currency: string;
  tags: string[];
  domain: string;
  description: string;
  downloads: number;
  rating: number;
  reviews: number;
  createdAt: number;
  updatedAt: number;
  featured: boolean;
}

export interface Transaction {
  id: string;
  buyerId: string;
  sellerId: string;
  listingId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'refunded';
  createdAt: number;
}

export interface MarketplaceStats {
  totalListings: number;
  totalVolume: number;
  topDomains: Record<string, number>;
  topCreators: string[];
}

export class Marketplace {
  private listings: Map<string, SeedListing> = new Map();
  private transactions: Map<string, Transaction> = new Map();
  private userListings: Map<string, string[]> = new Map();

  constructor() {
    this.seedFeaturedListings();
  }

  private seedFeaturedListings(): void {
    const featured = [
      { domain: 'game', price: 9.99, tags: ['arcade', 'classic'] },
      { domain: 'music', price: 14.99, tags: ['ambient', 'electronic'] },
      { domain: 'art', price: 19.99, tags: ['abstract', 'colorful'] },
      { domain: 'animation', price: 7.99, tags: ['loop', 'smooth'] },
      { domain: 'character', price: 24.99, tags: ['game-ready', 'rigged'] }
    ];

    let id = 1000;
    for (const f of featured) {
      const listing: SeedListing = {
        id: `listing_${id}`,
        seedId: `seed_${id}`,
        sellerId: 'paradigm_official',
        price: f.price,
        currency: 'USD',
        tags: f.tags,
        domain: f.domain,
        description: `Premium ${f.domain} seed collection`,
        downloads: Math.floor(Math.random() * 1000),
        rating: 4.5 + Math.random() * 0.5,
        reviews: Math.floor(Math.random() * 100),
        createdAt: Date.now() - Math.random() * 30 * 86400000,
        updatedAt: Date.now(),
        featured: true
      };
      this.listings.set(listing.id, listing);
      id++;
    }
  }

  createListing(listing: Omit<SeedListing, 'id' | 'createdAt' | 'updatedAt' | 'downloads' | 'rating' | 'reviews'>): SeedListing {
    const id = `listing_${Date.now()}`;
    const newListing: SeedListing = {
      ...listing,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      downloads: 0,
      rating: 0,
      reviews: 0
    };

    this.listings.set(id, newListing);
    
    const userListings = this.userListings.get(listing.sellerId) || [];
    userListings.push(id);
    this.userListings.set(listing.sellerId, userListings);

    return newListing;
  }

  getListing(id: string): SeedListing | undefined {
    return this.listings.get(id);
  }

  getListingsByDomain(domain: string): SeedListing[] {
    return Array.from(this.listings.values())
      .filter(l => l.domain === domain)
      .sort((a, b) => b.downloads - a.downloads);
  }

  getFeaturedListings(): SeedListing[] {
    return Array.from(this.listings.values())
      .filter(l => l.featured)
      .sort((a, b) => b.rating - a.rating);
  }

  getListingsBySeller(sellerId: string): SeedListing[] {
    const ids = this.userListings.get(sellerId) || [];
    return ids.map(id => this.listings.get(id)).filter(Boolean) as SeedListing[];
  }

  purchase(buyerId: string, listingId: string): Transaction | null {
    const listing = this.listings.get(listingId);
    if (!listing) return null;

    const transaction: Transaction = {
      id: `txn_${Date.now()}`,
      buyerId,
      sellerId: listing.sellerId,
      listingId,
      amount: listing.price,
      currency: listing.currency,
      status: 'completed',
      createdAt: Date.now()
    };

    this.transactions.set(transaction.id, transaction);
    listing.downloads++;
    listing.updatedAt = Date.now();

    return transaction;
  }

  getStats(): MarketplaceStats {
    const listings = Array.from(this.listings.values());
    const transactions = Array.from(this.transactions.values());

    const topDomains: Record<string, number> = {};
    const volumeByDomain: Record<string, number> = {};

    for (const listing of listings) {
      topDomains[listing.domain] = (topDomains[listing.domain] || 0) + 1;
      const txn = Array.from(this.transactions.values())
        .find(t => t.listingId === listing.id);
      if (txn) {
        volumeByDomain[listing.domain] = (volumeByDomain[listing.domain] || 0) + txn.amount;
      }
    }

    const volume = transactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalListings: listings.length,
      totalVolume: volume,
      topDomains: volumeByDomain,
      topCreators: Array.from(new Set(listings.map(l => l.sellerId)))
    };
  }

  searchListings(query: string): SeedListing[] {
    const q = query.toLowerCase();
    return Array.from(this.listings.values())
      .filter(l => 
        l.domain.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        l.tags.some(t => t.toLowerCase().includes(q))
      )
      .sort((a, b) => b.rating - a.rating);
  }
}

export class EnterpriseFeatures {
  private ssoConnections: Map<string, object> = new Map();
  private auditLogs: Map<string, object[]> = new Map();
  private billingCustomers: Map<string, object> = new Map();

  configureSSO(provider: string, config: object): void {
    this.ssoConnections.set(provider, config);
    this.logAudit('system', 'sso_configured', { provider });
  }

  logAudit(userId: string, action: string, data: object): void {
    const logs = this.auditLogs.get(userId) || [];
    logs.push({
      action,
      data,
      timestamp: Date.now(),
      ip: '0.0.0.0'
    });
    this.auditLogs.set(userId, logs);
  }

  getAuditLog(userId: string, limit: number = 100): object[] {
    return (this.auditLogs.get(userId) || []).slice(-limit);
  }

  createCustomer(email: string, plan: string): object {
    const id = `customer_${Date.now()}`;
    const customer = {
      id,
      email,
      plan,
      status: 'active',
      createdAt: Date.now(),
      subscription: {
        plan,
        startedAt: Date.now(),
        nextBilling: Date.now() + 30 * 86400000
      }
    };
    this.billingCustomers.set(id, customer);
    return customer;
  }

  getCustomer(customerId: string): object | undefined {
    return this.billingCustomers.get(customerId);
  }

  processPayment(customerId: string, amount: number): object {
    const customer = this.billingCustomers.get(customerId);
    if (!customer) return { error: 'Customer not found' };

    return {
      success: true,
      customerId,
      amount,
      processedAt: Date.now()
    };
  }
}

export class API Routes {
  private marketplace: Marketplace;
  private enterprise: EnterpriseFeatures;
  private agent: GSPLAgent;

  constructor() {
    this.marketplace = new Marketplace();
    this.enterprise = new EnterpriseFeatures();
    this.agent = new GSPLAgent();
  }

  getRouter() {
    return {
      '/api/seeds': {
        GET: () => this.listSeeds(),
        POST: (body: object) => this.createSeed(body)
      },
      '/api/seeds/:id': {
        GET: (params: object) => this.getSeed(params.id),
        PUT: (params: object, body: object) => this.updateSeed(params.id, body),
        DELETE: (params: object) => this.deleteSeed(params.id)
      },
      '/api/marketplace': {
        GET: () => this.marketplace.getFeaturedListings()
      },
      '/api/marketplace/:id/purchase': {
        POST: (params: object, body: object) => this.marketplace.purchase(body.buyerId, params.id)
      },
      '/api/agent/chat': {
        POST: (body: object) => this.agent.process(body.message)
      },
      '/api/enterprise/sso': {
        POST: (body: object) => this.enterprise.configureSSO(body.provider, body.config)
      },
      '/api/enterprise/audit': {
        GET: (params: object, query: object) => this.enterprise.getAuditLog(query.userId)
      }
    };
  }

  private listSeeds() {
    return { seeds: [], total: 0 };
  }

  private createSeed(body: object) {
    const seed = new UniversalSeed();
    return { id: seed.id, ...seed.serialize() };
  }

  private getSeed(id: string) {
    return { id };
  }

  private updateSeed(id: string, body: object) {
    return { id, updated: true };
  }

  private deleteSeed(id: string) {
    return { id, deleted: true };
  }
}

export function createServer() {
  const api = new API Routes();
  return api.getRouter();
}
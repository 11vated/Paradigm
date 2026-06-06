/**
 * Marketplace Routes
 * 
 * REST API endpoints for the Paradigm seed marketplace:
 * - Listing management (create, read, update, delete)
 * - Purchase transactions
 * - Search and filtering
 * - Statistics and analytics
 * - Integration with ParadigmMarketplace smart contract
 */

import { Router, Request, Response } from 'express';

// In-memory storage (TODO: replace with database persistence in production)
interface SeedListing {
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

interface Transaction {
  id: string;
  buyerId: string;
  sellerId: string;
  listingId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'refunded';
  createdAt: number;
}

interface MarketplaceStats {
  totalListings: number;
  totalVolume: number;
  topDomains: Record<string, number>;
  topCreators: string[];
}

// In-memory storage (TODO: migrate to PostgreSQL)
const listings = new Map<string, SeedListing>();
const transactions = new Map<string, Transaction>();
const userListings = new Map<string, string[]>();

// Seed featured listings on startup
function seedFeaturedListings(): void {
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
    listings.set(listing.id, listing);
    id++;
  }
}

seedFeaturedListings();

export function registerMarketplaceRoutes(router: Router): void {
  // GET /api/marketplace - Get featured listings
  router.get('/api/marketplace', (req: Request, res: Response) => {
    try {
      const featured = Array.from(listings.values())
        .filter(l => l.featured)
        .sort((a, b) => b.rating - a.rating);
      
      res.json({ listings: featured, total: featured.length });
    } catch (error) {
      console.error('[Marketplace] Error fetching featured listings:', error);
      res.status(500).json({ error: 'Failed to fetch featured listings' });
    }
  });

  // GET /api/marketplace/listings - Get all listings with optional filters
  router.get('/api/marketplace/listings', (req: Request, res: Response) => {
    try {
      const { domain, seller, search, limit = '50', offset = '0' } = req.query;
      
      let results = Array.from(listings.values());
      
      if (domain && typeof domain === 'string') {
        results = results.filter(l => l.domain === domain);
      }
      
      if (seller && typeof seller === 'string') {
        results = results.filter(l => l.sellerId === seller);
      }
      
      if (search && typeof search === 'string') {
        const q = search.toLowerCase();
        results = results.filter(l =>
          l.domain.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q) ||
          l.tags.some(t => t.toLowerCase().includes(q))
        );
      }
      
      const total = results.length;
      const offsetNum = parseInt(offset as string, 10) || 0;
      const limitNum = parseInt(limit as string, 10) || 50;
      
      results = results
        .sort((a, b) => b.downloads - a.downloads)
        .slice(offsetNum, offsetNum + limitNum);
      
      res.json({ listings: results, total, offset: offsetNum, limit: limitNum });
    } catch (error) {
      console.error('[Marketplace] Error fetching listings:', error);
      res.status(500).json({ error: 'Failed to fetch listings' });
    }
  });

  // GET /api/marketplace/listings/:id - Get specific listing
  router.get('/api/marketplace/listings/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const listing = listings.get(id);
      
      if (!listing) {
        return res.status(404).json({ error: 'Listing not found' });
      }
      
      res.json(listing);
    } catch (error) {
      console.error('[Marketplace] Error fetching listing:', error);
      res.status(500).json({ error: 'Failed to fetch listing' });
    }
  });

  // POST /api/marketplace/listings - Create new listing
  router.post('/api/marketplace/listings', (req: Request, res: Response) => {
    try {
      const { seedId, sellerId, price, currency, tags, domain, description } = req.body;
      
      if (!seedId || !sellerId || !price || !domain) {
        return res.status(400).json({ error: 'Missing required fields: seedId, sellerId, price, domain' });
      }
      
      const id = `listing_${Date.now()}`;
      const newListing: SeedListing = {
        id,
        seedId,
        sellerId,
        price: parseFloat(price),
        currency: currency || 'USD',
        tags: tags || [],
        domain,
        description: description || '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        downloads: 0,
        rating: 0,
        reviews: 0,
        featured: false
      };
      
      listings.set(id, newListing);
      
      const userListingIds = userListings.get(sellerId) || [];
      userListingIds.push(id);
      userListings.set(sellerId, userListingIds);
      
      res.status(201).json(newListing);
    } catch (error) {
      console.error('[Marketplace] Error creating listing:', error);
      res.status(500).json({ error: 'Failed to create listing' });
    }
  });

  // PUT /api/marketplace/listings/:id - Update listing
  router.put('/api/marketplace/listings/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const listing = listings.get(id);
      
      if (!listing) {
        return res.status(404).json({ error: 'Listing not found' });
      }
      
      const updates = req.body;
      const updated: SeedListing = {
        ...listing,
        ...updates,
        id: listing.id,
        updatedAt: Date.now()
      };
      
      listings.set(id, updated);
      res.json(updated);
    } catch (error) {
      console.error('[Marketplace] Error updating listing:', error);
      res.status(500).json({ error: 'Failed to update listing' });
    }
  });

  // DELETE /api/marketplace/listings/:id - Delete listing
  router.delete('/api/marketplace/listings/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const listing = listings.get(id);
      
      if (!listing) {
        return res.status(404).json({ error: 'Listing not found' });
      }
      
      // Remove from user's listings
      const userListingIds = userListings.get(listing.sellerId) || [];
      const filtered = userListingIds.filter(listingId => listingId !== id);
      userListings.set(listing.sellerId, filtered);
      
      listings.delete(id);
      res.json({ success: true });
    } catch (error) {
      console.error('[Marketplace] Error deleting listing:', error);
      res.status(500).json({ error: 'Failed to delete listing' });
    }
  });

  // POST /api/marketplace/listings/:id/purchase - Purchase a listing
  router.post('/api/marketplace/listings/:id/purchase', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { buyerId } = req.body;
      
      if (!buyerId) {
        return res.status(400).json({ error: 'Missing buyerId' });
      }
      
      const listing = listings.get(id);
      if (!listing) {
        return res.status(404).json({ error: 'Listing not found' });
      }
      
      const transaction: Transaction = {
        id: `txn_${Date.now()}`,
        buyerId,
        sellerId: listing.sellerId,
        listingId: id,
        amount: listing.price,
        currency: listing.currency,
        status: 'completed',
        createdAt: Date.now()
      };
      
      transactions.set(transaction.id, transaction);
      
      // Update listing stats
      listing.downloads++;
      listing.updatedAt = Date.now();
      listings.set(id, listing);
      
      res.status(201).json(transaction);
    } catch (error) {
      console.error('[Marketplace] Error processing purchase:', error);
      res.status(500).json({ error: 'Failed to process purchase' });
    }
  });

  // GET /api/marketplace/stats - Get marketplace statistics
  router.get('/api/marketplace/stats', (req: Request, res: Response) => {
    try {
      const allListings = Array.from(listings.values());
      const allTransactions = Array.from(transactions.values());
      
      const topDomains: Record<string, number> = {};
      const volumeByDomain: Record<string, number> = {};
      
      for (const listing of allListings) {
        topDomains[listing.domain] = (topDomains[listing.domain] || 0) + 1;
        const txn = allTransactions.find(t => t.listingId === listing.id);
        if (txn) {
          volumeByDomain[listing.domain] = (volumeByDomain[listing.domain] || 0) + txn.amount;
        }
      }
      
      const totalVolume = allTransactions
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const stats: MarketplaceStats = {
        totalListings: allListings.length,
        totalVolume,
        topDomains: volumeByDomain,
        topCreators: Array.from(new Set(allListings.map(l => l.sellerId)))
      };
      
      res.json(stats);
    } catch (error) {
      console.error('[Marketplace] Error fetching stats:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  });

  // GET /api/marketplace/domains - Get available domains
  router.get('/api/marketplace/domains', (req: Request, res: Response) => {
    try {
      const domains = Array.from(new Set(
        Array.from(listings.values()).map(l => l.domain)
      ));
      res.json({ domains });
    } catch (error) {
      console.error('[Marketplace] Error fetching domains:', error);
      res.status(500).json({ error: 'Failed to fetch domains' });
    }
  });
}

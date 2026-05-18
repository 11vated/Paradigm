/**
 * PARADIGM MARKETPLACE CONTRACT
 * 
 * Seed Marketplace with:
 * - Primary sales (creators sell seeds)
 * - Secondary sales (resales with royalties)
 * - Auction support
 * - Escrow for secure transactions
 * - Royalty tracking & distribution
 */

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ParadigmMarketplace
 * @dev NFT Marketplace for Seed NFTs with Royalty Support
 */
contract ParadigmMarketplace is ERC721, ERC721URIStorage, ERC721Burnable, AccessControl, ReentrancyGuard {
    
    // ─────────────────────────────────────────────────────────────────────────
    // ROLES
    // ─────────────────────────────────────────────────────────────────────────
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant MARKETPLACE_ROLE = keccak256("MARKETPLACE_ROLE");
    bytes32 public constant ROYALTY_MANAGER_ROLE = keccak256("ROYALTY_MANAGER_ROLE");
    
    // ─────────────────────────────────────────────────────────────────────────
    // DATA STRUCTURES
    // ─────────────────────────────────────────────────────────────────────────
    struct Listing {
        address seller;
        uint256 price;
        bool isAuction;
        uint256 auctionEnd;
        uint256 highestBid;
        address highestBidder;
    }
    
    struct RoyaltyInfo {
        address creator;
        uint256 primaryRoyaltyBPS;  // basis points for primary sales (default 1000 = 10%)
        uint256 secondaryRoyaltyBPS; // basis points for secondary sales (default 500 = 5%)
        uint256 totalPrimarySales;
        uint256 totalSecondarySales;
    }
    
    struct Offer {
        address offerer;
        uint256 price;
        uint256 expiry;
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────
    uint256 public tokenIdCounter;
    uint256 public listingCount;
    uint256 public platformFeeBPS = 250; // 2.5% platform fee
    
    // Token ID -> Listing
    mapping(uint256 => Listing) public listings;
    
    // Token ID -> Royalty Info
    mapping(uint256 => RoyaltyInfo) public royaltyInfo;
    
    // Token ID -> Offers
    mapping(uint256 => Offer[]) public offers;
    
    // Creator -> Accumulated royalties
    mapping(address => uint256) public pendingRoyalties;
    
    // User -> Bidding escrow (for auctions)
    mapping(address => uint256) public bidEscrow;
    
    // Events
    event Listed(uint256 indexed tokenId, address indexed seller, uint256 price, bool isAuction);
    event Unlisted(uint256 indexed tokenId);
    event Sold(uint256 indexed tokenId, address indexed buyer, uint256 price);
    event BidPlaced(uint256 indexed tokenId, address indexed bidder, uint256 amount);
    event BidWithdrawn(uint256 indexed tokenId, address indexed bidder, uint256 amount);
    event OfferMade(uint256 indexed tokenId, address indexed offerer, uint256 price);
    event RoyaltyPaid(address indexed creator, uint256 amount);
    
    // ─────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────
    constructor() ERC721("Paradigm Seed", "GPAR") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(MARKETPLACE_ROLE, msg.sender);
        _grantRole(ROYALTY_MANAGER_ROLE, msg.sender);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // MINTING (Seed NFT creation)
    // ─────────────────────────────────────────────────────────────────────────
    function mintSeed(
        address to,
        string memory tokenURI,
        address creator,
        uint256 primaryRoyaltyBPS,
        uint256 secondaryRoyaltyBPS
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        uint256 tokenId = ++tokenIdCounter;
        _mint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        // Set royalty info
        royaltyInfo[tokenId] = RoyaltyInfo({
            creator: creator,
            primaryRoyaltyBPS: primaryRoyaltyBPS,
            secondaryRoyaltyBPS: secondaryRoyaltyBPS,
            totalPrimarySales: 0,
            totalSecondarySales: 0
        });
        
        return tokenId;
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // LISTING FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @dev List a seed NFT for sale
     */
    function list(uint256 tokenId, uint256 price) external nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        require(listings[tokenId].seller == address(0), "Already listed");
        
        listings[tokenId] = Listing({
            seller: msg.sender,
            price: price,
            isAuction: false,
            auctionEnd: 0,
            highestBid: 0,
            highestBidder: address(0)
        });
        listingCount++;
        
        // Transfer to marketplace contract (requires approval)
        _transfer(msg.sender, address(this), tokenId);
        
        emit Listed(tokenId, msg.sender, price, false);
    }
    
    /**
     * @dev List a seed NFT for auction
     */
    function listAuction(uint256 tokenId, uint256 startingPrice, uint256 duration) external nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        require(listings[tokenId].seller == address(0), "Already listed");
        
        listings[tokenId] = Listing({
            seller: msg.sender,
            price: startingPrice,
            isAuction: true,
            auctionEnd: block.timestamp + duration,
            highestBid: startingPrice,
            highestBidder: address(0)
        });
        listingCount++;
        
        _transfer(msg.sender, address(this), tokenId);
        
        emit Listed(tokenId, msg.sender, startingPrice, true);
    }
    
    /**
     * @dev Unlist a seed NFT
     */
    function unlist(uint256 tokenId) external nonReentrant {
        Listing memory listing = listings[tokenId];
        require(listing.seller == msg.sender || hasRole(MARKETPLACE_ROLE, msg.sender), "Not authorized");
        
        // Return NFT to seller
        _transfer(address(this), listing.seller, tokenId);
        
        delete listings[tokenId];
        listingCount--;
        
        emit Unlisted(tokenId);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // BUYING FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @dev Buy a listed seed NFT
     */
    function buy(uint256 tokenId) external payable nonReentrant {
        Listing memory listing = listings[tokenId];
        require(listing.seller != address(0), "Not listed");
        require(!listing.isAuction, "Use buyAuction for auction listings");
        require(msg.value >= listing.price, "Insufficient payment");
        
        _processSale(tokenId, listing.seller, listing.price, msg.sender);
        
        // Transfer NFT to buyer
        _transfer(address(this), msg.sender, tokenId);
        
        // Return excess payment
        if (msg.value > listing.price) {
            payable(msg.sender).transfer(msg.value - listing.price);
        }
        
        delete listings[tokenId];
        listingCount--;
        
        emit Sold(tokenId, msg.sender, listing.price);
    }
    
    /**
     * @dev Place a bid on an auction
     */
    function placeBid(uint256 tokenId) external payable nonReentrant {
        Listing memory listing = listings[tokenId];
        require(listing.seller != address(0), "Not listed");
        require(listing.isAuction, "Not an auction");
        require(block.timestamp < listing.auctionEnd, "Auction ended");
        require(msg.value > listing.highestBid, "Bid too low");
        
        // Refund previous highest bidder
        if (listing.highestBidder != address(0)) {
            payable(listing.highestBidder).transfer(listing.highestBid);
        }
        
        // Update listing
        listings[tokenId].highestBid = msg.value;
        listings[tokenId].highestBidder = msg.sender;
        
        emit BidPlaced(tokenId, msg.sender, msg.value);
    }
    
    /**
     * @dev End auction and transfer NFT to highest bidder
     */
    function endAuction(uint256 tokenId) external nonReentrant {
        Listing memory listing = listings[tokenId];
        require(listing.seller != address(0), "Not listed");
        require(listing.isAuction, "Not an auction");
        require(block.timestamp >= listing.auctionEnd, "Auction not ended");
        
        if (listing.highestBidder != address(0)) {
            _processSale(tokenId, listing.seller, listing.highestBid, listing.highestBidder);
            _transfer(address(this), listing.highestBidder, tokenId);
            
            emit Sold(tokenId, listing.highestBidder, listing.highestBid);
        } else {
            // No bids - return to seller
            _transfer(address(this), listing.seller, tokenId);
        }
        
        delete listings[tokenId];
        listingCount--;
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // OFFERS
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @dev Make an offer on a seed NFT
     */
    function makeOffer(uint256 tokenId, uint256 price, uint256 duration) external payable {
        require(ownerOf(tokenId) != address(0), "Token doesn't exist");
        require(msg.value > 0, "Must send ETH with offer");
        
        offers[tokenId].push(Offer({
            offerer: msg.sender,
            price: price,
            expiry: block.timestamp + duration
        }));
        
        emit OfferMade(tokenId, msg.sender, price);
    }
    
    /**
     * @dev Accept an offer
     */
    function acceptOffer(uint256 tokenId, uint256 offerIndex) external nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        
        Offer memory offer = offers[tokenId][offerIndex];
        require(offer.expiry > block.timestamp, "Offer expired");
        
        _processSale(tokenId, msg.sender, offer.price, offer.offerer);
        _transfer(address(this), offer.offerer, tokenId);
        
        // Remove from offers
        offers[tokenId][offerIndex] = offers[tokenId][offers[tokenId].length - 1];
        offers[tokenId].pop();
        
        delete listings[tokenId];
        listingCount--;
        
        emit Sold(tokenId, offer.offerer, offer.price);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // ROYALTY & FEE PROCESSING
    // ─────────────────────────────────────────────────────────────────────────
    
    function _processSale(
        uint256 tokenId,
        address seller,
        uint256 price,
        address buyer
    ) internal {
        RoyaltyInfo memory royalty = royaltyInfo[tokenId];
        
        // Calculate fees
        uint256 platformFee = (price * platformFeeBPS) / 10000;
        
        uint256 royaltyAmount;
        uint256 creatorShare;
        
        if (royalty.totalPrimarySales == 0) {
            // Primary sale - higher royalty
            royaltyAmount = (price * royalty.primaryRoyaltyBPS) / 10000;
            royalty.totalPrimarySales = 1;
        } else {
            // Secondary sale - lower royalty
            royaltyAmount = (price * royalty.secondaryRoyaltyBPS) / 10000;
            royalty.totalSecondarySales++;
        }
        
        royaltyInfo[tokenId] = royalty;
        
        // Add to creator's pending royalties
        if (royalty.creator != address(0)) {
            pendingRoyalties[royalty.creator] += royaltyAmount;
        }
        
        // Transfer remaining to seller
        uint256 sellerAmount = price - platformFee - royaltyAmount;
        payable(seller).transfer(sellerAmount);
        
        // Emit event
        if (royalty.creator != address(0)) {
            emit RoyaltyPaid(royalty.creator, royaltyAmount);
        }
    }
    
    /**
     * @dev Creator claims accumulated royalties
     */
    function claimRoyalties() external {
        uint256 amount = pendingRoyalties[msg.sender];
        require(amount > 0, "No royalties to claim");
        
        pendingRoyalties[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────
    
    function setPlatformFee(uint256 newFeeBPS) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newFeeBPS <= 1000, "Fee too high"); // max 10%
        platformFeeBPS = newFeeBPS;
    }
    
    function updateRoyalty(uint256 tokenId, uint256 primaryBPS, uint256 secondaryBPS) 
        external 
        onlyRole(ROYALTY_MANAGER_ROLE) 
    {
        require(royaltyInfo[tokenId].creator != address(0), "Token doesn't exist");
        royaltyInfo[tokenId].primaryRoyaltyBPS = primaryBPS;
        royaltyInfo[tokenId].secondaryRoyaltyBPS = secondaryBPS;
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // OVERRIDES
    // ─────────────────────────────────────────────────────────────────────────
    function tokenURI(uint256 tokenId) 
        public 
        view 
        override(ERC721, ERC721URIStorage) 
        returns (string memory) 
    {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(ERC721, ERC721URIStorage, AccessControl) 
        returns (bool) 
    {
        return super.supportsInterface(interfaceId);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
}
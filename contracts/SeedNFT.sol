// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title SeedNFT
 * @dev ERC-721 NFT contract for Paradigm genetic seeds
 *
 * Each NFT represents ownership of a unique genetic seed,
 * including its cryptographic hash and provenance data.
 *
 * Features:
 * - Mint seeds as NFTs
 * - Store seed metadata URI (points to artifact)
 * - Track seed genetics hash on-chain
 * - Royalty support for creators
 * - Batch minting for evolution results
 */
contract SeedNFT is ERC721, ERC721URIStorage, Ownable {
    using Strings for uint256;

    // Struct to store seed data on-chain
    struct SeedData {
        string seedHash;        // SHA-256 hash of the seed
        string domain;           // Domain (character, music, etc.)
        string genetics;         // Compressed genetics data
        uint256 createdAt;       // Block timestamp
        address creator;         // Original creator
        string parent1;         // Parent 1 hash (if bred)
        string parent2;         // Parent 2 hash (if bred)
        uint256 generation;      // Generation number (0 = primordial)
    }

    // State variables
    uint256 private _nextTokenId;
    string private _baseTokenURI;
    address public royaltyRecipient;
    uint256 public royaltyBps; // Basis points (250 = 2.5%)

    // Mappings
    mapping(uint256 => SeedData) public seedData;
    mapping(string => uint256) public hashToTokenId; // seedHash -> tokenId
    mapping(address => uint256[]) private _ownerSeeds;

    // Events
    event SeedMinted(
        uint256 indexed tokenId,
        address indexed to,
        string seedHash,
        string domain,
        uint256 generation
    );

    event SeedBred(
        uint256 indexed tokenId,
        address indexed breeder,
        string parent1Hash,
        string parent2Hash
    );

    event RoyaltyUpdated(address indexed recipient, uint256 bps);

    event BaseURIUpdated(string newBaseURI);

    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseURI_,
        address royaltyRecipient_,
        uint256 royaltyBps_
    ) ERC721(name_, symbol_) Ownable(msg.sender) {
        _baseTokenURI = baseURI_;
        royaltyRecipient = royaltyRecipient_;
        royaltyBps = royaltyBps_;
    }

    /**
     * @dev Mint a new seed NFT
     * @param to Address to receive the NFT
     * @param seedHash SHA-256 hash of the seed
     * @param domain Domain of the seed
     * @param genetics Compressed genetics data (IPFS hash or similar)
     * @param uri Token URI for metadata
     * @param parent1Hash Hash of parent 1 (if bred)
     * @param parent2Hash Hash of parent 2 (if bred)
     * @param generation Generation number
     * @return tokenId The ID of the minted token
     */
    function mintSeed(
        address to,
        string memory seedHash,
        string memory domain,
        string memory genetics,
        string memory uri,
        string memory parent1Hash,
        string memory parent2Hash,
        uint256 generation
    ) public onlyOwner returns (uint256) {
        require(hashToTokenId[seedHash] == 0, "Seed already minted");

        uint256 tokenId = ++_nextTokenId;

        SeedData storage data = seedData[tokenId];
        data.seedHash = seedHash;
        data.domain = domain;
        data.genetics = genetics;
        data.createdAt = block.timestamp;
        data.creator = to; // The minter is the creator
        data.parent1 = parent1Hash;
        data.parent2 = parent2Hash;
        data.generation = generation;

        hashToTokenId[seedHash] = tokenId;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        _ownerSeeds[to].push(tokenId);

        emit SeedMinted(tokenId, to, seedHash, domain, generation);

        return tokenId;
    }

    /**
     * @dev Batch mint multiple seeds (for evolution results)
     * @param tos Array of addresses to receive NFTs
     * @param seedHashes Array of seed hashes
     * @param domains Array of domains
     * @param geneticsList Array of genetics data
     * @param uris Array of token URIs
     * @param generations Array of generation numbers
     * @return tokenIds Array of minted token IDs
     */
    function batchMintSeeds(
        address[] memory tos,
        string[] memory seedHashes,
        string[] memory domains,
        string[] memory geneticsList,
        string[] memory uris,
        uint256[] memory generations
    ) public onlyOwner returns (uint256[] memory) {
        require(tos.length == seedHashes.length, "Array length mismatch");
        require(tos.length == domains.length, "Array length mismatch");
        require(tos.length == geneticsList.length, "Array length mismatch");
        require(tos.length == uris.length, "Array length mismatch");
        require(tos.length == generations.length, "Array length mismatch");

        uint256[] memory tokenIds = new uint256[](tos.length);

        for (uint256 i = 0; i < tos.length; i++) {
            tokenIds[i] = mintSeed(
                tos[i],
                seedHashes[i],
                domains[i],
                geneticsList[i],
                uris[i],
                "", // No parents in batch mint
                "",
                generations[i]
            );
        }

        return tokenIds;
    }

    /**
     * @dev Breed two seed NFTs to create a new one
     * @param to Address to receive the new NFT
     * @param parent1TokenId Token ID of parent 1
     * @param parent2TokenId Token ID of parent 2
     * @param childSeedHash Hash of the child seed
     * @param childGenetics Genetics of the child
     * @param childUri URI for child metadata
     * @return tokenId The ID of the bred seed NFT
     */
    function breedSeeds(
        address to,
        uint256 parent1TokenId,
        uint256 parent2TokenId,
        string memory childSeedHash,
        string memory childGenetics,
        string memory childUri
    ) public onlyOwner returns (uint256) {
        require(_ownerOf(parent1TokenId) != address(0), "Parent 1 not found");
        require(_ownerOf(parent2TokenId) != address(0), "Parent 2 not found");

        SeedData storage parent1 = seedData[parent1TokenId];
        SeedData storage parent2 = seedData[parent2TokenId];

        uint256 childGeneration = (parent1.generation + parent2.generation) / 2 + 1;

        uint256 tokenId = mintSeed(
            to,
            childSeedHash,
            parent1.domain, // Inherit domain from parent 1
            childGenetics,
            childUri,
            parent1.seedHash,
            parent2.seedHash,
            childGeneration
        );

        emit SeedBred(tokenId, to, parent1.seedHash, parent2.seedHash);

        return tokenId;
    }

    /**
     * @dev Get all seeds owned by an address
     * @param owner Address to query
     * @return Array of token IDs
     */
    function getSeedsByOwner(address owner) public view returns (uint256[] memory) {
        return _ownerSeeds[owner];
    }

    /**
     * @dev Get total number of seeds minted
     */
    function totalSeeds() public view returns (uint256) {
        return _nextTokenId;
    }

    /**
     * @dev Check if a seed hash has been minted
     */
    function isSeedMinted(string memory seedHash) public view returns (bool) {
        return hashToTokenId[seedHash] != 0;
    }

    /**
     * @dev Get royalty info (EIP-2981)
     */
    function royaltyInfo(uint256 /*tokenId*/, uint256 salePrice)
        public
        view
        returns (address receiver, uint256 royaltyAmount)
    {
        receiver = royaltyRecipient;
        royaltyAmount = (salePrice * royaltyBps) / 10000;
    }

    /**
     * @dev Update royalty settings (only owner)
     */
    function setRoyalty(address recipient, uint256 bps) public onlyOwner {
        royaltyRecipient = recipient;
        royaltyBps = bps;
        emit RoyaltyUpdated(recipient, bps);
    }

    /**
     * @dev Update base URI (only owner)
     */
    function setBaseURI(string memory newBaseURI) public onlyOwner {
        _baseTokenURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    /**
     * @dev Override _baseURI
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    // Override required functions
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
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
        delete seedData[tokenId];
    }
}

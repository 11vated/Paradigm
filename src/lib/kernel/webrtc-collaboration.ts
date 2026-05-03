/**
 * WebRTC Collaboration — Implements real-time peer-to-peer communication
 * 
 * NEXUS CONCEPT: Real-time collaboration features
 * PARADIGM RECONSTRUCTION: Seed sharing, collaborative breeding, real-time evolution
 * 
 * Features:
 * - Peer-to-peer seed sharing
 * - Collaborative breeding rooms
 * - Real-time evolution monitoring
 * - Multi-user seed editing
 */

import type { Seed, Artifact } from './types';
import { rngFromHash } from './rng';

// ─── WebRTC Configuration ────────────────────────
export interface WebRTCConfig {
  iceServers: RTCIceServer[];
  signalingUrl?: string; // Signaling server URL
}

export interface PeerConnection {
  id: string;
  connection: RTCPeerConnection;
  dataChannel?: RTCDataChannel;
  seeds: Map<string, Seed>;
  status: 'connecting' | 'connected' | 'disconnected';
}

// ─── Signaling Messages ───────────────────────────
export type SignalingMessage = 
  | { type: 'offer'; sdp: RTCSessionDescriptionInit; from: string; to: string }
  | { type: 'answer'; sdp: RTCSessionDescriptionInit; from: string; to: string }
  | { type: 'ice-candidate'; candidate: RTCIceCandidateInit; from: string; to: string }
  | { type: 'seed-share'; seed: Seed; from: string }
  | { type: 'breed-request'; parent1: string; parent2: string; from: string }
  | { type: 'evolve-update'; generation: number; bestFitness: number; from: string }
  | { type: 'user-joined'; userId: string; name: string }
  | { type: 'user-left'; userId: string };

// ─── Collaboration Room ────────────────────────────
export interface Room {
  id: string;
  name: string;
  host: string;
  peers: Map<string, PeerConnection>;
  seeds: Map<string, Seed>;
  artifacts: Map<string, Artifact>;
  isActive: boolean;
}

// ─── WebRTC Manager Class ────────────────────────────
export class WebRTCManager {
  private config: WebRTCConfig;
  private localId: string;
  private rooms: Map<string, Room> = new Map();
  private peerConnections: Map<string, PeerConnection> = new Map();
  private signalingWs?: WebSocket;
  
  // Event handlers
  private onSeedShared?: (seed: Seed, fromPeer: string) => void;
  private onBreedRequested?: (parent1: Seed, parent2: Seed, fromPeer: string) => void;
  private onEvolveUpdate?: (data: any, fromPeer: string) => void;
  private onUserJoined?: (userId: string, name: string) => void;
  private onUserLeft?: (userId: string) => void;

  constructor(config: Partial<WebRTCConfig> = {}) {
    this.config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
      ...config,
    };

    this.localId = this.generatePeerId();
  }

  /**
   * Connect to signaling server
   */
  connectSignaling(url: string): void {
    this.signalingWs = new WebSocket(url);

    this.signalingWs.onmessage = (event) => {
      const message: SignalingMessage = JSON.parse(event.data);
      this.handleSignalingMessage(message);
    };

    this.signalingWs.onopen = () => {
      console.log(`[WebRTC] Connected to signaling server: ${url}`);
    };

    this.signalingWs.onerror = (error) => {
      console.error('[WebRTC] Signaling error:', error);
    };
  }

  /**
   * Create a new collaboration room
   */
  createRoom(name: string): Room {
    const roomId = this.generateRoomId();
    const room: Room = {
      id: roomId,
      name,
      host: this.localId,
      peers: new Map(),
      seeds: new Map(),
      artifacts: new Map(),
      isActive: true,
    };

    this.rooms.set(roomId, room);
    console.log(`[WebRTC] Created room: ${name} (${roomId})`);

    return room;
  }

  /**
   * Join an existing room
   */
  async joinRoom(roomId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room not found: ${roomId}`);
    }

    // Connect to all peers in room
    for (const [peerId] of room.peers) {
      if (peerId !== this.localId) {
        await this.connectToPeer(peerId, roomId);
      }
    }

    // Announce join
    this.sendSignaling({
      type: 'user-joined',
      userId: this.localId,
      name: `User_${this.localId.substring(0, 8)}`,
    });
  }

  /**
   * Connect to a peer
   */
  async connectToPeer(peerId: string, roomId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const pc = new RTCPeerConnection({ iceServers: this.config.iceServers });
    const peerConnection: PeerConnection = {
      id: peerId,
      connection: pc,
      seeds: new Map(),
      status: 'connecting',
    };

    // Create data channel
    const dataChannel = pc.createDataChannel('seeds');
    peerConnection.dataChannel = dataChannel;
    this.setupDataChannel(dataChannel, peerId);

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignaling({
          type: 'ice-candidate',
          candidate: event.candidate.toJSON(),
          from: this.localId,
          to: peerId,
        });
      }
    };

    // Handle incoming data channels
    pc.ondatachannel = (event) => {
      this.setupDataChannel(event.channel, peerId);
    };

    // Create offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    this.sendSignaling({
      type: 'offer',
      sdp: offer,
      from: this.localId,
      to: peerId,
    });

    this.peerConnections.set(peerId, peerConnection);
    room.peers.set(peerId, peerConnection);
  }

  /**
   * Handle signaling messages
   */
  private handleSignalingMessage(message: SignalingMessage): void {
    switch (message.type) {
      case 'offer':
        this.handleOffer(message);
        break;
      case 'answer':
        this.handleAnswer(message);
        break;
      case 'ice-candidate':
        this.handleIceCandidate(message);
        break;
      case 'seed-share':
        if (this.onSeedShared && message.seed) {
          this.onSeedShared(message.seed, message.from);
        }
        break;
      case 'breed-request':
        // Handle breed request
        break;
      case 'evolve-update':
        if (this.onEvolveUpdate) {
          this.onEvolveUpdate(message, message.from);
        }
        break;
      case 'user-joined':
        if (this.onUserJoined) {
          this.onUserJoined(message.userId, message.name);
        }
        break;
      case 'user-left':
        if (this.onUserLeft) {
          this.onUserLeft(message.userId);
        }
        break;
    }
  }

  private async handleOffer(message: any): Promise<void> {
    const pc = new RTCPeerConnection({ iceServers: this.config.iceServers });
    const peerId = message.from;

    const peerConnection: PeerConnection = {
      id: peerId,
      connection: pc,
      seeds: new Map(),
      status: 'connecting',
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignaling({
          type: 'ice-candidate',
          candidate: event.candidate.toJSON(),
          from: this.localId,
          to: peerId,
        });
      }
    };

    // Handle incoming data channels
    pc.ondatachannel = (event) => {
      this.setupDataChannel(event.channel, peerId);
    };

    await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    this.sendSignaling({
      type: 'answer',
      sdp: answer,
      from: this.localId,
      to: peerId,
    });

    this.peerConnections.set(peerId, peerConnection);
  }

  private async handleAnswer(message: any): Promise<void> {
    const peer = this.peerConnections.get(message.from);
    if (!peer) return;

    await peer.connection.setRemoteDescription(
      new RTCSessionDescription(message.sdp)
    );
    peer.status = 'connected';
  }

  private async handleIceCandidate(message: any): Promise<void> {
    const peer = this.peerConnections.get(message.from);
    if (!peer) return;

    await peer.connection.addIceCandidate(
      new RTCIceCandidate(message.candidate)
    );
  }

  /**
   * Setup data channel for seed sharing
   */
  private setupDataChannel(channel: RTCDataChannel, peerId: string): void {
    channel.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleDataChannelMessage(data, peerId);
    };

    channel.onopen = () => {
      console.log(`[WebRTC] Data channel opened with ${peerId}`);
      const peer = this.peerConnections.get(peerId);
      if (peer) {
        peer.status = 'connected';
      }
    };

    channel.onclose = () => {
      console.log(`[WebRTC] Data channel closed with ${peerId}`);
      const peer = this.peerConnections.get(peerId);
      if (peer) {
        peer.status = 'disconnected';
      }
    };
  }

  /**
   * Handle data channel messages
   */
  private handleDataChannelMessage(data: any, peerId: string): void {
    switch (data.type) {
      case 'seed-share':
        if (this.onSeedShared && data.seed) {
          this.onSeedShared(data.seed, peerId);
        }
        break;
      case 'breed-request':
        // Handle breed request
        break;
      case 'evolve-update':
        if (this.onEvolveUpdate) {
          this.onEvolveUpdate(data, peerId);
        }
        break;
    }
  }

  /**
   * Share a seed with all peers in a room
   */
  shareSeed(seed: Seed, roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Store locally
    room.seeds.set(seed.$hash || '', seed);

    // Share with all peers
    const message = JSON.stringify({
      type: 'seed-share',
      seed,
      from: this.localId,
    });

    for (const [peerId, peer] of this.peerConnections) {
      if (peer.dataChannel && peer.dataChannel.readyState === 'open') {
        peer.dataChannel.send(message);
      }
    }
  }

  /**
   * Request collaborative breed
   */
  requestBreed(parent1Hash: string, parent2Hash: string, roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const message = JSON.stringify({
      type: 'breed-request',
      parent1: parent1Hash,
      parent2: parent2Hash,
      from: this.localId,
    });

    // Send to all peers (simplified - would target specific peer)
    for (const [peerId, peer] of this.peerConnections) {
      if (peer.dataChannel && peer.dataChannel.readyState === 'open') {
        peer.dataChannel.send(message);
      }
    }
  }

  /**
   * Send evolution update
   */
  sendEvolveUpdate(generation: number, bestFitness: number, roomId: string): void {
    const message = JSON.stringify({
      type: 'evolve-update',
      generation,
      bestFitness,
      from: this.localId,
    });

    for (const [peerId, peer] of this.peerConnections) {
      if (peer.dataChannel && peer.dataChannel.readyState === 'open') {
        peer.dataChannel.send(message);
      }
    }
  }

  /**
   * Send signaling message
   */
  private sendSignaling(message: SignalingMessage): void {
    if (this.signalingWs && this.signalingWs.readyState === WebSocket.OPEN) {
      this.signalingWs.send(JSON.stringify(message));
    }
  }

  /**
   * Set event handlers
   */
  on(event: 'seed-shared', handler: (seed: Seed, fromPeer: string) => void): void;
  on(event: 'breed-requested', handler: (parent1: Seed, parent2: Seed, fromPeer: string) => void): void;
  on(event: 'evolve-update', handler: (data: any, fromPeer: string) => void): void;
  on(event: 'user-joined', handler: (userId: string, name: string) => void): void;
  on(event: 'user-left', handler: (userId: string) => void): void;
  on(event: string, handler: Function): void {
    switch (event) {
      case 'seed-shared':
        this.onSeedShared = handler;
        break;
      case 'breed-requested':
        this.onBreedRequested = handler;
        break;
      case 'evolve-update':
        this.onEvolveUpdate = handler;
        break;
      case 'user-joined':
        this.onUserJoined = handler;
        break;
      case 'user-left':
        this.onUserLeft = handler;
        break;
    }
  }

  /**
   * Get all peers in a room
   */
  getPeers(roomId: string): PeerConnection[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return Array.from(room.peers.values());
  }

  /**
   * Get all seeds in a room
   */
  getSeeds(roomId: string): Seed[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return Array.from(room.seeds.values());
  }

  /**
   * Disconnect from all peers
   */
  disconnect(): void {
    for (const [peerId, peer] of this.peerConnections) {
      peer.connection.close();
      if (peer.dataChannel) {
        peer.dataChannel.close();
      }
    }
    this.peerConnections.clear();

    if (this.signalingWs) {
      this.signalingWs.close();
    }
  }

  /**
   * Generate peer ID
   */
  private generatePeerId(): string {
    const rng = rngFromHash(Date.now().toString());
    const bytes = new Uint8Array(8);
    for (let i = 0; i < 8; i++) {
      bytes[i] = Math.floor(rng.nextF64() * 256);
    }
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Generate room ID
   */
  private generateRoomId(): string {
    const rng = rngFromHash(Date.now().toString());
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(rng.nextF64() * 256);
    }
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}

// ─── Export Singleton ────────────────────────────
export const webRTCManager = new WebRTCManager();

// ─── React Hook for WebRTC ────────────────────────
export function useWebRTC() {
  // This would be a React hook for using WebRTC in components
  // Implementation would depend on React version and setup

  return {
    manager: webRTCManager,
    createRoom: (name: string) => webRTCManager.createRoom(name),
    joinRoom: (id: string) => webRTCManager.joinRoom(id),
    shareSeed: (seed: Seed, roomId: string) => webRTCManager.shareSeed(seed, roomId),
  };
}

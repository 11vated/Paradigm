import crypto from 'crypto';

/**
 * WebSocket helpers extracted during Phase 1 server modular split.
 */
export function sendWsFrame(socket: any, payload: Buffer, opcode = 0x01) {
  const len = payload.length;
  let header: Buffer;

  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x80 | opcode;
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  try { socket.write(Buffer.concat([header, payload])); } catch {}
}

export function sendJson(socket: any, obj: any) {
  sendWsFrame(socket, Buffer.from(JSON.stringify(obj)));
}

export function parseWsFrame(buf: Buffer): { opcode: number; payload: Buffer; consumed: number } | null {
  if (buf.length < 2) return null;
  const opcode = buf[0] & 0x0f;
  const masked = (buf[1] & 0x80) !== 0;
  let payloadLen = buf[1] & 0x7f;
  let offset = 2;
  if (payloadLen === 126) {
    if (buf.length < 4) return null;
    payloadLen = buf.readUInt16BE(2);
    offset = 4;
  } else if (payloadLen === 127) {
    if (buf.length < 10) return null;
    payloadLen = Number(buf.readBigUInt64BE(2));
    offset = 10;
  }
  const maskLen = masked ? 4 : 0;
  const totalLen = offset + maskLen + payloadLen;
  if (buf.length < totalLen) return null;
  const mask = masked ? buf.subarray(offset, offset + maskLen) : null;
  const payload = buf.subarray(offset + maskLen, totalLen);
  if (mask) {
    for (let i = 0; i < payload.length; i++) {
      payload[i] ^= mask[i % 4];
    }
  }
  return { opcode, payload, consumed: totalLen };
}

export interface WebsocketUpgradeDeps {
  PORT: number;
  verifyTokenRaw: (token: string) => any; // sync or async per auth module
  log: (level: string, msg: string, meta?: any) => void;
  metrics: any;
  gsplAgent: any;
  seeds: any[];
  saveSeeds: () => void;
}

/**
 * Registers the RFC 6455 WebSocket upgrade handler for /ws/agent.
 * Extracted from monolithic server.ts as part of Phase 1 full autonomy server split.
 * Handles JWT auth, framing, and streaming agent results (thinking/result/error).
 */
export function registerWebsocketUpgrade(httpServer: any, deps: WebsocketUpgradeDeps): void {
  const { PORT, verifyTokenRaw, log, metrics, gsplAgent, seeds, saveSeeds } = deps;

  httpServer.on('upgrade', async (req: any, socket: any, head: Buffer) => {
    const urlParsed = new URL(req.url || '', `http://localhost:${PORT}`);
    if (urlParsed.pathname !== '/ws/agent') {
      socket.destroy();
      return;
    }

    // ── WebSocket JWT Authentication ──────────────────────────────
    const wsToken = urlParsed.searchParams.get('token')
      || (req.headers['authorization']?.startsWith('Bearer ') ? req.headers['authorization'].slice(7) : null);

    if (!wsToken) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      log('WARN', 'WebSocket connection rejected: no token');
      return;
    }

    const wsUser = await verifyTokenRaw(wsToken);
    if (!wsUser) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      log('WARN', 'WebSocket connection rejected: invalid or expired token');
      return;
    }
    log('INFO', 'WebSocket authenticated', { username: (wsUser as any).username });

    // RFC 6455 handshake
    const key = req.headers['sec-websocket-key'];
    if (!key) { socket.destroy(); return; }
    const keyStr = Array.isArray(key) ? key[0] : key;

    const MAGIC = '258EAFA5-E914-47DA-95CA-5AB9AC45E8B0';
    const accept = crypto.createHash('sha1').update(keyStr + MAGIC).digest('base64');

    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n` +
      '\r\n'
    );

    metrics.wsConnections++;
    metrics.wsActiveConnections++;
    log('INFO', 'WebSocket agent connection established');

    // ── Minimal WebSocket frame helpers (use module versions where possible) ─
    function sendWsFrameLocal(data: string) {
      const payload = Buffer.from(data, 'utf8');
      const len = payload.length;
      let header: Buffer;
      if (len < 126) {
        header = Buffer.alloc(2);
        header[0] = 0x81;
        header[1] = len;
      } else if (len < 65536) {
        header = Buffer.alloc(4);
        header[0] = 0x81;
        header[1] = 126;
        header.writeUInt16BE(len, 2);
      } else {
        header = Buffer.alloc(10);
        header[0] = 0x81;
        header[1] = 127;
        header.writeBigUInt64BE(BigInt(len), 2);
      }
      try { socket.write(Buffer.concat([header, payload])); } catch {}
    }

    function sendJsonLocal(obj: any) { sendWsFrameLocal(JSON.stringify(obj)); }

    function parseWsFrameLocal(buf: Buffer): { opcode: number; payload: Buffer; consumed: number } | null {
      if (buf.length < 2) return null;
      const opcode = buf[0] & 0x0f;
      const masked = (buf[1] & 0x80) !== 0;
      let payloadLen = buf[1] & 0x7f;
      let offset = 2;
      if (payloadLen === 126) {
        if (buf.length < 4) return null;
        payloadLen = buf.readUInt16BE(2);
        offset = 4;
      } else if (payloadLen === 127) {
        if (buf.length < 10) return null;
        payloadLen = Number(buf.readBigUInt64BE(2));
        offset = 10;
      }
      const maskLen = masked ? 4 : 0;
      const totalLen = offset + maskLen + payloadLen;
      if (buf.length < totalLen) return null;
      const mask = masked ? buf.subarray(offset, offset + maskLen) : null;
      const payload = buf.subarray(offset + maskLen, totalLen);
      if (mask) {
        for (let i = 0; i < payload.length; i++) {
          payload[i] ^= mask[i % 4];
        }
      }
      return { opcode, payload, consumed: totalLen };
    }

    let buffer = Buffer.alloc(0);

    socket.on('data', async (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);

      while (true) {
        const frame = parseWsFrameLocal(buffer);
        if (!frame) break;
        buffer = buffer.subarray(frame.consumed);

        if (frame.opcode === 0x08) {
          const closeFrame = Buffer.alloc(2);
          closeFrame[0] = 0x88;
          closeFrame[1] = 0;
          try { socket.write(closeFrame); } catch {}
          socket.end();
          return;
        }
        if (frame.opcode === 0x09) {
          const pong = Buffer.alloc(2 + frame.payload.length);
          pong[0] = 0x8A;
          pong[1] = frame.payload.length;
          frame.payload.copy(pong, 2);
          try { socket.write(pong); } catch {}
          continue;
        }
        if (frame.opcode !== 0x01) continue;

        const text = frame.payload.toString('utf8');
        let query: string;
        try {
          const msg = JSON.parse(text);
          query = msg.query || msg.message || text;
        } catch {
          query = text;
        }

        sendJsonLocal({ type: 'thinking', message: `Processing: "${query.substring(0, 80)}"...` });

        try {
          const result = await gsplAgent.processAsync(query, { seeds });
          sendJsonLocal({ type: 'result', ...result });

          if (result.data?.seed) {
            seeds.push(result.data.seed);
            saveSeeds();
          }
          if (result.data?.seeds) {
            seeds.push(...result.data.seeds);
            saveSeeds();
          }
          if (result.data?.population) {
            seeds.push(...result.data.population);
            saveSeeds();
          }
        } catch (err: any) {
          sendJsonLocal({ type: 'error', message: err.message || 'Agent processing failed' });
        }
      }
    });

    socket.on('error', () => { /* swallow */ });
    socket.on('close', () => { metrics.wsActiveConnections--; log('INFO', 'WebSocket agent connection closed'); });
  });
}

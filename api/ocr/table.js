export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const TEXTIN_APP_ID = process.env.TEXTIN_APP_ID || '';
  const TEXTIN_SECRET = process.env.TEXTIN_SECRET || '';

  if (!TEXTIN_APP_ID || !TEXTIN_SECRET) {
    return res.status(500).json({ error: 'TextIn API 未配置' });
  }

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);

    const boundary = req.headers['content-type']?.match(/boundary=(.+)/)?.[1];
    if (!boundary) {
      return res.status(400).json({ error: '无效的请求格式' });
    }

    const fileBuffer = extractFileFromMultipart(body, boundary);
    if (!fileBuffer) {
      return res.status(400).json({ error: '未找到文件' });
    }

    const url = 'https://api.textin.com/ai/service/v2/recognize/table/multipage';
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'x-ti-app-id': TEXTIN_APP_ID,
        'x-ti-secret-code': TEXTIN_SECRET,
        'Content-Type': 'application/octet-stream',
      },
      body: fileBuffer,
    });
    const data = await resp.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

function extractFileFromMultipart(body, boundary) {
  const boundaryBuf = Buffer.from(`--${boundary}`);
  const parts = [];
  let start = 0;

  while (true) {
    const idx = body.indexOf(boundaryBuf, start);
    if (idx === -1) break;
    if (start > 0) {
      parts.push(body.slice(start, idx - 2));
    }
    start = idx + boundaryBuf.length + 2;
  }

  for (const part of parts) {
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;
    const headers = part.slice(0, headerEnd).toString();
    if (headers.includes('filename=')) {
      return part.slice(headerEnd + 4);
    }
  }
  return null;
}

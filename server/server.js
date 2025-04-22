const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', '2fa_data.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize data file if not exists
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ items: [] }), 'utf8');
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// Helper function to read 2FA data
function read2FAData() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading 2FA data:', error);
    return { items: [] };
  }
}

// Helper function to write 2FA data
function write2FAData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing 2FA data:', error);
    return false;
  }
}

// Helper function to generate OTP for all active 2FAs
function generateOTPs() {
  const data = read2FAData();
  const activeItems = data.items.filter(item => !item.deleted);
  
  const otps = activeItems.map(item => {
    try {
      const token = authenticator.generate(item.secret);
      return {
        id: item.id,
        name: item.name,
        note: item.note,
        token
      };
    } catch (error) {
      console.error(`Error generating OTP for ${item.name}:`, error);
      return {
        id: item.id,
        name: item.name,
        note: item.note,
        token: 'ERROR'
      };
    }
  });
  
  return otps;
}

// Routes
app.get('/api/2fa', (req, res) => {
  const data = read2FAData();
  // Filter out deleted items and don't send secrets to client
  const items = data.items
    .filter(item => !item.deleted)
    .map(({ id, name, note, order }) => ({ id, name, note, order }));
  
  res.json({ items });
});

app.get('/api/2fa/otps', (req, res) => {
  const otps = generateOTPs();
  
  // Calculate remaining time until next refresh (00 or 30 seconds)
  const now = new Date();
  const seconds = now.getSeconds();
  let remainingSeconds = 0;
  
  if (seconds < 30) {
    remainingSeconds = 30 - seconds;
  } else {
    remainingSeconds = 60 - seconds;
  }
  
  res.json({
    otps,
    remainingSeconds
  });
});

app.post('/api/2fa', async (req, res) => {
  const { name, note, secret } = req.body;
  
  if (!name || !secret) {
    return res.status(400).json({ error: 'Name and secret are required' });
  }
  
  // Validate secret format
  try {
    authenticator.check('000000', secret); // Just to validate the secret format
  } catch (error) {
    return res.status(400).json({ error: 'Invalid secret format' });
  }
  
  const data = read2FAData();
  const id = Date.now().toString();
  
  // Add the new 2FA to the list with highest order
  const maxOrder = data.items.length > 0 
    ? Math.max(...data.items.map(item => item.order || 0)) 
    : 0;
  
  data.items.push({
    id,
    name,
    note: note || '',
    secret,
    order: maxOrder + 1,
    deleted: false,
    createdAt: new Date().toISOString()
  });
  
  if (write2FAData(data)) {
    // Generate QR code as data URL for client
    try {
      const otpAuthUrl = authenticator.keyuri(name, '2FA-iframe', secret);
      const qrCode = await QRCode.toDataURL(otpAuthUrl);
      res.json({ 
        success: true, 
        id,
        qrCode
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      res.json({ success: true, id });
    }
  } else {
    res.status(500).json({ error: 'Failed to save 2FA data' });
  }
});

app.put('/api/2fa/:id', (req, res) => {
  const { id } = req.params;
  const { name, note, order } = req.body;
  
  const data = read2FAData();
  const itemIndex = data.items.findIndex(item => item.id === id);
  
  if (itemIndex === -1) {
    return res.status(404).json({ error: '2FA not found' });
  }
  
  // Update the item
  if (name !== undefined) data.items[itemIndex].name = name;
  if (note !== undefined) data.items[itemIndex].note = note;
  if (order !== undefined) data.items[itemIndex].order = order;
  
  if (write2FAData(data)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to update 2FA data' });
  }
});

app.put('/api/2fa/reorder', (req, res) => {
  const { items } = req.body;
  
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Items must be an array' });
  }
  
  const data = read2FAData();
  
  // Update order of each item
  items.forEach((item, index) => {
    const itemIndex = data.items.findIndex(i => i.id === item.id);
    if (itemIndex !== -1) {
      data.items[itemIndex].order = index;
    }
  });
  
  if (write2FAData(data)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to reorder 2FA items' });
  }
});

app.delete('/api/2fa/:id', (req, res) => {
  const { id } = req.params;
  
  const data = read2FAData();
  const itemIndex = data.items.findIndex(item => item.id === id);
  
  if (itemIndex === -1) {
    return res.status(404).json({ error: '2FA not found' });
  }
  
  // Mark the item as deleted instead of removing it
  data.items[itemIndex].deleted = true;
  
  if (write2FAData(data)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to delete 2FA data' });
  }
});

app.get('/api/2fa/:id/secret', (req, res) => {
  const { id } = req.params;
  
  const data = read2FAData();
  const item = data.items.find(item => item.id === id && !item.deleted);
  
  if (!item) {
    return res.status(404).json({ error: '2FA not found' });
  }
  
  // Generate QR code for the secret
  const otpAuthUrl = authenticator.keyuri(item.name, '2FA-iframe', item.secret);
  QRCode.toDataURL(otpAuthUrl, (err, qrCode) => {
    if (err) {
      console.error('Error generating QR code:', err);
      return res.status(500).json({ error: 'Failed to generate QR code' });
    }
    
    res.json({
      secret: item.secret,
      qrCode
    });
  });
});

app.get('/config', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/config.html'));
});

app.get('/display', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/display.html'));
});

app.get('/', (req, res) => {
  res.redirect('/config');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 
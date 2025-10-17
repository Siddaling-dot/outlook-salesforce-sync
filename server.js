const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Define schema for Outlook items
const outlookItemSchema = new mongoose.Schema({
  type: { type: String, required: true }, // 'email', 'event', 'contact'
  subject: String,
  from: String,
  to: String,
  body: String,
  receivedDate: Date,
  outlookId: String,
  syncedToSalesforce: { type: Boolean, default: false },
  salesforceId: String,
  createdAt: { type: Date, default: Date.now }
});

const OutlookItem = mongoose.model('OutlookItem', outlookItemSchema);

// API Health Check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Outlook-Salesforce Sync API is running!',
    status: 'OK',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    endpoints: {
      '/api/sync': 'POST - Sync Outlook item',
      '/api/items': 'GET - Get all items',
      '/api/sync-to-sf': 'POST - Sync to Salesforce'
    }
  });
});

// Receive data from Power Automate
app.post('/api/sync', async (req, res) => {
  try {
    console.log('📨 Received data from Outlook:', req.body);
    
    const { type, subject, from, to, body, receivedDate, outlookId } = req.body;
    
    // Save to MongoDB
    const item = new OutlookItem({
      type: type || 'email',
      subject,
      from,
      to,
      body,
      receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
      outlookId
    });
    
    await item.save();
    
    console.log('✅ Saved to MongoDB with ID:', item._id);
    
    res.json({ 
      success: true, 
      id: item._id,
      message: 'Outlook item saved successfully' 
    });
    
  } catch (error) {
    console.error('❌ Error saving to MongoDB:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get all items (for debugging)
app.get('/api/items', async (req, res) => {
  try {
    const items = await OutlookItem.find().sort({ createdAt: -1 });
    res.json({ 
      success: true, 
      count: items.length,
      items 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get items not synced to Salesforce
app.get('/api/items/unsynced', async (req, res) => {
  try {
    const items = await OutlookItem.find({ syncedToSalesforce: false }).sort({ createdAt: -1 });
    res.json({ 
      success: true, 
      count: items.length,
      items 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Sync to Salesforce (manual trigger)
app.post('/api/sync-to-sf', async (req, res) => {
  try {
    const unsyncedItems = await OutlookItem.find({ syncedToSalesforce: false });
    let syncedCount = 0;
    
    console.log(`🔄 Found ${unsyncedItems.length} items to sync to Salesforce`);
    
    for (const item of unsyncedItems) {
      const sfResult = await createSalesforceTask(item);
      
      if (sfResult.success) {
        item.syncedToSalesforce = true;
        item.salesforceId = sfResult.salesforceId;
        await item.save();
        syncedCount++;
        console.log(`✅ Synced item to Salesforce: ${item._id}`);
      }
    }
    
    res.json({ 
      success: true, 
      message: `Successfully synced ${syncedCount} items to Salesforce`,
      synced: syncedCount,
      total: unsyncedItems.length
    });
    
  } catch (error) {
    console.error('❌ Sync error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Function to create Salesforce Task
async function createSalesforceTask(item) {
  try {
    // For now, we'll simulate creating a Salesforce Task
    // In the next step, we'll add actual Salesforce API integration
    
    console.log(`📧 Creating Salesforce Task for: ${item.subject}`);
    console.log(`   From: ${item.from}`);
    console.log(`   Type: ${item.type}`);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Simulate successful Salesforce Task creation
    const simulatedSalesforceId = 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    return { 
      success: true, 
      salesforceId: simulatedSalesforceId,
      message: 'Task created successfully (simulated)'
    };
    
  } catch (error) {
    console.error('❌ Error creating Salesforce Task:', error);
    return { success: false, error: error.message };
  }
}

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}`);
  console.log(`📨 Sync endpoint: http://localhost:${PORT}/api/sync`);
});
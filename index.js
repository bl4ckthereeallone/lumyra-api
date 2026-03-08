require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_KEY environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ status: 'Lumyra API is running' });
});

// Validate key endpoint
app.post('/validate', async (req, res) => {
    try {
        const { key, hwid } = req.body;
        
        console.log(`Validating key: ${key} for HWID: ${hwid}`);
        
        // Check if key exists
        const { data, error } = await supabase
            .from('keys')
            .select('*')
            .eq('key', key)
            .maybeSingle();
        
        if (error) {
            console.error('Database error:', error);
            return res.json({ valid: false, message: 'Database error' });
        }
        
        if (!data) {
            return res.json({ valid: false, message: 'Invalid key' });
        }
        
        // Check if key is used
        if (data.used) {
            if (data.hwid === hwid) {
                return res.json({ valid: true, message: 'Key already activated on this computer' });
            } else {
                return res.json({ valid: false, message: 'Key already in use' });
            }
        }
        
        // Activate key
        const { error: updateError } = await supabase
            .from('keys')
            .update({ used: true, hwid: hwid, activated_at: new Date() })
            .eq('key', key);
        
        if (updateError) {
            console.error('Update error:', updateError);
            return res.json({ valid: false, message: 'Activation failed' });
        }
        
        res.json({ valid: true, message: 'Key activated successfully' });
        
    } catch (error) {
        console.error('Validation error:', error);
        res.json({ valid: false, message: 'Server error' });
    }
});

// Generate key endpoint
app.post('/generate-key', async (req, res) => {
    try {
        const { adminSecret } = req.body;
        
        // Check admin secret
        if (adminSecret !== process.env.ADMIN_SECRET) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        // Generate key
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let key = 'LUMYRA-';
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 5; j++) {
                key += chars[Math.floor(Math.random() * chars.length)];
            }
            if (i < 3) key += '-';
        }
        
        // Save to Supabase
        const { data, error } = await supabase
            .from('keys')
            .insert([{ 
                key: key, 
                used: false, 
                hwid: null, 
                created_at: new Date()
            }])
            .select();
            
        if (error) {
            console.error('Supabase insert error:', error);
            return res.status(500).json({ error: 'Failed to save key to database' });
        }
        
        console.log('Generated new key:', key);
        res.json({ key: data[0].key });
        
    } catch (error) {
        console.error('Error generating key:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

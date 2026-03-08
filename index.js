require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.get('/', (req, res) => {
    res.json({ status: 'Lumyra API is running' });
});

app.post('/validate', async (req, res) => {
    const { key, hwid } = req.body;
    
    console.log(`Validating key: ${key} for HWID: ${hwid}`);
    
    try {
        const { data, error } = await supabase
            .from('keys')
            .select('*')
            .eq('key', key)
            .single();
        
        if (error || !data) {
            return res.json({ 
                valid: false, 
                message: 'Invalid key' 
            });
        }
        
        if (data.used) {
            if (data.hwid === hwid) {
                return res.json({ 
                    valid: true, 
                    message: 'Key already activated on this computer' 
                });
            } else {
                return res.json({ 
                    valid: false, 
                    message: 'Key already in use on another computer' 
                });
            }
        }
        
        const { error: updateError } = await supabase
            .from('keys')
            .update({ used: true, hwid: hwid, activated_at: new Date() })
            .eq('key', key);
        
        if (updateError) throw updateError;
        
        res.json({ 
            valid: true, 
            message: 'Key activated successfully' 
        });
        
    } catch (error) {
        console.error('Validation error:', error);
        res.status(500).json({ 
            valid: false, 
            message: 'Server error' 
        });
    }
});

app.post('/generate-key', async (req, res) => {
    const { adminSecret } = req.body;
    
    if (adminSecret !== process.env.ADMIN_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = 'LUMYRA-';
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 5; j++) {
            key += chars[Math.floor(Math.random() * chars.length)];
        }
        if (i < 3) key += '-';
    }
    
    try {
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
            throw error;
        }
        
        console.log('Generated new key:', key);
        res.json({ key: data[0].key });
        
    } catch (error) {
        console.error('Error saving key:', error);
        res.status(500).json({ error: 'Failed to save key' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

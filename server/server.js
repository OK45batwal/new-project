import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import { supabase } from './db.js';

const app = express();
const PORT = process.env.PORT || 5001;

// Detect if running inside Cloudflare Workers
const isCloudflare = typeof globalThis.caches !== 'undefined' && typeof globalThis.WebSocketPair !== 'undefined';

// Error handler: log full details server-side, return generic message to client
function handleError(res, err, context = '') {
  const message = err?.message || 'Unknown error';
  console.error(`[${context}] ${message}`);
  if (err?.stack) console.error(err.stack);
  const msg = process.env.NODE_ENV === 'production'
    ? 'An internal error occurred. Please try again later.'
    : message;
  res.status(500).json({ error: msg });
}

// Middleware
if (!isCloudflare) {
  app.use(compression({ threshold: 1024 }));
}
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// --- Health Check Route ---
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// --- Business Profile Routes ---
app.get('/api/profile', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('business_profile')
      .select('*')
      .order('profile_type', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    handleError(res, error, "GET profiles");
  }
});

app.put('/api/profile/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const profile = req.body;
    
    // Check if a profile already exists for this type
    const { data: existing, error: fetchError } = await supabase
      .from('business_profile')
      .select('id')
      .eq('profile_type', type)
      .limit(1);
      
    if (fetchError) throw fetchError;
    
    let result;
    if (existing && existing.length > 0) {
      // Update
      const { data, error } = await supabase
        .from('business_profile')
        .update({ ...profile, updated_at: new Date() })
        .eq('id', existing[0].id)
        .select();
      if (error) throw error;
      result = data[0];
    } else {
      // Insert
      const { data, error } = await supabase
        .from('business_profile')
        .insert([{ ...profile, profile_type: type }])
        .select();
      if (error) throw error;
      result = data[0];
    }
    
    res.json(result);
  } catch (error) {
    handleError(res, error, "PUT profile");
  }
});

// --- Customers Routes ---
app.get('/api/customers', async (req, res) => {
  const { search } = req.query;

  try {
    let query = supabase.from('customers').select('*');
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,company_name.ilike.%${search}%,mobile.ilike.%${search}%`);
    }
    
    const { data, error } = await query.order('name', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    handleError(res, error, "GET customers");
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .insert([req.body])
      .select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    handleError(res, error, "POST customer");
  }
});

app.put('/api/customers/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .update(req.body)
      .eq('id', req.params.id)
      .select();
    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    handleError(res, error, "PUT customer");
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    handleError(res, error, "DELETE customer");
  }
});

// --- Products Routes ---
app.get('/api/products', async (req, res) => {
  const { search } = req.query;

  try {
    let query = supabase.from('products').select('*');
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,category.ilike.%${search}%,sku.ilike.%${search}%,barcode.ilike.%${search}%`);
    }
    
    const { data, error } = await query.order('name', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    handleError(res, error, "GET products");
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .insert([req.body])
      .select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    handleError(res, error, "POST product");
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .update(req.body)
      .eq('id', req.params.id)
      .select();
    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    handleError(res, error, "PUT product");
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    handleError(res, error, "DELETE product");
  }
});

// --- Invoices Routes ---
app.get('/api/invoices', async (req, res) => {
  try {
    const { search, type, status, start_date, end_date } = req.query;
    let query = supabase.from('invoices').select('*');
    
    if (type) {
      query = query.eq('invoice_type', type);
    }
    if (status) {
      query = query.eq('payment_status', status);
    }
    if (start_date) {
      query = query.gte('invoice_date', start_date);
    }
    if (end_date) {
      query = query.lte('invoice_date', end_date);
    }
    
    if (search) {
      query = query.or(`invoice_number.ilike.%${search}%,customer_snapshot->>name.ilike.%${search}%,customer_snapshot->>company_name.ilike.%${search}%`);
    }
    
    const { data, error } = await query.order('invoice_date', { ascending: false }).order('invoice_number', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    handleError(res, error, "GET invoices");
  }
});

app.get('/api/invoices/:id', async (req, res) => {
  try {
    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', req.params.id)
      .single();
      
    if (invError) throw invError;
    
    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', req.params.id);
      
    if (itemsError) throw itemsError;
    
    const responseData = { ...invoice, items };
    res.json(responseData);
  } catch (error) {
    handleError(res, error, "GET invoice");
  }
});

const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

app.post('/api/invoices', async (req, res) => {
  try {
    const { items, isDraft, id: bodyId, created_at, updated_at, ...rawInvoiceData } = req.body;
    
    const invoiceData = { ...rawInvoiceData };
    if (!isUUID(invoiceData.customer_id)) {
      invoiceData.customer_id = null;
    }
    
    // Insert invoice header
    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .insert([invoiceData])
      .select();
      
    if (invError) throw invError;
    
    const newInvoice = invoice[0];
    
    // Insert invoice items
    const itemsWithInvoiceId = (items || []).map(item => {
      const cleanItem = { ...item };
      delete cleanItem.id;
      delete cleanItem.invoice_id;
      cleanItem.product_id = isUUID(cleanItem.product_id) ? cleanItem.product_id : null;
      return {
        ...cleanItem,
        invoice_id: newInvoice.id
      };
    });
    
    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(itemsWithInvoiceId);
      
    if (itemsError) {
      // Attempt to rollback by deleting invoice header
      await supabase.from('invoices').delete().eq('id', newInvoice.id);
      throw itemsError;
    }

    // Update product stock in bulk if stock exists
    const stockItems = (items || []).filter(item => item.product_id && isUUID(item.product_id) && item.quantity);
    if (stockItems.length > 0) {
      // Consolidate quantity updates by product_id (handles duplicate items for the same product)
      const quantityMap = new Map();
      for (const item of stockItems) {
        const currentQty = quantityMap.get(item.product_id) || 0;
        quantityMap.set(item.product_id, currentQty + Number(item.quantity));
      }
      
      const productIds = Array.from(quantityMap.keys());
      
      // Batch select current stock levels
      const { data: prods, error: fetchProdsError } = await supabase
        .from('products')
        .select('id, stock')
        .in('id', productIds);
        
      if (fetchProdsError) {
        // Attempt to rollback invoice and invoice_items if fetch fails
        await supabase.from('invoice_items').delete().eq('invoice_id', newInvoice.id);
        await supabase.from('invoices').delete().eq('id', newInvoice.id);
        throw fetchProdsError;
      }
      
      const stockUpdates = [];
      for (const prodId of productIds) {
        const prod = prods ? prods.find(p => p.id === prodId) : null;
        if (prod && prod.stock !== null) {
          const totalQty = quantityMap.get(prodId) || 0;
          const newStock = Number(prod.stock) - totalQty;
          stockUpdates.push({ id: prodId, stock: newStock });
        }
      }
      
      if (stockUpdates.length > 0) {
        const updatePromises = stockUpdates.map(u =>
          supabase.from('products').update({ stock: u.stock }).eq('id', u.id)
        );
        const results = await Promise.all(updatePromises);
        const stockError = results.find(r => r.error)?.error;
        
        if (stockError) {
          // Attempt to rollback invoice and invoice_items if update fails
          await supabase.from('invoice_items').delete().eq('invoice_id', newInvoice.id);
          await supabase.from('invoices').delete().eq('id', newInvoice.id);
          throw stockError;
        }
      }
    }
    
    res.status(201).json({ ...newInvoice, items: itemsWithInvoiceId });
  } catch (error) {
    handleError(res, error, "POST invoice");
  }
});

app.put('/api/invoices/:id', async (req, res) => {
  try {
    const { items, isDraft, id: bodyId, created_at, updated_at, ...rawInvoiceData } = req.body;
    const invoiceId = req.params.id;
    
    const invoiceData = { ...rawInvoiceData };
    if (!isUUID(invoiceData.customer_id)) {
      invoiceData.customer_id = null;
    }
    
    // Update invoice header
    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .update(invoiceData)
      .eq('id', invoiceId)
      .select();
      
    if (invError) throw invError;
    
    // Delete existing items
    const { error: deleteError } = await supabase
      .from('invoice_items')
      .delete()
      .eq('invoice_id', invoiceId);
      
    if (deleteError) throw deleteError;
    
    // Insert new items
    const itemsWithInvoiceId = (items || []).map(item => {
      const cleanItem = { ...item };
      delete cleanItem.id;
      delete cleanItem.invoice_id;
      cleanItem.product_id = isUUID(cleanItem.product_id) ? cleanItem.product_id : null;
      return {
        ...cleanItem,
        invoice_id: invoiceId
      };
    });
    
    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(itemsWithInvoiceId);
      
    if (itemsError) throw itemsError;
    
    res.json({ ...(invoice && invoice[0] ? invoice[0] : invoiceData), items: itemsWithInvoiceId });
  } catch (error) {
    handleError(res, error, "PUT invoice");
  }
});

app.delete('/api/invoices/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    handleError(res, error, "DELETE invoice");
  }
});

// --- Dashboard Stats Route ---
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    
    // Invoices list
    const { data: invoices, error: invError } = await supabase
      .from('invoices')
      .select('*');
    if (invError) throw invError;
    
    // Customers count
    const { count: customerCount, error: custError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });
    if (custError) throw custError;

    // Products count
    const { count: productCount, error: prodError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });
    if (prodError) throw prodError;

    // Calculation variables
    let todaySales = 0;
    let todayInvoices = 0;
    let monthlySales = 0;
    let totalGstCollected = 0;
    
    invoices.forEach(inv => {
      const isGstOrNonGst = ['GST', 'Non-GST'].includes(inv.invoice_type);
      const invDateStr = inv.invoice_date;
      const amount = Number(inv.grand_total) || 0;
      const cgst = Number(inv.cgst_total) || 0;
      const sgst = Number(inv.sgst_total) || 0;
      const igst = Number(inv.igst_total) || 0;
      
      if (invDateStr === today && isGstOrNonGst) {
        todaySales += amount;
        todayInvoices += 1;
      }
      
      if (invDateStr >= firstDayOfMonth && isGstOrNonGst) {
        monthlySales += amount;
      }
      
      if (isGstOrNonGst) {
        totalGstCollected += (cgst + sgst + igst);
      }
    });
    
    // Recent 5 Invoices
    const { data: recentInvoices, error: recError } = await supabase
      .from('invoices')
      .select('*')
      .order('invoice_date', { ascending: false })
      .order('invoice_number', { ascending: false })
      .limit(5);
      
    if (recError) throw recError;
    
    const statsData = {
      todaySales,
      todayInvoices,
      monthlySales,
      totalCustomers: customerCount || 0,
      totalProducts: productCount || 0,
      totalGstCollected,
      recentInvoices
    };
    
    res.json(statsData);
  } catch (error) {
    handleError(res, error, "GET dashboard stats");
  }
});

// --- Reports API ---
app.get('/api/reports', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let query = supabase.from('invoices').select('*');
    if (start_date) query = query.gte('invoice_date', start_date);
    if (end_date) query = query.lte('invoice_date', end_date);
    
    const { data: invoices, error } = await query.order('invoice_date', { ascending: true });
    if (error) throw error;
    
    // Generate simple aggregation report
    let totalSales = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    const dailySalesMap = {};
    
    invoices.forEach(inv => {
      const amt = Number(inv.grand_total) || 0;
      const cgst = Number(inv.cgst_total) || 0;
      const sgst = Number(inv.sgst_total) || 0;
      const igst = Number(inv.igst_total) || 0;
      
      totalSales += amt;
      totalCgst += cgst;
      totalSgst += sgst;
      totalIgst += igst;
      
      const date = inv.invoice_date;
      if (!dailySalesMap[date]) {
        dailySalesMap[date] = 0;
      }
      dailySalesMap[date] += amt;
    });
    
    const dailySales = Object.entries(dailySalesMap).map(([date, amount]) => ({
      date,
      amount
    }));
    
    const reportsData = {
      totalSales,
      totalTax: totalCgst + totalSgst + totalIgst,
      totalCgst,
      totalSgst,
      totalIgst,
      invoices,
      dailySales
    };
    
    res.json(reportsData);
  } catch (error) {
    handleError(res, error, "GET reports");
  }
});

// --- Database Restore API ---
app.post('/api/restore', async (req, res) => {
  try {
    const body = req.body;

    // Helper: resolve a value that may be a raw JSON string (old localStorage format)
    // or already a parsed object/array (new format)
    const resolve = (val) => {
      if (!val) return null;
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return null; }
      }
      return val;
    };

    const profile_gst    = resolve(body.profile_gst);
    const profile_nongst = resolve(body.profile_nongst);
    const customers      = resolve(body.customers) || [];
    const products       = resolve(body.products)  || [];
    // Old format stored invoices under "saved_invoices"; new format uses "invoices"
    const invoices       = resolve(body.invoices) || resolve(body.saved_invoices) || [];

    // Reject clearly empty / unrecognised files
    if (!profile_gst && !profile_nongst && !customers.length && !products.length && !invoices.length) {
      return res.status(400).json({ error: 'Backup file appears to be empty or in an unrecognised format.' });
    }

    // 1. Purge existing data (constraint-safe order)
    await supabase.from('invoice_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('business_profile').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 2. Insert Business Profiles (strip id/timestamps so Supabase regenerates them)
    const profilesToInsert = [];
    if (profile_gst && typeof profile_gst === 'object') {
      const { id: _id, created_at: _created_at, updated_at: _updated_at, ...gst } = profile_gst;
      profilesToInsert.push({ ...gst, profile_type: 'GST' });
    }
    if (profile_nongst && typeof profile_nongst === 'object') {
      const { id: _id, created_at: _created_at, updated_at: _updated_at, ...nongst } = profile_nongst;
      profilesToInsert.push({ ...nongst, profile_type: 'Non-GST' });
    }
    if (profilesToInsert.length > 0) {
      const { error: profErr } = await supabase.from('business_profile').insert(profilesToInsert);
      if (profErr) throw profErr;
    }

    // 3. Insert Customers (preserve id for invoice FK references; strip stale timestamps)
    if (customers.length > 0) {
      const customersClean = customers.map(({ created_at: _created_at, ...c }) => c);
      const { error: custErr } = await supabase.from('customers').insert(customersClean);
      if (custErr) throw custErr;
    }

    // 4. Insert Products (preserve id for invoice item references)
    if (products.length > 0) {
      const productsClean = products.map(({ created_at: _created_at, ...p }) => p);
      const { error: prodErr } = await supabase.from('products').insert(productsClean);
      if (prodErr) throw prodErr;
    }

    // 5. Insert Invoices & Invoice Items
    if (invoices.length > 0) {
      const invoicesToInsert = invoices.map(({ items: _items, created_at: _created_at, ...inv }) => inv);
      const { error: invErr } = await supabase.from('invoices').insert(invoicesToInsert);
      if (invErr) throw invErr;

      const itemsToInsert = [];
      invoices.forEach(inv => {
        if (inv.items && inv.items.length > 0) {
          inv.items.forEach(({ id: _id, invoice_id: _invoice_id, created_at: _created_at, ...item }) => {
            itemsToInsert.push({ ...item, invoice_id: inv.id });
          });
        }
      });

      if (itemsToInsert.length > 0) {
        const { error: itemsErr } = await supabase.from('invoice_items').insert(itemsToInsert);
        if (itemsErr) throw itemsErr;
      }
    }

    res.json({
      message: 'Database restored successfully!',
      summary: {
        profiles: profilesToInsert.length,
        customers: customers.length,
        products: products.length,
        invoices: invoices.length
      }
    });
  } catch (error) {
    handleError(res, error, "POST restore");
  }
});

// Start Server
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`InvoiceFlow backend running on port ${PORT}`);
  });
}

export default app;
// Trigger nodemon reload
